/**
 * Sheet Music Finder Pipeline
 * Given a YouTube URL OR Spotify track/album/playlist URL:
 *  1. Extract track/video metadata (title, artist/channel)
 *  2. Use AI to identify the composition name + composer
 *  3. Search Scribd catalog first (including the user's subscription session)
 *  4. Search free public sources: IMSLP and direct public links (YouTube only)
 *  5. Offer MuseScore only as the final fallback after all preferred sources
 * Returns an intentionally ordered list of score sources.
 */

import { invokeLLM } from "./_core/llm";
import { callDataApi } from "./_core/dataApi";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SheetMusicResult {
  source: "scribd" | "youtube_description" | "youtube_comments" | "imslp" | "mutopia" | "musopen" | "free_scores" | "musescore" | "web";
  title: string;
  url: string;
  pdfUrl?: string;           // direct PDF download URL if available
  previewUrl?: string;       // page to open in browser
  canImportDirectly: boolean; // true only when pdfUrl is a verified direct PDF
  confidence: "high" | "medium" | "low";
  notes?: string;
}

export interface FinderResult {
  videoId: string;
  videoTitle: string;
  compositionName: string;
  composer: string;
  sources: SheetMusicResult[];
  sourceSearchOrder?: string[];
  error?: string;
}

const SOURCE_PRIORITY: Record<SheetMusicResult["source"], number> = {
  scribd: 10,
  imslp: 20,
  mutopia: 21,
  musopen: 22,
  free_scores: 23,
  youtube_description: 30,
  youtube_comments: 31,
  // Subscription-only sources share the one final fallback bucket.
  musescore: 40,
  web: 40,
};

/** Sort sources into the exact portal policy: Scribd → free sources → one final subscription fallback bucket. */
export function orderSourcesByPriority(sources: SheetMusicResult[]): SheetMusicResult[] {
  return [...sources].sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]);
}

