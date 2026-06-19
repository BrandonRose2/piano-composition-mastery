CREATE TABLE `compositions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`composer` varchar(256),
	`fileKey` varchar(512),
	`fileUrl` varchar(1024),
	`fileName` varchar(512),
	`mimeType` varchar(128),
	`status` enum('pending','analyzing','complete','error') NOT NULL DEFAULT 'pending',
	`analysis` json,
	`framework` json,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compositions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`compositionId` int NOT NULL,
	`dayNumber` int NOT NULL,
	`completed` int NOT NULL DEFAULT 0,
	`notes` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practice_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
