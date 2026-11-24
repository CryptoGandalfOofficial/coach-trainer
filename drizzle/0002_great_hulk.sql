CREATE TABLE `weekly_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStart` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`averageScore` int NOT NULL DEFAULT 0,
	`minutesPracticed` int NOT NULL DEFAULT 0,
	`summaryText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_summaries_user_week_unique` UNIQUE(`userId`,`weekStart`)
);
--> statement-breakpoint
ALTER TABLE `weekly_summaries` ADD CONSTRAINT `weekly_summaries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;