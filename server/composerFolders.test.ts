import { describe, expect, it } from "vitest";
import {
  UNCATEGORIZED_COMPOSER_FOLDER,
  groupCompositionsByComposer,
  normalizeComposerFolderName,
  resolveComposerFolder,
} from "@shared/composerFolders";

describe("composer folder assignment", () => {
  it("uses a manually assigned composer folder before the AI analysis composer", () => {
    expect(resolveComposerFolder({
      composer: "Frédéric Chopin",
      analysis: { composer: "Gibran Alcocer" },
    })).toBe("Frédéric Chopin");
  });

  it("falls back to the composer from AI analysis when no manual assignment exists", () => {
    expect(resolveComposerFolder({
      composer: null,
      analysis: { composer: "Gibran Alcocer" },
    })).toBe("Gibran Alcocer");
  });

  it("uses Uncategorized for a score without either assignment", () => {
    expect(resolveComposerFolder({ analysis: null })).toBe(UNCATEGORIZED_COMPOSER_FOLDER);
  });

  it("normalizes whitespace in a manual folder name", () => {
    expect(normalizeComposerFolderName("  Claude   Debussy  ")).toBe("Claude Debussy");
  });

  it("moves a score into the new folder group when its manual assignment changes", () => {
    const score = { id: 10, composer: "Gibran Alcocer", analysis: { composer: "Gibran Alcocer" } };
    const before = groupCompositionsByComposer([score]);
    expect(before).toEqual([["Gibran Alcocer", [score]]]);

    const movedScore = { ...score, composer: "Frédéric Chopin" };
    const after = groupCompositionsByComposer([movedScore]);
    expect(after).toEqual([["Frédéric Chopin", [movedScore]]]);
  });
});
