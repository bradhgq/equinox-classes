// Equinox class downloader: fetch (API -> new raw snapshot) then build (newest
// complete snapshot -> static JSON for the web app). Details: downloader/README.md.

import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { runBuild, type BuildSummary } from "./build.ts";
import { runFetch } from "./fetch.ts";
import { formatBytes } from "./io.ts";
import type { Manifest } from "./snapshots.ts";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_DAYS = 42;
/** Exit non-zero when more than this share of clubs failed to fetch. */
const MAX_FAILED_SHARE = 0.1;
const EXIT = { ok: 0, error: 1, usage: 2, fetchFailures: 3, publishRefused: 4 } as const;

const HELP = `Usage: node downloader/download.ts [options]

Fetches every open Equinox club's class schedule into a new raw snapshot
(<raw>/<UTC time>/), then builds the static JSON the web app reads
(index.json, clubs/<id>.json) plus reports, from the newest complete snapshot.

Options:
  --out <dir>        Output root (default: <repo>/data)
  --raw <dir>        Raw snapshot archive (default: <out>/raw)
  --build-only       Skip the API; rebuild from the newest complete snapshot
  --snapshot <name>  Build from this snapshot instead (implies --build-only)
  --fetch-only       Write a snapshot; do not touch the published output
  --clubs <ids>      Fetch only these facility ids, e.g. 112,138; the build
                     takes every other club from older snapshots
  --days <n>         Club-local days to request starting today (default ${DEFAULT_DAYS};
                     Equinox publishes ~4 weeks, later days come back empty)
  --force            Publish even if the class count fell by more than half
  -h, --help         Show this help

Exit codes: 0 ok; 1 error; 2 bad usage; 3 more than ${MAX_FAILED_SHARE * 100}% of clubs failed to
fetch (output still built, failed clubs from older snapshots); 4 publish refused
by the drop check (old output kept).`;

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => [])) {
    if (e.isFile()) total += (await stat(join(e.parentPath, e.name))).size;
  }
  return total;
}

function fetchSummary(m: Manifest, log: (s: string) => void): void {
  const attempted = Object.keys(m.clubs).length;
  const seconds = (Date.parse(m.finishedAt) - Date.parse(m.startedAt)) / 1000;
  const classes = Object.values(m.clubs).reduce((n, c) => n + c.classes, 0);
  log(
    `fetch:   snapshot ${m.snapshot}: ${m.summary.ok}/${attempted} clubs ok, ${m.summary.failed.length} failed; ${classes} classes; ` +
      `${m.http.requests} HTTP requests (${m.http.retries} retries); ${formatBytes(m.bytes.json)} received, ` +
      `${formatBytes(m.bytes.gzip)} stored; ${seconds.toFixed(1)}s`,
  );
  if (m.facilities.note) log(`  facilities: ${m.facilities.note}`);
  for (const id of m.summary.failed) {
    const c = m.clubs[id];
    log(`  failed: ${id} ${c.name}: ${c.error}; build uses ${c.fallback ?? "nothing (never fetched)"}`);
  }
  const last = Object.entries(m.horizon.lastDates).map(([d, n]) => `${d} x${n}`);
  log(`  last class date per club: ${last.join(", ") || "none"}; ${m.summary.empty.length} clubs without classes`);
  const atEdge = Object.values(m.clubs).filter((c) => c.ok && c.lastDate !== null && c.lastDate === c.range?.end);
  if (atEdge.length) {
    log(`WARN ${atEdge.length} clubs have classes on the last requested day; the published horizon may reach past --days ${m.days}`);
  }
}

function buildSummary(b: BuildSummary, log: (s: string) => void): void {
  log(
    `build:   snapshot ${b.snapshot}: ${b.clubs} clubs (${b.clubsWithClasses} with classes); ${b.totalClasses} classes; ` +
      `horizon ${b.horizon.start}..${b.horizon.end}; ${b.fallbacks.length} clubs from older snapshots; ${b.warnings.length} warnings`,
  );
  log(`publish: ${b.decision.publish ? "yes" : "REFUSED"} (${b.decision.reason})`);
  if (b.decision.publish) {
    const f = b.files;
    log(
      `output:  index.json ${formatBytes(f.index)}; clubs/ ${f.clubFiles} files ${formatBytes(f.clubsTotal)}` +
        (f.largest ? ` (largest ${f.largest.name} ${formatBytes(f.largest.bytes)})` : "") +
        (f.removed.length ? `; removed ${f.removed.join(", ")}` : ""),
    );
  }
}

async function main(argv: string[]): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        out: { type: "string" },
        raw: { type: "string" },
        "build-only": { type: "boolean", default: false },
        snapshot: { type: "string" },
        "fetch-only": { type: "boolean", default: false },
        clubs: { type: "string" },
        days: { type: "string" },
        force: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    }));
  } catch (err) {
    console.error(`${(err as Error).message}\n\n${HELP}`);
    return EXIT.usage;
  }
  if (values.help) {
    console.log(HELP);
    return EXIT.ok;
  }
  const usage = (msg: string) => {
    console.error(`${msg}\n\n${HELP}`);
    return EXIT.usage;
  };
  const buildOnly = values["build-only"] || values.snapshot !== undefined;
  if (buildOnly && values["fetch-only"]) return usage("--fetch-only cannot be combined with --build-only or --snapshot");
  if (buildOnly && (values.clubs !== undefined || values.days !== undefined)) return usage("--clubs and --days only apply when fetching");
  const days = values.days === undefined ? DEFAULT_DAYS : Number(values.days);
  if (!Number.isInteger(days) || days < 1 || days > 366) return usage(`--days must be an integer from 1 to 366, got ${values.days}`);
  const clubIds = values.clubs
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (clubIds && (clubIds.length === 0 || clubIds.some((id) => !/^\d+$/.test(id)))) {
    return usage(`--clubs takes comma-separated numeric facility ids, got ${values.clubs}`);
  }

  const outDir = values.out ? resolve(values.out) : join(REPO_ROOT, "data");
  const rawDir = values.raw ? resolve(values.raw) : join(outDir, "raw");
  const log = (msg: string) => console.log(msg);
  const t0 = Date.now();
  log(`equinox downloader: out=${outDir} raw=${rawDir}`);

  const manifest = buildOnly ? null : await runFetch({ rawDir, days, clubIds, log });
  const built = values["fetch-only"] ? null : await runBuild({ outDir, rawDir, snapshot: values.snapshot, force: values.force, log });

  log("");
  log("== summary ==");
  let code: number = EXIT.ok;
  if (manifest) {
    fetchSummary(manifest, log);
    const attempted = Object.keys(manifest.clubs).length;
    if (attempted && manifest.summary.failed.length / attempted > MAX_FAILED_SHARE) code = EXIT.fetchFailures;
  }
  if (built) {
    buildSummary(built, log);
    if (!built.decision.publish) code = EXIT.publishRefused;
  }
  log(`raw archive: ${formatBytes(await dirSize(rawDir))} on disk`);
  log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s, exit ${code}`);
  return code;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (err) {
  console.error(`FATAL ${(err as Error)?.stack ?? String(err)}`);
  process.exitCode = EXIT.error;
}
