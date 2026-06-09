# Vinamar Web — System Architecture & Decomposition

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Scope:** System-level architecture and sub-project decomposition. Each sub-project gets its own detailed spec → plan → implementation cycle.

## 1. Purpose

A website for offering a privately-owned holiday apartment for rent. The apartment is in **La Mata, Torrevieja** (Costa Blanca, Spain); guests fly to **Alicante (ALC)** from **Pardubice (PED)**, **Wrocław (WRO)**, or **Prague (PRG)**.

The site does three jobs:

1. **Showcase** the apartment and surroundings (photos, trip tips).
2. **Take booking inquiries** for available dates (request-to-book, no online payment).
3. **Help guests pick the cheapest dates to visit** by combining the apartment's open dates with the cheapest flight prices from the three origin airports.

Audience is Czech-speaking. The site is **Czech only** (no i18n machinery, though content is structured so a language could be added later).

## 2. Key product decisions

| Decision | Choice | Rationale |
|---|---|---|
| Flight data source | **Travelpayouts / Aviasales** behind a `FlightPriceProvider` port | Free, covers low-cost carriers (Ryanair/Wizz dominate these routes), earns affiliate commission. Amadeus/Duffel excluded — they omit Ryanair fares. Kiwi Tequila gated behind 50k MAU. |
| Flight price freshness | Cached, refreshed daily; shown as *"indicative cheapest from €X"* + live affiliate "check & book" link | Vacation-rental planning doesn't need real-time fares; caching keeps cost near zero and pages resilient. |
| Booking model | **Inquiry / request-to-book**, owner confirms manually, no online payment | Single private apartment; avoids payments, PCI, refunds, cancellation policy. |
| Optimizer role | **Guest-facing cheapest-dates finder** | Guest enters origin + trip length → ranked open date windows by flight cost. Occupancy helped implicitly (only open dates offered) plus a gap-fill tiebreak. |
| Content management | **Bookings-only admin**; photos + trip tips are committed markdown/image files in the Next app | Right-sized for one apartment; no CMS to build. |
| Language | **Czech only** | Audience is Czech. No translation infrastructure. |
| Frontend rendering | **Next.js, mostly static** (SSG content + client islands) | Public marketing site needs SEO and fast first paint; interactive widgets call the API. |
| Persistence | **PostgreSQL, raw SQL** behind domain repository interfaces (`pg` driver, `node-pg-migrate` for versioned `.sql` migrations) | No ORM; keeps the domain free of persistence-library coupling. |

## 3. Architecture

**Style:** API-first. NestJS backend in **onion architecture**; Next.js frontend; everything containerized with docker-compose.

### Backend onion layers

- **Domain** (depends on nothing):
  - Entities: `AvailabilityCalendar`, `Inquiry`, `FlightQuote`, `DateWindow`
  - Value objects: `DateRange`, `Money`, `Origin` (PED/WRO/PRG)
  - Domain service: optimizer scoring (cheapest-window ranking + gap-fill tiebreak)
  - Ports (interfaces): `AvailabilityRepository`, `InquiryRepository`, `FlightQuoteRepository`, `FlightPriceProvider`
- **Application** (use cases / CQRS-lite handlers): `SubmitInquiry`, `ConfirmBooking`, `GetAvailability`, `RefreshFlightPrices`, `FindCheapestWindows`
- **Infrastructure**: raw-SQL repository adapters (`pg`), Travelpayouts HTTP adapter, email adapter (nodemailer/SMTP), daily price-refresh cron, config
- **Interface**: NestJS REST controllers, DTO validation (class-validator), admin auth guard

The dependency rule points inward only. NestJS DI binds ports to adapters.

### Frontend

- Next.js App Router. Content pages (apartment, surroundings, trip tips) statically generated from markdown + images committed in the Next app — these do **not** call the API.
- Client islands: availability calendar, flight prices, cheapest-dates finder, inquiry form — call the NestJS API via TanStack Query.
- Tailwind CSS; visual design via UI/UX Pro Max.

### Containers (docker-compose)

`web` (Next.js) · `api` (NestJS) · `db` (PostgreSQL) · `mailhog` (dev email capture).

## 4. Core data flows

- **Showcase:** markdown + images → statically rendered at build. API not involved.
- **Inquiry:** guest `POST /inquiries` → `SubmitInquiry` persists + emails owner → owner `POST /admin/inquiries/:id/confirm` → availability calendar blocks those dates.
- **Flight prices:** daily cron → Travelpayouts per route → store `FlightQuote` rows. Public reads always served from cache; provider outage never breaks a page (last-known-good served, flagged stale).
- **Cheapest-dates finder:** `GET /optimizer/cheapest-windows?origin=WRO&nights=7` → combine open availability windows × cached flight quotes → ranked list with gap-fill tiebreak.

## 5. Cross-cutting concerns

- **Error handling:** external-provider failures never break a page (serve last-known-good cache, flag stale). Validation at the controller edge; domain invariants throw typed domain errors → mapped to HTTP problem responses.
- **Admin auth:** single admin account, password from env, JWT. No user-management system.
- **Config:** all secrets/endpoints via env (Travelpayouts token, SMTP, admin password, DB URL).

## 6. Testing strategy

- **Domain:** pure unit tests, TDD. The optimizer scoring and date-window math are the crown jewels and must be exhaustively covered without infrastructure.
- **Application:** handler tests against in-memory repository fakes + a fake `FlightPriceProvider`.
- **Infrastructure:** Travelpayouts adapter against recorded fixtures; raw-SQL repositories against a disposable test PostgreSQL.
- **E2E:** Playwright for inquiry submission and the cheapest-dates finder. Each worktree runs on isolated ports via `docker-compose.override.yml`.

## 7. Sub-project decomposition & build order

Each is a separate spec → plan → build cycle.

| # | Sub-project | Delivers | Depends on |
|---|---|---|---|
| **A** | **Foundation & Showcase** | docker-compose, NestJS onion skeleton, Next.js app, public showcase pages (apartment, surroundings, trip tips from markdown). Walking skeleton. | — |
| **B** | **Availability & Inquiries** | availability calendar domain + raw-SQL repo, bookings-only admin (auth), inquiry form → email notification, confirm flow | A |
| **C** | **Flight Prices** | `FlightPriceProvider` port + Travelpayouts adapter, `FlightQuote` storage + daily refresh cron, per-route price display | A |
| **D** | **Cheapest-Dates Optimizer** | guest finder: origin + trip length → ranked open windows by flight cost, gap-fill tiebreak | B + C |

A is the walking skeleton. B and C are independent of each other. D is the capstone needing both.

## 8. Out of scope (YAGNI)

- Online payment / instant booking
- Multiple apartments / units
- Multi-language / i18n infrastructure
- Public-facing CMS for photos and trip tips
- Real-time flight pricing
- User accounts beyond the single admin