function dedupeSources(sources: SheetMusicResult[]): SheetMusicResult[] {
  const seen = new Set<string>();
  return orderSourcesByPriority(sources).filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

function searchOrderFor(hasYouTubeLinks: boolean): string[] {
  return [
    "1. Scribd catalog and your saved Scribd library",
    "2. Free public score databases (IMSLP, Mutopia, Musopen, and Free-scores)",
    ...(hasYouTubeLinks ? ["3. Direct public score links from the YouTube description and comments"] : []),
    `${hasYouTubeLinks ? "4" : "3"}. MuseScore and other subscription sites only as the final fallback`,
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Detect if a URL is a Spotify share link */
export function isSpotifyUrl(url: string): boolean {
  return /open\.spotify\.com\/(track|album|playlist|artist)\//i.test(url) ||
    /spotify\.link\//i.test(url);
}

/** Extract Spotify track/album metadata via the free oEmbed API (no API key needed) */
async function getSpotifyMetadata(spotifyUrl: string): Promise<{
  title: string;
  thumbnailUrl?: string;
} | null> {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "PianoMasteryPortal/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { title?: string; thumbnail_url?: string };
    return {
      title: data.title ?? "",
      thumbnailUrl: data.thumbnail_url,
    };
  } catch (err) {
    console.error("[SheetFinder] Spotify oEmbed error:", err);
    return null;
  }
}

/** Use AI to extract composition name + composer from a Spotify track title.
 * Preserves arranger/performer context — if the track is an arrangement or variation,
 * the search uses BOTH the arranger's name AND the original composer.
 */
async function identifyCompositionFromSpotify(
  trackTitle: string
): Promise<{ compositionName: string; composer: string; arranger?: string; isArrangement?: boolean }> {
  const prompt = `You are a music expert. Given the following Spotify track title, identify the composition for sheet music search purposes.

SPOTIFY TRACK TITLE: "${trackTitle}"

IMPORTANT RULES:
1. If the track is a VARIATION, ARRANGEMENT, TRANSCRIPTION, or COVER by a specific artist (e.g. "Mozart Variation" by Florian Christl, or "Clair de Lune (Piano Cover)" by someone), then:
   - compositionName = the SPECIFIC arrangement title as listed (e.g. "Mozart Variation (After Serenade K. 250 Haffner)")
   - composer = the ARRANGER/PERFORMER (e.g. "Florian Christl"), NOT the original composer
   - isArrangement = true
   - originalComposer = the original composer if identifiable (e.g. "Wolfgang Amadeus Mozart")
2. If the track IS the original classical piece performed straight (no variation/arrangement label), then:
   - compositionName = the standard composition name (e.g. "Nocturne in E-flat major, Op. 9 No. 2")
   - composer = the original composer (e.g. "Frédéric Chopin")
   - isArrangement = false
3. If it is a modern/pop/original piece, use the track title and performing artist.

Respond ONLY with a JSON object:
{"compositionName": "...", "composer": "...", "isArrangement": true/false, "originalComposer": "...or null"}`;

  try {
    const response = await invokeLLM({
      model: "claude-haiku-4-5",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });
    const raw = response.choices[0]?.message?.content;
    const text = typeof raw === "string" ? raw
      : Array.isArray(raw) ? (raw as any[]).filter(b => b.type === "text").map(b => b.text).join("") : "";
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(first, last + 1));
    return {
      compositionName: parsed.compositionName ?? trackTitle,
      composer: parsed.composer ?? "Unknown",
      arranger: parsed.isArrangement ? parsed.composer : undefined,
      isArrangement: parsed.isArrangement ?? false,
    };
  } catch {
    return { compositionName: trackTitle, composer: "Unknown", isArrangement: false };
  }
}

/** Extract YouTube video ID from any YouTube URL format */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Fetch YouTube video metadata via the Data API */
async function getVideoMetadata(videoId: string): Promise<{
  title: string;
  description: string;
  channelTitle: string;
} | null> {
  try {
    const result = await callDataApi("Youtube/video_details", {
      query: { videoId },
    }) as any;

    const video = result?.video ?? result;
    const title = video?.title ?? video?.videoDetails?.title ?? "";
    const description = video?.description ?? video?.videoDetails?.shortDescription ?? "";
    const channelTitle = video?.channelTitle ?? video?.videoDetails?.author ?? "";

    if (!title) return null;
    return { title, description, channelTitle };
  } catch (err) {
    console.error("[SheetFinder] Failed to get video metadata:", err);
    return null;
  }
}

/** Use AI to extract composition name and composer from video title/description */
async function identifyComposition(
  videoTitle: string,
  description: string,
  channelTitle: string
): Promise<{ compositionName: string; composer: string }> {
  const prompt = `You are a music expert. Given the following YouTube video information, identify the piano composition being performed.

VIDEO TITLE: "${videoTitle}"
CHANNEL: "${channelTitle}"
DESCRIPTION (first 500 chars): "${description.slice(0, 500)}"

Extract:
1. The exact composition name (e.g. "Nocturne in E-flat major, Op. 9 No. 2")
2. The composer's full name (e.g. "Frédéric Chopin")

Respond ONLY with a JSON object: {"compositionName": "...", "composer": "..."}
If you cannot identify the piece, use your best guess from the title.`;

  try {
    const response = await invokeLLM({
      model: "claude-haiku-4-5",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });
    const raw = response.choices[0]?.message?.content;
    const text = typeof raw === "string" ? raw
      : Array.isArray(raw) ? (raw as any[]).filter(b => b.type === "text").map(b => b.text).join("") : "";
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      compositionName: parsed.compositionName ?? videoTitle,
      composer: parsed.composer ?? "Unknown",
    };
  } catch {
    // Fallback: use video title as composition name
    return { compositionName: videoTitle, composer: "Unknown" };
  }
}

/** Search Scribd for sheet music using the session cookie */
async function searchScribd(
  compositionName: string,
  composer: string,
  sessionCookie: string
): Promise<SheetMusicResult[]> {
  const results: SheetMusicResult[] = [];
  const queries = [
    `${composer} ${compositionName} piano sheet music`,
    `${compositionName} piano score pdf`,
    `${composer} ${compositionName} score`,
  ];

  for (const query of queries.slice(0, 2)) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.scribd.com/search?query=${encodedQuery}&content_type=documents`;
      const res = await fetch(url, {
        headers: {
          "Cookie": `_scribd_session=${sessionCookie}`,
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.scribd.com/",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) continue;
      const html = await res.text();

      // Extract document links from Scribd search results HTML
      const docPattern = /href="(\/document\/(\d+)\/([^"?]+))"/g;
      let match;
      const seen = new Set<string>();
      while ((match = docPattern.exec(html)) !== null && results.length < 5) {
        const path = match[1];
        const docId = match[2];
        const slug = match[3];
        if (seen.has(docId)) continue;
        seen.add(docId);

        // Filter to music/score-related slugs
        const slugLower = slug.toLowerCase();
        const isRelevant = ["piano", "sheet", "score", "music", "partitura", "partition",
          compositionName.toLowerCase().split(" ")[0],
          composer.toLowerCase().split(" ").pop() ?? ""].some(kw => slugLower.includes(kw));

        if (!isRelevant && results.length > 0) continue;

        const title = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        // Scribd documents require subscription access — open in browser, cannot direct-download server-side
        results.push({
          source: "scribd",
          title: `${title} (Scribd)`,
          url: `https://www.scribd.com${path}`,
          previewUrl: `https://www.scribd.com${path}`,
          canImportDirectly: false,
          confidence: results.length === 0 ? "high" : "medium",
          notes: "Open in Scribd to read/download with your subscription",
        });
      }
    } catch (err) {
      console.error("[SheetFinder] Scribd search error:", err);
    }
    if (results.length >= 3) break;
  }

  return results;
}

