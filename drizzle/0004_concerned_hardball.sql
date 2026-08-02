CREATE TABLE `scribd_saved_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`docId` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`slug` varchar(512),
	`thumbnailUrl` varchar(1024),
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scribd_saved_docs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scribd_saved_docs_docId_unique` UNIQUE(`docId`)
);
