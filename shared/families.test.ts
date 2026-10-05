import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, displayName, familyOf, prefixOf, slugify } from "./families.ts";

test("one-off titles under a collapsed prefix share one family", () => {
  assert.deepEqual(familyOf("THEME RIDE: Charli XCX x Rufus Du Sol"), { key: "theme-ride", name: "Theme Ride" });
  assert.deepEqual(familyOf("Theme Ride: Y2K"), { key: "theme-ride", name: "Theme Ride" });
});

test("stable formats keep their full name", () => {
  assert.deepEqual(familyOf("Rounds: Boxing"), { key: "rounds-boxing", name: "Rounds: Boxing" });
  assert.deepEqual(familyOf("Swim: Skills + Drills"), { key: "swim-skills-plus-drills", name: "Swim: Skills + Drills" });
});

test("trademark marks and spacing don't split families", () => {
  assert.equal(familyOf("Precision Run®").key, familyOf("Precision Run").key);
  assert.equal(cleanName("  Sculpted   Yoga™ "), "Sculpted Yoga");
});

test("a themed variant of a standalone format folds into it", () => {
  assert.equal(familyOf("Beats + Bands Ride: Rufus x ODESZA").key, familyOf("Beats + Bands Ride").key);
  assert.equal(familyOf("THEME RIDE: ").key, "theme-ride"); // empty title still folds
});

test("club labels are stripped from the family", () => {
  assert.deepEqual(familyOf("W76th: Hot Vinyasa Yoga"), { key: "hot-vinyasa-yoga", name: "Hot Vinyasa Yoga" });
});

test("seasonal prefixes stay separate (their variants span categories)", () => {
  assert.equal(familyOf("Halloween: Ghost Ride").key, "halloween-ghost-ride");
});

test("display names", () => {
  assert.equal(displayName("THEME RIDE: Haunted Beats"), "Theme Ride: Haunted Beats");
  assert.equal(displayName("THEME RIDE: "), "Theme Ride");
  assert.equal(displayName("W76th: Hot Power Yoga"), "Hot Power Yoga");
  assert.equal(displayName("Rounds: Boxing"), "Rounds: Boxing");
  assert.equal(displayName("Precision Run®"), "Precision Run");
  assert.equal(displayName("PGX: Playground Experience"), "PGX: Playground Experience");
});

test("helpers", () => {
  assert.equal(prefixOf("True Barre: Off the Barre"), "True Barre");
  assert.equal(prefixOf("Vinyasa Yoga"), null);
  assert.equal(slugify("Beats & Bands Ride"), "beats-and-bands-ride");
});
