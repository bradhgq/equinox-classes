// Tiny zero-dependency web server for production:
//   /            the built app (web/dist)
//   /data/...    the downloader's JSON (data/index.json, data/clubs/*.json)
//   /prefs       re-issues the `eqxc` filter cookie as an HTTP cookie, so Safari's
//                7-day cap on script-set cookies doesn't wipe filters (critique C1)
//   /calendar.ics?<share query>
//                a search as a calendar subscription: an event when booking opens for
//                each matching class (see calendar.ts)
//
// Usage: node deploy/server.ts [--port 8080] [--web web/dist] [--data data] [--host 127.0.0.1]
// Put it behind your reverse proxy / tunnel (it speaks plain HTTP).

import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { parseArgs } from "node:util";
import { brotliCompressSync, constants as zlibConstants, gzipSync } from "node:zlib";
import { calendarFeed } from "./calendar.ts";

const { values: args } = parseArgs({
  options: {
    port: { type: "string", default: process.env.PORT ?? "8080" },
    host: { type: "string", default: process.env.HOST ?? "127.0.0.1" },
    web: { type: "string", default: process.env.WEB_DIR ?? "web/dist" },
    data: { type: "string", default: process.env.DATA_DIR ?? "data" },
  },
});

const WEB_DIR = resolve(args.web!);
const DATA_DIR = resolve(args.data!);
const COOKIE = "eqxc";
const COOKIE_MAX_AGE = 400 * 24 * 3600;

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".map", ".txt"]);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
};

/** Resolve a URL path inside a root directory, refusing anything that escapes it. */
function safePath(root: string, urlPath: string): string | null {
  const file = join(root, normalize(decodeURIComponent(urlPath)));
  return file.startsWith(root) ? file : null;
}

function readCookie(req: IncomingMessage, name: string): string | null {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

/** Echo the filter cookie back as a server-set cookie (value stays URI-encoded). */
function reissueCookie(req: IncomingMessage, res: ServerResponse) {
  const value = readCookie(req, COOKIE);
  if (!value) return;
  const secure = req.headers["x-forwarded-proto"] === "https" || (req.socket as { encrypted?: boolean }).encrypted;
  res.setHeader("Set-Cookie", `${COOKIE}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`);
}

function cacheControl(urlPath: string, ext: string): string {
  if (urlPath.startsWith("/assets/")) return "public, max-age=31536000, immutable"; // content-hashed
  if (urlPath.startsWith("/data/") || ext === ".html") return "no-cache"; // revalidate via ETag
  return "public, max-age=3600";
}

/**
 * Compressed bodies, kept per file until it changes: the club files change twice a day and the
 * assets never, so each is compressed once. Brotli runs at quality 5. The default, 11, cost about
 * 300 ms per club file and made a 42-club load take over 30 s; at 5 the size stays within a few
 * percent.
 */
const compressed = new Map<string, { mtimeMs: number; br?: Buffer; gzip?: Buffer }>();

async function compressedBody(file: string, mtimeMs: number, encoding: "br" | "gzip"): Promise<Buffer> {
  let entry = compressed.get(file);
  if (!entry || entry.mtimeMs !== mtimeMs) {
    entry = { mtimeMs };
    compressed.set(file, entry);
  }
  const cached = entry[encoding];
  if (cached) return cached;
  const raw = await readFile(file);
  const body =
    encoding === "br"
      ? brotliCompressSync(raw, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5, [zlibConstants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
      : gzipSync(raw);
  entry[encoding] = body;
  return body;
}

async function send(req: IncomingMessage, res: ServerResponse, file: string, urlPath: string) {
  const stat = statSync(file);
  const ext = extname(file);
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  res.setHeader("Content-Type", TYPES[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", cacheControl(urlPath, ext));
  res.setHeader("ETag", etag);
  res.setHeader("Vary", "Accept-Encoding");
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (ext === ".html") reissueCookie(req, res);
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304).end();
    return;
  }

  // index.html: make the link-preview image URL absolute for this host (crawlers need absolute URLs).
  if (ext === ".html") {
    const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
    const proto = req.headers["x-forwarded-proto"] ?? "http";
    // Vite emits "./og.png" (relative base); either form becomes absolute here.
    const html = (await readFile(file, "utf8")).replace(/content="\.?\/og\.png"/g, `content="${proto}://${host}/og.png"`);
    res.setHeader("Content-Length", Buffer.byteLength(html));
    res.end(req.method === "HEAD" ? undefined : html);
    return;
  }

  const accepts = String(req.headers["accept-encoding"] ?? "");
  const encoder = !COMPRESSIBLE.has(ext) ? null : accepts.includes("br") ? "br" : accepts.includes("gzip") ? "gzip" : null;
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  if (encoder) {
    const body = await compressedBody(file, stat.mtimeMs, encoder);
    res.setHeader("Content-Encoding", encoder);
    res.setHeader("Content-Length", body.length);
    res.end(body);
  } else {
    res.setHeader("Content-Length", stat.size);
    createReadStream(file).pipe(res);
  }
}

/** The subscription feed. Calendar apps poll it, so it revalidates cheaply via ETag. */
function sendCalendar(req: IncomingMessage, res: ServerResponse, query: string) {
  if (!existsSync(join(DATA_DIR, "index.json"))) {
    res.writeHead(503, { "Content-Type": "text/plain", "Retry-After": "600" }).end("no data yet\n");
    return;
  }
  const feed = calendarFeed(DATA_DIR, query);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="equinox-classes.ics"');
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("ETag", feed.etag);
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.headers["if-none-match"] === feed.etag) {
    res.writeHead(304).end();
    return;
  }
  const gzip = String(req.headers["accept-encoding"] ?? "").includes("gzip");
  const body = gzip ? gzipSync(feed.body) : Buffer.from(feed.body);
  if (gzip) res.setHeader("Content-Encoding", "gzip");
  res.setHeader("Content-Length", body.length);
  res.end(req.method === "HEAD" ? undefined : body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://x");
    const urlPath = url.pathname;
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    if (urlPath === "/prefs") {
      reissueCookie(req, res);
      res.writeHead(204, { "Cache-Control": "no-store" }).end();
      return;
    }
    if (urlPath === "/calendar.ics") return sendCalendar(req, res, url.search.slice(1));
    if (urlPath === "/healthz") {
      const ok = existsSync(join(DATA_DIR, "index.json"));
      res.writeHead(ok ? 200 : 503, { "Content-Type": "text/plain" }).end(ok ? "ok\n" : "no data yet\n");
      return;
    }
    const root = urlPath.startsWith("/data/") ? DATA_DIR : WEB_DIR;
    const rel = urlPath.startsWith("/data/") ? urlPath.slice("/data".length) : urlPath === "/" ? "/index.html" : urlPath;
    // Never expose the raw snapshot archive or reports, only the published JSON.
    if (root === DATA_DIR && !/^\/(index\.json|clubs\/[\w-]+\.json)$/.test(rel)) {
      res.writeHead(404).end();
      return;
    }
    const file = safePath(root, rel);
    if (file && existsSync(file) && statSync(file).isFile()) return await send(req, res, file, urlPath);
    res.writeHead(404, { "Content-Type": "text/plain" }).end("not found\n");
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500).end();
  }
});

server.listen(Number(args.port), args.host, () => {
  console.log(`equinox-classes on http://${args.host}:${args.port}  web=${WEB_DIR}  data=${DATA_DIR}`);
});
