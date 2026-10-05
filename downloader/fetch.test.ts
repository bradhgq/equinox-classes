import assert from "node:assert/strict";
import { test } from "node:test";
import { daysBetween } from "./dates.ts";
import { fetchRange } from "./fetch.ts";

/** Fake API: `perDay` items on each of the first `publishedDays` days from 2026-10-04. */
function fakeApi(perDay: number, publishedDays: number) {
  const calls: [string, string][] = [];
  const get = async (start: string, end: string): Promise<number[]> => {
    calls.push([start, end]);
    const out: number[] = [];
    for (let d = 0; d < daysBetween(start, end); d++) {
      const offset = daysBetween("2026-10-04", start) + d;
      if (offset < publishedDays) for (let i = 0; i < perDay; i++) out.push(offset * 1000 + i);
    }
    return out;
  };
  return { get, calls };
}
const len = (xs: number[]) => xs.length;

test("one request when the response is under the threshold", async () => {
  const api = fakeApi(20, 28);
  const r = await fetchRange(api.get, len, "2026-10-04", "2026-11-15", 1000);
  assert.equal(r.discarded, 0);
  assert.deepEqual(api.calls, [["2026-10-04", "2026-11-15"]]);
  assert.deepEqual(
    r.parts.map((p) => [p.startDate, p.endDate, p.count]),
    [["2026-10-04", "2026-11-15", 560]],
  );
});

test("bisects a range whose response reaches the threshold", async () => {
  const api = fakeApi(30, 42); // 1,260 items published over 6 of the 8 requested weeks
  const r = await fetchRange(api.get, len, "2026-10-04", "2026-11-29", 1000);
  assert.equal(r.discarded, 1);
  assert.deepEqual(
    r.parts.map((p) => [p.startDate, p.endDate, p.count]),
    [
      ["2026-10-04", "2026-11-01", 840],
      ["2026-11-01", "2026-11-29", 420],
    ],
  );
  const all = r.parts.flatMap((p) => p.value);
  assert.equal(new Set(all).size, 1260, "no gaps or duplicates at the split point");
});

test("keeps bisecting until every piece is under the threshold", async () => {
  const api = fakeApi(100, 28);
  const r = await fetchRange(api.get, len, "2026-10-04", "2026-11-01", 1000);
  assert.ok(r.parts.every((p) => p.count < 1000));
  assert.equal(r.parts.reduce((n, p) => n + p.count, 0), 2800);
});

test("accepts an oversized single day rather than looping", async () => {
  const api = fakeApi(1500, 1);
  const r = await fetchRange(api.get, len, "2026-10-04", "2026-10-05", 1000);
  assert.equal(r.parts[0].count, 1500);
  assert.equal(api.calls.length, 1);
});
