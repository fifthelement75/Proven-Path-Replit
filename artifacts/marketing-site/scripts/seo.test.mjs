import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { siteOrigin, publicPaths, navigationMiddleware } from "./site-config.mjs";

const dist = new URL("../dist/public/", import.meta.url);
const readBuilt = file => readFileSync(new URL(file, dist), "utf8");

test("all built marketing routes use the configured canonical origin", () => {
  for (const path of publicPaths) {
    const html = readBuilt(path === "/" ? "index.html" : `${path.slice(1)}/index.html`);
    const canonical = `${siteOrigin}${path}`;
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}"`), path);
    assert.ok(html.includes(`<meta property="og:url" content="${canonical}"`), path);
    assert.ok(html.includes(`"${siteOrigin}/#organization"`), path);
    assert.ok(html.includes(`"${siteOrigin}/#website"`), path);
    assert.ok(html.includes(`${siteOrigin}/opengraph.jpg`), path);
    assert.ok(!html.includes("__SITE_ORIGIN__"), path);
    assert.ok(!html.split("</head>")[0].includes("provenpath.fyi"), path);
  }
});

test("every public route contains its own visible heading, main copy, and crawlable links without JavaScript", () => {
  const expectedCopy = {
    "/": "Performance Intelligence That Powers",
    "/pricing": "Pricing Built for Modern HR Teams",
    "/contact": "Book a Demo",
    "/signup": "Coming Soon",
    "/privacy": "Privacy Policy",
    "/terms": "Terms of Service",
    "/blog": "Blog",
    "/security": "Security",
  };
  for (const path of publicPaths) {
    const html = readBuilt(path === "/" ? "index.html" : `${path.slice(1)}/index.html`);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, path);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, path);
    assert.match(html, /<div id="root"><.+/);
    assert.ok(html.includes(expectedCopy[path]), path);
    assert.match(html, /<a\b[^>]*href="\//, path);
    assert.ok(!/style="[^"]*(?:opacity:0(?:[;"]|$)|visibility:hidden|display:none)/.test(html), path);
  }
  const home = readBuilt("index.html");
  assert.ok(home.includes("every hiring and promotion decision is backed by verified data"));
  const pricing = readBuilt("pricing/index.html");
  assert.ok(pricing.includes("$9.99") && pricing.includes("$29") && pricing.includes("7-day free trial"));
  assert.ok(readBuilt("contact/index.html").includes('id="firstName"'));
  assert.ok(readBuilt("terms/index.html").includes("Professional Plan includes a 7-day free trial"));
});

test("the waitlist email has a visible associated label in generated markup", () => {
  const html = readBuilt("signup/index.html");
  assert.match(html, /<label\b[^>]*\bfor="waitlist-email"[^>]*>Work email<\/label>/);
  const emailInput = html.match(/<input\b[^>]*\btype="email"[^>]*>/)?.[0];
  assert.ok(emailInput, "the waitlist email input is rendered");
  assert.match(emailInput, /\bid="waitlist-email"/);
  assert.match(emailInput, /\bplaceholder="you@company.com"/);
  assert.equal((html.match(/\bid="waitlist-email"/g) ?? []).length, 1);
});

test("crawler discovery files use the same origin and reference generated pages", () => {
  for (const file of ["robots.txt", "sitemap.xml", "llms.txt"]) {
    const content = readBuilt(file);
    assert.ok(content.includes(siteOrigin), file);
    assert.ok(!content.includes("__SITE_ORIGIN__"), file);
    for (const url of content.matchAll(/https:\/\/[^\s<]+/g)) {
      assert.equal(new URL(url[0]).origin, siteOrigin, file);
    }
  }
  const sitemap = readBuilt("sitemap.xml");
  for (const [, url] of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
    assert.ok(publicPaths.includes(new URL(url).pathname), url);
  }
});

test("production has a dedicated noindex 404 and no homepage catch-all rewrite", () => {
  const notFound = readBuilt("404.html");
  assert.match(notFound, /404 — Page not found/);
  assert.match(notFound, /name="robots" content="noindex, follow"/);
  assert.ok(!notFound.includes("<script"));
  assert.ok(!notFound.includes('rel="canonical"'));
  const artifact = readFileSync(new URL("../.replit-artifact/artifact.toml", import.meta.url), "utf8");
  assert.ok(!artifact.includes("services.production.rewrites"));
});

test("navigation returns HTTP 404, handles HEAD, and preserves known routes and files", async () => {
  const middleware = navigationMiddleware(readBuilt("404.html"), true, fileURLToPath(dist));
  const server = createServer((req, res) => middleware(req, res, () => res.end(req.url)));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const missing = await fetch(`${base}/not-a-real-page`, { headers: { accept: "text/html" } });
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get("x-robots-tag"), "noindex");
    assert.match(await missing.text(), /404 — Page not found/);
    const head = await fetch(`${base}/not-a-real-page`, { method: "HEAD" });
    assert.equal(head.status, 404);
    assert.equal(await head.text(), "");
    const known = await fetch(`${base}/pricing`, { headers: { accept: "text/html" } });
    assert.equal(known.status, 200);
    assert.equal(await known.text(), "/index.html");
    const asset = await fetch(`${base}/favicon.png`, { headers: { accept: "text/html" } });
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), "/favicon.png");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
