// Inline fixtures for the downloader's unit tests (no network).

import { join } from "node:path";
import type { RawClass, RawClassesResponse, RawFacilitiesResponse, RawFacility } from "../apis/types.ts";
import type { LocalDate } from "../shared/schema.ts";
import { writeJsonAtomic, writeJsonGzAtomic } from "./io.ts";
import { createSnapshotDir, FACILITIES_FILE, MANIFEST_FILE, type ClubRecord, type Manifest } from "./snapshots.ts";

export function facility(over: Partial<RawFacility> & { facilityId: string }): RawFacility {
  return {
    clubId: Number(over.facilityId),
    name: `Equinox Club ${over.facilityId}`,
    webName: null,
    shortName: null,
    mobileName: null,
    urlName: null,
    region: "New York/Downtown",
    subRegion: "Downtown",
    status: "Open",
    clubType: "Regular",
    timeZone: "Eastern Standard Time",
    isAvailableOnline: true,
    isPresale: false,
    facilityContact: {
      address: "1 Main Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      latitude: "40.7375",
      longitude: "-74.0020",
      phoneNumber: null,
    },
    ...over,
  };
}

let nextInstanceId = 1_000;

/** A raw class at facility "112" on Sun 2026-10-04 08:45-09:45 EDT unless overridden. */
export function rawClass(over: Partial<RawClass> = {}, facilityId = "112"): RawClass {
  return {
    classId: 1238,
    classInstanceId: nextInstanceId++,
    name: "Vinyasa Yoga",
    classDescription: "Flowing sequences.",
    startDate: "2026-10-04T12:45:00.000Z",
    endDate: "2026-10-04T13:45:00.000Z",
    startLocal: "2026-10-04T08:45:00",
    endLocal: "2026-10-04T09:45:00",
    workoutCategoryId: 104,
    workoutSubCategoryId: 0,
    studioName: "Yoga Studio",
    timeSlot: "Morning",
    bookingType: "Online",
    isNew: false,
    isCycling: false,
    label: null,
    classLevel: { classLevelID: 0, content: "All Levels Welcome" },
    instructors: [{ instructor: { id: 1, firstName: "Jamison", lastName: "Goodnight" }, substitute: null }],
    status: {
      isCancelled: false,
      isClassFull: false,
      isWithinReservationPeriod: false,
      reservationStartDate: null,
      totalReservableItems: null,
      reservableItemsLeft: null,
    },
    facility: { facilityId, clubId: 126, name: "Equinox Greenwich Avenue", timeZoneId: "EASTERN STANDARD TIME" },
    ...over,
  };
}

/** Local start "YYYY-MM-DDTHH:MM" -> start/end fields of a 45-minute class at a fixed UTC offset. */
export function at(localStart: string, utcOffsetHours = -4): Partial<RawClass> {
  const startMs = Date.parse(`${localStart}:00Z`) - utcOffsetHours * 3600_000;
  const local = (ms: number) => new Date(ms + utcOffsetHours * 3600_000).toISOString().slice(0, 19);
  return {
    startLocal: `${localStart}:00`,
    endLocal: local(startMs + 45 * 60_000),
    startDate: new Date(startMs).toISOString(),
    endDate: new Date(startMs + 45 * 60_000).toISOString(),
  };
}

export const facilitiesResponse = (facilities: RawFacility[]): RawFacilitiesResponse => ({
  response: { success: true, messages: null, facilities },
});

export const classesResponse = (classes: RawClass[]): RawClassesResponse => ({ messages: null, classes: classes.length ? classes : null });

export interface SnapshotSpec {
  startedAt: string; // ISO; also names the snapshot
  /** The facilities response, or null when that request "failed" (then `facilitiesSource` must be set). */
  facilities: RawFacility[] | null;
  facilitiesSource?: string;
  /** Per facility id: the classes returned, or an Error for a failed fetch. */
  clubs: Record<string, RawClass[] | Error>;
  range?: { start: LocalDate; end: LocalDate };
  /** false: leave out manifest.json, like a run that died midway. */
  complete?: boolean;
}

/** Writes a snapshot into `rawDir` the way runFetch lays it out; returns its name. */
export async function writeSnapshot(rawDir: string, spec: SnapshotSpec): Promise<string> {
  const name = await createSnapshotDir(rawDir, new Date(spec.startedAt));
  const range = spec.range ?? { start: "2026-10-04", end: "2026-11-14" };
  if (spec.facilities) await writeJsonGzAtomic(join(rawDir, name, FACILITIES_FILE), facilitiesResponse(spec.facilities));
  const clubs: Record<string, ClubRecord> = {};
  for (const [id, result] of Object.entries(spec.clubs)) {
    const base = { name: `Club ${id}`, timeZone: "America/New_York", range, fetchedAt: spec.startedAt };
    if (result instanceof Error) {
      clubs[id] = { ...base, ok: false, requests: [], classes: 0, firstDate: null, lastDate: null, error: result.message };
      continue;
    }
    const file = `classes/${id}.json.gz`;
    await writeJsonGzAtomic(join(rawDir, name, file), classesResponse(result));
    const dates = result.map((c) => c.startLocal.slice(0, 10)).sort();
    clubs[id] = {
      ...base,
      ok: true,
      requests: [{ startDate: range.start, endDate: range.end, classes: result.length, file }],
      classes: result.length,
      firstDate: dates[0] ?? null,
      lastDate: dates.at(-1) ?? null,
    };
  }
  const open = (spec.facilities ?? []).filter((f) => f.status === "Open").length;
  const manifest: Manifest = {
    format: 1,
    snapshot: name,
    startedAt: spec.startedAt,
    finishedAt: spec.startedAt,
    days: 42,
    clubsRequested: null,
    http: { requests: 1 + Object.keys(spec.clubs).length, retries: 0 },
    bytes: { json: 0, gzip: 0 },
    facilities: { file: spec.facilities ? FACILITIES_FILE : null, source: spec.facilitiesSource ?? name, openClubs: open },
    clubs,
    summary: {
      ok: Object.values(clubs).filter((c) => c.ok).length,
      failed: Object.keys(clubs).filter((id) => !clubs[id].ok),
      empty: [],
    },
    horizon: { start: null, end: null, firstDates: {}, lastDates: {} },
  };
  if (spec.complete !== false) await writeJsonAtomic(join(rawDir, name, MANIFEST_FILE), manifest, true);
  return name;
}
