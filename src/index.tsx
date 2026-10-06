import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { clearProgramCache, fetchAllCinemas, fetchCinemaInfo, getProgram } from './api.ts'
import { getConfig, getHistoricDays, getProgramFromDb, setConfig } from './db.ts'
import type { CinemaInfo, Filters } from './types.ts'
import Layout from './views/Layout.tsx'
import { ProgramPage } from './views/Program.tsx'
import { AnalyticsPage } from './views/Analytics.tsx'
import { SettingsPage } from './views/Settings.tsx'

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

  if (schedule !== 'on_demand') {
    globalThis._scheduleTimer = setInterval(() => {
      clearProgramCache(cinemaId)
      getProgram(cinemaId).catch(console.error)
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
  const program =
    filters.date && filters.date < today
      ? getProgramFromDb(cinemaId, filters.date)
      : await getProgram(cinemaId)

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

app.get('/analytics', c => {
  return c.html(
    <Layout activePath='analytics' cinemaInfo={getCinemaInfo()}>
      <AnalyticsPage />
    </Layout>
  )
})

app.get('/settings', c => {
  const schedule = (getConfig('fetch_schedule') ?? 'on_demand') as FetchSchedule
  return c.html(
    <Layout activePath='settings' cinemaInfo={getCinemaInfo()}>
      <SettingsPage
        cinemaInfo={getCinemaInfo()}
        cinemaId={cinemaId}
        envOverride={globalThis._cinemaIdEnvOverride}
        schedule={schedule}
        searchResults={null}
        searchQuery={null}
      />
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
  const schedule = (getConfig('fetch_schedule') ?? 'on_demand') as FetchSchedule
  return c.html(
    <Layout activePath='settings' cinemaInfo={getCinemaInfo()}>
      <SettingsPage
        cinemaInfo={getCinemaInfo()}
        cinemaId={cinemaId}
        envOverride={globalThis._cinemaIdEnvOverride}
        schedule={schedule}
        searchResults={results}
        searchQuery={query}
      />
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

export default app
