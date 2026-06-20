import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, compositions, practiceProgress, type InsertComposition } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── Composition helpers ────────────────────────────────────────────────────

export async function createComposition(data: InsertComposition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(compositions).values(data);
  // @ts-ignore
  const insertId = result[0]?.insertId as number;
  const rows = await db.select().from(compositions).where(eq(compositions.id, insertId)).limit(1);
  return rows[0];
}

export async function getCompositionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(compositions).where(eq(compositions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listCompositions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(compositions).orderBy(desc(compositions.createdAt));
}

export async function updateCompositionStatus(
  id: number,
  status: "pending" | "analyzing" | "complete" | "error",
  extra?: { analysis?: unknown; framework?: unknown; errorMessage?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { status };
  if (extra?.analysis !== undefined) set.analysis = extra.analysis;
  if (extra?.framework !== undefined) set.framework = extra.framework;
  if (extra?.errorMessage !== undefined) set.errorMessage = extra.errorMessage;
  await db.update(compositions).set(set).where(eq(compositions.id, id));
}

export async function deleteComposition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete associated progress records first (cascade)
  await db.delete(practiceProgress).where(eq(practiceProgress.compositionId, id));
  await db.delete(compositions).where(eq(compositions.id, id));
}

// ── Progress helpers ───────────────────────────────────────────────────────

export async function getProgressForComposition(compositionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(practiceProgress).where(eq(practiceProgress.compositionId, compositionId));
}

export async function toggleDayProgress(compositionId: number, dayNumber: number, completed: boolean, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(practiceProgress)
    .where(and(eq(practiceProgress.compositionId, compositionId), eq(practiceProgress.dayNumber, dayNumber)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(practiceProgress)
      .set({
        completed: completed ? 1 : 0,
        completedAt: completed ? new Date() : null,
        notes: notes ?? existing[0].notes,
      })
      .where(and(eq(practiceProgress.compositionId, compositionId), eq(practiceProgress.dayNumber, dayNumber)));
  } else {
    await db.insert(practiceProgress).values({
      compositionId,
      dayNumber,
      completed: completed ? 1 : 0,
      completedAt: completed ? new Date() : null,
      notes: notes ?? null,
    });
  }
}