/**
 * Always expose Scribd as the first catalog search. If the bot-protected result
 * page cannot be read server-side, the browser receives a first-position catalog
 * link that opens in the user's authenticated Scribd session.
 */
async function searchScribdFirst(
  compositionName: string,
  composer: string,
  sessionCookie: string
): Promise<SheetMusicResult[]> {
  const catalogMatches = await searchScribd(compositionName, composer, sessionCookie);
  if (catalogMatches.length > 0) return catalogMatches;

  const query = [composer !== "Unknown" ? composer : "", compositionName, "piano sheet music"]
    .filter(Boolean)
    .join(" ");
  const url = `https://www.scribd.com/search?query=${encodeURIComponent(query)}&content_type=documents`;

  return [{
    source: "scribd",
    title: `Search Scribd Catalog: “${compositionName}”`,
    url,
    previewUrl: url,
    canImportDirectly: false,
    confidence: "medium",
    notes: "Scribd was checked first. Open this catalog search in your subscribed Scribd session to browse matching scores.",
  }];
}

/** Execute the portal's fixed order: Scribd → free sources → MuseScore → last resort. */
async function runPrioritizedSourceSearch(
  compositionName: string,
  composer: string,
  scribdSessionCookie: string,
  youtube?: { videoId: string; description: string }
): Promise<{ sources: SheetMusicResult[]; sourceSearchOrder: string[] }> {
  // Intentional sequence: public/community searches wait until Scribd was checked.
  const scribdResults = await searchScribdFirst(compositionName, composer, scribdSessionCookie);

  const [imslpResults, youtubeResults] = await Promise.all([
    searchImslp(compositionName, composer),
    youtube ? scanYouTubeLinks(youtube.videoId, youtube.description) : Promise.resolve([]),
  ]);
  const freeCatalogResults = searchFreeCatalogs(compositionName, composer);

  // MuseScore is intentionally evaluated only as the final fallback, after Scribd and every free source.
  const musescoreResults = await searchMusescore(compositionName, composer);

  return {
    sources: dedupeSources([
      ...scribdResults,
      ...imslpResults,
      ...freeCatalogResults,
      ...youtubeResults,
      ...musescoreResults,
    ]),
    sourceSearchOrder: searchOrderFor(!!youtube),
  };
}

/** Scan YouTube video description and comments for PDF/sheet music links */
async function scanYouTubeLinks(
  videoId: string,
  description: string
): Promise<SheetMusicResult[]> {
  const results: SheetMusicResult[] = [];

  // PDF/sheet music URL patterns
  const urlPattern = /https?:\/\/[^\s"<>)]+(?:\.pdf|imslp\.org\/wiki\/[^\s"<>)]+|musescore\.com\/[^\s"<>)]+|drive\.google\.com\/[^\s"<>)]+|dropbox\.com\/[^\s"<>)]+)/gi;

  // Scan description
    const descLinks = description.match(urlPattern) ?? [];
  for (const link of descLinks.slice(0, 3)) {
    const isPdf = link.toLowerCase().includes(".pdf");
    const isImslp = link.includes("imslp.org");
    const isMusescore = link.includes("musescore.com");
    if (isPdf || isImslp || isMusescore) {
      results.push({
          source: isMusescore ? "musescore" : "youtube_description",
        title: isImslp ? "IMSLP Score (from video description)"
          : isMusescore ? "MuseScore (from video description)"
          : "PDF Score (from video description)",
        url: link,
        pdfUrl: isPdf ? link : undefined,
        previewUrl: link,
        canImportDirectly: isPdf,
        confidence: "high",
        notes: "Found directly in the YouTube video description",
      });
    }
  }

  // Fetch top comments for sheet music links
  try {
    const commentsResult = await callDataApi("Youtube/comments", {
      query: { videoId, sortBy: "TOP_COMMENTS" },
    }) as any;

    const comments: any[] = commentsResult?.comments ?? commentsResult?.items ?? [];
    for (const comment of comments.slice(0, 30)) {
      const text: string = comment?.comment?.content ?? comment?.snippet?.topLevelComment?.snippet?.textDisplay ?? "";
      const links = text.match(urlPattern) ?? [];
      for (const link of links) {
        const isPdf = link.toLowerCase().includes(".pdf");
        const isImslp = link.includes("imslp.org");
        const isMusescore = link.includes("musescore.com");
        if (isPdf || isImslp || isMusescore) {
          results.push({
            source: isMusescore ? "musescore" : "youtube_comments",
            title: isImslp ? "IMSLP Score (from comment)"
              : isMusescore ? "MuseScore (from comment)"
              : "PDF Score (from comment)",
            url: link,
            pdfUrl: isPdf ? link : undefined,
            previewUrl: link,
            canImportDirectly: isPdf,
            confidence: "medium",
            notes: "Found in YouTube video comments",
          });
          if (results.length >= 5) break;
        }
      }
      if (results.length >= 5) break;
    }
  } catch (err) {
    console.error("[SheetFinder] YouTube comments fetch error:", err);
  }

  return results;
}

