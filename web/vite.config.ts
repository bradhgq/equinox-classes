import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";

// In production the server serves the downloader's output at /data next to the
// built app. In dev, mirror that by streaming ../data (repo root) at /data.
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
