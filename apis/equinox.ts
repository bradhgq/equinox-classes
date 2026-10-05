// Client for the public (unauthenticated) Equinox web API, the same endpoints
// equinox.com's club pages call. Endpoint notes, quirks and limits: apis/README.md.
//
// Server-side only: the API rejects CORS preflights from other origins, so a
// browser on our domain cannot call it directly.

import type {
  RawCatalogCategory,
  RawClass,
  RawClassDetail,
  RawClassesResponse,
  RawFacilitiesResponse,
  RawFacility,
} from "./types.ts";

export type * from "./types.ts";

export const API_BASE = "https://api.production.equinox.com";
export const WEB_BASE = "https://www.equinox.com";

/** Values accepted by `timeOfDays` in class search. Strings are rejected (HTTP 400). */
export const TIME_OF_DAY = { morning: 0, evening: 1, afternoon: 2 } as const;

/** Official group-fitness categories (from equinox.com/groupfitness/classes). */
export const CATEGORIES: readonly { id: number; name: string }[] = [
  { id: 6, name: "Cycling" },
  { id: 104, name: "Yoga" },
  { id: 105, name: "Pilates" },
  { id: 213, name: "Strength" },
  { id: 212, name: "Sculpt" },
  { id: 5, name: "HIIT" },
  { id: 4, name: "Barre" },
  { id: 2, name: "Boxing" },
  { id: 106, name: "Dance" },
  { id: 202, name: "Running" },
  { id: 203, name: "Swim" },
  { id: 210, name: "Regeneration" },
  { id: 214, name: "Outdoor Fitness" },
];

/** Facilities report Windows time-zone names; map to IANA for date math. */
export const WINDOWS_TO_IANA: Record<string, string> = {
  "eastern standard time": "America/New_York",
  "central standard time": "America/Chicago",
  "mountain standard time": "America/Denver",
  "pacific standard time": "America/Los_Angeles",
  "gmt standard time": "Europe/London",
};

export function ianaTimeZone(windowsName: string): string {
  const tz = WINDOWS_TO_IANA[windowsName.trim().toLowerCase()];
  if (!tz) throw new Error(`Unknown facility time zone: ${windowsName}`);
  return tz;
}

/** Public class page on equinox.com (shared with the web app). */
export { classUrl } from "../shared/links.ts";

export interface ClassQuery {
  facilityIds: (string | number)[];
  /** Club-local date, inclusive. */
  startDate: string;
  /** Club-local date, EXCLUSIVE (the API's own semantics). */
  endDate: string;
  workoutCategoryIds?: number[];
  instructorIds?: number[];
  classIds?: number[];
  timeOfDays?: number[];
}

export interface ClientOptions {
  userAgent?: string;
  timeoutMs?: number;
  /** Retries after the first attempt, for 429 / 5xx / network errors. */
  retries?: number;
  /** Minimum gap between request starts, across all callers of this client. */
  minIntervalMs?: number;
  /** Maximum requests in flight at once. */
  concurrency?: number;
  log?: (msg: string) => void;
}

export class EquinoxApiError extends Error {
  status: number;
  body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "EquinoxApiError";
    this.status = status;
    this.body = body;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class EquinoxClient {
  #opts: Required<ClientOptions>;
  #inFlight = 0;
  #waiters: (() => void)[] = [];
  #nextStart = 0;

  constructor(opts: ClientOptions = {}) {
    this.#opts = {
      userAgent: "equinox-classes/0.1 (personal schedule viewer)",
      timeoutMs: 30_000,
      retries: 4,
      minIntervalMs: 250,
      concurrency: 2,
      log: () => {},
      ...opts,
    };
  }

  // --- endpoints ------------------------------------------------------------

  /** Every club, including closed / coming-soon ones (~144). */
  async facilities(): Promise<RawFacility[]> {
    return (await this.facilitiesResponse()).response.facilities;
  }

  /** The whole facilities response object, as sent (for archiving). */
  async facilitiesResponse(): Promise<RawFacilitiesResponse> {
    return this.#request<RawFacilitiesResponse>("GET", "/v6/facilities/");
  }

