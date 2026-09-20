// Local-disk storage helpers (Railway-friendly replacement for the
// Manus WebDev "Forge" presigned-S3 storage service, which is only
// reachable from inside Manus-hosted deployments).
//
// Files are written under STORAGE_DIR (defaults to ./data/storage, and
// should point at a mounted persistent volume in production so uploads
// survive redeploys). Each file gets a small sidecar `<file>.meta.json`
// recording its content type so the proxy route can serve it correctly.

import fs, { createReadStream } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(process.cwd(), "data", "storage");

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/** Resolves a storage key to an absolute path, refusing anything that would escape STORAGE_DIR. */
export function resolveStoragePath(relKey: string): string {
  const key = normalizeKey(relKey);
  const target = path.resolve(STORAGE_DIR, key);
  if (target !== STORAGE_DIR && !target.startsWith(STORAGE_DIR + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return target;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = resolveStoragePath(key);

  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  await fsp.writeFile(filePath, buffer);
  await fsp.writeFile(`${filePath}.meta.json`, JSON.stringify({ contentType }));

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

/**
 * Historically returned a short-lived presigned S3 URL from Manus's Forge
 * service. Local storage has no such concept — the proxy route below serves
 * the file directly — so this just returns that same in-app URL.
 */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return `/manus-storage/${normalizeKey(relKey)}`;
}

/** Reads a stored file's raw bytes directly off disk (no HTTP round-trip needed for local storage). */
export async function storageGetBuffer(relKey: string): Promise<Buffer> {
  const filePath = resolveStoragePath(relKey);
  return fsp.readFile(filePath);
}

export async function readStorageMeta(filePath: string): Promise<{ contentType: string }> {
  try {
    const raw = await fsp.readFile(`${filePath}.meta.json`, "utf-8");
    const parsed = JSON.parse(raw) as { contentType?: string };
    return { contentType: parsed.contentType || "application/octet-stream" };
  } catch {
    return { contentType: "application/octet-stream" };
  }
}

export function createStorageReadStream(filePath: string) {
  return createReadStream(filePath);
}

export async function storageFileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fsp.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

// Re-export the sync fs module in case other code imports it from here in the future.
export { fs };
