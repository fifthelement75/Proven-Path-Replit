/**
 * Prerender script — generates per-route HTML files from the Vite build output.
 *
 * Each public marketing route gets its own dist/public/{route}/index.html with
 * route-specific <title>, <meta name="description">, <link rel="canonical">,
 * og:*, and twitter:* tags baked in, so social bots and non-JS crawlers see
 * the correct metadata without needing to execute JavaScript.
 *
 * Usage (runs automatically via `pnpm build`):
 *   node scripts/prerender.mjs
 *
 * Canonical origin: src/content/site-config.json (shared with Vite and the client).
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { siteOrigin, publicPaths, expandSiteOrigin } from "./site-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const trialPolicy = JSON.parse(
  readFileSync(join(__dirname, "../src/content/trial-policy.json"), "utf-8"),
);
if (!Number.isSafeInteger(trialPolicy.durationDays) || trialPolicy.durationDays < 1) {
  throw new Error("Invalid marketing trial duration.");
}
const distDir = join(__dirname, "../dist/public");
const siteUrl = siteOrigin;
const ogImageAlt = "Proven Path dashboard and performance intelligence preview";

const routes = [
  {
    path: "/",
    title: "Proven Path — Performance Intelligence for Modern HR Teams",
    description:
      "AI-powered performance intelligence for HR teams. Run structured interviews, 360° reviews, and skill assessments with verified data that powers better hiring, retention, and growth.",
  },
  {
    path: "/pricing",
    title: "Pricing — Proven Path | Performance Management for Growing Teams",
    description:
      `Start a ${trialPolicy.durationDays}-day free trial with no credit card required. Professional is $9.99/month; Team is $29/user/month with a 10-user minimum.`,
    ldJson: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I switch plans anytime?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, upgrade or downgrade anytime"
          }
        },
        {
          "@type": "Question",
          "name": "Is there a free trial?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes — every new account gets a ${trialPolicy.durationDays}-day free trial of the Professional plan with no credit card required.`
          }
        },
        {
          "@type": "Question",
          "name": "What payment methods do you accept?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Credit card, PayPal, invoice (Enterprise)"
          }
        },
        {
          "@type": "Question",
          "name": "Can I cancel anytime?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, no long-term contracts"
          }
        }
      ]
    },
  },
  {
    path: "/contact",
    title: "Book a Demo — Proven Path | Talk to Our HR Performance Experts",
    description:
      "See how Proven Path helps your HR team make data-driven hiring, promotion, and retention decisions. Book a personalized demo with our team today.",
  },
  {
    path: "/signup",
    title: "Join the Waitlist — Proven Path | Private Beta",
    description:
      "Proven Path is currently in private beta. Join the waitlist and be the first to know when we open up to new HR teams.",
  },
  {
    path: "/blog",
    title: "Blog — Proven Path",
    description:
      "Proven Path — performance intelligence for modern HR teams. This page is coming soon.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy — Proven Path",
    description:
      "Read the Proven Path privacy policy. Learn how we collect, use, and protect your data on our HR performance intelligence platform.",
  },
  {
    path: "/terms",
    title: "Terms of Service — Proven Path",
    description:
      "Read the Proven Path terms of service. Understand the rules and agreements that govern your use of our HR performance intelligence platform.",
  },
  {
    path: "/security",
    title: "Security — Proven Path",
    description:
      "Proven Path — performance intelligence for modern HR teams. This page is coming soon.",
  },
];

function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function patchHtml(html, { title, description, canonicalUrl, pageUrl, ldJson }) {
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  const alt = escapeAttr(ogImageAlt);

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`);

  html = html.replace(
    /(<meta name="description" content=")[^"]*"/,
    `$1${d}"`,
  );

  html = html.replace(/(<meta property="og:title" content=")[^"]*"/, `$1${t}"`);
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*"/,
    `$1${d}"`,
  );
  html = html.replace(
    /(<meta property="og:image:alt" content=")[^"]*"/,
    `$1${alt}"`,
  );
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*"/,
    `$1${escapeAttr(pageUrl)}"`,
  );

  html = html.replace(
    /(<meta name="twitter:title" content=")[^"]*"/,
    `$1${t}"`,
  );
  html = html.replace(
    /(<meta name="twitter:description" content=")[^"]*"/,
    `$1${d}"`,
  );
  html = html.replace(
    /(<meta name="twitter:image:alt" content=")[^"]*"/,
    `$1${alt}"`,
  );

  html = html.replace(
    /(<link rel="canonical" href=")[^"]*"/,
    `$1${escapeAttr(canonicalUrl)}"`,
  );

  if (ldJson) {
    const block = `\n    <script type="application/ld+json">\n    ${JSON.stringify(ldJson, null, 2).replace(/\n/g, "\n    ")}\n    </script>`;
    html = html.replace("</head>", `${block}\n  </head>`);
  }

  return html;
}

if (JSON.stringify(routes.map(route => route.path).sort()) !== JSON.stringify([...publicPaths].sort())) {
  throw new Error("Public marketing routes and prerender routes must match.");
}
const templateHtml = expandSiteOrigin(readFileSync(join(distDir, "index.html"), "utf-8"));

for (const file of ["robots.txt", "sitemap.xml", "llms.txt"]) {
  const template = readFileSync(join(__dirname, "../public", file), "utf-8");
  writeFileSync(join(distDir, file), expandSiteOrigin(template), "utf-8");
}

for (const route of routes) {
  const canonicalUrl = `${siteUrl}${route.path === "/" ? "/" : route.path}`;
  const pageUrl = canonicalUrl;

  const patched = patchHtml(templateHtml, {
    title: route.title,
    description: route.description,
    canonicalUrl,
    pageUrl,
    ldJson: route.ldJson,
  });

  if (route.path === "/") {
    writeFileSync(join(distDir, "index.html"), patched, "utf-8");
    console.log(`  / → dist/public/index.html`);
  } else {
    const routeDir = join(distDir, route.path.replace(/^\//, ""));
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(join(routeDir, "index.html"), patched, "utf-8");
    console.log(`  ${route.path} → dist/public${route.path}/index.html`);
  }
}

console.log(`\nPrerender complete — ${routes.length} routes generated.`);
