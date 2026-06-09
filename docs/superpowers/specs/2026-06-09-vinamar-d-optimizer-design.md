# Sub-project D — Cheapest-Dates Optimizer

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Parent:** [System Architecture & Decomposition](./2026-06-09-vinamar-system-architecture-design.md)
**Depends on:** A (Foundation), B (Availability), C (Flight Prices)

## 1. Goal

A guest-facing dates-finder: the guest picks an origin and a stay length (≥ 7 nights); the site returns the available date windows ranked cheapest-flight-first, with a gentle gap-fill tiebreak that favours your occupancy. Picking a window pre-fills the inquiry form and offers an exact-date flight booking link.

## 2. Key decisions

| Topic | Decision |
|---|---|
| Inputs | Origin (PED/WRO/PRG), desired nights (≥ 7), optional earliest/latest date. |
| Candidate windows | Anchored to **real flight days** — the departure dates present in C's cached quotes for that origin — so every suggestion corresponds to a day flights actually operate. |
| Availability | A window is offered only if it overlaps **no** calendar block (B) and the arrival is in the future. |
| Ranking | **Cheapest flight first** using the cached departure-day price as the signal; **gap-fill tiebreak** when prices are equal. |
| Price honesty | For non-7-night stays the cached 7-night departure-day price is shown as **indicative** (`orientační`); the **booking deep link is built for the guest's exact arrival+departure dates**. |
| Result action | Pre-fill `/rezervace` with the chosen dates (query params) **and** show the Travelpayouts affiliate booking link for those exact dates. |

## 3. Optimizer algorithm (the crown jewel — pure domain, exhaustively tested)

`CheapestWindowFinder.find(quotes, blocks, desiredNights, now, minStay = 7): WindowSuggestion[]`

1. **Candidate arrivals** = each `quote.departureDate` for the origin where `departureDate > now`.
2. For each candidate, build `window = DateRange(arrival, arrival + desiredNights)`.
3. **Availability filter**: drop the window if any block overlaps it.
4. **Price signal**: `indicativePrice = quote.price` (the cheapest cached round trip departing that day).
5. **Gap-fill penalty** (tiebreak): with blocks sorted, find the free gap immediately *before* the window (from the previous block's end, or `now`, to arrival) and immediately *after* (from departure to the next block's start, or +∞). For each side, if the gap is in `[1, minStay − 1]` nights it is an **unbookable orphan**; penalty for that side `= minStay − gap` (a 1-night orphan = penalty 6; a 6-night orphan = penalty 1). Gaps of 0 or ≥ `minStay` add nothing. `orphanPenalty = before + after`.
6. **Sort** by `indicativePrice.amount` asc, then `orphanPenalty` asc, then `arrival` asc.

`WindowSuggestion` (domain value object): `range: DateRange`, `origin: Origin`, `indicativePrice: Money`, `orphanPenalty: number`.

The finder is a pure function of its inputs (no I/O, no clock except the injected `now`), so it is unit-tested across: empty quotes, all-blocked, orphan-before/after, tie-break ordering, future-only filtering, varying `desiredNights`.

## 4. Application

`FindCheapestWindows` (query): inputs `originCode`, `nights`, optional `from`/`to`, `limit` (default 10).
1. Load `quotes = FlightQuoteRepository.listForOrigin(origin)` (C).
2. Load `blocks = AvailabilityRepository.listBetween(now, horizonEnd)` (B).
3. `suggestions = CheapestWindowFinder.find(quotes, blocks, nights, now)`.
4. Take top `limit`; for each, build the **exact-date deep link** via the `FlightDeepLinkBuilder` port.
5. Return DTOs: `{ origin, arrival, departure, nights, indicativePrice, currency, flightDeepLink, hasOrphanGap }`.

New port: `FlightDeepLinkBuilder.forDates(origin, arrival, departure): string`.

D's module wires B's `AVAILABILITY_REPOSITORY` and C's `FLIGHT_QUOTE_REPOSITORY` — this is the integration seam, so D must be built after B and C.

## 5. Infrastructure

- **`AviasalesDeepLinkBuilder`** implements `FlightDeepLinkBuilder`: constructs an Aviasales search URL for the exact `origin`→ALC arrival/return dates with `TRAVELPAYOUTS_MARKER` (reuses C's deep-link helper).

## 6. Interface (HTTP)

- `GET /api/optimizer/cheapest-windows?origin=WRO&nights=7&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10` → ranked suggestion DTOs.

## 7. Frontend

- **`/najit-terminy`** (the dates-finder): origin selector, nights input (min 7), optional month range → ranked result cards: dates, *"orientační letenka od X €"*, a gap-fill hint is **not** shown to guests (internal only), a **"Vybrat termín"** button, and a **"Rezervovat letenku"** affiliate link (exact dates, `rel="sponsored noopener"`).
- **"Vybrat termín"** navigates to `/rezervace?arrival=YYYY-MM-DD&departure=YYYY-MM-DD`; the inquiry form reads those query params and pre-fills arrival/departure (guest adds name/email).
- The **homepage hero CTA** ("Zjistit nejlevnější termíny") and the nav point to `/najit-terminy`.
- Data fetched client-side (TanStack Query).

## 8. Testing

- **Domain:** `CheapestWindowFinder` exhaustive unit tests (price ordering, tiebreak by orphan penalty, orphan-before/after detection, availability filtering, future-only, arbitrary `desiredNights`, empty inputs).
- **Application:** `FindCheapestWindows` against in-memory availability + flight-quote fakes + a stub deep-link builder (verifies it composes B + C data and caps at `limit`).
- **Infrastructure:** `AviasalesDeepLinkBuilder` unit test (exact-date URL + marker).
- **E2E:** seed a block and mock flight quotes → `GET /api/optimizer/cheapest-windows` returns windows that skip the blocked dates, cheapest first.
- **Playwright:** finder returns windows; "Vybrat termín" lands on `/rezervace` with pre-filled dates.

## 9. Acceptance criteria

1. `GET /api/optimizer/cheapest-windows?origin=WRO&nights=7` returns available windows, cheapest-flight-first, excluding any blocked dates.
2. Windows leaving an unbookable 1–6 night orphan gap rank below equally-priced windows that don't.
3. Non-7-night requests return results with an indicative price and a booking link built for the exact dates.
4. `/najit-terminy` shows ranked windows; "Vybrat termín" pre-fills `/rezervace`; the flight link opens Aviasales for the exact dates with the affiliate marker.
5. All tests pass; domain dependency rule holds; the finder is pure (no I/O).

## 10. Out of scope

Multi-origin comparison in one view, price-drop alerts, calendar heat-map visualisation, automatic discounting of orphan gaps.
