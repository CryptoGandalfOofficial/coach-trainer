CREATE TABLE `target_standards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`outcomeType` varchar(64) NOT NULL,
	`targetName` varchar(160) NOT NULL,
	`evaluator` varchar(160),
	`jurisdiction` varchar(96),
	`targetDate` timestamp,
	`language` varchar(32) NOT NULL DEFAULT 'en',
	`format` varchar(96),
	`sourceUrl` varchar(512),
	`notes` text,
	`version` varchar(32) NOT NULL DEFAULT 'v1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `target_standards_id` PRIMARY KEY(`id`),
	CONSTRAINT `target_standards_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `target_standards` ADD CONSTRAINT `target_standards_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;