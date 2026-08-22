ALTER TABLE `compositions` ADD `contentHash` varchar(64);--> statement-breakpoint
ALTER TABLE `compositions` ADD CONSTRAINT `compositions_user_content_hash_unique` UNIQUE(`userId`,`contentHash`);