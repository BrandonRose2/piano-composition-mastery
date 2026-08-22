import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { practiceProgress } from "../drizzle/schema";
import { getDb, getProgressForComposition, listCompositions, resolveLibraryOwnerId } from "./db";

describe("linked library ownership", () => {
  it("resolves Brandon Rose's linked Google identity to the active email library", async () => {
    const emailOwner = await resolveLibraryOwnerId(1);
    const googleOwner = await resolveLibraryOwnerId(2940001);

    expect(emailOwner).toBe(1);
    expect(googleOwner).toBe(emailOwner);

    const emailLibrary = await listCompositions(emailOwner);
    const googleLibrary = await listCompositions(googleOwner);
    expect(emailLibrary.length).toBeGreaterThan(0);
    expect(googleLibrary.map((composition) => composition.id)).toEqual(
      emailLibrary.map((composition) => composition.id)
    );

    const db = await getDb();
    expect(db).not.toBeNull();
    const progressRows = await db!
      .select({ compositionId: practiceProgress.compositionId })
      .from(practiceProgress)
      .where(eq(practiceProgress.userId, emailOwner));
    expect(progressRows.length).toBeGreaterThan(0);

    const compositionId = progressRows[0].compositionId;
    const emailProgress = await getProgressForComposition(compositionId, emailOwner);
    const googleProgress = await getProgressForComposition(compositionId, googleOwner);
    expect(googleProgress).toEqual(emailProgress);
  });
});
