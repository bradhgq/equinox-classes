// GET /calendar.ics?<share query>: a search as a calendar subscription (webcal).
// Stateless: the query is the subscription, so there's nothing to store. It runs the
// web app's own decoding and matching (web/src/lib), so a calendar always holds the
// same classes the page would show for that link.

import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ClubSchedule, DataIndex } from "../shared/schema.ts";
import { buildCatalog, type Catalog } from "../web/src/lib/catalog.ts";
import { buildFeed } from "../web/src/lib/feed.ts";
import { decodeFilters } from "../web/src/lib/filters/codec.ts";
import { effectiveClubIds } from "../web/src/lib/filters/where.ts";

/** Parsed JSON, re-read only when the file changes (the downloader rewrites data/ every 12 h). */
const parsed = new Map<string, { mtimeMs: number; value: unknown }>();

function readJson<T>(file: string): T {
  const { mtimeMs } = statSync(file);
  const hit = parsed.get(file);
  if (hit?.mtimeMs === mtimeMs) return hit.value as T;
  const value = JSON.parse(readFileSync(file, "utf8")) as T;
  parsed.set(file, { mtimeMs, value });
  return value;
}

let current: { generatedAt: string; catalog: Catalog } | null = null;

function loadCatalog(dataDir: string): Catalog {
  const index = readJson<DataIndex>(join(dataDir, "index.json"));
  if (current?.generatedAt !== index.generatedAt) current = { generatedAt: index.generatedAt, catalog: buildCatalog(index) };
  return current.catalog;
}

/** A club whose file is missing (mid-rewrite, or dropped) is skipped, not fatal. */
function loadSchedule(dataDir: string, clubId: string): ClubSchedule | null {
  try {
    return readJson<ClubSchedule>(join(dataDir, "clubs", `${clubId}.json`));
  } catch {
    return null;
  }
}

export interface CalendarFeed {
  body: string;
  etag: string;
}

export function calendarFeed(dataDir: string, query: string, now = new Date()): CalendarFeed {
  const catalog = loadCatalog(dataDir);
  const { filters } = decodeFilters(query, catalog);
  const schedules = effectiveClubIds(filters, catalog)
    .map((id) => loadSchedule(dataDir, id))
    .filter((s): s is ClubSchedule => s !== null);
  const body = buildFeed(catalog, filters, schedules, now);
  return { body, etag: `"${createHash("sha1").update(body).digest("base64url")}"` };
}
