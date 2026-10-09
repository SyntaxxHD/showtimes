import type { FC } from 'hono/jsx'
import type { Filters, Movie, Program, Room, Showtime } from '../types.ts'
import { Icon } from './Icon.tsx'
import {
  EmptyState,
  ExternalLink,
  FilterChip,
  FilterRow,
  ViewBtn,
  roomColorClass,
  roomColClass
} from './components.tsx'

const TZ = 'Europe/Berlin'

function toLocalDate(iso: string): Date {
  return new Date(new Date(iso).toLocaleString('en-US', { timeZone: TZ }))
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ
  })
}

function formatDayLabel(dayKey: string): string {
  const d = new Date(dayKey + 'T12:00:00')
  const today = todayLocal()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = tomorrow.toLocaleDateString('en-CA')

  if (dayKey === today) {
    return 'Heute'
  }

  if (dayKey === tomorrowKey) {
    return 'Morgen'
  }

  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  })
}

function formatDayParts(dayKey: string): { weekday: string; date: string } {
  const d = new Date(dayKey + 'T12:00:00')
  const today = todayLocal()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = tomorrow.toLocaleDateString('en-CA')

  if (dayKey === today) {
    return {
      weekday: 'Heute',
      date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    }
  }

  if (dayKey === tomorrowKey) {
    return {
      weekday: 'Morgen',
      date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    }
  }

  return {
    weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }),
    date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }
}

