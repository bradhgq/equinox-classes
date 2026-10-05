// Building and sending a share link (handoff §5.1, §7).

import type { Catalog } from "../../lib/catalog.ts";
import { encodeFilters } from "../../lib/filters/codec.ts";
import { shareSentence } from "../../lib/filters/summary.ts";
import type { Filters } from "../../lib/filters/types.ts";

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

export function buildSharePayload(filters: Filters, catalog: Catalog): SharePayload {
  const query = encodeFilters(filters, catalog);
  const url = `${location.origin}${location.pathname}${query ? `?${query}` : ""}`;
  return { title: "Equinox classes that fit", text: shareSentence(filters, catalog), url };
}

/** Phones and tablets get the system share sheet; desktops copy (owner round 5). */
const touchFirst = () => matchMedia("(pointer: coarse)").matches;

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/**
 * The share sheet (sentence + link) on touch devices that have one. Everywhere else, copy only
 * the link, so "Link copied" is exactly what's on the clipboard.
 */
export async function sharePayload(p: SharePayload): Promise<ShareResult> {
  if (touchFirst() && navigator.share && (!navigator.canShare || navigator.canShare(p))) {
    try {
      await navigator.share(p);
      return "shared";
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return "cancelled";
      // Fall through to copying (e.g. share blocked by permissions policy).
    }
  }
  try {
    await navigator.clipboard.writeText(p.url);
    return "copied";
  } catch {
    return "failed";
  }
}
