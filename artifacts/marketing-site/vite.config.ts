import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { readFileSync } from "node:fs";
import { expandSiteOrigin, navigationMiddleware } from "./scripts/site-config.mjs";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  appType: "mpa",
  plugins: [
    {
      name: "marketing-canonical-and-not-found",
      transformIndexHtml: expandSiteOrigin,
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
          const types = { "/robots.txt": "text/plain", "/sitemap.xml": "application/xml", "/llms.txt": "text/plain" };
          if (!(pathname in types)) return next();
          res.setHeader("Content-Type", `${types[pathname as keyof typeof types]}; charset=utf-8`);
          res.end(expandSiteOrigin(readFileSync(path.resolve(import.meta.dirname, `public${pathname}`), "utf8")));
        });
        server.middlewares.use(navigationMiddleware(
          readFileSync(path.resolve(import.meta.dirname, "public/404.html"), "utf8"), true,
          path.resolve(import.meta.dirname, "public"),
        ));
      },
      configurePreviewServer(server) {
        server.middlewares.use(navigationMiddleware(
          readFileSync(path.resolve(import.meta.dirname, "dist/public/404.html"), "utf8"),
          false, path.resolve(import.meta.dirname, "dist/public"),
        ));
      },
    },
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
