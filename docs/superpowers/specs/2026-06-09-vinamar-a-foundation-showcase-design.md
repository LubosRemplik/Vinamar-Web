# Sub-project A — Foundation & Showcase

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Parent:** [System Architecture & Decomposition](./2026-06-09-vinamar-system-architecture-design.md)
**Depends on:** —

## 1. Goal

Deliver the walking skeleton plus the public showcase: a containerized NestJS (onion) + Next.js + PostgreSQL stack that runs with one command, and four statically-rendered Czech showcase pages styled in the **Warm Mediterranean** direction. No booking, flights, optimizer, or admin yet — those are B/C/D. This sub-project establishes the structure, conventions, and patterns that B/C/D copy.

## 2. Scope

### In scope
- docker-compose stack: `web` (Next.js), `api` (NestJS), `db` (PostgreSQL)
- NestJS onion skeleton with DI conventions, CQRS-lite handler+controller pattern, typed domain errors → RFC-7807 problem-detail responses
- Raw-SQL persistence wiring: `pg` connection pool + `node-pg-migrate` versioned `.sql` migration runner
- `GET /api/health` endpoint verifying DB connectivity (the reference vertical slice through every layer)
- Next.js App Router app with four showcase pages, markdown-driven content, placeholder imagery, Warm Mediterranean theme
- Tests across all layers (see §7)
- README documenting run, conventions, and the photo/content drop-in process

### Out of scope (later sub-projects / tasks)
- Availability, inquiries, flight prices, optimizer, admin, email/mailhog (B/C/D)
- CI/CD (separate task)
- i18n, payments, multiple units

## 3. Visual direction

**Warm Mediterranean** — terracotta/ochre primary with sea blue accent, sandy/off-white backgrounds, soft rounded corners, serif display headings + sans body. Encoded as Tailwind theme tokens. Final polish via the UI/UX Pro Max skill during build.

Indicative palette (refined at build): terracotta `#d9743f`, ochre `#e8a06a`, sand `#f3e6d4`, sea `#2c7a9e`, ink `#3d3a35`.

## 4. Pages & content model

Four pages (Czech routes). `Rezervace` appears in the nav but is **disabled / "připravujeme"** until B/D.

| Route | Page | Content source |
|---|---|---|
| `/` | Domů (home) | `content/home.md` (hero, highlights) + previews pulled from other content |
| `/apartman` | Apartmán | `content/apartman.md` |
| `/okoli` | Okolí | `content/okoli.md` |
| `/tipy-na-vylety` | Tipy na výlety (list) | all `content/trips/*.md` |
| `/tipy-na-vylety/[slug]` | Single trip tip | `content/trips/<slug>.md` |

### Content files (markdown + frontmatter, committed in the Next app)

- **`content/home.md`** — frontmatter: `heroTitle`, `heroSubtitle`, `heroImage`, `highlights[]` (`{icon, label}`). Body optional.
- **`content/apartman.md`** — frontmatter: `title`, `intro`, `amenities[]`, `gallery[]` (image paths). Markdown body = description.
- **`content/okoli.md`** — frontmatter: `title`, `intro`, `gallery[]`. Body = sections on La Mata, beaches, salt lakes, Torrevieja.
- **`content/trips/<slug>.md`** — frontmatter: `title`, `category` (one of: `plaze`, `mesta`, `priroda`, `restaurace`, `vylety`), `image`, `summary`, `order`, optional `externalLink`, optional `distanceKm`. Markdown body = full tip.

### Images
- Live under `web/public/images/` with documented subfolders: `apartment/`, `surroundings/`, `trips/`, `home/`.
- Markdown references images by public path (e.g. `/images/apartment/gallery-01.jpg`), so `next/image` serves them statically.
- A ships **neutral placeholder images** in those folders + a README section: "replace these files, keep the names, no code change needed."

