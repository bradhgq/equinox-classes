import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { calendarFeed } from "../deploy/calendar.ts";

// In production the server serves the downloader's output at /data next to the
// built app, plus /calendar.ics. In dev, mirror both from ../data (repo root).
const DATA_DIR = resolve(__dirname, "../data");

function serveData(): Plugin {
  return {
    name: "serve-data",
    configureServer(server) {
      server.middlewares.use("/data", (req, res, next) => {
        const rel = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]));
        const file = join(DATA_DIR, rel);
        if (!file.startsWith(DATA_DIR) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("Content-Type", file.endsWith(".json") ? "application/json" : "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        createReadStream(file).pipe(res);
      });
      // The calendar subscription feed, rendered by the same code as the production server.
      server.middlewares.use("/calendar.ics", (req, res) => {
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.end(calendarFeed(DATA_DIR, (req.url ?? "").split("?")[1] ?? "").body);
      });
    },
  };
}

export default defineConfig({
  // Relative asset URLs so the app also works when hosted under a sub-path.
  base: "./",
  plugins: [preact(), serveData()],
  build: { target: "es2022", sourcemap: true },
  server: { port: 5173 },
});
