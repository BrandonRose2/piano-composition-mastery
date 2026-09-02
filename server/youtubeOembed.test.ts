import { describe, expect, it } from "vitest";
import { extractVideoId } from "./sheetMusicFinder";

describe("YouTube finder URL support", () => {
  it("extracts the stable video ID even when share URLs include radio and playlist parameters", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=fuKvTWUvvlY&list=RDfuKvTWUvvlY&start_radio=1"))
      .toBe("fuKvTWUvvlY");
  });
});
