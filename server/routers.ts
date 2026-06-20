import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
    list: publicProcedure.query(async () => {
      return listCompositions();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCompositionById(input.id);
      }),

    upload: publicProcedure
      .input(
        z.object({
          fileName: z.string(),
          mimeType: z.string(),
          base64Data: z.string(),
          extractedText: z.string().optional().default(""),
        })
      )
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        const key = `compositions/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url: fileUrl } = await storagePut(key, buffer, input.mimeType);

        const composition = await createComposition({
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
        // Keep the buffer in closure for server-side PDF text extraction
        const fileBuffer = buffer;

        // Use setTimeout(0) instead of setImmediate for broader runtime compatibility
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

    status: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const comp = await getCompositionById(input.id);
        if (!comp) throw new Error("Composition not found");
        return { status: comp.status, errorMessage: comp.errorMessage };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteComposition(input.id);
        return { success: true };
      }),
  }),

  progress: router({
    get: publicProcedure
      .input(z.object({ compositionId: z.number() }))
      .query(async ({ input }) => {
        return getProgressForComposition(input.compositionId);
      }),

    toggle: publicProcedure
      .input(
        z.object({
          compositionId: z.number(),
          dayNumber: z.number(),
          completed: z.boolean(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await toggleDayProgress(input.compositionId, input.dayNumber, input.completed, input.notes);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
