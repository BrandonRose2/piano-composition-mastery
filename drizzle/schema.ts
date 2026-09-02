import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user.
   * For username/password users this is set to 'local:<username>' to keep the unique constraint. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  /** Username for local (non-OAuth) accounts. Unique when set. */
  username: varchar("username", { length: 64 }).unique(),
  /** bcrypt hash of the password for local accounts. Null for OAuth users. */
  passwordHash: varchar("passwordHash", { length: 256 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** Canonical library owner for linked login identities; null means this user owns their own library. */
  libraryOwnerId: int("libraryOwnerId"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Stores each uploaded composition and its AI-generated analysis + framework.
 */
export const compositions = mysqlTable("compositions", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner of this composition — null means public/legacy */
  userId: int("userId"),
  title: varchar("title", { length: 512 }).notNull(),
  composer: varchar("composer", { length: 256 }),
  fileKey: varchar("fileKey", { length: 512 }),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  fileName: varchar("fileName", { length: 512 }),
  /** Original public PDF URL when the portal acquired the score from a verified source. */
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  /** Human-readable source name retained with an automatically acquired score. */
  sourceLabel: varchar("sourceLabel", { length: 128 }),
  /** SHA-256 fingerprint of the uploaded bytes, scoped to the shared library. */
  contentHash: varchar("contentHash", { length: 64 }),
  mimeType: varchar("mimeType", { length: 128 }),
  status: mysqlEnum("status", ["pending", "analyzing", "complete", "error"]).default("pending").notNull(),
  /** Full AI-generated analysis JSON */
  analysis: json("analysis"),
  /** Full AI-generated 30-day framework JSON */
  framework: json("framework"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("compositions_user_content_hash_unique").on(table.userId, table.contentHash),
]);

export type Composition = typeof compositions.$inferSelect;
export type InsertComposition = typeof compositions.$inferInsert;

/**
 * Per-day practice progress for a composition.
 */
export const practiceProgress = mysqlTable("practice_progress", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner of this progress record */
  userId: int("userId"),
  compositionId: int("compositionId").notNull(),
  dayNumber: int("dayNumber").notNull(),
  completed: int("completed").default(0).notNull(),
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PracticeProgress = typeof practiceProgress.$inferSelect;

/**
 * Tracks files that have been auto-imported from the Downloads folder
 * so the weekly agent cron never imports the same file twice.
 */
export const importedFiles = mysqlTable("imported_files", {
  id: int("id").autoincrement().primaryKey(),
  /** Original filename from the Downloads folder */
  filename: varchar("filename", { length: 512 }).notNull(),
  /** Full path on the desktop mount at time of import */
  filePath: varchar("filePath", { length: 1024 }),
  /** File size in bytes */
  fileSize: int("fileSize"),
  /** Status of the import */
  status: mysqlEnum("status", ["imported", "skipped", "error"]).default("imported").notNull(),
  /** Linked composition if successfully imported */
  compositionId: int("compositionId"),
  /** Error message if import failed */
  errorMessage: text("errorMessage"),
  /** When the file was imported */
  importedAt: timestamp("importedAt").defaultNow().notNull(),
});

export type ImportedFile = typeof importedFiles.$inferSelect;
export type InsertImportedFile = typeof importedFiles.$inferInsert;

/**
 * Cached list of documents saved in the user's Scribd account.
 * Populated by the "Sync Scribd Library" button on the Auto-Import page.
 * Used by the sheet music finder to check the user's own library first.
 */
export const scribdSavedDocs = mysqlTable("scribd_saved_docs", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner of this cached entry */
  userId: int("userId").notNull(),
  /** Scribd document ID (numeric string) — unique per user */
  docId: varchar("docId", { length: 64 }).notNull(),
  /** Document title as shown on Scribd */
  title: varchar("title", { length: 512 }).notNull(),
  /** Full Scribd URL e.g. https://www.scribd.com/document/123/slug */
  url: varchar("url", { length: 1024 }).notNull(),
  /** URL slug for display */
  slug: varchar("slug", { length: 512 }),
  /** Thumbnail image URL if available */
  thumbnailUrl: varchar("thumbnailUrl", { length: 1024 }),
  /** When this record was last synced */
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export type ScribdSavedDoc = typeof scribdSavedDocs.$inferSelect;
export type InsertScribdSavedDoc = typeof scribdSavedDocs.$inferInsert;
