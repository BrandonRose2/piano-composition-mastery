import { describe, expect, it } from "vitest";
import {
  describeAcquisitionAvailability,
  isAuthorizedOpenScorePdfUrl,
  isSafeDirectPdfUrl,
  selectAutoAcquireCandidate,
} from "./sheetMusicAcquisition";

describe("sheet music acquisition eligibility", () => {
  it("selects a verified public PDF while excluding controlled catalog pages", () => {
    const candidate = selectAutoAcquireCandidate([
      { source: "scribd", title: "Scribd", url: "https://scribd.com/document/1", pdfUrl: "https://scribd.com/document/1.pdf", canImportDirectly: true, confidence: "high" },
      { source: "public_pdf", title: "Score", url: "https://imslp.org/files/work.pdf", pdfUrl: "https://imslp.org/files/work.pdf", canImportDirectly: true, confidence: "medium" },
    ]);

    expect(candidate?.source).toBe("public_pdf");
    expect(describeAcquisitionAvailability(candidate)).toContain("importing");
  });

  it("rejects malformed, non-PDF, and access-controlled links", () => {
    expect(isSafeDirectPdfUrl("https://scores.example.org/work.pdf")).toBe(true);
    expect(isSafeDirectPdfUrl("https://musescore.com/user/1/score.pdf")).toBe(false);
    expect(isSafeDirectPdfUrl("https://scribd.com/document/12")).toBe(false);
    expect(isSafeDirectPdfUrl("https://scores.example.org/work")).toBe(false);
    expect(isSafeDirectPdfUrl("not a url")).toBe(false);
    expect(isAuthorizedOpenScorePdfUrl("https://imslp.org/files/work.pdf")).toBe(true);
    expect(isAuthorizedOpenScorePdfUrl("https://scores.example.org/work.pdf")).toBe(false);
  });
});
