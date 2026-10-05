import type {
  ApiCinemaRoom,
  ApiContent,
  ApiShowing,
  Movie,
  Program,
  Room,
  Showtime
} from './types.ts'

const TMDB_CDN = 'https://cineamo-tmdb.b-cdn.net/t/p/w780'
const TMDB_POSTER_CDN = 'https://cineamo-tmdb.b-cdn.net/t/p/w342'

interface ImagePaths {
  backdropPath?: string
  posterPath?: string
}

export function transform(
  apiRooms: ApiCinemaRoom[],
  apiShowings: ApiShowing[],
  imageMap: Map<number, ImagePaths> = new Map()
): Program {
  const rooms: Room[] = apiRooms.map(r => ({
    id: r.id,
    name: r.name,
    seatCount: r.seatCount
  }))

  const roomMap = new Map(rooms.map(r => [r.id, r]))

  const movieMap = new Map<number, Movie>()

  for (const s of apiShowings) {
    const content: ApiContent = s._embedded.content

    const room = roomMap.get(s.cinemaRoomId)
    const roomName = room?.name ?? `Room ${s.cinemaRoomId}`

    if (!movieMap.has(content.id)) {
      const imgs = imageMap.get(content.id)
      movieMap.set(content.id, {
        contentId: content.id,
        name: content.name,
        slug: content.slug,
        description: content.description,
        duration: content.duration,
        ageRating: content.ageRating,
        posterImageUrl: imgs?.posterPath
          ? `${TMDB_POSTER_CDN}${imgs.posterPath}`
          : content.posterImageUrl,
        backdropImageUrl: imgs?.backdropPath
          ? `${TMDB_CDN}${imgs.backdropPath}`
          : content.backdropImageUrl,
        trailerUrl: content.trailerUrl,
        premiereDate: content.premiereDate,
        showtimes: []
      })
    }

    const showtime: Showtime = {
      showingId: s.id,
      startDatetime: s.startDatetime,
      endDatetime: s.endDatetime,
      roomId: s.cinemaRoomId,
      roomName,
      language: s.language,
      originalLanguage: s.originalLanguage,
      isOriginalVersion: s.isOriginalLanguage ?? false,
      isSubtitled: s.isSubtitled ?? false,
      subtitledLanguage: s.subtitledLanguage,
      is3D: s.isThreeDimensional ?? false,
      isDolbyAtmos: s.isDolbyAtmos,
      isImax: s.isImax,
      is4DX: s.is4DX,
      isPremiere: s.isPremiere,
      isPreview: s.isPreview,
      ticketUrl: s.ticketUrls.default ?? s.onlineTicketUrl,
      state: s.state
    }

    movieMap.get(content.id)!.showtimes.push(showtime)
  }

  for (const movie of movieMap.values()) {
    movie.showtimes.sort((a, b) => a.startDatetime.localeCompare(b.startDatetime))
  }

  const movies = [...movieMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return {
    fetchedAt: new Date().toISOString(),
    rooms,
    movies
  }
}
