// Where filters live between visits (handoff §7):
// - the `eqxc` cookie holds the canonical query string;
// - after writing it, we ask the server to re-issue it (GET ./prefs) so it
//   becomes a server-set cookie, which Safari doesn't cap at 7 days;
// - a shared link being viewed (not yet kept) lives in sessionStorage so a
//   reload keeps showing it.

import { FILTER_COOKIE, readCookie, serializeCookie } from "../lib/cookie.ts";

const VIEW_KEY = "eqxc_view";

export function readSavedQuery(): string {
  return readCookie(FILTER_COOKIE, document.cookie) ?? "";
}

export function writeSavedQuery(query: string): void {
  const secure = location.protocol === "https:";
  document.cookie = query
    ? serializeCookie(FILTER_COOKIE, query, { secure })
    : serializeCookie(FILTER_COOKIE, "", { secure, maxAge: 0 });
  refreshServerCookie();
}

/** Best effort: a static host without /prefs just 404s and we keep the script-set cookie. */
export function refreshServerCookie(): void {
  fetch("./prefs", { credentials: "same-origin", cache: "no-store" }).catch(() => {});
}

export function readTemporaryView(): string | null {
  try {
    return sessionStorage.getItem(VIEW_KEY);
  } catch {
    return null;
  }
}

export function writeTemporaryView(query: string | null): void {
  try {
    if (query === null) sessionStorage.removeItem(VIEW_KEY);
    else sessionStorage.setItem(VIEW_KEY, query);
  } catch {
    // Private mode or storage disabled: the view just won't survive a reload.
  }
}

/** Read a shared link from the address bar and immediately clean the URL (absorb it). */
export function takeSharedQuery(): string | null {
  const query = location.search.replace(/^\?/, "");
  if (!query) return null;
  history.replaceState(history.state, "", location.pathname + location.hash);
  return query;
}