/** Search IMSLP for free public domain scores */
async function searchImslp(
  compositionName: string,
  composer: string
): Promise<SheetMusicResult[]> {
  const results: SheetMusicResult[] = [];
  try {
    const query = encodeURIComponent(`${compositionName} ${composer} piano`);
    const url = `https://imslp.org/api.php?action=query&list=search&srsearch=${query}&srnamespace=0&srlimit=5&format=json&origin=*`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PianoMasteryPortal/1.0 (educational tool)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return results;
    const data = await res.json() as any;
    const hits: any[] = data?.query?.search ?? [];

    for (const hit of hits.slice(0, 3)) {
      const title: string = hit.title ?? "";
      if (title.startsWith("Category:") || title.startsWith("IMSLP:")) continue;
      const pageUrl = `https://imslp.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
      // IMSLP pages list multiple PDF files — we can't reliably resolve a direct PDF URL
      // without rendering JS. Mark as browse-only; user opens the page to download.
      results.push({
        source: "imslp",
        title: `${title} (IMSLP — Free)`,
        url: pageUrl,
        previewUrl: pageUrl,
        canImportDirectly: false,
        confidence: results.length === 0 ? "high" : "medium",
        notes: "Free public domain score — open IMSLP page to download the PDF",
      });
    }
  } catch (err) {
    console.error("[SheetFinder] IMSLP search error:", err);
  }
  return results;
}

/**
 * Add focused searches for established free score catalogs. These sites may block
 * automated scraping, so their result cards open a targeted catalog search in the
 * user's browser rather than pretending that the server downloaded a score.
 */
function searchFreeCatalogs(compositionName: string, composer: string): SheetMusicResult[] {
  const query = [composer !== "Unknown" ? composer : "", compositionName, "piano sheet music"]
    .filter(Boolean)
    .join(" ");
  const focusedSearch = (domain: string) => `https://duckduckgo.com/?q=${encodeURIComponent(`site:${domain} ${query}`)}`;

  return [
    {
      source: "mutopia",
      title: `Search Mutopia Project: “${compositionName}”`,
      url: focusedSearch("mutopiaproject.org"),
      previewUrl: focusedSearch("mutopiaproject.org"),
      canImportDirectly: false,
      confidence: "low",
      notes: "Free, downloadable public-domain and openly licensed editions.",
    },
    {
      source: "musopen",
      title: `Search Musopen’s free score catalog: “${compositionName}”`,
      url: focusedSearch("musopen.org"),
      previewUrl: focusedSearch("musopen.org"),
      canImportDirectly: false,
      confidence: "low",
      notes: "Free public-domain score catalog; availability varies by work.",
    },
    {
      source: "free_scores",
      title: `Search Free-scores: “${compositionName}”`,
      url: focusedSearch("free-scores.com"),
      previewUrl: focusedSearch("free-scores.com"),
      canImportDirectly: false,
      confidence: "low",
      notes: "Free score database with piano arrangements and printable material.",
    },
  ];
}

/** Search MuseScore for free scores */
async function searchMusescore(
  compositionName: string,
  composer: string
): Promise<SheetMusicResult[]> {
  const results: SheetMusicResult[] = [];
  try {
    const query = encodeURIComponent(`${composer} ${compositionName} piano`);
    const url = `https://musescore.com/sheetmusic?text=${query}&instrument=piano`;
    results.push({
      source: "musescore",
      title: `Search MuseScore: "${compositionName}" by ${composer}`,
      url,
      previewUrl: url,
      canImportDirectly: false,
      confidence: "low",
      notes: "Last-resort source. Open only after Scribd and the free score databases do not provide a suitable score.",
    });
  } catch {
    // ignore
  }
  return results;
}

// ── Plain text search entry point ───────────────────────────────────────────

/**
 * Find sheet music from a plain text query (composition name, composer, etc.)
 * Skips URL metadata step — uses the text directly as the search query.
 */
export async function findSheetMusicFromText(
  query: string,
  scribdSessionCookie: string
): Promise<FinderResult> {
  console.log(`[SheetFinder] Plain text search: "${query}"`);

  // Use AI to parse the text into composition + composer
  const identified = await identifyCompositionFromSpotify(query); // reuse same AI parser
  const { compositionName, composer } = identified;
  console.log(`[SheetFinder] Identified: "${compositionName}" by ${composer}`);

  const prioritized = await runPrioritizedSourceSearch(compositionName, composer, scribdSessionCookie);

  return {
    videoId: "",
    videoTitle: query,
    compositionName,
    composer,
    sources: prioritized.sources,
    sourceSearchOrder: prioritized.sourceSearchOrder,
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function findSheetMusicFromYouTube(
  youtubeUrl: string,
  scribdSessionCookie: string
): Promise<FinderResult> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return {
      videoId: "",
      videoTitle: "",
      compositionName: "",
      composer: "",
      sources: [],
      error: "Could not extract a valid YouTube video ID from the URL.",
    };
  }

  console.log(`[SheetFinder] Starting search for video: ${videoId}`);

  // Step 1: Get video metadata
  const meta = await getVideoMetadata(videoId);
  const videoTitle = meta?.title ?? `YouTube video ${videoId}`;
  const description = meta?.description ?? "";
  const channelTitle = meta?.channelTitle ?? "";

  console.log(`[SheetFinder] Video: "${videoTitle}"`);

  // Step 2: Identify composition
  const { compositionName, composer } = await identifyComposition(videoTitle, description, channelTitle);
  console.log(`[SheetFinder] Identified: "${compositionName}" by ${composer}`);

  const prioritized = await runPrioritizedSourceSearch(compositionName, composer, scribdSessionCookie, {
    videoId,
    description,
  });

  console.log(`[SheetFinder] Found ${prioritized.sources.length} sources total`);

  return {
    videoId,
    videoTitle,
    compositionName,
    composer,
    sources: prioritized.sources,
    sourceSearchOrder: prioritized.sourceSearchOrder,
  };
}

// ── Spotify Entry Point ───────────────────────────────────────────────────────

/**
 * Find sheet music for a Spotify track/album link.
 * Uses oEmbed (no API key) to get the title, then runs the same
 * Scribd + IMSLP + MuseScore search pipeline.
 */
export async function findSheetMusicFromSpotify(
  spotifyUrl: string,
  scribdSessionCookie: string
): Promise<FinderResult> {
  console.log(`[SheetFinder] Spotify search for: ${spotifyUrl}`);

  // Step 1: Get track title via oEmbed
  const meta = await getSpotifyMetadata(spotifyUrl);
  const trackTitle = meta?.title ?? "";
  if (!trackTitle) {
    return {
      videoId: "",
      videoTitle: spotifyUrl,
      compositionName: "",
      composer: "",
      sources: [],
      error: "Could not retrieve track info from Spotify. Make sure the link is a valid public Spotify track, album, or playlist URL.",
    };
  }

  console.log(`[SheetFinder] Spotify track: "${trackTitle}"`);

  // Step 2: Identify composition + composer via AI (preserves arranger context)
  const identified = await identifyCompositionFromSpotify(trackTitle);
  const { compositionName, composer, isArrangement } = identified;
  console.log(`[SheetFinder] Identified: "${compositionName}" by ${composer} (arrangement: ${isArrangement})`);

  const prioritized = await runPrioritizedSourceSearch(compositionName, composer, scribdSessionCookie);

  console.log(`[SheetFinder] Spotify search found ${prioritized.sources.length} sources`);

  // Build a clear display name that shows both arranger and original if applicable
  const displayComposer = isArrangement
    ? `${composer} (arr. of ${trackTitle})`
    : composer;

  return {
    videoId: "",          // not a YouTube video
    videoTitle: trackTitle,
    compositionName,
    composer: displayComposer,
    sources: prioritized.sources,
    sourceSearchOrder: prioritized.sourceSearchOrder,
  };
}
