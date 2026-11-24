CREATE TABLE `readiness_forecast_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetStandardId` int NOT NULL,
	`historyId` int NOT NULL,
	`actualOutcome` varchar(32) NOT NULL,
	`actualScore` int,
	`notes` varchar(512),
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `readiness_forecast_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `target_source_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`reviewerUserId` int NOT NULL,
	`previousStatus` varchar(32),
	`status` varchar(32) NOT NULL,
	`reviewNotes` varchar(512),
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `target_source_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `readiness_forecast_outcomes` ADD CONSTRAINT `readiness_forecast_outcomes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readiness_forecast_outcomes` ADD CONSTRAINT `rfo_standard_fk` FOREIGN KEY (`targetStandardId`) REFERENCES `target_standards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readiness_forecast_outcomes` ADD CONSTRAINT `rfo_history_fk` FOREIGN KEY (`historyId`) REFERENCES `readiness_score_history`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `target_source_reviews` ADD CONSTRAINT `tsr_source_fk` FOREIGN KEY (`sourceId`) REFERENCES `target_sources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `target_source_reviews` ADD CONSTRAINT `tsr_reviewer_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
