import type { FC } from 'hono/jsx'
import type { Filters, Movie, Program, Room, Showtime } from '../types.ts'
import { Icon } from './Icon.tsx'


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
  // dayKey is YYYY-MM-DD in local time
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
    return { weekday: 'Heute', date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) }
  }
  if (dayKey === tomorrowKey) {
    return { weekday: 'Morgen', date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) }
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


function showtimeMatchesFilters(s: Showtime, filters: Filters): boolean {
  if (s.state === 'cancelled') {
    return false
  }

  if (filters.date && getDayKey(s.startDatetime) !== filters.date) {
    return false
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

function applyFilters(movies: Movie[], filters: Filters): Movie[] {
  return movies
    .map(m => ({
      ...m,
      showtimes: m.showtimes.filter(s => showtimeMatchesFilters(s, filters))
    }))
    .filter(m => m.showtimes.length > 0)
}


const ShowtimePill: FC<{ s: Showtime }> = ({ s }) => {
  const lang = langLabel(s.isOriginalVersion, s.isSubtitled, s.subtitledLanguage)
  const badges = formatBadges(s)
  const content = (
    <span class='showtime-pill'>
      <span class='pill-time'>{formatTime(s.startDatetime)}</span>
      <span class={`pill-room room-${s.roomName.toLowerCase()}`}>{s.roomName}</span>
      {lang && <span class='pill-lang'>{lang}</span>}
      {badges.map(b => (
        <span class='pill-badge'>{b}</span>
      ))}
    </span>
  )
  if (s.ticketUrl) {
    return (
      <a href={s.ticketUrl} target='_blank' rel='noopener' class='showtime-link'>
        {content}
      </a>
    )
  }
  return content
}

const MovieCard: FC<{ movie: Movie }> = ({ movie: m }) => {
  const days = groupByDate(m.showtimes)
  return (
    <article class='movie-card'>
      <div class='movie-body'>
        {m.posterImageUrl && (
          <div class='movie-poster'>
            <img src={m.posterImageUrl} alt={m.name} loading='lazy' />
          </div>
        )}
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

        // group by day
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
            <h2 class={`room-heading room-${room.name.toLowerCase()}`}>
              <span class='room-dot'></span>
              {room.name}
              {room.seatCount != null && <small class='room-seats'>{room.seatCount} Plätze</small>}
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
                        <a
                          href={s.ticketUrl}
                          target='_blank'
                          rel='noopener'
                          class='ticket-link'
                        >
                          → Ticket
                        </a>
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
    return <p class='empty'>Keine Vorstellungen.</p>
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
          <div class={`schedule-col-header room-${room.name.toLowerCase()}`}>
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
          <div class={`schedule-column room-col-${room.name.toLowerCase()}`}>
            <div class='schedule-col-body' style={`height: ${totalMinutes * pxPerMin}px`}>
              {(byRoom.get(room.id) ?? []).filter(({ s }) => s.endDatetime != null).map(({ movie: m, s }) => {
                const startMin =
                  getHour(s.startDatetime) * 60 +
                  toLocalDate(s.startDatetime).getMinutes() -
                  startHour * 60
                const endD = toLocalDate(s.endDatetime!)
                const endMin = endD.getHours() * 60 + endD.getMinutes() - startHour * 60
                const height = Math.max((endMin - startMin) * pxPerMin, 24)
                return (
                  <div
                    class='schedule-block'
                    style={`top: ${startMin * pxPerMin}px; height: ${height}px`}
                    title={`${m.name} (${formatTime(s.startDatetime)}–${formatTime(s.endDatetime!)})`}
                  >
                    {s.ticketUrl ? (
                      <a
                        href={s.ticketUrl}
                        target='_blank'
                        rel='noopener'
                        class='schedule-block-link'
                      >
                        {m.name}
                        <span class='sched-time'>{formatTime(s.startDatetime)}</span>
                      </a>
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


const FilterBar: FC<{ program: Program; filters: Filters; historicDays: string[] }> = ({ program, filters, historicDays }) => {
  const daySet = new Set<string>(historicDays)
  for (const m of program.movies) {
    for (const s of m.showtimes) {
      daySet.add(getDayKey(s.startDatetime))
    }
  }
  const days = [...daySet].sort()

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
      <div class='filter-row'>
        <span class='filter-label'>
          <Icon name='calendar-days' size={13} />
          Tag
        </span>
        <div class='day-strip-wrap'>
          <div class='day-strip'>
            <a
              href={filterUrl({ date: null })}
              class={`day-chip ${!filters.date ? 'active' : ''}`}
            >
              <span class='day-chip-weekday'>Alle</span>
            </a>
            {days.map(d => {
              const { weekday, date } = formatDayParts(d)
              return (
                <a
                  href={filterUrl({ date: d })}
                  class={`day-chip ${filters.date === d ? 'active' : ''}`}
                >
                  <span class='day-chip-weekday'>{weekday}</span>
                  <span class='day-chip-date'>{date}</span>
                </a>
              )
            })}
          </div>
        </div>
      </div>

      <div class='filter-row'>
        <span class='filter-label'>
          <Icon name='door-open' size={13} />
          Saal
        </span>
        <div class='filter-chips'>
          <a
            href={filterUrl({ room: null })}
            class={`chip ${!filters.roomId ? 'active' : ''}`}
          >
            Alle
          </a>
          {program.rooms.map(r => (
            <a
              href={filterUrl({ room: String(r.id) })}
              class={`chip chip-room room-${r.name.toLowerCase()} ${filters.roomId === r.id ? 'active' : ''}`}
            >
              {r.name}
            </a>
          ))}
        </div>
      </div>

      <div class='filter-row'>
        <span class='filter-label'>
          <Icon name='languages' size={13} />
          Sprache
        </span>
        <div class='filter-chips'>
          <a
            href={filterUrl({ lang: null })}
            class={`chip ${!filters.lang ? 'active' : ''}`}
          >
            Alle
          </a>
          {langs.has('deu') && (
            <a
              href={filterUrl({ lang: 'deu' })}
              class={`chip ${filters.lang === 'deu' ? 'active' : ''}`}
            >
              Deutsch
            </a>
          )}
          {langs.has('ov') && (
            <a
              href={filterUrl({ lang: 'ov' })}
              class={`chip ${filters.lang === 'ov' ? 'active' : ''}`}
            >
              OV
            </a>
          )}
          {langs.has('omu') && (
            <a
              href={filterUrl({ lang: 'omu' })}
              class={`chip ${filters.lang === 'omu' ? 'active' : ''}`}
            >
              OmU
            </a>
          )}
        </div>
      </div>

      {(has3D || hasDolby || hasImax || has4DX) && (
        <div class='filter-row'>
          <span class='filter-label'>
            <Icon name='sparkles' size={13} />
            Format
          </span>
          <div class='filter-chips'>
            <a
              href={filterUrl({ format: null })}
              class={`chip ${!filters.format ? 'active' : ''}`}
            >
              Alle
            </a>
            {has3D && (
              <a
                href={filterUrl({ format: '3d' })}
                class={`chip ${filters.format === '3d' ? 'active' : ''}`}
              >
                3D
              </a>
            )}
            {hasDolby && (
              <a
                href={filterUrl({ format: 'dolby' })}
                class={`chip ${filters.format === 'dolby' ? 'active' : ''}`}
              >
                Dolby Atmos
              </a>
            )}
            {hasImax && (
              <a
                href={filterUrl({ format: 'imax' })}
                class={`chip ${filters.format === 'imax' ? 'active' : ''}`}
              >
                IMAX
              </a>
            )}
            {has4DX && (
              <a
                href={filterUrl({ format: '4dx' })}
                class={`chip ${filters.format === '4dx' ? 'active' : ''}`}
              >
                4DX
              </a>
            )}
          </div>
        </div>
      )}

      <div class='filter-row'>
        <span class='filter-label'>
          <Icon name='clock' size={13} />
          Zeit
        </span>
        <div class='filter-chips'>
          <a
            href={filterUrl({ time: null })}
            class={`chip ${!filters.time ? 'active' : ''}`}
          >
            Alle
          </a>
          <a
            href={filterUrl({ time: 'morning' })}
            class={`chip ${filters.time === 'morning' ? 'active' : ''}`}
          >
            Vormittag (&lt;13 Uhr)
          </a>
          <a
            href={filterUrl({ time: 'afternoon' })}
            class={`chip ${filters.time === 'afternoon' ? 'active' : ''}`}
          >
            Nachmittag (13–18 Uhr)
          </a>
          <a
            href={filterUrl({ time: 'evening' })}
            class={`chip ${filters.time === 'evening' ? 'active' : ''}`}
          >
            Abend (&gt;18 Uhr)
          </a>
        </div>
      </div>
    </div>
  )
}


const ViewToggle: FC<{ filters: Filters }> = ({ filters }) => {
  function viewUrl(v: string): string {
    const params = new URLSearchParams()
    if (v !== 'movie') {
      params.set('view', v)
    }
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
      <a
        href={viewUrl('movie')}
        class={`view-btn ${filters.view === 'movie' ? 'active' : ''}`}
        title='Nach Film'
      >
        <Icon name='film' size={14} /> Film
      </a>
      <a
        href={viewUrl('room')}
        class={`view-btn ${filters.view === 'room' ? 'active' : ''}`}
        title='Nach Saal'
      >
        <Icon name='layout-grid' size={14} /> Saal
      </a>
      <a
        href={viewUrl('schedule')}
        class={`view-btn ${filters.view === 'schedule' ? 'active' : ''}`}
        title='Zeitplan'
      >
        <Icon name='calendar-days' size={14} /> Zeitplan
      </a>
    </div>
  )
}


export const ProgramPage: FC<{ program: Program; filters: Filters; historicDays: string[] }> = ({
  program,
  filters,
  historicDays
}) => {
  const filtered = applyFilters(program.movies, filters)
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
          <ViewToggle filters={filters} />
        </div>
      </div>

      <FilterBar program={program} filters={filters} historicDays={historicDays} />

      {filtered.length === 0 ? (
        <p class='empty'>Keine Vorstellungen für diese Filter.</p>
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
