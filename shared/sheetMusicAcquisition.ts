export type AcquirableSource = {
  source: string;
  title: string;
  url: string;
  pdfUrl?: string;
  canImportDirectly: boolean;
  confidence?: string;
};

/** Sources allowed to trigger a no-touch import after the URL is verified as a PDF. */
const AUTO_ACQUIRABLE_SOURCES = new Set([
  "youtube_description",
  "imslp",
  "mutopia",
  "musopen",
  "free_scores",
  "public_pdf",
]);

const OPEN_SCORE_HOSTS = [
  "imslp.org",
  "imslp.info",
  "mutopiaproject.org",
  "musopen.org",
  "cpdl.org",
  "archive.org",
  "8notes.com",
];

const ACCESS_CONTROLLED_HOSTS = [
  "scribd.com",
  "musescore.com",
  "musicnotes.com",
  "sheetmusicplus.com",
  "noteflight.com",
  "note-store.com",
];

function isAccessControlledHost(hostname: string): boolean {
  return ACCESS_CONTROLLED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function isAuthorizedOpenScorePdfUrl(rawUrl: string | undefined): rawUrl is string {
  if (!isSafeDirectPdfUrl(rawUrl)) return false;
  const hostname = new URL(rawUrl).hostname.toLowerCase();
  return OPEN_SCORE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function isSafeDirectPdfUrl(rawUrl: string | undefined): rawUrl is string {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || isAccessControlledHost(url.hostname.toLowerCase())) {
      return false;
    }
    return /\.pdf(?:$|[?#])/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

export function selectAutoAcquireCandidate(sources: AcquirableSource[]): AcquirableSource | null {
  const eligible = sources.filter((source) =>
    AUTO_ACQUIRABLE_SOURCES.has(source.source)
    && source.canImportDirectly
    && isAuthorizedOpenScorePdfUrl(source.pdfUrl),
  );

  const confidenceRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return eligible.sort((a, b) => (confidenceRank[a.confidence ?? "low"] ?? 3) - (confidenceRank[b.confidence ?? "low"] ?? 3))[0] ?? null;
}

export function describeAcquisitionAvailability(candidate: AcquirableSource | null): string {
  if (candidate) return `Verified PDF found from ${candidate.source.replace(/_/g, " ")}; importing it into your library now.`;
  return "No directly downloadable PDF was available from an authorized public link. Sources that require Scribd, MuseScore, or an official-store sign-in remain available to open in your browser.";
}
