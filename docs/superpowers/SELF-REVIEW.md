# Self-Review — Vinamar Web specs & plans

**Date:** 2026-06-09. Reviewer pass over all 5 specs and 5 plans before implementation.

## Specs

- **Coverage vs original request:** apartment showcase (A), trip tips (A), photos with drop-in convention (A), availability + inquiries (B), flight prices from PED/WRO/PRG→ALC (C), cheapest-dates planner balancing price and occupancy (D), containerized + API-first + onion + React (all). CI/CD gap closed by E. ✅
- **Internal consistency:** stack, ports, and decomposition agree across the system spec and the five sub-project specs (raw SQL, onion, CQRS-lite, Travelpayouts behind `FlightPriceProvider`, Czech-only, Warm Mediterranean). ✅
- **Scope:** each sub-project is independently buildable/testable; D's dependency on B+C is explicit. ✅
- **Ambiguity resolved:** flight-price honesty for non-7-night stays settled (indicative price + exact-date booking link) in D. ✅

## Plans — issues found and fixed inline

1. **B `AdminModule` duplicate CQRS handler registration** (correctness bug): handlers were provided in both the feature modules and `AdminModule`, which makes `@nestjs/cqrs` throw on duplicate registration. **Fixed** — `AdminModule` now provides only its controllers + `AdminGuard`; the app-global bus routes to the handlers in `InquiryModule`/`AvailabilityModule`.
2. **A Tailwind version drift**: unpinned `tailwindcss` installs v4 (CSS-first, no `tailwind.config.ts`), breaking the v3-style config. **Fixed** — pinned `tailwindcss@^3`.
3. **A ESLint version drift**: ESLint v9 ignores `.eslintrc.cjs` (flat config by default), breaking the domain dependency-rule lint. **Fixed** — pinned `eslint@^8` + `@typescript-eslint/*@^7`.

## Plans — accepted risks (resolve pragmatically at build time)

- **`node-pg-migrate` SQL marker format** (`-- Up Migration` / `-- Down Migration`): verify at first `npm run migrate up`; adjust markers if the runner rejects them.
- **Per-module `pgPoolProvider`** creates one `pg.Pool` per module. Functionally correct (each pool is small); acceptable at this scale. Could be consolidated into a shared `DatabaseModule` later.
- **Next.js 15 async `params`/`searchParams`** are awaited in the plans; if the installed Next minor differs, keep them sync/async to match.
- **Toolchain adaptation clause:** implementers may pin/adjust versions to get tests green **without changing the architecture** (onion layering, ports, raw SQL, the documented endpoints/DTOs).

## Cross-plan type/contract consistency

- B exports `DateRange`, `CalendarBlock`, `AVAILABILITY_REPOSITORY`; C exports `Origin`, `Money`, `FlightQuote`, `FLIGHT_QUOTE_REPOSITORY`, `buildDeepLink`; D consumes all of these unchanged and adds `FLIGHT_DEEP_LINK_BUILDER` + the suggestion DTO. The `GetQuotesForOrigin` DTO is the exact contract D relies on. ✅

## Execution order (hard constraint)

A → (B, C) → D → E. D wires ports from B and C, so it must come last among the feature sub-projects. On a single `main` working tree, B and C are run sequentially (they touch shared wiring files: `app.module.ts`, `docker-compose.yml`, `.env.example`, `web/lib/api.ts`, `web/components/Nav.tsx`, `web/app/page.tsx`).
