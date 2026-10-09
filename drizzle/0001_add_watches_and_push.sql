ALTER TABLE `contents` ADD COLUMN `movie_id` integer;
--> statement-breakpoint
CREATE TABLE `watches` (
	`id` integer PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`created_at` text NOT NULL,
	`notified_at` text,
	`matched_movie` text
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL UNIQUE,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text NOT NULL
);
