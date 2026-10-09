import type { FC } from 'hono/jsx'
import { count, desc, eq, max, min, sql, sum } from 'drizzle-orm'
import { db } from '../db.ts'
import { contents, rooms, showings } from '../schema.ts'
import { EmptyState, PageSection, StatTile } from './components.tsx'

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
  const [{ totalShowings }] = db.select({ totalShowings: count() }).from(showings).all()

  const [{ totalMovies }] = db.select({ totalMovies: count() }).from(contents).all()

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
        <EmptyState>
          Noch keine historischen Daten. Lade das <a href='/program'>Programm</a> einmal,
          um Daten zu sammeln.
        </EmptyState>
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
    .orderBy(desc(count()))
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
    .leftJoin(rooms, eq(rooms.id, showings.cinemaRoomId))
    .groupBy(showings.cinemaRoomId)
    .orderBy(desc(count()))
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
        <StatTile value={totalShowings} label='Vorstellungen gesamt' />
        <StatTile value={totalMovies} label='Verschiedene Filme' />
        <StatTile value={firstDate} label='Älteste Daten' />
        <StatTile value={lastDate} label='Aktuellste Daten' />
      </div>

      <PageSection class='analytics-section' title='Häufigste Filme'>
        <div class='bar-chart'>
          {topMovies.map(m => (
            <CssBar value={m.count} max={maxMovieCount} label={m.name} />
          ))}
        </div>
      </PageSection>

      <PageSection class='analytics-section' title='Saalauslastung'>
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
      </PageSection>

      <PageSection class='analytics-section' title='Sprachverteilung'>
        <div class='bar-chart'>
          <CssBar value={deCount} max={maxLang} label='Deutsch' />
          <CssBar value={ovCount} max={maxLang} label='OV (Originalfassung)' />
          <CssBar
            value={omuCount}
            max={maxLang}
            label='OmU (Originalfassung mit Untertiteln)'
          />
        </div>
      </PageSection>

      <PageSection class='analytics-section' title='Programm-Wechsel (letzte 8 Wochen)'>
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
      </PageSection>
    </div>
  )
}
