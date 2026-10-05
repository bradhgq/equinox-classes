// Links for subscribing to a search in a calendar app. The feed itself is the server's
// /calendar.ics (deploy/calendar.ts); its query is the same one share links use.

import type { Catalog } from "../../lib/catalog.ts";
import { encodeFilters } from "../../lib/filters/codec.ts";
import type { Filters } from "../../lib/filters/types.ts";

export interface FeedLinks {
  /** Plain URL, for "Copy link" (Outlook and other apps take it as "subscribe from web"). */
  https: string;
  /** Opens the system calendar's subscribe prompt (Apple Calendar; Outlook on Windows). */
  webcal: string;
  /** Google Calendar's "add by URL" page with this feed filled in. */
  google: string;
}

export function feedLinks(filters: Filters, catalog: Catalog, page: string = location.href): FeedLinks {
  const feed = new URL("calendar.ics", page); // beside the app, whatever path it's served under
  feed.search = encodeFilters(filters, catalog);
  const https = feed.toString();
  const webcal = https.replace(/^https?:/, "webcal:");
  return { https, webcal, google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}` };
}

/**
 * Who can fetch a feed served from this host. Calendar apps fetch it themselves (Google from its
 * own servers), so a preview on this computer or this network is out of reach for some of them.
 */
export function previewScope(host: string = location.hostname): "computer" | "network" | null {
  if (/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(host)) return "computer";
  if (/\.local$|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) return "network";
  return null;
}
