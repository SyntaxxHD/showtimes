import type { FC } from 'hono/jsx'
import type { Movie, Showtime } from '../types.ts'
import { Icon } from './Icon.tsx'
import { ExternalLink, roomColorClass } from './components.tsx'
import { formatTime, formatDayLabel, groupByDate } from './Program.tsx'

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

interface MovieDetailProps {
  movie: Movie
  upcomingShowtimes: Showtime[]
}

export const MovieDetailPage: FC<MovieDetailProps> = ({ movie: m, upcomingShowtimes }) => {
  const days = groupByDate(upcomingShowtimes)
  const cinematic = !!m.backdropImageUrl

  return (
    <div class={`movie-detail${cinematic ? ' movie-detail--cinematic' : ''}`}>
      {cinematic ? (
        <div class='movie-detail-hero'>
          <img src={m.backdropImageUrl!} alt='' class='movie-detail-backdrop' />
          <a href='/program' class='back-link'>
            <Icon name='arrow-left' size={15} /> Programm
          </a>
        </div>
      ) : (
        <a href='/program' class='back-link'>
          <Icon name='arrow-left' size={15} /> Programm
        </a>
      )}

      <div class='movie-detail-info'>
        {m.posterImageUrl && (
          <div class='movie-detail-poster'>
            <img src={m.posterImageUrl} alt={m.name} />
          </div>
        )}

        <div class='movie-detail-body'>
          <h1 class='movie-detail-title'>{m.name}</h1>

          <div class='movie-detail-meta'>
            {m.ageRating && <span class='badge badge-fsk'>FSK {m.ageRating}</span>}
            {m.duration && <span class='badge badge-duration'>{m.duration} min</span>}
            {m.premiereDate && (
              <span class='badge badge-duration'>
                {new Date(m.premiereDate).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </span>
            )}
            {m.trailerUrl && (
              <ExternalLink href={m.trailerUrl} class='btn-trailer'>
                <Icon name='play-circle' size={13} /> Trailer
              </ExternalLink>
            )}
          </div>

          {m.description && <p class='movie-detail-desc'>{m.description}</p>}
        </div>
      </div>

      <section class='movie-detail-showings'>
        <h2 class='movie-detail-showings-heading'>Vorstellungen</h2>

        {days.length === 0 ? (
          <p class='movie-detail-no-showings'>Keine weiteren Vorstellungen</p>
        ) : (
          days.map(([dayKey, showtimes]) => (
            <div class='showing-day'>
              <div class='showing-day-label'>{formatDayLabel(dayKey)}</div>
              <div class='showing-rows'>
                {showtimes.map(s => {
                  const lang = langLabel(
                    s.isOriginalVersion,
                    s.isSubtitled,
                    s.subtitledLanguage
                  )
                  const badges = formatBadges(s)
                  return (
                    <div class='showing-row'>
                      <span class='showing-time'>{formatTime(s.startDatetime)}</span>
                      <span class={`showing-room ${roomColorClass(s.roomName)}`}>
                        {s.roomName}
                      </span>
                      <div class='showing-tags'>
                        {lang && <span class='pill-lang'>{lang}</span>}
                        {badges.map(b => (
                          <span class='pill-badge'>{b}</span>
                        ))}
                      </div>
                      {s.ticketUrl && (
                        <ExternalLink href={s.ticketUrl} class='ticket-link'>
                          Ticket →
                        </ExternalLink>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
