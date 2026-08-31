import { describe, expect, it } from "vitest";
import { compositionMatchesSearch, getLibrarySearchSuggestions } from "./librarySearch";

const library = [
  { id: 1, title: "Idea 9", fileName: "Gibran Alcocer - Idea 9.pdf", analysis: { composer: "Gibran Alcocer" } },
  { id: 2, title: "Winter Wind", fileName: "Chopin Op 25 No 11.pdf", analysis: { composer: "Frédéric Chopin" } },
  { id: 3, title: "Wyden Down", fileName: "Wyden Down.pdf", composer: "Alexander Wyden" },
];

describe("predictive library search", () => {
  it("matches titles, composers, manual folders, and filenames as a user types", () => {
    expect(compositionMatchesSearch(library[0], "gibran idea")).toBe(true);
    expect(compositionMatchesSearch(library[1], "op 25")).toBe(true);
    expect(compositionMatchesSearch(library[2], "alexander")).toBe(true);
    expect(compositionMatchesSearch(library[2], "chopin")).toBe(false);
  });

  it("returns concise, title-prioritized suggestions", () => {
    expect(getLibrarySearchSuggestions(library, "idea").map((score) => score.id)).toEqual([1]);
    expect(getLibrarySearchSuggestions(library, "w").map((score) => score.id)).toEqual([2, 3]);
  });
});
