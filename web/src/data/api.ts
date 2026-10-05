// Fetching the downloader's static JSON (shared/schema.ts). Paths are relative
// so the app works under any sub-path; the server serves /data next to the app.

import { type ClubSchedule, type DataIndex, SCHEMA_VERSION } from "../../../shared/schema.ts";

const DATA_BASE = "./data/";

export class SchemaMismatchError extends Error {
  constructor() {
    super("The schedule format changed. Reload the page.");
    this.name = "SchemaMismatchError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  // no-cache = revalidate with the server (ETag); repeat visits stay fast but fresh.
  const res = await fetch(DATA_BASE + path, { cache: "no-cache" });
  if (!res.ok) throw new Error(res.status >= 500 ? "The schedule server didn’t respond. Try again in a moment." : "The schedule couldn’t be found. Try again later.");
  return (await res.json()) as T;
}

export async function fetchIndex(): Promise<DataIndex> {
  const index = await getJson<DataIndex>("index.json");
  if (index.version !== SCHEMA_VERSION) throw new SchemaMismatchError();
  return index;
}

export async function fetchClubSchedule(clubId: string): Promise<ClubSchedule> {
  const schedule = await getJson<ClubSchedule>(`clubs/${encodeURIComponent(clubId)}.json`);
  if (schedule.version !== SCHEMA_VERSION) throw new SchemaMismatchError();
  return schedule;
}
