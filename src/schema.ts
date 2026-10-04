import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const rooms = sqliteTable('rooms', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  seatCount: integer('seat_count'),
  cinemaId: integer('cinema_id')
})

export const contents = sqliteTable('contents', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  duration: integer('duration'),
  ageRating: text('age_rating'),
  posterImageUrl: text('poster_image_url'),
  backdropImageUrl: text('backdrop_image_url'),
  trailerUrl: text('trailer_url'),
  premiereDate: text('premiere_date')
})

export const showings = sqliteTable('showings', {
  id: integer('id').primaryKey(),
  contentId: integer('content_id').notNull(),
  cinemaRoomId: integer('cinema_room_id').notNull(),
  name: text('name').notNull(),
  startDatetime: text('start_datetime').notNull(),
  endDatetime: text('end_datetime'),
  language: text('language'),
  originalLanguage: text('original_language'),
  isOriginalVersion: integer('is_original_version', { mode: 'boolean' }),
  isSubtitled: integer('is_subtitled', { mode: 'boolean' }),
  subtitledLanguage: text('subtitled_language'),
  is3D: integer('is_3d', { mode: 'boolean' }),
  isDolbyAtmos: integer('is_dolby_atmos', { mode: 'boolean' }),
  isImax: integer('is_imax', { mode: 'boolean' }),
  is4DX: integer('is_4dx', { mode: 'boolean' }),
  isPremiere: integer('is_premiere', { mode: 'boolean' }),
  isPreview: integer('is_preview', { mode: 'boolean' }),
  ticketUrl: text('ticket_url'),
  state: text('state').notNull(),
  fetchedAt: text('fetched_at').notNull(),
  cinemaId: integer('cinema_id')
})

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})
