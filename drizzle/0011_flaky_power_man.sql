CREATE TABLE `readiness_score_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetStandardId` int NOT NULL,
	`version` varchar(32) NOT NULL,
	`score` int NOT NULL,
	`overallPracticeScore` int NOT NULL,
	`attempts` int NOT NULL,
	`confidence` varchar(16) NOT NULL,
	`breakdown` text NOT NULL,
	`forecast` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `readiness_score_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `target_sources` ADD `contentHash` varchar(64);--> statement-breakpoint
ALTER TABLE `target_sources` ADD `changeStatus` varchar(32) DEFAULT 'stable' NOT NULL;--> statement-breakpoint
ALTER TABLE `target_sources` ADD `lastChangedAt` timestamp;--> statement-breakpoint
ALTER TABLE `target_standards` ADD `rubricModules` text;--> statement-breakpoint
ALTER TABLE `readiness_score_history` ADD CONSTRAINT `readiness_score_history_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readiness_score_history` ADD CONSTRAINT `readiness_score_history_targetStandardId_target_standards_id_fk` FOREIGN KEY (`targetStandardId`) REFERENCES `target_standards`(`id`) ON DELETE cascade ON UPDATE no action;