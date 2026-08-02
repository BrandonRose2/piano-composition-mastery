CREATE TABLE `imported_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(512) NOT NULL,
	`filePath` varchar(1024),
	`fileSize` int,
	`status` enum('imported','skipped','error') NOT NULL DEFAULT 'imported',
	`compositionId` int,
	`errorMessage` text,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `imported_files_id` PRIMARY KEY(`id`)
);
