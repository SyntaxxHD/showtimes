# showtimes

A self-hosted program viewer for cinemas running on the [Cineamo](https://cineamo.com) platform. I built this because the official Cineamo app doesn't let you see the full week at a glance, and the schedule view on the cinema's own website is not great either.

Works for any Cineamo cinema, just set your `CINEMA_ID`.

## Features

- Movie grid, by-room, and schedule (timeline) views
- Filters by day, room, language, format, and time of day
- Showtime statistics page
- Caches API responses for one hour, persists data to SQLite

## Stack

Bun · Hono · Server-side JSX · SQLite (via Drizzle)

## Setup

### Docker (recommended)

Create a `docker-compose.yml`:

```yaml
services:
  showtimes:
    image: ghcr.io/syntaxxhd/showtimes:latest
    ports:
      - "3000:3000"
    volumes:
      - showtimes-data:/app/data
    environment:
      CINEMA_ID: 1045
      DB_PATH: /app/data/showtimes.db

volumes:
  showtimes-data:
```

Then run:

```sh
docker compose up -d
```

### Local

Requires [Bun](https://bun.sh).

```sh
git clone https://github.com/SyntaxxHD/showtimes.git
cd showtimes
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

By default this runs for **Luxor-Filmpalast Walldorf** (cinema ID 1045). To use a different cinema, set the `CINEMA_ID` environment variable:

```sh
CINEMA_ID=1234 bun run dev
```

Or copy `.env.example` to `.env` and fill it in. The cinema name, logo, and website link are fetched automatically from the Cineamo API.

> **Note:** The UI is in German, since Cineamo is a German platform and all cinema data (movie titles, showtimes, room names) comes in German anyway.

## Finding your cinema ID

Open the settings page at `/settings` once the app is running. It lets you search for your cinema by name and apply it with one click. Alternatively, open the Cineamo app or your cinema's website and look at the network requests - the numeric ID appears as `cinemaId=XXXX` in API calls.

## Room colors

The schedule and room views have color coding for rooms named Black, Blue, Red, Green, Purple, and Brown, which happen to be the room names at my cinema. Other cinemas will get rooms without color tinting, which still works fine.
