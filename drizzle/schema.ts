import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

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
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
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
  mimeType: varchar("mimeType", { length: 128 }),
  status: mysqlEnum("status", ["pending", "analyzing", "complete", "error"]).default("pending").notNull(),
  /** Full AI-generated analysis JSON */
  analysis: json("analysis"),
  /** Full AI-generated 30-day framework JSON */
  framework: json("framework"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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