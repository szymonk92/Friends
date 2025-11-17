CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person1_id` text NOT NULL,
	`person2_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`qualifier` text,
	`strength` real DEFAULT 0.5,
	`start_date` integer,
	`end_date` integer,
	`end_reason` text,
	`hide_from_suggestions` integer DEFAULT false,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person1_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person2_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `connections_user_id_idx` ON `connections` (`user_id`);--> statement-breakpoint
CREATE INDEX `connections_person1_idx` ON `connections` (`person1_id`);--> statement-breakpoint
CREATE INDEX `connections_person2_idx` ON `connections` (`person2_id`);--> statement-breakpoint
CREATE INDEX `connections_status_idx` ON `connections` (`status`);--> statement-breakpoint
CREATE TABLE `contact_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person_id` text NOT NULL,
	`event_type` text NOT NULL,
	`notes` text,
	`location` text,
	`duration` integer,
	`event_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_events_user_id_idx` ON `contact_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `contact_events_person_id_idx` ON `contact_events` (`person_id`);--> statement-breakpoint
CREATE INDEX `contact_events_date_idx` ON `contact_events` (`event_date`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`event_type` text,
	`event_date` integer,
	`location` text,
	`guest_ids` text,
	`compatibility_score` real,
	`menu_suggestions` text,
	`seating_arrangement` text,
	`warnings` text,
	`status` text DEFAULT 'planned',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_user_id_idx` ON `events` (`user_id`);--> statement-breakpoint
CREATE INDEX `events_date_idx` ON `events` (`event_date`);--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`file_path` text NOT NULL,
	`file_type` text NOT NULL,
	`person_id` text,
	`story_id` text,
	`thumbnail_path` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	`cloud_url` text,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `files_user_id_idx` ON `files` (`user_id`);--> statement-breakpoint
CREATE INDEX `files_person_id_idx` ON `files` (`person_id`);--> statement-breakpoint
CREATE INDEX `files_story_id_idx` ON `files` (`story_id`);--> statement-breakpoint
CREATE TABLE `magic_link_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`token` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `magic_link_tokens_token_unique` ON `magic_link_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`photo_id` text,
	`relationship_type` text,
	`met_date` integer,
	`person_type` text DEFAULT 'placeholder',
	`data_completeness` text DEFAULT 'minimal',
	`added_by` text DEFAULT 'auto_created',
	`importance_to_user` text DEFAULT 'unknown',
	`potential_duplicates` text,
	`canonical_id` text,
	`merged_from` text,
	`extraction_context` text,
	`mention_count` integer DEFAULT 0,
	`status` text DEFAULT 'active' NOT NULL,
	`archive_reason` text,
	`archived_at` integer,
	`date_of_death` integer,
	`date_of_birth` integer,
	`hide_from_active_views` integer DEFAULT false,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canonical_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `people_user_id_idx` ON `people` (`user_id`);--> statement-breakpoint
CREATE INDEX `people_status_idx` ON `people` (`status`);--> statement-breakpoint
CREATE INDEX `people_name_idx` ON `people` (`name`);--> statement-breakpoint
CREATE INDEX `people_person_type_idx` ON `people` (`person_type`);--> statement-breakpoint
CREATE INDEX `people_importance_idx` ON `people` (`importance_to_user`);--> statement-breakpoint
CREATE INDEX `people_canonical_id_idx` ON `people` (`canonical_id`);--> statement-breakpoint
CREATE TABLE `relations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`subject_type` text DEFAULT 'person' NOT NULL,
	`relation_type` text NOT NULL,
	`object_id` text,
	`object_type` text,
	`object_label` text NOT NULL,
	`metadata` text,
	`intensity` text,
	`confidence` real DEFAULT 1,
	`category` text,
	`source` text DEFAULT 'manual',
	`valid_from` integer,
	`valid_to` integer,
	`status` text DEFAULT 'current',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `relations_user_id_idx` ON `relations` (`user_id`);--> statement-breakpoint
CREATE INDEX `relations_subject_idx` ON `relations` (`subject_id`);--> statement-breakpoint
CREATE INDEX `relations_type_idx` ON `relations` (`relation_type`);--> statement-breakpoint
CREATE INDEX `relations_category_idx` ON `relations` (`category`);--> statement-breakpoint
CREATE TABLE `relationship_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`connection_id` text,
	`change_type` text NOT NULL,
	`previous_value` text,
	`new_value` text,
	`reason` text,
	`notes` text,
	`changed_at` integer NOT NULL,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `relationship_history_user_id_idx` ON `relationship_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `relationship_history_connection_idx` ON `relationship_history` (`connection_id`);--> statement-breakpoint
CREATE TABLE `secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person_id` text,
	`title` text NOT NULL,
	`encrypted_content` text NOT NULL,
	`encryption_salt` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `secrets_user_id_idx` ON `secrets` (`user_id`);--> statement-breakpoint
CREATE INDEX `secrets_person_id_idx` ON `secrets` (`person_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`device_name` text,
	`created_at` integer NOT NULL,
	`last_active_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`ai_processed` integer DEFAULT false,
	`ai_processed_at` integer,
	`extracted_data` text,
	`people_ids` text,
	`attachment_ids` text,
	`story_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_version` integer DEFAULT 1,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stories_user_id_idx` ON `stories` (`user_id`);--> statement-breakpoint
CREATE INDEX `stories_date_idx` ON `stories` (`story_date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`email_verified` integer,
	`display_name` text,
	`avatar_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`subscription_tier` text DEFAULT 'free' NOT NULL,
	`subscription_valid_until` integer,
	`settings` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`last_sync_at` integer,
	`sync_token` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);