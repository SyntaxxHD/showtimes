CREATE TABLE `config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contents` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`duration` integer,
	`age_rating` text,
	`poster_image_url` text,
	`backdrop_image_url` text,
	`trailer_url` text,
	`premiere_date` text
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`seat_count` integer,
	`cinema_id` integer
);
--> statement-breakpoint
CREATE TABLE `showings` (
	`id` integer PRIMARY KEY NOT NULL,
	`content_id` integer NOT NULL,
	`cinema_room_id` integer NOT NULL,
	`name` text NOT NULL,
	`start_datetime` text NOT NULL,
	`end_datetime` text,
	`language` text,
	`original_language` text,
	`is_original_version` integer,
	`is_subtitled` integer,
	`subtitled_language` text,
	`is_3d` integer,
	`is_dolby_atmos` integer,
	`is_imax` integer,
	`is_4dx` integer,
	`is_premiere` integer,
	`is_preview` integer,
	`ticket_url` text,
	`state` text NOT NULL,
	`fetched_at` text NOT NULL,
	`cinema_id` integer
);
