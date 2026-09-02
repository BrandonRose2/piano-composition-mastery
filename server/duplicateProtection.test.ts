import { describe, expect, it } from "vitest";
import { normalizeCompositionFilename } from "./db";

describe("composition duplicate protection", () => {
  it("recognizes a canonical score filename after download-number normalization", () => {
    expect(normalizeCompositionFilename("987535053-Wyden-Down.pdf"))
      .toBe(normalizeCompositionFilename("Wyden Down.pdf"));
  });

  it("keeps a distinct filename distinct after normalization", () => {
    expect(normalizeCompositionFilename("uniquely-named-practice-score.pdf"))
      .not.toBe(normalizeCompositionFilename("Wyden Down.pdf"));
  });
});
