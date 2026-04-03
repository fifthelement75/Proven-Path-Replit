# Workspace

## Overview

Career Passport — a full-stack performance management platform. Companies register, track employees through structured performance reviews (self/peer/manager), log continuous 1:1 feedback, generate AI-powered development plans, and share read-only employee profile links.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite (artifacts/career-passport)
- **Backend**: Express 5 (artifacts/api-server, port 8080)
- **Database**: PostgreSQL + Drizzle ORM (@workspace/db)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`, Orval-generated Zod schemas
- **Auth**: JWT (jsonwebtoken), bcryptjs — token stored in localStorage as `career_passport_token`
- **AI**: OpenAI gpt-5.2 via @workspace/integrations-openai-ai-server (dev plan generation)
- **Charts**: Recharts (radar, bar, line charts)
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- **Build**: esbuild (API server)

## Architecture

```
artifacts/
  api-server/          # Express REST API (port 8080)
    src/routes/        # auth, companies, employees, reviews, feedback, devplan, share
    src/middlewares/   # auth.ts (JWT requireAuth)
  career-passport/     # React+Vite frontend (port 23852, previewPath "/")
    src/pages/         # login, register, dashboard, employees, employee-detail, share
    src/contexts/      # AuthContext (JWT state)
    src/components/    # layout, ui/* (shadcn components)
lib/
  db/                  # Drizzle schema (companies, employees, reviews, feedback, devplans, sharelinks)
  api-spec/            # OpenAPI spec source of truth
  api-zod/             # Orval-generated Zod validators
  api-client-react/    # Orval-generated React Query hooks + custom-fetch.ts
  integrations-openai-ai-server/  # OpenAI client via Replit integration
```

## Key Features

- **Auth**: Company register/login with JWT — `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Employees**: CRUD with search/filter by department+level, score tracking, manager relationships
- **Reviews**: 3 types (self/peer/manager), 5 competencies scored 1-5, period tracking
- **Feedback**: 1:1 feedback log with meeting types, action items, employee responses
- **Dev Plans**: AI-generated from review+feedback data, skill tracking with completion checkboxes
- **Share Links**: Read-only shareable profiles with configurable expiry (7days/30days/never)
- **Dashboard**: Company health stats, competency radar chart, department bar chart, activity feed

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Vite Proxy

The career-passport Vite dev server proxies `/api/*` to `http://localhost:8080`. This is configured in `artifacts/career-passport/vite.config.ts`.

## Demo Account

- Email: admin@acme.com
- Password: demo1234
- Pre-seeded with 5 employees, 6 performance reviews, 4 feedback sessions

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