function todayLocal(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

function getHour(iso: string): number {
  return toLocalDate(iso).getHours()
}

function getDayKey(iso: string): string {
  return toLocalDate(iso).toLocaleDateString('en-CA')
}

function groupByDate(showtimes: Showtime[]): [string, Showtime[]][] {
  const map = new Map<string, Showtime[]>()
  for (const s of showtimes) {
    const key = getDayKey(s.startDatetime)
    const list = map.get(key) ?? []
    list.push(s)
    map.set(key, list)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function langLabel(
  isOV: boolean,
  isSubtitled: boolean,
  subtitledLang: string | null
): string | null {
  if (isOV) {
    return 'OV'
  }
  if (isSubtitled) {
    return subtitledLang ? `OmU (${subtitledLang.toUpperCase()})` : 'OmU'
  }
  return null
}

function formatBadges(s: Showtime): string[] {
  const b: string[] = []
  if (s.is3D) {
    b.push('3D')
  }
  if (s.isDolbyAtmos) {
    b.push('Dolby Atmos')
  }
  if (s.isImax) {
    b.push('IMAX')
  }
  if (s.is4DX) {
    b.push('4DX')
  }
  if (s.isPremiere) {
    b.push('Premiere')
  }
  if (s.isPreview) {
    b.push('Vorpremiere')
  }
  return b
}

function weekContaining(day: string): string {
  const d = new Date(day + 'T12:00:00')
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - dow + 1)
  const year = d.getFullYear()
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay() === 0 ? 6 : jan4.getDay() - 1))
  const weekNum =
    Math.round((d.getTime() - startOfWeek1.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

function mondayOf(week: string): string {
  const [yearStr, wStr] = week.split('-W')
  const year = parseInt(yearStr, 10)
  const weekNum = parseInt(wStr, 10)
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay() === 0 ? 6 : jan4.getDay() - 1))
  const monday = new Date(startOfWeek1)
  monday.setDate(startOfWeek1.getDate() + (weekNum - 1) * 7)
  return monday.toLocaleDateString('en-CA')
}

function weekDays(week: string): string[] {
  const monday = mondayOf(week)
  const days: string[] = []
  const d = new Date(monday + 'T12:00:00')
  for (let i = 0; i < 7; i++) {
    days.push(d.toLocaleDateString('en-CA'))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

function dateRange(from: string, to: string): string[] {
  const days: string[] = []
  let cur = from
  while (cur <= to) {
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

function showtimeMatchesFilters(
  s: Showtime,
  filters: Filters,
  activeWeek: string
): boolean {
  if (s.state === 'cancelled') {
    return false
  }

  if (filters.date) {
    if (getDayKey(s.startDatetime) !== filters.date) {
      return false
    }
  } else {
    const days = weekDays(activeWeek)
    if (!days.includes(getDayKey(s.startDatetime))) {
      return false
    }
  }

  if (filters.roomId && s.roomId !== filters.roomId) {
    return false
  }

  if (filters.lang) {
    if (filters.lang === 'ov' && !s.isOriginalVersion) {
      return false
    }
    if (filters.lang === 'omu' && !s.isSubtitled) {
      return false
    }
    if (filters.lang === 'deu' && (s.isOriginalVersion || s.isSubtitled)) {
      return false
    }
  }

  if (filters.format) {
    if (filters.format === '3d' && !s.is3D) {
      return false
    }
    if (filters.format === 'dolby' && !s.isDolbyAtmos) {
      return false
    }
    if (filters.format === 'imax' && !s.isImax) {
      return false
    }
    if (filters.format === '4dx' && !s.is4DX) {
      return false
    }
  }

  if (filters.time) {
    const h = getHour(s.startDatetime)
    if (filters.time === 'morning' && h >= 13) {
      return false
    }
    if (filters.time === 'afternoon' && (h < 13 || h >= 18)) {
      return false
    }
    if (filters.time === 'evening' && h < 18) {
      return false
    }
  }

  if (filters.premiereOnly && !s.isPremiere) {
    return false
  }

  return true
}

function applyFilters(movies: Movie[], filters: Filters, activeWeek: string): Movie[] {
  return movies
    .map(m => ({
      ...m,
      showtimes: m.showtimes.filter(s => showtimeMatchesFilters(s, filters, activeWeek))
    }))
    .filter(m => m.showtimes.length > 0)
}

const ShowtimePill: FC<{ s: Showtime }> = ({ s }) => {
  const lang = langLabel(s.isOriginalVersion, s.isSubtitled, s.subtitledLanguage)
  const badges = formatBadges(s)
  const content = (
    <span class='showtime-pill'>
      <span class='pill-time'>{formatTime(s.startDatetime)}</span>
      <span class={`pill-room ${roomColorClass(s.roomName)}`}>{s.roomName}</span>
      {lang && <span class='pill-lang'>{lang}</span>}
      {badges.map(b => (
        <span class='pill-badge'>{b}</span>
      ))}
    </span>
  )

  if (s.ticketUrl) {
    return (
      <ExternalLink href={s.ticketUrl} class='showtime-link'>
        {content}
      </ExternalLink>
    )
  }

  return content
}

const MovieCard: FC<{ movie: Movie }> = ({ movie: m }) => {
  const days = groupByDate(m.showtimes)
  return (
    <article class='movie-card'>
      <div class='movie-body'>
        <div class='movie-poster'>
          {m.posterImageUrl ? (
            <img src={m.posterImageUrl} alt={m.name} loading='lazy' />
          ) : (
            <div class='movie-poster-placeholder'>
              <Icon name='film' size={32} />
            </div>
          )}
        </div>
        <div class='movie-info'>
          <h2 class='movie-title'>{m.name}</h2>
          <div class='movie-meta'>
            {m.ageRating && <span class='badge badge-fsk'>FSK {m.ageRating}</span>}
            {m.duration && <span class='badge badge-duration'>{m.duration} min</span>}
          </div>
          {m.description && <p class='movie-desc'>{m.description}</p>}
          <div class='showtime-groups'>
            {days.map(([dayKey, showtimes]) => (
              <div class='showtime-day'>
                <span class='showtime-day-label'>{formatDayLabel(dayKey)}</span>
                <div class='showtime-day-pills'>
                  {showtimes.map(s => (
                    <ShowtimePill s={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

const ByRoomView: FC<{ movies: Movie[]; rooms: Room[] }> = ({ movies, rooms }) => {
  const roomShowtimes = new Map<number, { movie: Movie; showtime: Showtime }[]>()
  for (const r of rooms) {
    roomShowtimes.set(r.id, [])
  }
  for (const m of movies) {
    for (const s of m.showtimes) {
      roomShowtimes.get(s.roomId)?.push({ movie: m, showtime: s })
    }
  }
  for (const list of roomShowtimes.values()) {
    list.sort((a, b) => a.showtime.startDatetime.localeCompare(b.showtime.startDatetime))
  }

  return (
    <div class='by-room'>
      {rooms.map(room => {
        const entries = roomShowtimes.get(room.id) ?? []
        if (entries.length === 0) {
          return null
        }

        const byDay = new Map<string, { movie: Movie; showtime: Showtime }[]>()
        for (const e of entries) {
          const key = getDayKey(e.showtime.startDatetime)
          const list = byDay.get(key) ?? []
          list.push(e)
          byDay.set(key, list)
        }
        const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))

        return (
          <section class='room-section'>
            <h2 class={`room-heading ${roomColorClass(room.name)}`}>
              <span class='room-dot'></span>
              {room.name}
              {room.seatCount != null && (
                <small class='room-seats'>{room.seatCount} Plätze</small>
              )}
            </h2>
            <div class='room-showings'>
              {days.map(([dayKey, dayEntries]) => (
                <>
                  <div class='room-day-header'>{formatDayLabel(dayKey)}</div>
                  {dayEntries.map(({ movie, showtime: s }) => (
                    <div class='room-entry'>
                      <span class='room-entry-time'>{formatTime(s.startDatetime)}</span>
                      <span class='room-entry-title'>{movie.name}</span>
                      <div class='room-entry-tags'>
                        <ShowtimePill s={s} />
                      </div>
                      {s.ticketUrl && (
                        <ExternalLink href={s.ticketUrl} class='ticket-link'>
                          → Ticket
                        </ExternalLink>
                      )}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

const ScheduleView: FC<{ movies: Movie[]; rooms: Room[] }> = ({ movies, rooms }) => {
  const byRoom = new Map<number, { movie: Movie; s: Showtime }[]>()
  for (const r of rooms) {
    byRoom.set(r.id, [])
  }
  for (const m of movies) {
    for (const s of m.showtimes) {
      byRoom.get(s.roomId)?.push({ movie: m, s })
    }
  }
  for (const list of byRoom.values()) {
    list.sort((a, b) => a.s.startDatetime.localeCompare(b.s.startDatetime))
  }

  const activeRooms = rooms.filter(r => (byRoom.get(r.id)?.length ?? 0) > 0)
  const allShowings = movies.flatMap(m => m.showtimes).filter(s => s.endDatetime != null)
  if (allShowings.length === 0) {
    return <EmptyState>Keine Vorstellungen.</EmptyState>
  }

  const startHour = Math.min(...allShowings.map(s => getHour(s.startDatetime)))
  const endHour = Math.max(
    ...allShowings.map(s => {
      const d = toLocalDate(s.endDatetime!)
      return d.getHours() + (d.getMinutes() > 0 ? 1 : 0)
    })
  )

  const totalMinutes = (endHour - startHour) * 60
  const pxPerMin = 2

  return (
    <div class='schedule-outer'>
      <div class='schedule-inner'>
        <div class='schedule-header-row'>
          <div class='schedule-time-gutter' />
          {activeRooms.map(room => (
            <div class={`schedule-col-header ${roomColorClass(room.name)}`}>
              {room.name}
            </div>
          ))}
        </div>
        <div
          class='schedule-grid'
          style={`--rooms: ${activeRooms.length}; --total-min: ${totalMinutes}`}
        >
          <div class='schedule-time-axis' style={`height: ${totalMinutes * pxPerMin}px`}>
            {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
              <div
                class='time-tick'
                style={`top: ${i * 60 * pxPerMin}px; transform: translateY(${i === 0 ? '0' : '-50%'})`}
              >
                {String(startHour + i).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {activeRooms.map(room => (
            <div class={`schedule-column ${roomColClass(room.name)}`}>
              <div
                class='schedule-col-body'
                style={`height: ${totalMinutes * pxPerMin}px`}
              >
                {(byRoom.get(room.id) ?? [])
                  .filter(({ s }) => s.endDatetime != null)
                  .map(({ movie: m, s }) => {
                    const startMin =
                      getHour(s.startDatetime) * 60 +
                      toLocalDate(s.startDatetime).getMinutes() -
                      startHour * 60
                    const endD = toLocalDate(s.endDatetime!)
                    const endMin =
                      endD.getHours() * 60 + endD.getMinutes() - startHour * 60
                    const height = Math.max((endMin - startMin) * pxPerMin, 24)
                    return (
                      <div
                        class='schedule-block'
                        style={`top: ${startMin * pxPerMin}px; height: ${height}px`}
                        title={`${m.name} (${formatTime(s.startDatetime)}–${formatTime(s.endDatetime!)})`}
                      >
                        {s.ticketUrl ? (
                          <ExternalLink href={s.ticketUrl} class='schedule-block-link'>
                            {m.name}
                            <span class='sched-time'>{formatTime(s.startDatetime)}</span>
                          </ExternalLink>
                        ) : (
                          <span>
                            {m.name}
                            <span class='sched-time'>{formatTime(s.startDatetime)}</span>
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const FilterBar: FC<{
  program: Program
  filters: Filters
  availableDays: Set<string>
  activeWeek: string
}> = ({ program, filters, availableDays, activeWeek }) => {
  const today = todayLocal()
  const allDays = dateRange(addDays(today, -14), addDays(today, 21))

  const langs = new Set<string>()
  let has3D = false,
    hasDolby = false,
    hasImax = false,
    has4DX = false
  for (const m of program.movies) {
    for (const s of m.showtimes) {
      if (s.isOriginalVersion) {
        langs.add('ov')
      } else if (s.isSubtitled) {
        langs.add('omu')
      } else {
        langs.add('deu')
      }
      if (s.is3D) {
        has3D = true
      }
      if (s.isDolbyAtmos) {
        hasDolby = true
      }
      if (s.isImax) {
        hasImax = true
      }
      if (s.is4DX) {
        has4DX = true
      }
    }
  }

  function filterUrl(overrides: Partial<Record<string, string | null>>): string {
    const params = new URLSearchParams()
    const p = (k: string, v: string | null | undefined) => {
      if (v) {
        params.set(k, v)
      }
    }
    p('view', filters.view !== 'movie' ? filters.view : null)
    p('week', overrides.week !== undefined ? overrides.week : activeWeek)
    p('date', overrides.date !== undefined ? overrides.date : filters.date)
    p(
      'room',
      overrides.room !== undefined
        ? overrides.room
        : filters.roomId
          ? String(filters.roomId)
          : null
    )
    p('lang', overrides.lang !== undefined ? overrides.lang : filters.lang)
    p('format', overrides.format !== undefined ? overrides.format : filters.format)
    p('time', overrides.time !== undefined ? overrides.time : filters.time)
    if (filters.premiereOnly) {
      params.set('premiere', '1')
    }
    const q = params.toString()
    return '/program' + (q ? '?' + q : '')
  }

  return (
    <div class='filter-bar'>
      <FilterRow icon='calendar-days' label='Tag'>
        <div class='day-strip-outer'>
          <a
            href={filterUrl({ date: null, week: null })}
            class={`day-chip ${!filters.date ? 'active' : ''}`}
          >
            <span class='day-chip-weekday'>Woche</span>
          </a>
          <a
            href={filterUrl({ date: today, week: null })}
            class={`day-chip ${filters.date === today ? 'active' : ''}`}
          >
            <span class='day-chip-weekday'>Heute</span>
          </a>
          <div class='day-strip'>
            {allDays.map(d => {
              const hasData = availableDays.has(d)
              const { weekday, date } = formatDayParts(d)
              return (
                <a
                  href={filterUrl({ date: d, week: null })}
                  class={`day-chip ${filters.date === d ? 'active' : ''} ${!hasData ? 'day-chip-empty' : ''}`}
                >
                  <span class='day-chip-weekday'>{weekday}</span>
                  <span class='day-chip-date'>{date}</span>
                </a>
              )
            })}
          </div>
        </div>
      </FilterRow>

      <FilterRow icon='door-open' label='Saal'>
        <div class='filter-chips'>
          <FilterChip href={filterUrl({ room: null })} active={!filters.roomId}>
            Alle
          </FilterChip>
          {program.rooms.map(r => (
            <FilterChip
              href={filterUrl({ room: String(r.id) })}
              active={filters.roomId === r.id}
              extraClass={`chip-room ${roomColorClass(r.name)}`}
            >
              {r.name}
            </FilterChip>
          ))}
        </div>
      </FilterRow>

      <FilterRow icon='languages' label='Sprache'>
        <div class='filter-chips'>
          <FilterChip href={filterUrl({ lang: null })} active={!filters.lang}>
            Alle
          </FilterChip>
          {langs.has('deu') && (
            <FilterChip href={filterUrl({ lang: 'deu' })} active={filters.lang === 'deu'}>
              Deutsch
            </FilterChip>
          )}
          {langs.has('ov') && (
            <FilterChip href={filterUrl({ lang: 'ov' })} active={filters.lang === 'ov'}>
              OV
            </FilterChip>
          )}
          {langs.has('omu') && (
            <FilterChip href={filterUrl({ lang: 'omu' })} active={filters.lang === 'omu'}>
              OmU
            </FilterChip>
          )}
        </div>
      </FilterRow>

      {(has3D || hasDolby || hasImax || has4DX) && (
        <FilterRow icon='sparkles' label='Format'>
          <div class='filter-chips'>
            <FilterChip href={filterUrl({ format: null })} active={!filters.format}>
              Alle
            </FilterChip>
            {has3D && (
              <FilterChip
                href={filterUrl({ format: '3d' })}
                active={filters.format === '3d'}
              >
                3D
              </FilterChip>
            )}
            {hasDolby && (
              <FilterChip
                href={filterUrl({ format: 'dolby' })}
                active={filters.format === 'dolby'}
              >
                Dolby Atmos
              </FilterChip>
            )}
            {hasImax && (
              <FilterChip
                href={filterUrl({ format: 'imax' })}
                active={filters.format === 'imax'}
              >
                IMAX
              </FilterChip>
            )}
            {has4DX && (
              <FilterChip
                href={filterUrl({ format: '4dx' })}
                active={filters.format === '4dx'}
              >
                4DX
              </FilterChip>
            )}
          </div>
        </FilterRow>
      )}

      <FilterRow icon='clock' label='Zeit'>
        <div class='filter-chips'>
          <FilterChip href={filterUrl({ time: null })} active={!filters.time}>
            Alle
          </FilterChip>
          <FilterChip
            href={filterUrl({ time: 'morning' })}
            active={filters.time === 'morning'}
          >
            Vormittag (&lt;13 Uhr)
          </FilterChip>
          <FilterChip
            href={filterUrl({ time: 'afternoon' })}
            active={filters.time === 'afternoon'}
          >
            Nachmittag (13–18 Uhr)
          </FilterChip>
          <FilterChip
            href={filterUrl({ time: 'evening' })}
            active={filters.time === 'evening'}
          >
            Abend (&gt;18 Uhr)
          </FilterChip>
        </div>
      </FilterRow>
    </div>
  )
}

const ViewToggle: FC<{ filters: Filters; activeWeek: string }> = ({
  filters,
  activeWeek
}) => {
  function viewUrl(v: string): string {
    const params = new URLSearchParams()
    if (v !== 'movie') {
      params.set('view', v)
    }
    params.set('week', activeWeek)
    if (filters.date) {
      params.set('date', filters.date)
    }
    if (filters.roomId) {
      params.set('room', String(filters.roomId))
    }
    if (filters.lang) {
      params.set('lang', filters.lang)
    }
    if (filters.format) {
      params.set('format', filters.format)
    }
    if (filters.time) {
      params.set('time', filters.time)
    }
    if (filters.premiereOnly) {
      params.set('premiere', '1')
    }
    const q = params.toString()
    return '/program' + (q ? '?' + q : '')
  }

  return (
    <div class='view-toggle'>
      <ViewBtn
        href={viewUrl('movie')}
        active={filters.view === 'movie'}
        icon='film'
        title='Nach Film'
      >
        Film
      </ViewBtn>
      <ViewBtn
        href={viewUrl('room')}
        active={filters.view === 'room'}
        icon='layout-grid'
        title='Nach Saal'
      >
        Saal
      </ViewBtn>
      <ViewBtn
        href={viewUrl('schedule')}
        active={filters.view === 'schedule'}
        icon='calendar-days'
        title='Zeitplan'
      >
        Zeitplan
      </ViewBtn>
    </div>
  )
}

export const ProgramPage: FC<{
  program: Program
  filters: Filters
  availableDays: Set<string>
}> = ({ program, filters, availableDays }) => {
  const today = todayLocal()
  const activeWeek = filters.week ?? weekContaining(filters.date ?? today)
  const filtered = applyFilters(program.movies, filters, activeWeek)
  const totalShowings = filtered.reduce((n, m) => n + m.showtimes.length, 0)

  return (
    <div class='program-page'>
      <div class='program-header'>
        <h1>Programm</h1>
        <div class='program-header-right'>
          <span class='program-count'>
            {filtered.length} Film{filtered.length !== 1 ? 'e' : ''}, {totalShowings}{' '}
            Vorstellung{totalShowings !== 1 ? 'en' : ''}
          </span>
          <ViewToggle filters={filters} activeWeek={activeWeek} />
        </div>
      </div>

      <FilterBar
        program={program}
        filters={filters}
        availableDays={availableDays}
        activeWeek={activeWeek}
      />

      {filtered.length === 0 ? (
        <EmptyState>Keine Vorstellungen für diese Filter.</EmptyState>
      ) : filters.view === 'room' ? (
        <ByRoomView movies={filtered} rooms={program.rooms} />
      ) : filters.view === 'schedule' ? (
        <ScheduleView movies={filtered} rooms={program.rooms} />
      ) : (
        <div class='movie-grid'>
          {filtered.map(m => (
            <MovieCard movie={m} />
          ))}
        </div>
      )}

      <p class='fetch-time'>
        Stand: {new Date(program.fetchedAt).toLocaleString('de-DE', { timeZone: TZ })}
      </p>
    </div>
  )
}
