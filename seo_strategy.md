# SEO Strategy

## In scope
- Public marketing pages in `artifacts/marketing-site`
  - `/`
  - `/pricing`
  - `/contact`
  - `/signup`
  - `/privacy`
  - `/terms`
  - Any other publicly linked marketing routes

## Out of scope
- Authenticated product application routes under the Career Passport app (`artifacts/career-passport`) such as dashboard, employees, candidates, billing, and settings
- Tokenized utility/share flows under the Career Passport app (`/share/:token`, `/peer-review/:token`, `/self-reflection/:token`, `/accept-invite/:token`) because they appear to be private or invitation-based surfaces rather than pages intended to rank in search
- Admin/internal APIs in `artifacts/api-server`

## Target audience
- HR leaders, people operations teams, and hiring/performance stakeholders evaluating performance management software

## Primary keywords
- performance management software
- HR performance reviews
- employee development plans
- candidate assessments
- performance intelligence

## Dismissed categories
- (None yet)

## Notes
- Current public site architecture is a Vite + React app with a custom prerender step that writes route-specific `<head>` tags into static HTML files.
- Public route bodies are still client-rendered only; the built HTML contains route-specific metadata but not server-rendered H1/body content.
- Current machine-readable host signals are inconsistent: prerendered canonicals default to `provenpath.app`, while `robots.txt`, `sitemap.xml`, and `llms.txt` point to `provenpath.fyi`.
