// Class-name -> family rules for the class filter (see ClassFamily in schema.ts).
//
// Equinox names classes "Format" or "Prefix: Variant". For most prefixes the
// variant is a real, recurring format worth filtering on ("Rounds: Boxing",
// "Swim: Pro"), so the full name is the family. Two exceptions, curated from a
// full download (docs/class-families.md has the evidence):
//
// - COLLAPSE_PREFIXES: the variant is a one-off title ("THEME RIDE: Charli XCX
//   x Rufus Du Sol"), so every variant folds into one family named after the prefix.
// - STRIP_PREFIXES: the prefix is a club's label on its own formats
//   ("W76th: Hot Vinyasa Yoga"), so the family is the part after the colon.
//
// Keys are cleaned, lower-cased prefixes.

export const COLLAPSE_PREFIXES: Readonly<Record<string, string>> = {
  "theme ride": "Theme Ride",
  "beats + bands ride": "Beats + Bands Ride",
};

export const STRIP_PREFIXES: ReadonlySet<string> = new Set(["w76th"]);

/** Strip trademark marks and normalize whitespace: "Precision Run®" -> "Precision Run". */
export function cleanName(name: string): string {
  return name.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
}

export function slugify(s: string): string {
  return cleanName(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The prefix of "Prefix: Variant", or null when the name has no colon. */
export function prefixOf(name: string): string | null {
  const clean = cleanName(name);
  const i = clean.indexOf(":");
  return i > 0 ? clean.slice(0, i).trim() : null;
}

/** The part after "Prefix:" ("" when there is nothing after it). */
function variantOf(name: string): string {
  const clean = cleanName(name);
  return clean.slice(clean.indexOf(":") + 1).trim();
}

/** "THEME RIDE" -> "Theme Ride". Single words stay ("PGX", "HIIT" are acronyms); mixed case is left alone. */
function titleCaseIfShouting(s: string): string {
  if (!s.includes(" ") || !/[A-Z]{2}/.test(s) || s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Family key and a display-name candidate for one class name. When several
 * spellings share a key ("Precision Run®" / "Precision Run"), callers pick the
 * most common candidate.
 */
export function familyOf(name: string): { key: string; name: string } {
  const clean = cleanName(name);
  const prefix = prefixOf(clean);
  if (prefix) {
    const lower = prefix.toLowerCase();
    if (STRIP_PREFIXES.has(lower) && variantOf(clean)) return familyOf(variantOf(clean));
    const collapsed = COLLAPSE_PREFIXES[lower];
    if (collapsed) return { key: slugify(collapsed), name: collapsed };
  }
  return { key: slugify(clean), name: clean };
}

/**
 * How a single class is labelled in the UI: cleaned, club labels stripped, and
 * shouted prefixes calmed ("THEME RIDE: Haunted Beats" -> "Theme Ride: Haunted Beats").
 */
export function displayName(name: string): string {
  const clean = cleanName(name);
  const prefix = prefixOf(clean);
  if (!prefix) return clean;
  const variant = variantOf(clean);
  if (STRIP_PREFIXES.has(prefix.toLowerCase()) && variant) return displayName(variant);
  const calm = titleCaseIfShouting(prefix);
  return variant ? `${calm}: ${variant}` : calm;
}
