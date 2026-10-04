import type { FC } from 'hono/jsx'
import type { ApiCinema, CinemaInfo } from '../types.ts'
import { Icon } from './Icon.tsx'

type FetchSchedule = 'on_demand' | 'daily' | 'weekly' | 'monthly'

interface SettingsPageProps {
  cinemaInfo: CinemaInfo
  cinemaId: number
  envOverride: boolean
  schedule: FetchSchedule
  searchResults: ApiCinema[] | null
  searchQuery: string | null
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
  searchQuery
}) => {
  return (
    <div class='settings-page'>
      <h1>Einstellungen</h1>

      <section class='settings-section'>
        <h2>Kino</h2>

        <div class='settings-current'>
          {cinemaInfo.logoWideImageUrl && (
            <img src={cinemaInfo.logoWideImageUrl} alt={cinemaInfo.name} class='settings-logo' />
          )}
          <div>
            <div class='settings-cinema-name'>{cinemaInfo.name}</div>
            <div class='settings-cinema-id'>ID: {cinemaId}</div>
          </div>
        </div>

        {envOverride ? (
          <p class='settings-env-notice'>
            <Icon name='lock' size={14} />
            {' '}Konfiguriert via Umgebungsvariable <code>CINEMA_ID={cinemaId}</code>. Die Einstellungen hier haben keinen Effekt.
          </p>
        ) : (
          <>
            <form method='post' action='/settings/cinema-search' class='settings-search-form'>
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
                  <p class='empty'>Keine Ergebnisse.</p>
                ) : (
                  searchResults.map(cinema => (
                    <form method='post' action='/settings/cinema' class='settings-result-row'>
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
      </section>

      <section class='settings-section'>
        <h2>Abruf-Zeitplan</h2>
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
          <button type='submit' class='settings-btn'>Speichern</button>
        </form>
      </section>
    </div>
  )
}
