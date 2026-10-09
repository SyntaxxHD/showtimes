import webpush from 'web-push'
import {
  getConfig,
  deletePushSubscription,
  getPushSubscriptions,
  getUnnotifiedWatches,
  markWatchNotified
} from './db.ts'
import type { Movie, Program, Showtime, Watch } from './types.ts'

function firstShowtime(movie: Movie): Showtime | undefined {
  return movie.showtimes.reduce<Showtime | undefined>(
    (best, s) => (!best || s.startDatetime < best.startDatetime ? s : best),
    undefined
  )
}

async function sendWebhook(
  url: string,
  movie: Movie,
  watch: Watch,
  showtime: Showtime | undefined
): Promise<void> {
  const body = JSON.stringify({
    movie: movie.name,
    query: watch.title,
    firstShowtime: showtime?.startDatetime ?? null,
    ticketUrl: showtime?.ticketUrl ?? null
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Title: movie.name,
      Tags: 'movie'
    },
    body
  })
  if (!res.ok) {
    console.error(`[watches] webhook failed: ${res.status} ${url}`)
  } else {
    console.log(`[watches] webhook sent for "${movie.name}"`)
  }
}

async function sendPushNotifications(
  movie: Movie,
  showtime: Showtime | undefined
): Promise<void> {
  const subs = getPushSubscriptions()
  if (subs.length === 0) {
    return
  }
  const payload = JSON.stringify({
    title: movie.name,
    body: showtime
      ? `Erste Vorstellung: ${new Date(showtime.startDatetime).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' })}`
      : 'Im Programm',
    url: '/program'
  })
  await Promise.all(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          deletePushSubscription(sub.endpoint)
          console.log(
            `[watches] removed stale push subscription ${sub.endpoint.slice(0, 40)}...`
          )
        } else {
          console.error('[watches] push send error:', err)
        }
      }
    })
  )
}

export async function checkWatches(program: Program): Promise<void> {
  const unnotified = getUnnotifiedWatches()
  if (unnotified.length === 0) {
    return
  }

  const webhookUrl = getConfig('webhook_url')

  for (const watch of unnotified) {
    const match = program.movies.find(
      m => m.movieId != null && m.movieId === watch.tmdbId
    )
    if (!match) {
      continue
    }

    const showtime = firstShowtime(match)
    console.log(`[watches] match: "${watch.title}" -> "${match.name}"`)

    markWatchNotified(watch.id, match.name)

    if (webhookUrl) {
      sendWebhook(webhookUrl, match, watch, showtime).catch(console.error)
    }
    sendPushNotifications(match, showtime).catch(console.error)
  }
}
