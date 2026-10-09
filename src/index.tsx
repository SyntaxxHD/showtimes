import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { clearProgramCache, fetchAllCinemas, fetchCinemaInfo, getProgram } from './api.ts'
import {
  addPushSubscription,
  addWatch,
  deleteWatch,
  deletePushSubscription,
  getConfig,
  getHistoricDays,
  getProgramFromDb,
  getPushSubscriptions,
  getWatches,
  setConfig
} from './db.ts'
import { checkWatches } from './notify.ts'
import type { CinemaInfo, Filters, TmdbMovieResult } from './types.ts'
import Layout from './views/Layout.tsx'
import { ProgramPage } from './views/Program.tsx'
import { AnalyticsPage } from './views/Analytics.tsx'
import { SettingsPage } from './views/Settings.tsx'
import { MovieDetailPage } from './views/MovieDetail.tsx'
import webpush from 'web-push'

declare global {
  var _cinemaInfo: CinemaInfo | undefined
  var _scheduleTimer: ReturnType<typeof setInterval> | undefined
  var _cinemaIdEnvOverride: boolean
}

const envCinemaId = process.env.CINEMA_ID ? parseInt(process.env.CINEMA_ID, 10) : null
const dbCinemaId = getConfig('cinema_id')
let cinemaId = envCinemaId ?? (dbCinemaId ? parseInt(dbCinemaId, 10) : 1045)

globalThis._cinemaIdEnvOverride = envCinemaId !== null

globalThis._cinemaInfo ??= await fetchCinemaInfo(cinemaId)

if (!getConfig('vapid_public_key')) {
  const keys = webpush.generateVAPIDKeys()
  setConfig('vapid_public_key', keys.publicKey)
  setConfig('vapid_private_key', keys.privateKey)
  console.log('[push] generated VAPID keys')
}

webpush.setVapidDetails(
  'mailto:admin@example.com',
  getConfig('vapid_public_key')!,
  getConfig('vapid_private_key')!
)

function getCinemaInfo(): CinemaInfo {
  return globalThis._cinemaInfo!
}

async function refreshCinemaInfo(id: number): Promise<void> {
  globalThis._cinemaInfo = await fetchCinemaInfo(id)
  clearProgramCache()
}

type FetchSchedule = 'on_demand' | 'daily' | 'weekly' | 'monthly'

const SCHEDULE_MS: Record<Exclude<FetchSchedule, 'on_demand'>, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
}

function applySchedule(schedule: FetchSchedule): void {
  if (globalThis._scheduleTimer) {
    clearInterval(globalThis._scheduleTimer)
    globalThis._scheduleTimer = undefined
  }

  console.log(`[schedule] fetch schedule: ${schedule}`)

  if (schedule !== 'on_demand') {
    getProgram(cinemaId).then(checkWatches).catch(console.error)

    globalThis._scheduleTimer = setInterval(() => {
      console.log('[schedule] scheduled refresh triggered')
      clearProgramCache(cinemaId)
      getProgram(cinemaId).then(checkWatches).catch(console.error)
    }, SCHEDULE_MS[schedule])
  }
}

const currentSchedule = (getConfig('fetch_schedule') ?? 'on_demand') as FetchSchedule
applySchedule(currentSchedule)

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))

app.get('/', c => c.redirect('/program'))

app.get('/program', async c => {
  const q = c.req.query()

  const rawView = q['view']
  const view: Filters['view'] =
    rawView === 'room' || rawView === 'schedule' ? rawView : 'movie'

  const filters: Filters = {
    view,
    date: q['date'] ?? null,
    week: q['week'] ?? null,
    offset: parseInt(q['offset'] ?? '0', 10) || 0,
    roomId: q['room'] ? parseInt(q['room'], 10) : null,
    lang: (['deu', 'ov', 'omu'] as const).find(l => l === q['lang']) ?? null,
    format:
      (['3d', 'dolby', 'imax', '4dx'] as const).find(f => f === q['format']) ?? null,
    time:
      (['morning', 'afternoon', 'evening'] as const).find(t => t === q['time']) ?? null,
    premiereOnly: q['premiere'] === '1'
  }

  const historicDays = getHistoricDays(cinemaId)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' })
  let program
  if (filters.date && filters.date < today) {
    program = getProgramFromDb(cinemaId, filters.date)
  } else {
    program = await getProgram(cinemaId)
    checkWatches(program).catch(console.error)
  }

  const availableDays = new Set<string>(historicDays)
  for (const m of program.movies) {
    for (const s of m.showtimes) {
      const d = new Date(s.startDatetime).toLocaleDateString('en-CA', {
        timeZone: 'Europe/Berlin'
      })
      availableDays.add(d)
    }
  }

  return c.html(
    <Layout activePath='program' cinemaInfo={getCinemaInfo()}>
      <ProgramPage program={program} filters={filters} availableDays={availableDays} />
    </Layout>
  )
})

app.get('/movie/:contentId', async c => {
  const contentId = parseInt(c.req.param('contentId'), 10)
  if (isNaN(contentId)) {
    return c.notFound()
  }
  const program = await getProgram(cinemaId)
  const movie = program.movies.find(m => m.contentId === contentId)
  if (!movie) {
    return c.notFound()
  }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' })
  const upcomingShowtimes = movie.showtimes.filter(
    s => s.startDatetime.slice(0, 10) >= today
  )
  return c.html(
    <Layout activePath='program' cinemaInfo={getCinemaInfo()}>
      <MovieDetailPage movie={movie} upcomingShowtimes={upcomingShowtimes} />
    </Layout>
  )
})

