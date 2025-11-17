CREATE TABLE `pending_extractions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`story_id` text,
	`subject_id` text NOT NULL,
	`subject_name` text NOT NULL,
	`relation_type` text NOT NULL,
	`object_label` text NOT NULL,
	`object_type` text,
	`intensity` text,
	`confidence` real NOT NULL,
	`category` text,
	`metadata` text,
	`status` text,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`reviewed_at` integer,
	`review_notes` text,
	`extraction_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pending_extractions_user_id_idx` ON `pending_extractions` (`user_id`);--> statement-breakpoint
CREATE INDEX `pending_extractions_story_id_idx` ON `pending_extractions` (`story_id`);--> statement-breakpoint
CREATE INDEX `pending_extractions_subject_id_idx` ON `pending_extractions` (`subject_id`);--> statement-breakpoint
CREATE INDEX `pending_extractions_review_status_idx` ON `pending_extractions` (`review_status`);