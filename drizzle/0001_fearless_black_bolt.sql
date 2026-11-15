CREATE TABLE `coach_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredLanguage` varchar(32) NOT NULL DEFAULT 'en',
	`country` varchar(64),
	`targetRole` varchar(128),
	`experienceLevel` varchar(32),
	`weeklyMinutes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coach_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `coach_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `coaching_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`interviewType` varchar(64) NOT NULL,
	`timeline` varchar(32) NOT NULL,
	`focus` varchar(160) NOT NULL,
	`difficulty` varchar(32) NOT NULL,
	`mode` varchar(64) NOT NULL,
	`plannedSessions` int NOT NULL,
	`completedSessions` int NOT NULL DEFAULT 0,
	`overallScore` int NOT NULL DEFAULT 0,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coaching_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interaction_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` int,
	`eventType` varchar(64) NOT NULL,
	`path` varchar(64) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interaction_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`overallScore` int NOT NULL,
	`technicalScore` int,
	`communicationScore` int,
	`confidenceScore` int,
	`timeManagementScore` int,
	`coachType` varchar(32) NOT NULL,
	`timeTaken` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practice_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coach_profiles` ADD CONSTRAINT `coach_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD CONSTRAINT `coaching_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interaction_events` ADD CONSTRAINT `interaction_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interaction_events` ADD CONSTRAINT `interaction_events_sessionId_coaching_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `coaching_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_attempts` ADD CONSTRAINT `practice_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_attempts` ADD CONSTRAINT `practice_attempts_sessionId_coaching_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `coaching_sessions`(`id`) ON DELETE cascade ON UPDATE no action;