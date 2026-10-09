import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema.ts'
import {
  config,
  contents,
  pushSubscriptions,
  rooms,
  showings,
  watches
} from './schema.ts'
import { and, asc, desc, eq, gte, isNull, lt, min, sql } from 'drizzle-orm'
import type { Movie, Program, PushSubscription, Room, Showtime, Watch } from './types.ts'

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

export function persistProgram(
  cinemaId: number,
  roomList: Room[],
  movies: Movie[]
): void {
  const fetchedAt = new Date().toISOString()

  db.transaction(tx => {
    for (const r of roomList) {
      tx.insert(rooms)
        .values({ id: r.id, name: r.name, seatCount: r.seatCount, cinemaId })
        .onConflictDoUpdate({
          target: rooms.id,
          set: { name: r.name, seatCount: r.seatCount, cinemaId }
        })
        .run()
    }

    for (const m of movies) {
      tx.insert(contents)
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
          premiereDate: m.premiereDate,
          movieId: m.movieId
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
            premiereDate: m.premiereDate,
            movieId: m.movieId
          }
        })
        .run()

      for (const s of m.showtimes) {
        tx.insert(showings)
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
  db.insert(config)
    .values({ key, value })
    .onConflictDoUpdate({ target: config.key, set: { value } })
    .run()
}

export function getEarliestDay(cinemaId: number): string | null {
  const row = db
    .select({ day: min(sql<string>`substr(${showings.startDatetime}, 1, 10)`) })
    .from(showings)
    .where(eq(showings.cinemaId, cinemaId))
    .get()
  return row?.day ?? null
}

export function getHistoricDays(cinemaId: number): string[] {
  const dayExpr = sql<string>`substr(${showings.startDatetime}, 1, 10)`
  const rows = db
    .select({ day: dayExpr })
    .from(showings)
    .where(
      and(lt(showings.startDatetime, sql`date('now')`), eq(showings.cinemaId, cinemaId))
    )
    .groupBy(dayExpr)
    .orderBy(asc(dayExpr))
    .all()
  return rows.map(r => r.day)
}

function baseProgramQuery() {
  return db
    .select({
      showingId: showings.id,
      startDatetime: showings.startDatetime,
      endDatetime: showings.endDatetime,
      roomId: showings.cinemaRoomId,
      roomName: rooms.name,
      language: showings.language,
      originalLanguage: showings.originalLanguage,
      isOriginalVersion: showings.isOriginalVersion,
      isSubtitled: showings.isSubtitled,
      subtitledLanguage: showings.subtitledLanguage,
      is3D: showings.is3D,
      isDolbyAtmos: showings.isDolbyAtmos,
      isImax: showings.isImax,
      is4DX: showings.is4DX,
      isPremiere: showings.isPremiere,
      isPreview: showings.isPreview,
      ticketUrl: showings.ticketUrl,
      state: showings.state,
      fetchedAt: showings.fetchedAt,
      contentId: contents.id,
      contentName: contents.name,
      slug: contents.slug,
      description: contents.description,
      duration: contents.duration,
      ageRating: contents.ageRating,
      posterImageUrl: contents.posterImageUrl,
      backdropImageUrl: contents.backdropImageUrl,
      trailerUrl: contents.trailerUrl,
      premiereDate: contents.premiereDate,
      movieId: contents.movieId,
      roomTableId: rooms.id,
      seatCount: rooms.seatCount
    })
    .from(showings)
    .innerJoin(contents, eq(showings.contentId, contents.id))
    .innerJoin(rooms, eq(showings.cinemaRoomId, rooms.id))
}

type ProgramRow = ReturnType<ReturnType<typeof baseProgramQuery>['all']>[number]

function buildProgram(rows: ProgramRow[]): Program | null {
  if (rows.length === 0) {
    return null
  }

  const movieMap = new Map<number, Movie>()
  const roomMap = new Map<number, Room>()
  let latestFetchedAt = ''

  for (const row of rows) {
    if (row.fetchedAt > latestFetchedAt) {
      latestFetchedAt = row.fetchedAt
    }

    if (!roomMap.has(row.roomTableId)) {
      roomMap.set(row.roomTableId, {
        id: row.roomTableId,
        name: row.roomName,
        seatCount: row.seatCount
      })
    }

    if (!movieMap.has(row.contentId)) {
      movieMap.set(row.contentId, {
        contentId: row.contentId,
        movieId: row.movieId,
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
      isOriginalVersion: row.isOriginalVersion ?? false,
      isSubtitled: row.isSubtitled ?? false,
      subtitledLanguage: row.subtitledLanguage,
      is3D: row.is3D ?? false,
      isDolbyAtmos: row.isDolbyAtmos,
      isImax: row.isImax,
      is4DX: row.is4DX,
      isPremiere: row.isPremiere ?? false,
      isPreview: row.isPreview ?? false,
      ticketUrl: row.ticketUrl,
      state: row.state
    }

    movieMap.get(row.contentId)!.showtimes.push(showtime)
  }

  return {
    fetchedAt: latestFetchedAt,
    rooms: Array.from(roomMap.values()),
    movies: Array.from(movieMap.values())
  }
}

export function getProgramFromDb(cinemaId: number, date: string): Program {
  const rows = baseProgramQuery()
    .where(
      and(
        eq(sql<string>`substr(${showings.startDatetime}, 1, 10)`, date),
        eq(showings.cinemaId, cinemaId)
      )
    )
    .orderBy(asc(showings.startDatetime))
    .all()
  return (
    buildProgram(rows) ?? { fetchedAt: new Date().toISOString(), rooms: [], movies: [] }
  )
}

export function getLatestProgramFromDb(cinemaId: number): Program | null {
  const rows = baseProgramQuery()
    .where(
      and(
        eq(showings.cinemaId, cinemaId),
        gte(showings.startDatetime, sql`date('now', '-1 day')`)
      )
    )
    .orderBy(asc(showings.startDatetime))
    .all()
  return buildProgram(rows)
}

export function addWatch(tmdbId: number, title: string, posterPath: string | null): void {
  db.insert(watches)
    .values({ tmdbId, title, posterPath, createdAt: new Date().toISOString() })
    .run()
}

export function getWatches(): Watch[] {
  return db
    .select()
    .from(watches)
    .orderBy(desc(watches.createdAt))
    .all()
    .map(r => ({
      id: r.id,
      tmdbId: r.tmdbId,
      title: r.title,
      posterPath: r.posterPath,
      createdAt: r.createdAt,
      notifiedAt: r.notifiedAt,
      matchedMovie: r.matchedMovie
    }))
}

export function getUnnotifiedWatches(): Watch[] {
  return db
    .select()
    .from(watches)
    .where(isNull(watches.notifiedAt))
    .all()
    .map(r => ({
      id: r.id,
      tmdbId: r.tmdbId,
      title: r.title,
      posterPath: r.posterPath,
      createdAt: r.createdAt,
      notifiedAt: r.notifiedAt,
      matchedMovie: r.matchedMovie
    }))
}

export function deleteWatch(id: number): void {
  db.delete(watches).where(eq(watches.id, id)).run()
}

export function markWatchNotified(id: number, matchedMovie: string): void {
  db.update(watches)
    .set({ notifiedAt: new Date().toISOString(), matchedMovie })
    .where(eq(watches.id, id))
    .run()
}

export function addPushSubscription(
  endpoint: string,
  p256dh: string,
  auth: string
): void {
  db.insert(pushSubscriptions)
    .values({ endpoint, p256dh, auth, createdAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh, auth, createdAt: new Date().toISOString() }
    })
    .run()
}

export function getPushSubscriptions(): PushSubscription[] {
  return db
    .select()
    .from(pushSubscriptions)
    .all()
    .map(r => ({
      id: r.id,
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
      createdAt: r.createdAt
    }))
}

export function deletePushSubscription(endpoint: string): void {
  db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run()
}
