// The one cookie: `eqxc` holds the canonical filter query (handoff §7).
// Values are URI-encoded because the query contains commas, which aren't valid
// cookie octets (RFC 6265).

export const FILTER_COOKIE = "eqxc";
export const MAX_AGE_SECONDS = 400 * 24 * 3600; // browsers cap expiry at 400 days

export function readCookie(name: string, cookieString: string): string | null {
  for (const part of cookieString.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function serializeCookie(name: string, value: string, opts: { secure: boolean; maxAge?: number }): string {
  const maxAge = opts.maxAge ?? MAX_AGE_SECONDS;
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${opts.secure ? "; Secure" : ""}`;
}
