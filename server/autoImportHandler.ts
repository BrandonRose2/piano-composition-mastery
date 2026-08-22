/**
 * /api/scheduled/auto-import
 *
 * Called by the weekly AGENT cron. The agent scans the user's Downloads folder,
 * reads each new PDF as base64, and POSTs it here. This handler:
 *  1. Authenticates the cron caller
 *  2. Checks the filename hasn't been imported before
 *  3. Stores the PDF in S3
 *  4. Creates a composition record
 *  5. Kicks off AI analysis
 *  6. Records the import in the imported_files table
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";
import { createComposition, getImportedFilenames, recordImportedFile, updateCompositionStatus, getUserByOpenId, findDuplicateComposition, resolveLibraryOwnerId } from "./db";
import { analyzeComposition } from "./analyzeComposition";
import { ENV } from "./_core/env";
import { createHash } from "crypto";

export async function autoImportHandler(req: Request, res: Response) {
  try {
    // Authenticate — must be a cron caller
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const { filename, base64, mimeType = "application/pdf", fileSize } = req.body as {
      filename: string;
      base64: string;
      mimeType?: string;
      fileSize?: number;
    };

    if (!filename || !base64) {
      return res.status(400).json({ error: "filename and base64 are required" });
    }

    // Check if already imported
    const alreadyImported = await getImportedFilenames();
    if (alreadyImported.includes(filename)) {
      await recordImportedFile({
        filename,
        status: "skipped",
        errorMessage: "Already imported in a previous run",
        fileSize: fileSize ?? null,
      });
      return res.json({ ok: true, skipped: true, reason: "already_imported" });
    }

    // Decode base64 → Buffer
    const buffer = Buffer.from(base64, "base64");

    // Look up the canonical shared library owner before checking content.
    const ownerUser = await getUserByOpenId(ENV.ownerOpenId);
    const ownerUserId = await resolveLibraryOwnerId(ownerUser?.id ?? 1);
    const contentHash = createHash("sha256").update(buffer).digest("hex");
    const duplicate = await findDuplicateComposition(ownerUserId, { fileName: filename, contentHash });
    if (duplicate) {
      await recordImportedFile({
        filename,
        status: "skipped",
        errorMessage: "Already in library",
        compositionId: duplicate.id,
        fileSize: fileSize ?? buffer.length,
      });
      return res.json({ ok: true, skipped: true, reason: "already_in_library", compositionId: duplicate.id });
    }

    // Upload to S3
    const fileKey = `auto-import/${Date.now()}-${filename}`;
    const { url: fileUrl } = await storagePut(fileKey, buffer, mimeType);

    // Create composition record scoped to the owner
    const titleFromFilename = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    const comp = await createComposition({
      userId: ownerUserId as unknown as number,
      title: titleFromFilename,
      fileKey,
      fileUrl,
      fileName: filename,
      contentHash,
      mimeType,
      status: "analyzing",
    });

    // Record the import
    await recordImportedFile({
      filename,
      filePath: req.body.filePath ?? null,
      fileSize: fileSize ?? buffer.length,
      status: "imported",
      compositionId: comp.id,
    });

    // Kick off AI analysis in the background (don't await — handler must return within 2 min)
    void (async () => {
      try {
        const { analysis, framework } = await analyzeComposition(filename, buffer, mimeType);
        await updateCompositionStatus(comp.id, "complete", { analysis, framework });
      } catch (err) {
        console.error(`[auto-import] Analysis failed for ${filename}:`, err);
        await updateCompositionStatus(comp.id, "error", {
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return res.json({ ok: true, compositionId: comp.id, title: titleFromFilename });
  } catch (err) {
    console.error("[auto-import] Handler error:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
