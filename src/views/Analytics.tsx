import type { FC } from 'hono/jsx'
import { count, max, min, sql, sum } from 'drizzle-orm'
import { db } from '../db.ts'
import { contents, rooms, showings } from '../schema.ts'

const CssBar: FC<{ value: number; max: number; label: string; sub?: string }> = ({
  value,
  max,
  label,
  sub
}) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div class='bar-row'>
      <span class='bar-label'>
        {label}
        {sub && <small>{sub}</small>}
      </span>
      <div class='bar-track'>
        <div class='bar-fill' style={`width: ${pct}%`}></div>
      </div>
      <span class='bar-value'>{value}</span>
    </div>
  )
}

export const AnalyticsPage: FC = () => {
  const [{ totalShowings }] = db
    .select({ totalShowings: count() })
    .from(showings)
    .all()

  const [{ totalMovies }] = db
    .select({ totalMovies: count() })
    .from(contents)
    .all()

  const [dateRange] = db
    .select({
      first: min(showings.startDatetime),
      last: max(showings.startDatetime)
    })
    .from(showings)
    .all()

  if (totalShowings === 0) {
    return (
      <div class='analytics-page'>
        <h1>Statistiken</h1>
        <p class='empty'>
          Noch keine historischen Daten. Lade das <a href='/program'>Programm</a> einmal,
          um Daten zu sammeln.
        </p>
      </div>
    )
  }

  const topMovies = db
    .select({
      contentId: showings.contentId,
      name: showings.name,
      count: count()
    })
    .from(showings)
    .groupBy(showings.contentId)
    .orderBy(sql`count(*) desc`)
    .limit(15)
    .all()

  const maxMovieCount = topMovies[0]?.count ?? 1

  const roomStats = db
    .select({
      roomId: showings.cinemaRoomId,
      roomName: rooms.name,
      count: count()
    })
    .from(showings)
    .leftJoin(rooms, sql`${rooms.id} = ${showings.cinemaRoomId}`)
    .groupBy(showings.cinemaRoomId)
    .orderBy(sql`count(*) desc`)
    .all()

  const maxRoomCount = roomStats[0]?.count ?? 1

  const [langStats] = db
    .select({
      ov: sum(sql<number>`case when ${showings.isOriginalVersion} = 1 then 1 else 0 end`),
      omu: sum(sql<number>`case when ${showings.isSubtitled} = 1 then 1 else 0 end`),
      de: sum(
        sql<number>`case when ${showings.isOriginalVersion} = 0 and ${showings.isSubtitled} = 0 then 1 else 0 end`
      )
    })
    .from(showings)
    .all()

  const ovCount = Number(langStats.ov ?? 0)
  const omuCount = Number(langStats.omu ?? 0)
  const deCount = Number(langStats.de ?? 0)
  const maxLang = Math.max(ovCount, omuCount, deCount)

  const weeklyMovies = db
    .select({
      week: sql<string>`strftime('%Y-W%W', ${showings.startDatetime})`,
      contentId: showings.contentId,
      name: showings.name,
      firstSeen: min(showings.startDatetime),
      lastSeen: max(showings.startDatetime)
    })
    .from(showings)
    .groupBy(sql`strftime('%Y-W%W', ${showings.startDatetime})`, showings.contentId)
    .orderBy(sql`strftime('%Y-W%W', ${showings.startDatetime}) desc, count(*) desc`)
    .all()

  const weekMap = new Map<string, { name: string; contentId: number }[]>()

  for (const row of weeklyMovies) {
    if (!weekMap.has(row.week)) {
      weekMap.set(row.week, [])
    }
    weekMap.get(row.week)!.push({ name: row.name, contentId: row.contentId })
  }

  const weeks = [...weekMap.entries()].slice(0, 8)

  const firstDate = dateRange.first
    ? new Date(dateRange.first).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })
    : '–'
  const lastDate = dateRange.last
    ? new Date(dateRange.last).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })
    : '–'

  return (
    <div class='analytics-page'>
      <h1>Statistiken</h1>
      <div class='stats-summary'>
        <div class='stat-tile'>
          <span class='stat-value'>{totalShowings}</span>
          <span class='stat-label'>Vorstellungen gesamt</span>
        </div>
        <div class='stat-tile'>
          <span class='stat-value'>{totalMovies}</span>
          <span class='stat-label'>Verschiedene Filme</span>
        </div>
        <div class='stat-tile'>
          <span class='stat-value'>{firstDate}</span>
          <span class='stat-label'>Älteste Daten</span>
        </div>
        <div class='stat-tile'>
          <span class='stat-value'>{lastDate}</span>
          <span class='stat-label'>Aktuellste Daten</span>
        </div>
      </div>

      <section class='analytics-section'>
        <h2>Häufigste Filme</h2>
        <div class='bar-chart'>
          {topMovies.map(m => (
            <CssBar value={m.count} max={maxMovieCount} label={m.name} />
          ))}
        </div>
      </section>

      <section class='analytics-section'>
        <h2>Saalauslastung</h2>
        <div class='bar-chart'>
          {roomStats.map(r => (
            <CssBar
              value={r.count}
              max={maxRoomCount}
              label={r.roomName ?? `Saal ${r.roomId}`}
              sub={` (${Math.round((r.count / totalShowings) * 100)}%)`}
            />
          ))}
        </div>
      </section>

      <section class='analytics-section'>
        <h2>Sprachverteilung</h2>
        <div class='bar-chart'>
          <CssBar value={deCount} max={maxLang} label='Deutsch' />
          <CssBar value={ovCount} max={maxLang} label='OV (Originalfassung)' />
          <CssBar
            value={omuCount}
            max={maxLang}
            label='OmU (Originalfassung mit Untertiteln)'
          />
        </div>
      </section>

      <section class='analytics-section'>
        <h2>Programm-Wechsel (letzte 8 Wochen)</h2>
        <div class='churn-table'>
          {weeks.map(([week, movies]) => (
            <div class='churn-week'>
              <h3 class='churn-week-label'>
                KW {week.split('-W')[1]} {week.split('-W')[0]}
              </h3>
              <div class='churn-movies'>
                {movies.map(m => (
                  <span class='churn-movie'>{m.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
