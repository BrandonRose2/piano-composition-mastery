import { describe, expect, it } from "vitest";
import {
  adjustScoreZoom,
  MAX_IMAGE_SCORE_ZOOM,
  MAX_PDF_SCORE_ZOOM,
  MIN_SCORE_ZOOM,
  scoreZoomWidthPercent,
} from "./scoreZoom";

describe("score zoom helpers", () => {
  it("uses a bounded, visible increment for PDF scores", () => {
    expect(adjustScoreZoom(1, 0.2, MAX_PDF_SCORE_ZOOM)).toBe(1.2);
    expect(adjustScoreZoom(MAX_PDF_SCORE_ZOOM, 0.2, MAX_PDF_SCORE_ZOOM)).toBe(MAX_PDF_SCORE_ZOOM);
    expect(adjustScoreZoom(MIN_SCORE_ZOOM, -0.2, MAX_PDF_SCORE_ZOOM)).toBe(MIN_SCORE_ZOOM);
  });

  it("returns an expanding canvas width for both PDF and image zoom", () => {
    expect(scoreZoomWidthPercent(1)).toBe("100%");
    expect(scoreZoomWidthPercent(1.2)).toBe("120%");
    expect(adjustScoreZoom(3.9, 0.2, MAX_IMAGE_SCORE_ZOOM)).toBe(MAX_IMAGE_SCORE_ZOOM);
  });
});
