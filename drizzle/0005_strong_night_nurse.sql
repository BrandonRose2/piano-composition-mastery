ALTER TABLE `scribd_saved_docs` DROP INDEX `scribd_saved_docs_docId_unique`;--> statement-breakpoint
ALTER TABLE `scribd_saved_docs` ADD `userId` int NOT NULL;