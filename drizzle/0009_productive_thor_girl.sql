CREATE TABLE `target_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetStandardId` int NOT NULL,
	`jurisdiction` varchar(96),
	`url` varchar(512) NOT NULL,
	`title` varchar(240),
	`publisher` varchar(160),
	`sourceType` varchar(64) NOT NULL DEFAULT 'official',
	`contentExcerpt` text,
	`status` varchar(32) NOT NULL DEFAULT 'pending_review',
	`reviewNotes` varchar(512),
	`fetchedAt` timestamp,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `target_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `target_standard_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetStandardId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`snapshot` text NOT NULL,
	`changeNote` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `target_standard_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `target_standards` ADD `rubricCriteria` text;
--> statement-breakpoint
UPDATE `target_standards` SET `rubricCriteria` = '[]' WHERE `rubricCriteria` IS NULL;
--> statement-breakpoint
ALTER TABLE `target_standards` MODIFY `rubricCriteria` text NOT NULL;
--> statement-breakpoint
ALTER TABLE `target_standards` ADD `reviewStatus` varchar(32) NOT NULL DEFAULT 'draft';
--> statement-breakpoint
ALTER TABLE `target_standards` ADD `lastReviewedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `target_sources` ADD CONSTRAINT `target_sources_targetStandardId_target_standards_id_fk` FOREIGN KEY (`targetStandardId`) REFERENCES `target_standards`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `target_standard_versions` ADD CONSTRAINT `target_standard_versions_targetStandardId_target_standards_id_fk` FOREIGN KEY (`targetStandardId`) REFERENCES `target_standards`(`id`) ON DELETE cascade ON UPDATE no action;
