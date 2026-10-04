import type { ApiCinema, ApiCinemaRoom, ApiPage, ApiShowing, CinemaInfo, Program } from './types.ts'
import { transform } from './transform.ts'
import { persistProgram } from './db.ts'

const BASE = 'https://api.cineamo.com'
export const CINEMA_ID = parseInt(process.env.CINEMA_ID ?? '1045', 10)
const CACHE_TTL_MS = 60 * 60 * 1000

interface Cache {
  data: Program
  expiresAt: number
}

declare global {
  var _programCache: Cache | undefined
}

async function fetchAllPages<TKey extends string, TItem>(
  path: string,
  key: TKey
): Promise<TItem[]> {
  const url = `${BASE}${path}&perPage=100&page=1`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Cineamo API error ${res.status}: ${path}`)
  }

  const page = (await res.json()) as ApiPage<TKey, TItem>
  const items = page._embedded[key] as TItem[]

  if (page._page_count <= 1) {
    return items
  }

  const remaining = await Promise.all(
    Array.from({ length: page._page_count - 1 }, (_, i) =>
      fetch(`${BASE}${path}&perPage=100&page=${i + 2}`)
        .then(r => r.json() as Promise<ApiPage<TKey, TItem>>)
        .then(p => p._embedded[key] as TItem[])
    )
  )

  return items.concat(remaining.flat())
}

async function fetchShowings(): Promise<ApiShowing[]> {
  return fetchAllPages<'showings', ApiShowing>(
    `/showings?cinemaId=${CINEMA_ID}`,
    'showings'
  )
}

async function fetchRooms(): Promise<ApiCinemaRoom[]> {
  return fetchAllPages<'cinema-rooms', ApiCinemaRoom>(
    `/cinema-rooms?cinemaId=${CINEMA_ID}`,
    'cinema-rooms'
  )
}


interface ImagePaths {
  backdropPath?: string
  posterPath?: string
}

async function fetchImagePathsForContent(id: number): Promise<[number, ImagePaths] | null> {
  try {
    const res = await fetch(`${BASE}/contents/${id}`)
    if (!res.ok) {
      return null
    }

    const data = (await res.json()) as {
      _embedded?: { cineamoMovie?: { backdropPath?: string; posterPath?: string } }
    }
    const movie = data._embedded?.cineamoMovie
    if (!movie) {
      return null
    }

    return [id, { backdropPath: movie.backdropPath, posterPath: movie.posterPath }]
  } catch {
    return null
  }
}

async function fetchImagePaths(contentIds: number[]): Promise<Map<number, ImagePaths>> {
  const results = await Promise.all(contentIds.map(fetchImagePathsForContent))

  const entries = results.filter((r): r is [number, ImagePaths] => r !== null)
  return new Map(entries)
}

export async function fetchAllCinemas(): Promise<ApiCinema[]> {
  return fetchAllPages<'cinemas', ApiCinema>('/cinemas?', 'cinemas')
}

export async function fetchCinemaInfo(cinemaId: number): Promise<CinemaInfo> {
  const res = await fetch(`${BASE}/cinemas/${cinemaId}`)

  if (!res.ok) {
    throw new Error(`Cineamo API error ${res.status}: /cinemas/${cinemaId}`)
  }

  const data = (await res.json()) as {
    name: string
    shortName: string
    logoWideImageUrl: string
    _embedded?: { cinemaConfiguration?: { domain?: string } }
  }

  const domain = data._embedded?.cinemaConfiguration?.domain
  const websiteUrl = domain ? `https://${domain}` : null

  return {
    name: data.name,
    shortName: data.shortName,
    logoWideImageUrl: data.logoWideImageUrl,
    websiteUrl
  }
}

export async function getProgram(): Promise<Program> {
  const cached = globalThis._programCache

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  const [rooms, showings] = await Promise.all([fetchRooms(), fetchShowings()])
  const contentIds = [...new Set(showings.map(s => s.contentId))]
  const imageMap = await fetchImagePaths(contentIds)
  const program = transform(rooms, showings, imageMap)

  persistProgram(CINEMA_ID, program.rooms, program.movies)

  globalThis._programCache = { data: program, expiresAt: Date.now() + CACHE_TTL_MS }

  return program
}
