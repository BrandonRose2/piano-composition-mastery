import type { Express } from "express";
import {
  createStorageReadStream,
  readStorageMeta,
  resolveStoragePath,
  storageFileExists,
} from "../storage";

/**
 * Serves files written by storagePut() directly from local disk.
 * Replaces the old Manus Forge presigned-S3 redirect, which only worked
 * inside a Manus-hosted deployment.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    let filePath: string;
    try {
      filePath = resolveStoragePath(key);
    } catch {
      res.status(400).send("Invalid storage key");
      return;
    }

    try {
      const exists = await storageFileExists(filePath);
      if (!exists) {
        res.status(404).send("File not found");
        return;
      }

      const { contentType } = await readStorageMeta(filePath);
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "private, max-age=3600");

      const stream = createStorageReadStream(filePath);
      stream.on("error", (err) => {
        console.error("[StorageProxy] read error:", err);
        if (!res.headersSent) res.status(500).send("Storage read error");
      });
      stream.pipe(res);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(500).send("Storage proxy error");
    }
  });
}
