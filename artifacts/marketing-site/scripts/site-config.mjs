import { readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

const config = JSON.parse(readFileSync(new URL("../src/content/site-config.json", import.meta.url), "utf8"));
const origin = new URL(config.origin);
if (origin.protocol !== "https:" || origin.origin !== config.origin || origin.username || origin.password) {
  throw new Error("The marketing site requires one canonical HTTPS origin.");
}
if (!Array.isArray(config.publicPaths) || !config.publicPaths.includes("/") ||
    config.publicPaths.some(path => typeof path !== "string" || !/^\/[a-z/-]*$/.test(path)) ||
    new Set(config.publicPaths).size !== config.publicPaths.length) {
  throw new Error("Invalid public marketing paths.");
}

export const siteOrigin = origin.origin;
export const publicPaths = config.publicPaths;
export const expandSiteOrigin = text => text.replaceAll("__SITE_ORIGIN__", siteOrigin);

// Vite normally falls back to a successful SPA shell for missing URLs. Keep local
// navigation consistent with production static hosting without intercepting modules.
export function navigationMiddleware(notFoundHtml, rewriteKnownRoutes = false, staticDir) {
  return (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;
    if (/^\/(?:@|src\/|node_modules\/)/.test(pathname)) return next();
    if (staticDir) {
      try {
        const file = resolve(staticDir, `.${decodeURIComponent(pathname)}`);
        if (file.startsWith(`${resolve(staticDir)}${sep}`) && statSync(file).isFile()) return next();
      } catch { /* Missing files continue to the normal navigation check. */ }
    }
    const route = pathname.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";
    if (publicPaths.includes(route) || pathname === "/index.html") {
      if (rewriteKnownRoutes) req.url = `/index.html${url.search}`;
      return next();
    }
    if (pathname === "/404.html" ||
        (extname(pathname) && !req.headers.accept?.includes("text/html"))) return next();
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Robots-Tag", "noindex");
    res.end(req.method === "HEAD" ? undefined : notFoundHtml);
  };
}
