import type { FC } from 'hono/jsx'
import type { ApiCinema, CinemaInfo, TmdbMovieResult, Watch } from '../types.ts'
import { Icon } from './Icon.tsx'
import { EmptyState, PageSection } from './components.tsx'

type FetchSchedule = 'on_demand' | 'daily' | 'weekly' | 'monthly'

const TMDB_POSTER_THUMB = 'https://cineamo-tmdb.b-cdn.net/t/p/w92'

interface SettingsPageProps {
  cinemaInfo: CinemaInfo
  cinemaId: number
  envOverride: boolean
  schedule: FetchSchedule
  searchResults: ApiCinema[] | null
  searchQuery: string | null
  watches: Watch[]
  webhookUrl: string | null
  tmdbToken: boolean
  vapidPublicKey: string
  pushCount: number
  movieSearchResults: TmdbMovieResult[] | null
  movieSearchQuery: string | null
}

const SCHEDULE_LABELS: Record<FetchSchedule, string> = {
  on_demand: 'Nur bei Aufruf',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich'
}

export const SettingsPage: FC<SettingsPageProps> = ({
  cinemaInfo,
  cinemaId,
  envOverride,
  schedule,
  searchResults,
  searchQuery,
  watches,
  webhookUrl,
  tmdbToken,
  vapidPublicKey,
  pushCount,
  movieSearchResults,
  movieSearchQuery
}) => {
  return (
    <div class='settings-page'>
      <h1>Einstellungen</h1>

      <PageSection class='settings-section' title='Kino'>
        <div class='settings-current'>
          {cinemaInfo.logoWideImageUrl && (
            <img
              src={cinemaInfo.logoWideImageUrl}
              alt={cinemaInfo.name}
              class='settings-logo'
            />
          )}
          <div>
            <div class='settings-cinema-name'>{cinemaInfo.name}</div>
            <div class='settings-cinema-id'>ID: {cinemaId}</div>
          </div>
        </div>

        {envOverride ? (
          <p class='settings-env-notice'>
            <Icon name='lock' size={14} /> Konfiguriert via Umgebungsvariable{' '}
            <code>CINEMA_ID={cinemaId}</code>. Die Einstellungen hier haben keinen Effekt.
          </p>
        ) : (
          <>
            <form
              method='post'
              action='/settings/cinema-search'
              class='settings-search-form'
            >
              <input
                type='text'
                name='query'
                placeholder='Kino suchen…'
                value={searchQuery ?? ''}
                class='settings-input'
                autofocus
              />
              <button type='submit' class='settings-btn'>
                <Icon name='search' size={14} />
                Suchen
              </button>
            </form>

            {searchResults !== null && (
              <div class='settings-results'>
                {searchResults.length === 0 ? (
                  <EmptyState>Keine Ergebnisse.</EmptyState>
                ) : (
                  searchResults.map(cinema => (
                    <form
                      method='post'
                      action='/settings/cinema'
                      class='settings-result-row'
                    >
                      <input type='hidden' name='cinema_id' value={String(cinema.id)} />
                      <span class='settings-result-name'>{cinema.name}</span>
                      <span class='settings-result-city'>{cinema.city}</span>
                      <span class='settings-result-id'>#{cinema.id}</span>
                      <button
                        type='submit'
                        class={`settings-btn-sm ${cinema.id === cinemaId ? 'active' : ''}`}
                      >
                        {cinema.id === cinemaId ? 'Aktiv' : 'Übernehmen'}
                      </button>
                    </form>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </PageSection>

      <PageSection class='settings-section' title='Abruf-Zeitplan'>
        <p>Wie oft soll das Programm automatisch aktualisiert werden?</p>

        <form method='post' action='/settings/schedule' class='settings-schedule-form'>
          <div class='settings-radio-group'>
            {(['on_demand', 'daily', 'weekly', 'monthly'] as FetchSchedule[]).map(opt => (
              <label class={`settings-radio ${schedule === opt ? 'active' : ''}`}>
                <input
                  type='radio'
                  name='schedule'
                  value={opt}
                  checked={schedule === opt}
                />
                {SCHEDULE_LABELS[opt]}
              </label>
            ))}
          </div>
          <button type='submit' class='settings-btn'>
            Speichern
          </button>
        </form>
      </PageSection>

      <PageSection class='settings-section' title='Film-Benachrichtigungen'>
        {schedule === 'on_demand' && (
          <p class='settings-env-notice settings-env-notice--warn'>
            <Icon name='alert-triangle' size={14} /> Benachrichtigungen werden nur ausgelöst,
            wenn das Programm manuell aufgerufen wird. Für zuverlässige Benachrichtigungen
            wähle einen automatischen Abruf-Zeitplan.
          </p>
        )}

        <div class='settings-notif-section'>
          <h3 class='settings-notif-heading'>TMDB API-Token</h3>
          <p class='settings-notif-desc'>
            Für die Filmsuche wird ein kostenloser TMDB-Token benötigt.{' '}
            <a
              href='https://www.themoviedb.org/settings/api'
              target='_blank'
              rel='noopener'
            >
              Jetzt erstellen →
            </a>
          </p>
          <form method='post' action='/settings/tmdb-token' class='settings-search-form'>
            <input
              type='password'
              name='tmdb_token'
              placeholder={
                tmdbToken ? '••••••••••••• (gespeichert)' : 'Read Access Token eingeben…'
              }
              class='settings-input'
            />
            <button type='submit' class='settings-btn'>
              Speichern
            </button>
          </form>
        </div>

        <div class='settings-notif-section'>
          <h3 class='settings-notif-heading'>Webhook-URL</h3>
          <p class='settings-notif-desc'>
            Server sendet eine HTTP POST-Anfrage an diese URL, wenn ein beobachteter Film
            im Programm erscheint. Kompatibel mit ntfy.sh, Gotify, Slack, Discord u.a.
          </p>
          <form method='post' action='/settings/webhook' class='settings-search-form'>
            <input
              type='url'
              name='webhook_url'
              value={webhookUrl ?? ''}
              placeholder='https://ntfy.sh/mein-thema'
              class='settings-input'
            />
            <button type='submit' class='settings-btn'>
              Speichern
            </button>
          </form>
        </div>

        <div class='settings-notif-section'>
          <h3 class='settings-notif-heading'>Browser-Push</h3>
          <p class='settings-notif-desc'>
            Push-Benachrichtigungen direkt im Browser.
          </p>
          <div id='push-gate' class='settings-push-gate'>
            <div class='settings-push-content'>
              <div class='settings-push-row'>
                <span class='settings-result-city'>
                  {pushCount === 0
                    ? 'Keine aktiven Abonnements'
                    : `${pushCount} aktives Abonnement${pushCount !== 1 ? 's' : ''}`}
                </span>
                <button
                  id='push-toggle-btn'
                  type='button'
                  class='settings-btn'
                  data-vapid-key={vapidPublicKey}
                >
                  Aktivieren
                </button>
              </div>
            </div>
            <div id='push-gate-pwa' class='settings-push-overlay settings-push-overlay--hidden'>
              <Icon name='lock' size={22} />
              <strong class='settings-push-gate-heading'>App installieren</strong>
              <span class='settings-push-gate-desc'>
                Tippe auf Teilen &rarr; Zum Home-Bildschirm, dann öffne die App und aktiviere
                Push hier.
              </span>
            </div>
            <div id='push-gate-https' class='settings-push-overlay settings-push-overlay--hidden'>
              <Icon name='lock' size={22} />
              <strong class='settings-push-gate-heading'>HTTPS erforderlich</strong>
              <span class='settings-push-gate-desc'>
                Push-Benachrichtigungen funktionieren nur über eine verschlüsselte Verbindung
                (HTTPS).
              </span>
            </div>
          </div>
          <script src='/static/push.js' />
        </div>

        <div class='settings-notif-section'>
          <h3 class='settings-notif-heading'>Beobachtete Filme</h3>
          <p class='settings-notif-desc'>
            Benachrichtigung, sobald ein beobachteter Film im Programm erscheint.
          </p>

          {!tmdbToken && (
            <p class='settings-env-notice settings-env-notice--warn'>
              <Icon name='alert-triangle' size={14} /> TMDB-Token benötigt, um Filme zu suchen.
            </p>
          )}

          {tmdbToken && (
            <form
              method='get'
              action='/settings/watches/search'
              class='settings-search-form'
            >
              <input
                type='text'
                name='q'
                placeholder='Film suchen…'
                value={movieSearchQuery ?? ''}
                class='settings-input'
              />
              <button type='submit' class='settings-btn'>
                <Icon name='search' size={14} />
                Suchen
              </button>
            </form>
          )}

          {movieSearchResults !== null && (
            <div class='settings-results'>
              {movieSearchResults.length === 0 ? (
                <EmptyState>Keine Ergebnisse.</EmptyState>
              ) : (
                movieSearchResults.map(movie => (
                  <form
                    method='post'
                    action='/settings/watches'
                    class='settings-result-row settings-media-row'
                  >
                    <input type='hidden' name='tmdb_id' value={String(movie.id)} />
                    <input type='hidden' name='title' value={movie.title} />
                    <input
                      type='hidden'
                      name='poster_path'
                      value={movie.posterPath ?? ''}
                    />
                    {movie.posterPath ? (
                      <a
                        href={`https://www.themoviedb.org/movie/${movie.id}`}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        <img
                          src={`${TMDB_POSTER_THUMB}${movie.posterPath}`}
                          alt={movie.title}
                          class='settings-poster-thumb'
                          loading='lazy'
                        />
                      </a>
                    ) : (
                      <div class='settings-poster-placeholder' />
                    )}
                    <a
                      href={`https://www.themoviedb.org/movie/${movie.id}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      class='settings-media-info'
                    >
                      <span class='settings-result-name'>{movie.title}</span>
                      {movie.releaseDate && (
                        <span class='settings-result-city'>
                          {movie.releaseDate.slice(0, 4)}
                        </span>
                      )}
                    </a>
                    <button type='submit' class='settings-btn'>
                      Beobachten
                    </button>
                  </form>
                ))
              )}
            </div>
          )}

          <div class='settings-results'>
            {watches.length === 0 ? (
              <EmptyState>Keine beobachteten Filme.</EmptyState>
            ) : (
              watches.map(watch => (
                <div class='settings-result-row settings-media-row'>
                  {watch.posterPath ? (
                    <a
                      href={`https://www.themoviedb.org/movie/${watch.tmdbId}`}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <img
                        src={`${TMDB_POSTER_THUMB}${watch.posterPath}`}
                        alt={watch.title}
                        class='settings-poster-thumb'
                        loading='lazy'
                      />
                    </a>
                  ) : (
                    <div class='settings-poster-placeholder' />
                  )}
                  <a
                    href={`https://www.themoviedb.org/movie/${watch.tmdbId}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    class='settings-media-info'
                  >
                    <span class='settings-result-name'>{watch.title}</span>
                    <span class='settings-result-city'>
                      {watch.notifiedAt ? `Gefunden: ${watch.matchedMovie}` : 'Ausstehend'}
                    </span>
                  </a>
                  <form method='post' action={`/settings/watches/${watch.id}/delete`}>
                    <button type='submit' class='settings-btn'>
                      Löschen
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </PageSection>
    </div>
  )
}
