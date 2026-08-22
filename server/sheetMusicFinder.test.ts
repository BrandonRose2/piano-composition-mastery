import { describe, expect, it } from "vitest";
import { orderSourcesByPriority, type SheetMusicResult } from "./sheetMusicFinder";

const source = (kind: SheetMusicResult["source"]): SheetMusicResult => ({
  source: kind,
  title: kind,
  url: `https://example.test/${kind}`,
  canImportDirectly: false,
  confidence: "medium",
});

describe("sheet music finder source priority", () => {
  it("always puts Scribd before free sources and MuseScore", () => {
    const ordered = orderSourcesByPriority([
      source("musescore"),
      source("imslp"),
      source("scribd"),
    ]);

    expect(ordered.map((item) => item.source)).toEqual([
      "scribd",
      "imslp",
      "musescore",
    ]);
  });

  it("keeps direct public YouTube score links ahead of MuseScore", () => {
    const ordered = orderSourcesByPriority([
      source("musescore"),
      source("free_scores"),
      source("musopen"),
      source("mutopia"),
      source("youtube_comments"),
      source("youtube_description"),
      source("imslp"),
      source("scribd"),
    ]);

    expect(ordered.map((item) => item.source)).toEqual([
      "scribd",
      "imslp",
      "mutopia",
      "musopen",
      "free_scores",
      "youtube_description",
      "youtube_comments",
      "musescore",
    ]);
  });
});