  async facility(facilityId: string | number): Promise<RawFacility> {
    const res = await this.#request<{ facility: RawFacility }>("GET", `/v6/facilities/facility/${facilityId}`);
    return res.facility;
  }

  /** Scheduled classes. Returns [] when nothing matches (the API returns null). */
  async classes(q: ClassQuery): Promise<RawClass[]> {
    return (await this.classesResponse(q)).classes ?? [];
  }

  /** The whole allclasses response object, as sent (for archiving); `classes` is null when nothing matches. */
  async classesResponse(q: ClassQuery): Promise<RawClassesResponse> {
    const body = {
      startDate: q.startDate,
      endDate: q.endDate,
      facilityIds: q.facilityIds.map(Number),
      isBookingRequired: false,
      ...(q.workoutCategoryIds && { workoutCategoryIds: q.workoutCategoryIds }),
      ...(q.instructorIds && { instructorIds: q.instructorIds }),
      ...(q.classIds && { classIds: q.classIds }),
      ...(q.timeOfDays && { timeOfDays: q.timeOfDays }),
    };
    return this.#request<RawClassesResponse>("POST", "/v6/groupfitness/classes/allclasses", body);
  }

  /** Class templates per category, with lifetime reservation counts (a popularity signal). */
  async classCatalog(categoryIds: number[]): Promise<RawCatalogCategory[]> {
    return this.#request("GET", `/v6/groupfitness/classes?categoryIds=${categoryIds.join(",")}`);
  }

  /** One class occurrence with its description and benefit ratings. */
  async classDetail(classInstanceId: number): Promise<RawClassDetail> {
    return this.#request("GET", `/v6/groupfitness/classes/${classInstanceId}`);
  }

  // --- transport ------------------------------------------------------------

  async #request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const { retries, log } = this.#opts;
    for (let attempt = 0; ; attempt++) {
      let status = 0;
      let text = "";
      let retryAfterMs: number | null = null;
      try {
        const res = await this.#throttled(() =>
          fetch(API_BASE + path, {
            method,
            headers: {
              "User-Agent": this.#opts.userAgent,
              Accept: "application/json",
              ...(body !== undefined && { "Content-Type": "application/json" }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(this.#opts.timeoutMs),
          }),
        );
        status = res.status;
        text = await res.text();
        if (res.ok) return JSON.parse(text) as T;
        const ra = res.headers.get("retry-after");
        if (ra) retryAfterMs = Number.isFinite(Number(ra)) ? Number(ra) * 1000 : Math.max(0, Date.parse(ra) - Date.now());
      } catch (err) {
        // Network error or timeout: fall through to the retry decision with status 0.
        // (Also when it happens while reading the body, after `status` was set.)
        status = 0;
        text = String(err);
      }
      const retryable = status === 0 || status === 429 || status >= 500;
      if (!retryable || attempt >= retries) {
        throw new EquinoxApiError(`${method} ${path} failed (${status || "network"}): ${text.slice(0, 200)}`, status, text);
      }
      const backoff = retryAfterMs ?? Math.min(30_000, 1000 * 2 ** attempt) * (0.75 + Math.random() / 2);
      log(`retry ${attempt + 1}/${retries} in ${Math.round(backoff)}ms: ${method} ${path} -> ${status || text.slice(0, 80)}`);
      await sleep(backoff);
    }
  }

  async #throttled<T>(fn: () => Promise<T>): Promise<T> {
    while (this.#inFlight >= this.#opts.concurrency) {
      await new Promise<void>((r) => this.#waiters.push(r));
    }
    this.#inFlight++;
    try {
      const wait = this.#nextStart - Date.now();
      this.#nextStart = Math.max(Date.now(), this.#nextStart) + this.#opts.minIntervalMs;
      if (wait > 0) await sleep(wait);
      return await fn();
    } finally {
      this.#inFlight--;
      this.#waiters.shift()?.();
    }
  }
}
