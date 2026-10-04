import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema.ts'
import { config, contents, rooms, showings } from './schema.ts'
import { eq, sql } from 'drizzle-orm'
import type { Movie, Program, Room, Showtime } from './types.ts'

declare global {
  var _db: Database | undefined
}

function openDb(): Database {
  const path = process.env.DB_PATH ?? 'cinema.db'
  const sqlite = new Database(path)

  sqlite.run('PRAGMA journal_mode = WAL')

  return sqlite
}

globalThis._db ??= openDb()

export const db = drizzle(globalThis._db, { schema })

migrate(db, { migrationsFolder: 'drizzle' })

export function persistProgram(cinemaId: number, roomList: Room[], movies: Movie[]): void {
  const fetchedAt = new Date().toISOString()

  db.transaction(tx => {
    for (const r of roomList) {
      tx
        .insert(rooms)
        .values({ id: r.id, name: r.name, seatCount: r.seatCount, cinemaId })
        .onConflictDoUpdate({
          target: rooms.id,
          set: { name: r.name, seatCount: r.seatCount, cinemaId }
        })
        .run()
    }

    for (const m of movies) {
      tx
        .insert(contents)
        .values({
          id: m.contentId,
          name: m.name,
          slug: m.slug,
          description: m.description,
          duration: m.duration,
          ageRating: m.ageRating,
          posterImageUrl: m.posterImageUrl,
          backdropImageUrl: m.backdropImageUrl,
          trailerUrl: m.trailerUrl,
          premiereDate: m.premiereDate
        })
        .onConflictDoUpdate({
          target: contents.id,
          set: {
            name: m.name,
            slug: m.slug,
            description: m.description,
            duration: m.duration,
            ageRating: m.ageRating,
            posterImageUrl: m.posterImageUrl,
            backdropImageUrl: m.backdropImageUrl,
            trailerUrl: m.trailerUrl,
            premiereDate: m.premiereDate
          }
        })
        .run()

      for (const s of m.showtimes) {
        tx
          .insert(showings)
          .values({
            id: s.showingId,
            contentId: m.contentId,
            cinemaRoomId: s.roomId,
            name: m.name,
            startDatetime: s.startDatetime,
            endDatetime: s.endDatetime,
            language: s.language,
            originalLanguage: s.originalLanguage,
            isOriginalVersion: s.isOriginalVersion,
            isSubtitled: s.isSubtitled,
            subtitledLanguage: s.subtitledLanguage,
            is3D: s.is3D,
            isDolbyAtmos: s.isDolbyAtmos,
            isImax: s.isImax,
            is4DX: s.is4DX,
            isPremiere: s.isPremiere,
            isPreview: s.isPreview,
            ticketUrl: s.ticketUrl,
            state: s.state,
            fetchedAt,
            cinemaId
          })
          .onConflictDoUpdate({
            target: showings.id,
            set: {
              state: s.state,
              ticketUrl: s.ticketUrl,
              fetchedAt
            }
          })
          .run()
      }
    }
  })
}

export function getConfig(key: string): string | null {
  const row = db.select().from(config).where(eq(config.key, key)).get()
  return row?.value ?? null
}

export function setConfig(key: string, value: string): void {
  db.insert(config).values({ key, value }).onConflictDoUpdate({ target: config.key, set: { value } }).run()
}

export function getHistoricDays(cinemaId: number): string[] {
  const rows = db.all(
    sql`SELECT DISTINCT substr(start_datetime, 1, 10) AS day FROM showings WHERE start_datetime < date('now') AND cinema_id = ${cinemaId} ORDER BY day ASC`
  ) as Array<{ day: string }>
  return rows.map(r => r.day)
}

