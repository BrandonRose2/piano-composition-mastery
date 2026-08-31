import { describe, expect, it } from "vitest";
import { normalizeTempo, parseTempoDraft } from "./metronomeTempo";

describe("metronome tempo helpers", () => {
  it("keeps tempo in the playable 20–220 BPM range", () => {
    expect(normalizeTempo(98.4)).toBe(98);
    expect(normalizeTempo(250)).toBe(220);
    expect(normalizeTempo(4)).toBe(20);
    expect(normalizeTempo(Number.NaN)).toBe(80);
  });

  it("does not treat an incomplete number field as a tempo change", () => {
    expect(parseTempoDraft("")).toBeNull();
    expect(parseTempoDraft("130")).toBe(130);
    expect(parseTempoDraft(" 98.7 ")).toBe(99);
    expect(parseTempoDraft("fast")).toBeNull();
  });
});
