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
} from "./db";
import { storagePut } from "./storage";
import { analyzeComposition } from "./analyzeComposition";
import { callDataApi } from "./_core/dataApi";

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
});

export type AppRouter = typeof appRouter;