export function getProgramFromDb(cinemaId: number, date: string): Program {
  const rows = db.all(
    sql`
      SELECT
        s.id AS showingId,
        s.start_datetime AS startDatetime,
        s.end_datetime AS endDatetime,
        s.cinema_room_id AS roomId,
        r.name AS roomName,
        s.language AS language,
        s.original_language AS originalLanguage,
        s.is_original_version AS isOriginalVersion,
        s.is_subtitled AS isSubtitled,
        s.subtitled_language AS subtitledLanguage,
        s.is_3d AS is3D,
        s.is_dolby_atmos AS isDolbyAtmos,
        s.is_imax AS isImax,
        s.is_4dx AS is4DX,
        s.is_premiere AS isPremiere,
        s.is_preview AS isPreview,
        s.ticket_url AS ticketUrl,
        s.state AS state,
        s.fetched_at AS fetchedAt,
        c.id AS contentId,
        c.name AS contentName,
        c.slug AS slug,
        c.description AS description,
        c.duration AS duration,
        c.age_rating AS ageRating,
        c.poster_image_url AS posterImageUrl,
        c.backdrop_image_url AS backdropImageUrl,
        c.trailer_url AS trailerUrl,
        c.premiere_date AS premiereDate,
        r.id AS roomTableId,
        r.seat_count AS seatCount
      FROM showings s
      JOIN contents c ON s.content_id = c.id
      JOIN rooms r ON s.cinema_room_id = r.id
      WHERE substr(s.start_datetime, 1, 10) = ${date} AND s.cinema_id = ${cinemaId}
      ORDER BY s.start_datetime ASC
    `
  ) as Array<{
    showingId: number
    startDatetime: string
    endDatetime: string | null
    roomId: number
    roomName: string
    language: string | null
    originalLanguage: string | null
    isOriginalVersion: number | null
    isSubtitled: number | null
    subtitledLanguage: string | null
    is3D: number | null
    isDolbyAtmos: number | null
    isImax: number | null
    is4DX: number | null
    isPremiere: number | null
    isPreview: number | null
    ticketUrl: string | null
    state: string
    fetchedAt: string
    contentId: number
    contentName: string
    slug: string
    description: string | null
    duration: number | null
    ageRating: string | null
    posterImageUrl: string | null
    backdropImageUrl: string | null
    trailerUrl: string | null
    premiereDate: string | null
    roomTableId: number
    seatCount: number | null
  }>

  const movieMap = new Map<number, Movie>()
  const roomMap = new Map<number, Room>()
  let latestFetchedAt = ''

  for (const row of rows) {
    if (row.fetchedAt > latestFetchedAt) latestFetchedAt = row.fetchedAt

    if (!roomMap.has(row.roomTableId)) {
      roomMap.set(row.roomTableId, { id: row.roomTableId, name: row.roomName, seatCount: row.seatCount })
    }

    if (!movieMap.has(row.contentId)) {
      movieMap.set(row.contentId, {
        contentId: row.contentId,
        name: row.contentName,
        slug: row.slug,
        description: row.description,
        duration: row.duration,
        ageRating: row.ageRating,
        posterImageUrl: row.posterImageUrl,
        backdropImageUrl: row.backdropImageUrl,
        trailerUrl: row.trailerUrl,
        premiereDate: row.premiereDate,
        showtimes: []
      })
    }

    const showtime: Showtime = {
      showingId: row.showingId,
      startDatetime: row.startDatetime,
      endDatetime: row.endDatetime,
      roomId: row.roomId,
      roomName: row.roomName,
      language: row.language,
      originalLanguage: row.originalLanguage,
      isOriginalVersion: row.isOriginalVersion === 1,
      isSubtitled: row.isSubtitled === 1,
      subtitledLanguage: row.subtitledLanguage,
      is3D: row.is3D === 1,
      isDolbyAtmos: row.isDolbyAtmos == null ? null : row.isDolbyAtmos === 1,
      isImax: row.isImax == null ? null : row.isImax === 1,
      is4DX: row.is4DX == null ? null : row.is4DX === 1,
      isPremiere: row.isPremiere === 1,
      isPreview: row.isPreview === 1,
      ticketUrl: row.ticketUrl,
      state: row.state
    }

    movieMap.get(row.contentId)!.showtimes.push(showtime)
  }

  return {
    fetchedAt: latestFetchedAt || new Date().toISOString(),
    rooms: Array.from(roomMap.values()),
    movies: Array.from(movieMap.values())
  }
}
