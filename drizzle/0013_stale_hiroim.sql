CREATE TABLE `target_source_refresh_locks` (
	`lockKey` varchar(64) NOT NULL,
	`runId` varchar(64),
	`lockedUntil` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `target_source_refresh_locks_lockKey` PRIMARY KEY(`lockKey`)
);
--> statement-breakpoint
CREATE TABLE `target_source_refresh_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` varchar(64) NOT NULL,
	`triggerType` varchar(32) NOT NULL,
	`status` varchar(32) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`checked` int NOT NULL DEFAULT 0,
	`changed` int NOT NULL DEFAULT 0,
	`errors` int NOT NULL DEFAULT 0,
	`skipped` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`lastSuccessfulRefreshAt` timestamp,
	CONSTRAINT `target_source_refresh_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `target_source_refresh_runs_runId_unique` UNIQUE(`runId`)
);
