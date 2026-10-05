import assert from "node:assert/strict";
import { test } from "node:test";
import { decidePublish } from "./sanity.ts";

test("publishes the first build", () => {
  assert.equal(decidePublish(null, 54_000, false).publish, true);
});

test("publishes normal fluctuations and growth", () => {
  assert.equal(decidePublish(54_000, 50_000, false).publish, true);
  assert.equal(decidePublish(54_000, 90_000, false).publish, true);
  assert.equal(decidePublish(54_000, 27_000, false).publish, true); // exactly half is still allowed
});

test("refuses a drop of more than half", () => {
  const d = decidePublish(54_000, 26_999, false);
  assert.equal(d.publish, false);
  assert.match(d.reason, /more than half/);
  assert.match(d.reason, /54000 -> 26999/);
});

test("refuses an empty build, even without a previous index", () => {
  assert.equal(decidePublish(null, 0, false).publish, false);
  assert.equal(decidePublish(54_000, 0, false).publish, false);
});

test("--force overrides", () => {
  assert.equal(decidePublish(54_000, 10, true).publish, true);
  assert.equal(decidePublish(null, 0, true).publish, true);
  assert.match(decidePublish(54_000, 10, true).reason, /--force/);
});

test("a previous index with zero classes is no baseline", () => {
  assert.equal(decidePublish(0, 10, false).publish, true);
});
