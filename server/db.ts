import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, compositions, practiceProgress, importedFiles, scribdSavedDocs, type InsertComposition, type InsertImportedFile, type InsertScribdSavedDoc, type ScribdSavedDoc } from "../drizzle/schema";
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

/**
 * Resolve the canonical library owner for an authenticated identity. This keeps
 * intentionally linked OAuth/email accounts on one private composition library.
 */
export async function resolveLibraryOwnerId(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ id: users.id, libraryOwnerId: users.libraryOwnerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.libraryOwnerId ?? rows[0]?.id ?? userId;
}

// ── Composition helpers (userId-scoped) ───────────────────────────────────────

export async function createComposition(data: InsertComposition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(compositions).values(data);
  // @ts-ignore
  const insertId = result[0]?.insertId as number;
  const rows = await db.select().from(compositions).where(eq(compositions.id, insertId)).limit(1);
  return rows[0];
}

export async function getCompositionById(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const where = userId !== undefined
    ? and(eq(compositions.id, id), eq(compositions.userId, userId))
    : eq(compositions.id, id);
  const rows = await db.select().from(compositions).where(where).limit(1);
  return rows[0] ?? null;
}

export async function listCompositions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(compositions)
    .where(eq(compositions.userId, userId))
    .orderBy(desc(compositions.createdAt));
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

export async function deleteComposition(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Only delete if the composition belongs to this user
  const comp = await getCompositionById(id, userId);
  if (!comp) throw new Error("Composition not found or access denied");
  await db.delete(practiceProgress).where(eq(practiceProgress.compositionId, id));
  await db.delete(compositions).where(eq(compositions.id, id));
}

// ── Imported Files helpers ────────────────────────────────────────────────────

export async function getImportedFilenames(): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({ filename: importedFiles.filename }).from(importedFiles);
  return rows.map(r => r.filename);
}

export async function recordImportedFile(data: InsertImportedFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(importedFiles).values(data);
  // @ts-ignore
  const insertId = result[0]?.insertId as number;
  const rows = await db.select().from(importedFiles).where(eq(importedFiles.id, insertId)).limit(1);
  return rows[0];
}

export async function listImportedFiles(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(importedFiles)
    .orderBy(desc(importedFiles.importedAt))
    .limit(limit);
}

// ── Progress helpers (userId-scoped) ──────────────────────────────────────────

export async function getProgressForComposition(compositionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(practiceProgress)
    .where(and(eq(practiceProgress.compositionId, compositionId), eq(practiceProgress.userId, userId)));
}

export async function toggleDayProgress(
  compositionId: number,
  dayNumber: number,
  completed: boolean,
  userId: number,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(practiceProgress)
    .where(
      and(
        eq(practiceProgress.compositionId, compositionId),
        eq(practiceProgress.dayNumber, dayNumber),
        eq(practiceProgress.userId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(practiceProgress)
      .set({
        completed: completed ? 1 : 0,
        completedAt: completed ? new Date() : null,
        notes: notes ?? existing[0].notes,
      })
      .where(
        and(
          eq(practiceProgress.compositionId, compositionId),
          eq(practiceProgress.dayNumber, dayNumber),
          eq(practiceProgress.userId, userId)
        )
      );
  } else {
    await db.insert(practiceProgress).values({
      compositionId,
      dayNumber,
      userId,
      completed: completed ? 1 : 0,
      completedAt: completed ? new Date() : null,
      notes: notes ?? null,
    });
  }
}

/** Upsert a batch of Scribd saved docs (from browser sync) */
export async function upsertScribdSavedDocs(docs: InsertScribdSavedDoc[]): Promise<void> {
  const db = await getDb();
  if (!db || docs.length === 0) return;
  // Upsert each doc — update title/url/slug/thumbnailUrl and refresh syncedAt on conflict
  for (const doc of docs) {
    await db
      .insert(scribdSavedDocs)
      .values({ ...doc, syncedAt: new Date() })
      .onDuplicateKeyUpdate({
        set: {
          title: doc.title,
          url: doc.url,
          slug: doc.slug ?? null,
          thumbnailUrl: doc.thumbnailUrl ?? null,
          syncedAt: new Date(),
        },
      });
  }
}

/** Return all cached Scribd saved docs for a user, newest sync first */
export async function listScribdSavedDocs(userId: number): Promise<ScribdSavedDoc[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scribdSavedDocs)
    .where(eq(scribdSavedDocs.userId, userId))
    .orderBy(desc(scribdSavedDocs.syncedAt));
}

/** Fuzzy-search cached Scribd saved docs by title keywords, scoped to a user */
export async function searchScribdSavedDocs(query: string, userId: number): Promise<ScribdSavedDoc[]> {
  const db = await getDb();
  if (!db) return [];
  const all = await db.select().from(scribdSavedDocs)
    .where(eq(scribdSavedDocs.userId, userId))
    .orderBy(desc(scribdSavedDocs.syncedAt));
  const keywords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // strip punctuation
    .split(/\s+/)
    .filter(k => k.length >= 2);    // allow 2-char keywords like "25"
  if (keywords.length === 0) return all.slice(0, 10);
  return all.filter(doc => {
    const haystack = (doc.title + " " + (doc.slug ?? "")).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    return keywords.some(kw => haystack.includes(kw));
  });
}