### Content loading
- `web/lib/content.ts` reads markdown at build with `gray-matter` (frontmatter) + `remark`/`remark-html` (body → HTML).
- `generateStaticParams` enumerates `content/trips/*.md` for the `[slug]` route.
- All pages statically generated (SSG); no API calls.

## 5. Frontend structure (Next.js App Router)

```
web/
  app/
    layout.tsx                       # nav + footer shell, theme
    page.tsx                         # Domů
    apartman/page.tsx
    okoli/page.tsx
    tipy-na-vylety/page.tsx
    tipy-na-vylety/[slug]/page.tsx
  components/                        # Nav, Hero, Highlights, Gallery, TripCard, Footer
  content/                          # markdown (see §4)
  public/images/                    # placeholder imagery + drop-in convention
  lib/content.ts                    # markdown loader
  tailwind.config.ts                # Warm Mediterranean tokens
```

Homepage section order (from approved wireframe): hero + "find cheapest dates" CTA (CTA links to a placeholder anchor until D) → highlights → gallery preview → surroundings + flight-price teasers → trip-tips preview → footer.

## 6. Backend structure (NestJS onion)

```
api/
  src/
    domain/                         # ports + value objects (HealthStatus); zero framework/SQL imports
    application/                    # CheckHealth query + handler
    infrastructure/
      persistence/pg-connection.ts  # pg Pool
      persistence/health.repository.ts  # raw SQL: SELECT 1
      config/
    interface/
      http/health.controller.ts
      http/problem-detail.filter.ts # typed domain errors -> RFC-7807
    main.ts
  migrations/                       # node-pg-migrate *.sql files
```

- **Reference vertical slice (`/health`):** `HealthController` → `CheckHealthQuery` → handler → `DbHealthChecker` port → infra adapter runs `SELECT 1` → returns `{ status, db, version, timestamp }`. This proves controller→application→domain-port→infrastructure→SQL wiring end-to-end and is the pattern B/C/D copy.
- **CQRS-lite:** queries/commands as plain classes with dedicated handlers (recommended: `@nestjs/cqrs` Query/Command buses). Ports are interfaces with DI tokens bound to infra adapters in a module.
- **Dependency rule:** domain imports nothing outward; enforced by an ESLint boundary rule (documented in README).
- **Migrations** run automatically on `api` container start (before the app listens).

## 7. Testing

- **Application:** `CheckHealth` handler unit test against a fake `DbHealthChecker`.
- **Infrastructure:** `health.repository` integration test against a disposable test PostgreSQL.
- **Interface (e2e):** `GET /api/health` returns 200 with the documented shape; returns a problem-detail when DB is down.
- **Frontend (Playwright smoke):** each of the 4 pages renders, nav links work, a trip detail page loads from its slug, `Rezervace` is visibly disabled.
- TDD for any non-trivial logic (content loader edge cases: missing frontmatter, empty trips folder).
- Worktree isolation: `docker-compose.override.yml` on alternate ports so e2e runs independently of the main environment.

## 8. Acceptance criteria

1. `docker compose up` starts `web`, `api`, `db`; migrations run automatically.
2. `GET /api/health` → 200 with `db: "ok"`; DB-down yields a problem-detail response.
3. All four showcase pages render as static HTML with placeholder images and Czech content in the Warm Mediterranean theme.
4. Nav works across pages; `Rezervace` is present but disabled/"připravujeme".
5. Trip tips list renders from `content/trips/*.md`; each has a working detail page.
6. Domain layer has no outward imports (ESLint boundary rule passes).
7. Lint and all tests pass.
8. README documents: how to run, the onion/CQRS conventions, and the photo/content drop-in process.

## 9. Open implementation notes (decide during build)

- Exact Tailwind token values and font pairing — finalized via UI/UX Pro Max.
- Whether to use `@nestjs/cqrs` vs hand-rolled handlers — default to `@nestjs/cqrs` unless it feels heavy for the skeleton.
- Node base image / pnpm vs npm — pick per workspace convention at build start.
