// File helpers. Every write goes to a temp file in the same directory, is
// fsynced, then renamed over the target, so readers (the web server, a
// concurrent build) only ever see the old file or the complete new one.

import { mkdir, open, readFile, readdir, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

export async function writeFileAtomic(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = join(dirname(path), `.${basename(path)}.tmp-${process.pid}`);
  try {
    const fh = await open(tmp, "w");
    try {
      await fh.writeFile(data);
      await fh.sync();
    } finally {
      await fh.close();
    }
    await rename(tmp, path);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

export async function writeJsonAtomic(path: string, value: unknown, pretty = false): Promise<number> {
  const text = JSON.stringify(value, null, pretty ? 2 : undefined) + "\n";
  await writeFileAtomic(path, text);
  return Buffer.byteLength(text);
}

/** Writes gzipped JSON; returns the uncompressed and compressed sizes in bytes. */
export async function writeJsonGzAtomic(path: string, value: unknown): Promise<{ json: number; gzip: number }> {
  const text = JSON.stringify(value);
  const gz = gzipSync(text, { level: 9 });
  await writeFileAtomic(path, gz);
  return { json: Buffer.byteLength(text), gzip: gz.byteLength };
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function readJsonGz<T>(path: string): Promise<T> {
  return JSON.parse(gunzipSync(await readFile(path)).toString("utf8")) as T;
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function fileSize(path: string): Promise<number> {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

/** Names of the regular files in `dir` (empty when the directory does not exist). */
export async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
