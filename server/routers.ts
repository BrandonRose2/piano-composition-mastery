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
        const extractedText = input.extractedText;
        const fileName = input.fileName;

        setImmediate(async () => {
          try {
            await updateCompositionStatus(compositionId, "analyzing");
            const { analysis, framework } = await analyzeComposition(fileName, extractedText);
            await updateCompositionStatus(compositionId, "complete", { analysis, framework });
          } catch (err) {
            console.error("[Analysis] Failed:", err);
            await updateCompositionStatus(compositionId, "error", {
              errorMessage: err instanceof Error ? err.message : "Unknown error",
            });
          }
        });

        return composition;
      }),

    status: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const comp = await getCompositionById(input.id);
        if (!comp) throw new Error("Composition not found");
        return { status: comp.status, errorMessage: comp.errorMessage };
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
