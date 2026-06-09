# Sub-project C — Flight Prices

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Parent:** [System Architecture & Decomposition](./2026-06-09-vinamar-system-architecture-design.md)
**Depends on:** A (Foundation & Showcase). Independent of B.

## 1. Goal

Fetch, cache, and display the cheapest round-trip flight prices from the three origin airports (PED, WRO, PRG) to Alicante (ALC), behind a swappable `FlightPriceProvider` port with Travelpayouts as the first adapter. Provides the data the optimizer (D) consumes, plus a homepage teaser and a simple `/letenky` page with affiliate "check & book" links.

## 2. Key decisions

| Topic | Decision |
|---|---|
| Provider | **Travelpayouts / Aviasales** data API, behind `FlightPriceProvider`. A `MockFlightPriceProvider` is used when no token is configured (dev/test), so the app runs without live credentials. |
| Currency | **EUR.** |
| Trip shape | Round trip, **7-night** stay (matches B's minimum), origins PED/WRO/PRG → ALC. |
| Horizon | **9 months** ahead, refreshed **daily** via cron (and once on startup if the cache is empty). |
| Freshness | Prices are cached and shown as *"od X €"* (indicative). Each quote carries a Travelpayouts affiliate deep link for the live price + booking (earns commission). |
| C's own UI | Homepage teaser ("Letenky od X €") + a simple `/letenky` page: cheapest price per origin with a deep link. The interactive date-finder is D. |

## 3. Domain model

- **`Origin`** (value object): one of `PED`, `WRO`, `PRG`, with display name. `DESTINATION = 'ALC'` constant.
- **`Money`** (value object): `amount: number`, `currency: 'EUR'`.
- **`FlightQuote`** (entity): `origin: Origin`, `departureDate: Date`, `returnDate: Date`, `price: Money`, `airline: string`, `deepLink: string`, `fetchedAt: Date`.
- **Ports:**
  - `FlightPriceProvider`: `cheapestForOrigin(origin: Origin, horizonMonths: number): Promise<FlightQuote[]>` — one cheapest quote per departure date across the horizon.
  - `FlightQuoteRepository`: `replaceForOrigin(origin, quotes)`, `cheapestPerOrigin()`, `listForOrigin(origin)`.

## 4. Application handlers

- `RefreshFlightPrices` (command, cron-triggered): for each origin, `provider.cheapestForOrigin(origin, 9)` → `repo.replaceForOrigin(origin, quotes)`. Logs counts; a single origin failing does not abort the others.
- `GetCheapestPerOrigin` (query): `repo.cheapestPerOrigin()` → one cheapest quote per origin (teaser + `/letenky`).
- `GetQuotesForOrigin` (query): `repo.listForOrigin(origin)` → all cached quotes for an origin (feeds D).

## 5. Infrastructure

- **Migration** (`node-pg-migrate`, raw SQL): `flight_quotes(id uuid pk default gen_random_uuid(), origin text, departure_date date, return_date date, price_amount numeric, price_currency text, airline text, deep_link text, fetched_at timestamptz, UNIQUE(origin, departure_date))`.
- **`PgFlightQuoteRepository`** (raw SQL): `replaceForOrigin` runs delete-then-insert in a transaction; `cheapestPerOrigin` selects the min-price row per origin; `listForOrigin` returns ordered quotes.
- **`TravelpayoutsFlightPriceProvider`**: calls the Aviasales prices endpoint per origin per month over the horizon (`currency=eur`, origin, `destination=ALC`), keeps the cheapest per departure date, sets `returnDate = departureDate + 7`, and builds an affiliate deep link from the returned link + `TRAVELPAYOUTS_MARKER`. Uses `TRAVELPAYOUTS_TOKEN`.
- **`MockFlightPriceProvider`**: deterministic sample quotes (price varies by weekday/date) so the stack works without credentials; selected when `TRAVELPAYOUTS_TOKEN` is unset.
- **Provider binding**: module factory picks Travelpayouts vs Mock based on env.
- **Cron**: `@nestjs/schedule` daily job dispatches `RefreshFlightPrices`; on bootstrap, if the cache is empty, run once.

## 6. Interface (HTTP)

- `GET /api/flights/cheapest` → `[{ origin, originName, price, currency, departureDate, returnDate, deepLink }]` (one per origin).
- `GET /api/flights?origin=WRO` → all cached quotes for that origin (used by D).
- `POST /api/admin/flights/refresh` (behind `AdminGuard` from B; if B not yet merged, expose unguarded behind an env flag) → triggers `RefreshFlightPrices`.

## 7. Frontend

- **Homepage teaser**: replace the static "Letenky od 58 €" placeholder with the live cheapest across origins, linking to `/letenky`.
- **`/letenky`**: a card per origin (Pardubice/Vratislav/Praha) showing cheapest price, dates, airline, and a "Zkontrolovat a rezervovat" affiliate deep link (opens Travelpayouts/Aviasales in a new tab, `rel="sponsored noopener"`).
- Data fetched client-side (TanStack Query) — not statically generated, so prices stay current.

## 8. Config

New env: `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`, `FLIGHTS_HORIZON_MONTHS=9`. Absent token → mock provider.

## 9. Testing

- **Domain:** `Money`, `Origin`, `FlightQuote` construction (TDD).
- **Application:** `RefreshFlightPrices` against a fake provider + in-memory repo (replaces per origin; one origin failing doesn't abort); `GetCheapestPerOrigin` selects the min per origin.
- **Infrastructure:** `PgFlightQuoteRepository` against test PostgreSQL (replace + cheapest-per-origin); `TravelpayoutsFlightPriceProvider` against a recorded HTTP fixture (no live calls in tests); deep-link builder unit test.
- **E2E:** `GET /api/flights/cheapest` returns one quote per origin using the mock provider after a refresh.
- **Playwright:** `/letenky` renders three origin cards with deep links.

## 10. Acceptance criteria

1. With no token, the mock provider seeds quotes; `GET /api/flights/cheapest` returns one per origin in EUR.
2. With a token, the Travelpayouts adapter fetches real cached prices for PED/WRO/PRG→ALC over 9 months.
3. A daily cron refreshes quotes; a single failing origin does not break the others.
4. `/letenky` shows cheapest price per origin with working affiliate deep links; the homepage teaser shows the live cheapest.
5. `GET /api/flights?origin=WRO` returns the cached quotes (the contract D depends on).
6. All tests pass; domain dependency rule holds; no live HTTP in tests.

## 11. Out of scope

Multi-city, one-way, non-ALC destinations, real-time pricing, baggage/fare-class detail, price-drop alerts.