app.get('/analytics', c => {
  return c.html(
    <Layout activePath='analytics' cinemaInfo={getCinemaInfo()}>
      <AnalyticsPage />
    </Layout>
  )
})

function settingsProps(extra: {
  searchResults?: import('./types.ts').ApiCinema[] | null
  searchQuery?: string | null
  movieSearchResults?: TmdbMovieResult[] | null
  movieSearchQuery?: string | null
}) {
  return {
    cinemaInfo: getCinemaInfo(),
    cinemaId,
    envOverride: globalThis._cinemaIdEnvOverride,
    schedule: (getConfig('fetch_schedule') ?? 'on_demand') as FetchSchedule,
    searchResults: extra.searchResults ?? null,
    searchQuery: extra.searchQuery ?? null,
    watches: getWatches(),
    webhookUrl: getConfig('webhook_url'),
    tmdbToken: !!getConfig('tmdb_token'),
    vapidPublicKey: getConfig('vapid_public_key')!,
    pushCount: getPushSubscriptions().length,
    movieSearchResults: extra.movieSearchResults ?? null,
    movieSearchQuery: extra.movieSearchQuery ?? null
  }
}

app.get('/settings', c => {
  return c.html(
    <Layout activePath='settings' cinemaInfo={getCinemaInfo()}>
      <SettingsPage {...settingsProps({})} />
    </Layout>
  )
})

app.post('/settings/cinema-search', async c => {
  const body = await c.req.parseBody()
  const query = String(body['query'] ?? '')
    .trim()
    .toLowerCase()

  const allCinemas = await fetchAllCinemas()
  const results = query
    ? allCinemas.filter(
        cm =>
          cm.name.toLowerCase().includes(query) || cm.city.toLowerCase().includes(query)
      )
    : allCinemas.slice(0, 20)
  return c.html(
    <Layout activePath='settings' cinemaInfo={getCinemaInfo()}>
      <SettingsPage {...settingsProps({ searchResults: results, searchQuery: query })} />
    </Layout>
  )
})

app.post('/settings/cinema', async c => {
  if (globalThis._cinemaIdEnvOverride) {
    return c.redirect('/settings')
  }

  const body = await c.req.parseBody()
  const newId = parseInt(String(body['cinema_id']), 10)
  if (!isNaN(newId)) {
    setConfig('cinema_id', String(newId))
    cinemaId = newId
    await refreshCinemaInfo(newId)
  }

  return c.redirect('/program')
})

app.post('/settings/schedule', async c => {
  const body = await c.req.parseBody()
  const schedule = String(body['schedule'] ?? 'on_demand') as FetchSchedule
  if (['on_demand', 'daily', 'weekly', 'monthly'].includes(schedule)) {
    setConfig('fetch_schedule', schedule)
    applySchedule(schedule)
  }

  return c.redirect('/settings')
})

app.post('/settings/webhook', async c => {
  const body = await c.req.parseBody()
  setConfig('webhook_url', String(body['webhook_url'] ?? '').trim())
  return c.redirect('/settings')
})

app.post('/settings/tmdb-token', async c => {
  const body = await c.req.parseBody()
  setConfig('tmdb_token', String(body['tmdb_token'] ?? '').trim())
  return c.redirect('/settings')
})

app.get('/settings/watches/search', async c => {
  const query = (c.req.query('q') ?? '').trim()
  let movieSearchResults: TmdbMovieResult[] | null = null

  if (query) {
    const token = getConfig('tmdb_token')
    if (token) {
      const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=de-DE&page=1`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })

      if (res.ok) {
        const data = (await res.json()) as {
          results: Array<{
            id: number
            title: string
            release_date?: string
            poster_path?: string | null
          }>
        }
        movieSearchResults = data.results.slice(0, 8).map(r => ({
          id: r.id,
          title: r.title,
          releaseDate: r.release_date ?? null,
          posterPath: r.poster_path ?? null
        }))
      } else {
        console.error(`[tmdb] search failed: ${res.status}`)
      }
    }
  }

  return c.html(
    <Layout activePath='settings' cinemaInfo={getCinemaInfo()}>
      <SettingsPage {...settingsProps({ movieSearchResults, movieSearchQuery: query })} />
    </Layout>
  )
})

app.post('/settings/watches', async c => {
  const body = await c.req.parseBody()
  const tmdbId = parseInt(String(body['tmdb_id']), 10)
  const title = String(body['title'] ?? '').trim()
  const posterPath = String(body['poster_path'] ?? '').trim() || null

  if (!isNaN(tmdbId) && title) {
    addWatch(tmdbId, title, posterPath)
  }

  return c.redirect('/settings')
})

app.post('/settings/watches/:id/delete', async c => {
  const id = parseInt(c.req.param('id'), 10)
  if (!isNaN(id)) {
    deleteWatch(id)
  }
  return c.redirect('/settings')
})

app.get('/vapid-public-key', c => {
  const publicKey = getConfig('vapid_public_key')
  if (!publicKey) {
    return c.json({ error: 'not configured' }, 500)
  }
  return c.json({ publicKey })
})

app.post('/settings/push-subscribe', async c => {
  const { endpoint, p256dh, auth } = await c.req.json<{
    endpoint: string
    p256dh: string
    auth: string
  }>()
  if (endpoint && p256dh && auth) {
    addPushSubscription(endpoint, p256dh, auth)
  }
  return c.json({ ok: true })
})

app.post('/settings/push-unsubscribe', async c => {
  const { endpoint } = await c.req.json<{ endpoint: string }>()
  if (endpoint) {
    deletePushSubscription(endpoint)
  }
  return c.json({ ok: true })
})

export default app
