import { describe, expect, it } from "vitest";
import { findDuplicateComposition } from "./db";

describe("composition duplicate protection", () => {
  it("recognizes the canonical Wyden Down score by its normalized source filename", async () => {
    const duplicate = await findDuplicateComposition(1, {
      fileName: "987535053-Wyden-Down.pdf",
    });

    expect(duplicate?.id).toBe(30001);
  });

  it("does not treat a distinct filename as a duplicate", async () => {
    const duplicate = await findDuplicateComposition(1, {
      fileName: "uniquely-named-practice-score.pdf",
    });

    expect(duplicate).toBeNull();
  });
});
