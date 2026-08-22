import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createComposition,
  getCompositionById,
  listCompositions,
  updateCompositionStatus,
  deleteComposition,
  getProgressForComposition,
  toggleDayProgress,
  getDb,
  listImportedFiles,
  upsertScribdSavedDocs,
  listScribdSavedDocs,
  searchScribdSavedDocs,
} from "./db";
import { storagePut } from "./storage";
import { analyzeComposition } from "./analyzeComposition";
import { callDataApi } from "./_core/dataApi";
import { findSheetMusicFromYouTube, findSheetMusicFromSpotify, findSheetMusicFromText, isSpotifyUrl, extractVideoId } from "./sheetMusicFinder";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getImportedFilenames, recordImportedFile } from "./db";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcryptjs";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  compositions: router({
    /** List only the current user's compositions */
    list: protectedProcedure.query(async ({ ctx }) => {
      return listCompositions(ctx.user.id);
    }),

    /** Get a single composition — only if it belongs to the current user */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return getCompositionById(input.id, ctx.user.id);
      }),

    /** Upload a new composition score and kick off AI analysis */
    upload: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          mimeType: z.string(),
          base64Data: z.string(),
          extractedText: z.string().optional().default(""),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user.id;
        const buffer = Buffer.from(input.base64Data, "base64");
        const key = `compositions/${userId}/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url: fileUrl } = await storagePut(key, buffer, input.mimeType);

        const composition = await createComposition({
          userId,
          title: input.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          fileName: input.fileName,
          fileKey: key,
          fileUrl,
          mimeType: input.mimeType,
          status: "pending",
        });

        if (!composition) throw new Error("Failed to create composition record");

        const compositionId = composition.id;
        const fileName = input.fileName;
        const mimeType = input.mimeType;
        const fileBuffer = buffer;

        setTimeout(async () => {
          try {
            console.log(`[Analysis] Starting analysis for composition ${compositionId}: ${fileName}`);
            await updateCompositionStatus(compositionId, "analyzing");
            const { analysis, framework } = await analyzeComposition(
              fileName,
              fileBuffer,
              mimeType
            );
            await updateCompositionStatus(compositionId, "complete", { analysis, framework });
            console.log(`[Analysis] Completed for composition ${compositionId}`);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[Analysis] Failed for composition ${compositionId}:`, errMsg);
            await updateCompositionStatus(compositionId, "error", {
              errorMessage: errMsg,
            }).catch(dbErr => console.error("[Analysis] Failed to update error status:", dbErr));
          }
        }, 0);

        return composition;
      }),

    /** Poll the status of an in-progress composition */
    status: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const comp = await getCompositionById(input.id, ctx.user.id);
        if (!comp) throw new Error("Composition not found");
        return { status: comp.status, errorMessage: comp.errorMessage };
      }),

    /** Rename a composition title */
    rename: protectedProcedure
      .input(z.object({ id: z.number(), title: z.string().min(1).max(200) }))
      .mutation(async ({ input, ctx }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new Error("Database unavailable");
        const { compositions } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db
          .update(compositions)
          .set({ title: input.title })
          .where(and(eq(compositions.id, input.id), eq(compositions.userId, ctx.user.id)));
        return { success: true };
      }),

    /** Delete a composition and all its progress records */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteComposition(input.id, ctx.user.id);
        return { success: true };
      }),

    /**
     * Retry AI analysis for a composition that previously errored.
     * Re-fetches the file from S3 using a presigned URL and re-runs analyzeComposition.
     */
    retryAnalysis: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const comp = await getCompositionById(input.id, ctx.user.id);
        if (!comp) throw new Error("Composition not found or access denied");
        if (!comp.fileKey) throw new Error("No file stored for this composition — please re-upload.");
        if (comp.status === "analyzing") throw new Error("Analysis is already in progress.");

        // Mark as analyzing immediately so the UI updates
        await updateCompositionStatus(comp.id, "analyzing");

        const compositionId = comp.id;
        const fileName = comp.fileName ?? comp.title;
        const mimeType = comp.mimeType ?? "application/pdf";
        const fileKey = comp.fileKey;

        // Re-fetch file from S3 and re-run analysis in the background
        setTimeout(async () => {
          try {
            const { storageGetSignedUrl } = await import("./storage");
            const signedUrl = await storageGetSignedUrl(fileKey);
            const fileResp = await fetch(signedUrl, { signal: AbortSignal.timeout(30_000) });
            if (!fileResp.ok) throw new Error(`Could not fetch file from storage: HTTP ${fileResp.status}`);
            const arrayBuffer = await fileResp.arrayBuffer();
            const fileBuffer = Buffer.from(arrayBuffer);

            const { analysis, framework } = await analyzeComposition(fileName, fileBuffer, mimeType);
            await updateCompositionStatus(compositionId, "complete", { analysis, framework });
            console.log(`[RetryAnalysis] Completed for composition ${compositionId}`);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[RetryAnalysis] Failed for composition ${compositionId}:`, errMsg);
            await updateCompositionStatus(compositionId, "error", { errorMessage: errMsg })
              .catch(dbErr => console.error("[RetryAnalysis] Failed to update error status:", dbErr));
          }
        }, 0);

        return { success: true, id: compositionId };
      }),
  }),

  youtube: router({
    /** Search YouTube for the best performance video of a given piece */
    searchPerformance: publicProcedure
      .input(z.object({
        title: z.string(),
        composer: z.string(),
        key: z.string().optional().default(""),
        tempo: z.string().optional().default(""),
        catalogue: z.string().optional().default(""),
      }))
      .query(async ({ input }) => {
        // Build a specific query using all available metadata
        const parts = [input.composer, input.title];
        if (input.catalogue) parts.push(input.catalogue);
        if (input.key) parts.push(input.key);
        parts.push("piano performance");
        const query = parts.filter(Boolean).join(" ");

        try {
          const result = await callDataApi("Youtube/search", {
            query: { q: query, gl: "US", hl: "en" },
          }) as any;

          const contents: any[] = result?.contents ?? [];

          const parseViews = (text: string): number => {
            if (!text) return 0;
            const clean = text.replace(/[^0-9.KMB]/gi, "");
            const num = parseFloat(clean);
            if (isNaN(num)) return 0;
            if (/B/i.test(text)) return num * 1_000_000_000;
            if (/M/i.test(text)) return num * 1_000_000;
            if (/K/i.test(text)) return num * 1_000;
            return num;
          };

          const videos = contents
            .filter((c: any) => c?.type === "video" && c?.video?.videoId)
            .map((c: any) => ({
              videoId: c.video.videoId as string,
              title: (c.video.title ?? "") as string,
              channelTitle: (c.video.channelTitle ?? "") as string,
              viewCountText: (c.video.viewCountText ?? "") as string,
              viewCount: parseViews(c.video.viewCountText ?? ""),
              lengthText: (c.video.lengthText ?? "") as string,
              publishedTimeText: (c.video.publishedTimeText ?? "") as string,
              thumbnailUrl: (c.video.thumbnails?.[0]?.url ?? "") as string,
            }));

          if (videos.length === 0) return [];

          // Sort by views and return top 5
          const sorted = [...videos].sort((a, b) => b.viewCount - a.viewCount);
          return sorted.slice(0, 5);
        } catch (err) {
          console.error("[YouTube] Search failed:", err);
          return [];
        }
      }),
  }),

  sheetMusic: router({
    /**
     * Search IMSLP for free piano sheet music PDFs.
     * Uses the IMSLP MediaWiki API to find works matching the query,
     * then returns structured results with direct IMSLP page links.
     */
    search: publicProcedure
      .input(z.object({ query: z.string().min(1).max(200) }))
      .query(async ({ input }) => {
        try {
          const query = encodeURIComponent(input.query);
          // Use IMSLP's MediaWiki search API
          const url = `https://imslp.org/api.php?action=query&list=search&srsearch=${query}+piano&srnamespace=0&srlimit=10&format=json&origin=*`;
          const res = await fetch(url, {
            headers: { "User-Agent": "PianoMasteryPortal/1.0 (educational tool)" },
          });
          if (!res.ok) throw new Error(`IMSLP API error: ${res.status}`);
          const data = await res.json() as any;
          const hits: any[] = data?.query?.search ?? [];

          // Filter to piano-relevant results and build structured output
          const results = hits
            .filter((h: any) => {
              const t = (h.title ?? "").toLowerCase();
              return !t.startsWith("category:") && !t.startsWith("imslp:") && !t.startsWith("template:");
            })
            .map((h: any) => {
              const title: string = h.title ?? "";
              // Build the IMSLP page URL
              const pageUrl = `https://imslp.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
              // Strip HTML snippet
              const snippet = (h.snippet ?? "").replace(/<[^>]+>/g, "").trim();
              return {
                title,
                pageUrl,
                snippet,
                wordCount: h.wordcount ?? 0,
              };
            });

          return results;
        } catch (err) {
          console.error("[SheetMusic] IMSLP search failed:", err);
          return [];
        }
      }),
  }),

  sheetMusicImport: router({
    /**
     * Fetch a PDF from a given URL, store it in S3, and kick off AI analysis.
     * Used for importing sheet music directly from a URL (e.g. IMSLP direct PDF link).
     */
    importFromUrl: protectedProcedure
      .input(
        z.object({
          pdfUrl: z.string().url(),
          titleHint: z.string().optional().default(""),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user.id;

        // Fetch the PDF from the provided URL
        const response = await fetch(input.pdfUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PianoMasteryPortal/1.0; educational use)",
            "Accept": "application/pdf,*/*",
          },
          redirect: "follow",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: HTTP ${response.status} from ${input.pdfUrl}`);
        }

        const contentType = response.headers.get("content-type") ?? "application/pdf";
        if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
          throw new Error(`URL does not appear to be a PDF (content-type: ${contentType}). Please provide a direct PDF download link.`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 100) {
          throw new Error("Downloaded file is too small to be a valid PDF.");
        }

        // Derive a filename from the URL or the title hint
        const urlPath = new URL(input.pdfUrl).pathname;
        const rawName = decodeURIComponent(urlPath.split("/").pop() ?? "score.pdf");
        const fileName = rawName.endsWith(".pdf") ? rawName : `${rawName}.pdf`;
        const title = input.titleHint || fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");

        const key = `compositions/${userId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url: fileUrl } = await storagePut(key, buffer, "application/pdf");

        const composition = await createComposition({
          userId,
          title,
          fileName,
          fileKey: key,
          fileUrl,
          mimeType: "application/pdf",
          status: "pending",
        });

        if (!composition) throw new Error("Failed to create composition record");

        const compositionId = composition.id;
        const fileBuffer = buffer;

        setTimeout(async () => {
          try {
            console.log(`[Analysis] Starting import analysis for composition ${compositionId}: ${title}`);
            await updateCompositionStatus(compositionId, "analyzing");
            const { analysis, framework } = await analyzeComposition(fileName, fileBuffer, "application/pdf");
            await updateCompositionStatus(compositionId, "complete", { analysis, framework });
            console.log(`[Analysis] Import analysis completed for composition ${compositionId}`);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[Analysis] Import analysis failed for composition ${compositionId}:`, errMsg);
            await updateCompositionStatus(compositionId, "error", { errorMessage: errMsg }).catch(() => {});
          }
        }, 0);

        return { id: composition.id, title };
      }),
  }),

  localAuth: router({
    /**
     * Register a new account with username + password (no email required).
     * Returns a session cookie on success.
     */
    register: publicProcedure
      .input(
        z.object({
          username: z
            .string()
            .min(3, "Username must be at least 3 characters")
            .max(32, "Username must be 32 characters or fewer")
            .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, _ and -"),
          password: z
            .string()
            .min(6, "Password must be at least 6 characters")
            .max(128),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        // Check username is not taken
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);
        if (existing.length > 0) {
          throw new Error("Username is already taken");
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `local:${input.username}`;

        await db.insert(users).values({
          openId,
          username: input.username,
          passwordHash,
          name: input.username,
          loginMethod: "local",
          lastSignedIn: new Date(),
        });

        const newUser = await db
          .select()
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);
        if (!newUser[0]) throw new Error("Failed to create account");

        const token = await sdk.createSessionToken(openId, { name: input.username });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        return { success: true, username: input.username };
      }),

    /**
     * Login with username + password.
     * Returns a session cookie on success.
     */
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const rows = await db
          .select()
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);

        const user = rows[0];
        if (!user || !user.passwordHash) {
          throw new Error("Invalid username or password");
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new Error("Invalid username or password");
        }

        // Update lastSignedIn
        await db
          .update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, user.id));

        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? user.username ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        return { success: true, username: user.username ?? input.username };
      }),
  }),

  /**
   * YouTube or Spotify → Sheet Music finder.
   * Given a YouTube URL or Spotify track/album/playlist URL, identifies the
   * composition and searches Scribd, IMSLP, and MuseScore for free PDF sheet music.
   * For YouTube URLs, also scans the video description and top comments.
   */
  findSheetMusic: protectedProcedure
    .input(z.object({ url: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
      // A browser-friendly catalog link is still returned when the server session
      // cannot scrape Scribd. This keeps Scribd first instead of blocking the finder.
      const cookie = ENV.scribdSessionCookie ?? "";
      const url = input.url.trim();
      let result;
      // Detect input type: Spotify link, YouTube link, or plain text query
      const isUrl = /^https?:\/\//i.test(url);
      if (isSpotifyUrl(url)) {
        result = await findSheetMusicFromSpotify(url, cookie);
      } else if (isUrl && extractVideoId(url)) {
        result = await findSheetMusicFromYouTube(url, cookie);
      } else if (isUrl) {
        // Generic URL — treat the URL itself as a text query
        result = await findSheetMusicFromText(url, cookie);
      } else {
        // Plain text: composition name, composer, etc.
        result = await findSheetMusicFromText(url, cookie);
      }
      if (result.error) throw new Error(result.error);

      // Inject cached Scribd saved docs as top results if they match the identified composition
      try {
        const compositionName = result.compositionName ?? "";
        const composer = result.composer ?? "";
        const searchQuery = `${composer} ${compositionName}`.trim();
        if (searchQuery.length > 3) {
          const savedMatches = await searchScribdSavedDocs(searchQuery, ctx.user.id);
          if (savedMatches.length > 0) {
            const savedResults = savedMatches.map(doc => ({
              source: "scribd_saved" as const,
              title: doc.title,
              url: doc.url,
              previewUrl: doc.url,
              canImportDirectly: false,
              confidence: "high" as const,
              notes: "From your Scribd library",
            }));
            // Prepend saved results before the first-position Scribd catalog result and all free sources.
            result = {
              ...result,
              sources: [
                ...savedResults,
                ...(result.sources ?? []),
              ],
            };
          }
        }
      } catch (_e) {
        // Non-fatal — continue with original results
      }

      return result;
    }),

  /**
   * Import a sheet music result (from findSheetMusic) into the user's library.
   * Fetches the PDF from the given URL and kicks off AI analysis.
   */
  importSheetMusicResult: protectedProcedure
    .input(z.object({
      pdfUrl: z.string().url(),
      titleHint: z.string().optional().default(""),
      isScribd: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/pdf,*/*",
      };
      if (input.isScribd && ENV.scribdSessionCookie) {
        headers["Cookie"] = `_scribd_session=${ENV.scribdSessionCookie}`;
        headers["Referer"] = "https://www.scribd.com/";
      }

      const response = await fetch(input.pdfUrl, { headers, redirect: "follow", signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`Could not download PDF: HTTP ${response.status}`);

      // Validate that the response is actually a PDF, not an HTML page
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        throw new Error(
          "This link opens a webpage, not a direct PDF file. Please open it in your browser and download the PDF manually, then drag it into the upload zone."
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < 100) throw new Error("Downloaded file is too small to be a valid PDF.");

      // Check PDF magic bytes (%PDF-)
      const header = buffer.slice(0, 5).toString("ascii");
      if (!header.startsWith("%PDF")) {
        throw new Error(
          "The downloaded file does not appear to be a PDF. Please open the link in your browser and download the PDF manually."
        );
      }

      const urlPath = new URL(input.pdfUrl).pathname;
      const rawName = decodeURIComponent(urlPath.split("/").pop() ?? "score.pdf");
      const fileName = rawName.endsWith(".pdf") ? rawName : `${rawName}.pdf`;
      const title = input.titleHint || fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");

      const key = `compositions/${userId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url: fileUrl } = await storagePut(key, buffer, "application/pdf");

      const composition = await createComposition({ userId, title, fileName, fileKey: key, fileUrl, mimeType: "application/pdf", status: "pending" });
      if (!composition) throw new Error("Failed to create composition record");

      const compositionId = composition.id;
      const fileBuffer = buffer;
      setTimeout(async () => {
        try {
          await updateCompositionStatus(compositionId, "analyzing");
          const { analysis, framework } = await analyzeComposition(fileName, fileBuffer, "application/pdf");
          await updateCompositionStatus(compositionId, "complete", { analysis, framework });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          await updateCompositionStatus(compositionId, "error", { errorMessage: errMsg }).catch(() => {});
        }
      }, 0);

      return { id: composition.id, title };
    }),

  /**
   * Fetch a webpage URL server-side, extract its text content, and kick off AI analysis.
   * Used when the user pastes a URL into the upload zone instead of uploading a file.
   */
  fetchFromUrl: protectedProcedure
    .input(
      z.object({
        url: z.string().url("Please enter a valid URL (e.g. https://example.com)"),
        titleHint: z.string().optional().default(""),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Fetch the page
      const response = await fetch(input.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PianoMasteryPortal/1.0; educational use)",
          "Accept": "text/html,application/xhtml+xml,*/*",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`Could not fetch URL (HTTP ${response.status}). Make sure the link is publicly accessible.`);
      }

      const rawText = await response.text();

      // Determine filename from URL path
      let urlPath = "";
      try { urlPath = new URL(input.url).hostname; } catch { urlPath = "webpage"; }
      const fileName = `${urlPath}.html`;
      const title = input.titleHint || urlPath.replace(/^www\./, "").replace(/[-_.]/g, " ");

      // Store the raw HTML as a file in S3 so the composition record has a fileUrl
      const buffer = Buffer.from(rawText, "utf-8");
      const key = `compositions/${userId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url: fileUrl } = await storagePut(key, buffer, "text/html");

      const composition = await createComposition({
        userId,
        title,
        fileName,
        fileKey: key,
        fileUrl,
        mimeType: "text/html",
        status: "pending",
      });

      if (!composition) throw new Error("Failed to create composition record");

      const compositionId = composition.id;
      const fileBuffer = buffer;

      setTimeout(async () => {
        try {
          console.log(`[Analysis] Starting URL analysis for composition ${compositionId}: ${input.url}`);
          await updateCompositionStatus(compositionId, "analyzing");
          const { analysis, framework } = await analyzeComposition(fileName, fileBuffer, "text/html");
          await updateCompositionStatus(compositionId, "complete", { analysis, framework });
          console.log(`[Analysis] URL analysis completed for composition ${compositionId}`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[Analysis] URL analysis failed for composition ${compositionId}:`, errMsg);
          await updateCompositionStatus(compositionId, "error", { errorMessage: errMsg }).catch(() => {});
        }
      }, 0);

      return { id: composition.id, title };
    }),

  progress: router({
    /** Summarise progress for ALL of the current user's compositions in one call */
    summaryAll: protectedProcedure.query(async ({ ctx }) => {
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      const { practiceProgress } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(practiceProgress)
        .where(eq(practiceProgress.userId, ctx.user.id));
      // Group by compositionId and count completed days
      const map: Record<number, { completed: number; total: number }> = {};
      for (const row of rows) {
        if (!map[row.compositionId]) map[row.compositionId] = { completed: 0, total: 0 };
        map[row.compositionId].total += 1;
        if (row.completed) map[row.compositionId].completed += 1;
      }
      return Object.entries(map).map(([id, counts]) => ({
        compositionId: Number(id),
        completedDays: counts.completed,
        totalDays: 30,
        percentage: Math.round((counts.completed / 30) * 100),
      }));
    }),

    /** Get all progress records for a composition, scoped to the current user */
    get: protectedProcedure
      .input(z.object({ compositionId: z.number() }))
      .query(async ({ input, ctx }) => {
        return getProgressForComposition(input.compositionId, ctx.user.id);
      }),

    /** Toggle a day's completion status */
    toggle: protectedProcedure
      .input(
        z.object({
          compositionId: z.number(),
          dayNumber: z.number(),
          completed: z.boolean(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await toggleDayProgress(
          input.compositionId,
          input.dayNumber,
          input.completed,
          ctx.user.id,
          input.notes
        );
        return { success: true };
      }),
  }),
  autoImport: router({
    /** List recent auto-import history */
    list: protectedProcedure.query(async () => {
      return listImportedFiles(100);
    }),

    /**
     * Upload a single PDF from the browser for batch import.
     * The frontend reads files locally and sends them as base64.
     * Returns the composition id so the UI can track per-file status.
     */
    uploadFile: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        base64Data: z.string(),
        fileSize: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user.id;
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB

        if (input.fileSize > MAX_SIZE) {
          await recordImportedFile({ filename: input.fileName, filePath: "", compositionId: null, status: "skipped", errorMessage: "File too large (max 50MB)" });
          return { status: "skipped", reason: "File too large (max 50MB)", compositionId: null };
        }

        // Check for duplicate by filename scoped to this user's compositions
        const db = await getDb();
        if (db) {
          const { compositions: compsTable } = await import("../drizzle/schema");
          const { eq, and } = await import("drizzle-orm");
          const existing = await db
            .select({ id: compsTable.id })
            .from(compsTable)
            .where(and(eq(compsTable.userId, userId), eq(compsTable.fileName, input.fileName)))
            .limit(1);
          if (existing.length > 0) {
            await recordImportedFile({ filename: input.fileName, filePath: "", compositionId: existing[0].id, status: "skipped", errorMessage: "Already in library" });
            return { status: "skipped", reason: "Already in library", compositionId: existing[0].id };
          }
        }

        try {
          const buffer = Buffer.from(input.base64Data, "base64");
          const fileKey = `auto-import/${userId}/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { url: fileUrl } = await storagePut(fileKey, buffer, "application/pdf");

          const titleFromFilename = input.fileName
            .replace(/^\d+-/, "")
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]/g, " ")
            .replace(/\s+\(\d+\)$/, "")
            .trim();

          const comp = await createComposition({
            userId,
            title: titleFromFilename,
            fileKey,
            fileUrl,
            fileName: input.fileName,
            mimeType: "application/pdf",
          });

          await recordImportedFile({ filename: input.fileName, filePath: fileKey, compositionId: comp.id, status: "imported" });

          // Set to analyzing, then kick off AI analysis in background
          await updateCompositionStatus(comp.id, "analyzing");
          analyzeComposition(input.fileName, buffer, "application/pdf")
            .then(result => updateCompositionStatus(comp.id, "complete", { analysis: result?.analysis, framework: result?.framework }))
            .catch(err => updateCompositionStatus(comp.id, "error", { errorMessage: err.message }));

          return { status: "imported", reason: "", compositionId: comp.id };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await recordImportedFile({ filename: input.fileName, filePath: "", compositionId: null, status: "error", errorMessage: msg });
          throw new Error(msg);
        }
      }),
  }),

  /** Scribd saved library cache — sync from pasted HTML or single URL, search locally */
  scribd: router({

    /**
     * Bulk sync: user pastes the raw HTML of their Scribd saved list page.
     * Server parses it, extracts all document links, and upserts them into the cache.
     */
    syncFromHtml: protectedProcedure
      .input(z.object({ html: z.string().min(10) }))
      .mutation(async ({ input, ctx }) => {
        const { html } = input;
        const docs: { userId: number; docId: string; title: string; url: string; slug: string }[] = [];
        const seen = new Set<string>();

        // Pattern: href="/document/123/slug-title" or href="/doc/123/slug"
        const docPattern = /href="\/(document|doc)\/(\d+)\/([^"?#\s]+)"/g;
        let m;
        while ((m = docPattern.exec(html)) !== null) {
          const docId = m[2];
          const slug = m[3];
          if (seen.has(docId)) continue;
          seen.add(docId);
          // Convert slug to title: "my-sheet-music" → "My Sheet Music"
          const title = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          docs.push({
            userId: ctx.user.id,
            docId,
            title,
            url: `https://www.scribd.com/document/${docId}/${slug}`,
            slug,
          });
        }

        if (docs.length === 0) {
          throw new Error("No Scribd document links found in the pasted HTML. Make sure you copied the full page source from your Scribd saved list.");
        }

        await upsertScribdSavedDocs(docs);
        return { synced: docs.length };
      }),

    /**
     * Single URL add: user pastes one Scribd document URL.
     * Server extracts docId/slug/title and upserts it.
     */
    addByUrl: protectedProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input, ctx }) => {
        // Match https://www.scribd.com/document/123/slug or /doc/123/slug
        const match = input.url.match(/scribd\.com\/(document|doc)\/(\d+)\/([^?#\s]+)/);
        if (!match) {
          throw new Error("Invalid Scribd URL. Expected format: https://www.scribd.com/document/123/document-title");
        }
        const docId = match[2];
        const slug = match[3];
        const title = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        await upsertScribdSavedDocs([{
          userId: ctx.user.id,
          docId,
          title,
          url: `https://www.scribd.com/document/${docId}/${slug}`,
          slug,
        }]);
        return { title, docId };
      }),

    /** Return all cached saved docs for the current user, newest first */
    getSavedDocs: protectedProcedure
      .query(async ({ ctx }) => {
        return listScribdSavedDocs(ctx.user.id);
      }),

    /** Fuzzy-search cached saved docs by composition/composer name */
    searchSaved: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input, ctx }) => {
        return searchScribdSavedDocs(input.query, ctx.user.id);
      }),
  }),
});
export type AppRouter = typeof appRouter;
