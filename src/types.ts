// Raw Cineamo API types

export interface ApiCinema {
  id: number
  name: string
  shortName: string
  city: string
  logoWideImageUrl: string | null
}

export interface ApiPage<TKey extends string, TItem> {
  _total_items: number
  _page: number
  _page_count: number
  _links: {
    self: { href: string }
    next?: { href: string }
    last?: { href: string }
  }
  _embedded: Record<TKey, TItem[]>
}

export interface ApiContent {
  id: number
  name: string
  slug: string
  category: string
  description: string | null
  descriptionEn: string | null
  duration: number | null
  posterImageRef: string | null
  posterImageUrl: string | null
  backdropImageRef: string | null
  backdropImageUrl: string | null
  ageRating: string | null
  trailerUrl: string | null
  isRegularEvent: boolean
  premiereDate: string | null
  movieId: number | null
  _links: { self: { href: string } }
}

export interface ApiShowing {
  id: number
  contentId: number
  cinemaRoomId: number
  name: string
  startDatetime: string
  endDatetime: string
  state: string
  isThreeDimensional: boolean | null
  isRegularShowtime: boolean
  isDolbyAtmos: boolean | null
  language: string | null
  originalLanguage: string | null
  isOriginalLanguage: boolean | null
  isSubtitled: boolean | null
  subtitledLanguage: string | null
  movieId: number
  onlineTicketUrl: string | null
  ticketUrls: {
    default: string | null
    web: string | null
    ios: string | null
    android: string | null
    cinemaWebsite: string | null
  }
  showingTagIds: number[] | null
  isPremiere: boolean
  isPreview: boolean
  isImax: boolean | null
  isDolbyVision: boolean | null
  is4DX: boolean | null
  isScreenX: boolean | null
  isLive: boolean | null
  _links: { self: { href: string } }
  _embedded: {
    content: ApiContent
  }
}

export interface ApiCinemaRoom {
  id: number
  name: string
  seatCount: number
  note: string | null
  profileImageUrl: string | null
  isTheater: boolean
  _links: { self: { href: string } }
}

// Clean domain types

export interface Showtime {
  showingId: number
  startDatetime: string
  endDatetime: string | null
  roomId: number
  roomName: string
  language: string | null
  originalLanguage: string | null
  isOriginalVersion: boolean
  isSubtitled: boolean
  subtitledLanguage: string | null
  is3D: boolean
  isDolbyAtmos: boolean | null
  isImax: boolean | null
  is4DX: boolean | null
  isPremiere: boolean
  isPreview: boolean
  ticketUrl: string | null
  state: string
}

export interface Movie {
  contentId: number
  name: string
  slug: string
  description: string | null
  duration: number | null
  ageRating: string | null
  posterImageUrl: string | null
  backdropImageUrl: string | null
  trailerUrl: string | null
  premiereDate: string | null
  showtimes: Showtime[]
}

export interface Room {
  id: number
  name: string
  seatCount: number | null
}

export interface Program {
  fetchedAt: string
  rooms: Room[]
  movies: Movie[]
}

export interface Filters {
  view: 'movie' | 'room' | 'schedule'
  date: string | null // YYYY-MM-DD in Europe/Berlin
  week: string | null // YYYY-Www e.g. 2025-W40
  offset: number // day-strip window index, each step shifts 36 days
  roomId: number | null
  lang: 'deu' | 'ov' | 'omu' | null
  format: '3d' | 'dolby' | 'imax' | '4dx' | null
  time: 'morning' | 'afternoon' | 'evening' | null
  premiereOnly: boolean
}

export interface CinemaInfo {
  name: string
  shortName: string
  logoWideImageUrl: string | null
  websiteUrl: string | null
}
