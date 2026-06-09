# Availability-first portal — design

**Date:** 2026-06-09
**Branch:** `availability-first-portal`
**Status:** Design approved (Part 1 by user; Part 2 decided autonomously at user's request while away)

## Problem

The portal is currently framed flight-first. The headline experience is "find the cheapest
flight to Alicante" (`/letenky`) and "find the cheapest date windows" (`/najit-terminy`),
with results ranked by flight price. This inverts the actual product.

The product is the **apartment**. The primary purpose is to show **when the apartment is
available**, and — alongside each open window — **the cheapest way to get there**. Transport
is a supporting annotation, not the headline.

## Goal

Reframe the portal around availability:

1. Lead with the apartment's free dates over the next 12 months.
2. Annotate each open window with the cheapest flight (the existing flight data), as a detail.
3. Keep the booking-inquiry flow as the conversion path.

## Scope decisions

- **Transport scope:** flights only, reframed. No new transport modes, no airport transfer,
  no multi-modal comparison. (Recorded so future work knows this was a deliberate boundary.)
- **Availability model:** calendar-first — the guest browses free dates directly; flight cost
  is a per-window annotation, not a gatekeeping input.
- **Layout:** "Calendar wall" — a grid of monthly mini-calendars with free nights highlighted
  and a "from X €" cheapest-flight badge per month.
- **Page structure:** one consolidated page `/volne-terminy`; both `/letenky` and
  `/najit-terminy` are removed.
- **Implementation approach:** a new backend read-model slice (mirrors the `optimizer` slice),
  not frontend-only grouping — to match the repo's onion/CQRS conventions.

## Architecture overview

```
Browser  ──GET /calendar?origin&nights──▶  CalendarController
                                              │ QueryBus
                                              ▼
                                  FindAvailabilityCalendarHandler
                                   ├─ FlightQuoteRepository.listForOrigin
                                   ├─ AvailabilityRepository.listBetween(now, +12mo)
                                   ├─ CheapestWindowFinder.find(...)        (REUSED)
                                   ├─ AvailabilityCalendarBuilder.build(...) (NEW)
                                   └─ FlightDeepLinkBuilder.forDates(...)    (REUSED)
                                              │
                                              ▼
                                   AvailabilityCalendar DTO (12 months)
```

The flight↔availability overlap math is **reused**, not duplicated: the handler runs the
existing `CheapestWindowFinder` to get window suggestions, then a new builder reshapes them
into a month grid alongside the free-date ranges.

## Backend — new `calendar` read-model slice

No new tables, no infrastructure changes. All four dependencies already exist as ports.

### `domain/calendar/`
- **`MonthAvailability`** (value): `year: number`, `month: number` (1–12),
  `freeRanges: DateRange[]`, `cheapestWindow: WindowSuggestion | null`.
- **`AvailabilityCalendar`** (value): ordered `months: MonthAvailability[]`.
- **`AvailabilityCalendarBuilder`** (domain service):
  `build(blocks: CalendarBlock[], windows: WindowSuggestion[], now: Date, horizonEnd: Date): AvailabilityCalendar`
  1. Compute **free ranges** = complement of `blocks` within `[now, horizonEnd]`.
  2. Bucket free ranges by calendar month, **splitting ranges that cross a month boundary**
     so each month carries only the portion inside it (enables per-month highlighting).
  3. For each month, pick the **cheapest `WindowSuggestion` whose arrival falls in that month**
     (windows are already produced and priced by `CheapestWindowFinder`).
  4. Emit one `MonthAvailability` per month in `[now, horizonEnd]`, in chronological order.
     Months with no free ranges and no window are still emitted (rendered as fully booked).

### `application/calendar/`
- **`FindAvailabilityCalendarQuery`**: `origin: string`, `nights = 7`, `months = 12`.
- **`FindAvailabilityCalendarHandler`** (`@QueryHandler`):
  - `origin = Origin.fromCode(q.origin)`; `now = clock.now()`; `horizonEnd = now + q.months`.
  - `quotes = quoteRepo.listForOrigin(origin)`; `blocks = availabilityRepo.listBetween(now, horizonEnd)`.
  - `windows = new CheapestWindowFinder().find(quotes, blocks, q.nights, now)`.
  - `calendar = new AvailabilityCalendarBuilder().build(blocks, windows, now, horizonEnd)`.
  - Map to DTO; build each month's `flightDeepLink` via `FlightDeepLinkBuilder.forDates(...)`.
  - Injected ports: `FLIGHT_QUOTE_REPOSITORY`, `AVAILABILITY_REPOSITORY`,
    `FLIGHT_DEEP_LINK_BUILDER`, `CLOCK`.

### DTO shape
```ts
interface AvailabilityCalendarDto {
  origin: string;
  nights: number;
  months: {
    year: number;
    month: number;                 // 1–12
    freeRanges: { start: string; end: string }[]; // ISO yyyy-mm-dd
    cheapest: {
      arrival: string;
      departure: string;
      nights: number;
      indicativePrice: number;
      currency: string;
      flightDeepLink: string;
      hasOrphanGap: boolean;
    } | null;
  }[];
}
```

### `interface/`
- **`http/calendar.controller.ts`**: `GET /calendar?origin=WRO&nights=7&months=12` →
  `QueryBus.execute(new FindAvailabilityCalendarQuery(origin, Number(nights ?? 7), Number(months ?? 12)))`.
- **`calendar.module.ts`**: mirror `optimizer.module.ts` — register handler + the four ports.
  Register the module in `app.module.ts`.

### Truthfulness note
A free night only earns a **price badge** when a flight quote produces a viable window covering
it. Free nights with no matching quote still render as free (bookable via inquiry) but without
an "od X €" badge. The calendar shows availability truthfully; price is the annotation where
data exists.

## Frontend — `/volne-terminy`

### Visual language (Airbnb/Stripe-grade)
The current look is dated primarily because **no web font is loaded** — `tailwind.config.ts`
maps `display → Georgia (serif)` and `body → system-ui`. This is the root cause of the
"awful font" and is the first thing fixed.

- **Typography:** load **Inter** (variable) via `next/font/google` in `layout.tsx`; replace the
  `display`/`body` families in `tailwind.config.ts` so all text is Inter. Define a deliberate
  type scale, tight heading letter-spacing, comfortable line-heights. Drop Georgia.
- **Surfaces:** neutral off-white canvas; **white `rounded-2xl` cards** with soft shadows and
  subtle borders; generous whitespace; the warm palette (terracotta/sea) used *sparingly* as
  accents (price badges, CTAs, selected dates), not as fills.
- **States:** clear hover/focus rings, loading skeletons, empty and error states.
- Polish is executed with the **`frontend-design` skill** during implementation; this spec
  records the direction only.

### Components
- **`app/volne-terminy/page.tsx`** — server shell: H1 "Volné termíny", intro copy
  ("Vyberte termín, kdy je apartmán volný — u každého ukážeme nejlevnější letenku."),
  hosts the client island.
- **`components/CalendarWall.tsx`** (client) — origin selector (default `WRO` / Vratislav),
  nights stepper (default 7, min 7); calls `fetchAvailabilityCalendar`; renders 12
  `MonthCard`s; handles loading/empty/error.
- **`components/MonthCard.tsx`** — mini-month grid, free nights highlighted, "od X €" badge
  when `cheapest` is present; selecting a free window reveals its detail + CTAs.
- **Window detail / CTAs** (relocated from today's `WindowFinder`):
  - "Rezervovat tento termín" → `/rezervace?arrival=…&departure=…` (existing prefill flow).
  - "Rezervovat letenku" → `cheapest.flightDeepLink` with `rel="sponsored noopener"`,
    `target="_blank"`.
  - `hasOrphanGap` shows a subtle "kratší mezera" hint.

### `lib/api.ts`
- Add `fetchAvailabilityCalendar(origin: string, nights: number): Promise<AvailabilityCalendarDto>`.
- Remove `fetchCheapestFlights` and `fetchCheapestWindows` (and the `CheapestFlight` /
  `CheapestWindow` types) once their consumers are deleted.

### Information architecture
- **Nav** (`components/Nav.tsx`): `Volné termíny · Apartmán · Okolí · Tipy na výlety · Rezervace`.
  Remove the `Letenky` and `Najít termíny` links; add `Volné termíny → /volne-terminy`.
- **Home** (`app/page.tsx` + `content/home.md`): keep the showcase hero; flip the third
  `SectionTeaser` from "Letenky / Najděte nejlevnější let" to
  **"Volné termíny / Podívejte se, kdy je volno a jak se levně dostat"**, promoted to the
  lead teaser. Update the layout `<meta description>` wording away from "levné letenky".
- **Delete:** `app/letenky/`, `app/najit-terminy/`, `components/FlightCard.tsx`,
  `components/WindowFinder.tsx`.
- **Keep:** all flight backend endpoints (`/flights/*`), the flight-price cron, and the
  Travelpayouts provider — they still populate `flight_quotes`. Only the frontend
  flight-first surfaces are removed.

## Testing

- **Domain (vitest/jest, `api`):** `AvailabilityCalendarBuilder` —
  - free-range complement of blocks within the horizon;
  - month-boundary splitting of a range that spans two months;
  - cheapest-per-month selection;
  - fully-booked month → no free ranges, no window;
  - free month with no matching quote → free ranges present, `cheapestWindow = null`.
- **API e2e (`api`):** `GET /calendar?origin=WRO&nights=7` against the mock flight provider —
  12 months returned in order, badges present where quotes exist, deep-links well-formed,
  booked dates absent from free ranges.
- **Web (Playwright, `web`):** load `/volne-terminy`, assert months render with badges,
  pick a free window → lands on `/rezervace` with `arrival`/`departure` prefilled. Replace
  the existing `letenky` / `najit-terminy` smoke tests.

## Out of scope (YAGNI)

Multi-modal transport, airport→apartment transfer, real-time per-day flight pricing,
internationalisation, user accounts.

## Execution note

Per repo conventions, implementation runs via Claude Code Agent Teams in isolated git
worktrees (`worktree-setup` / `worktree-close`), with a `docker-compose.override.yml` on
alternate ports. Tests run without asking. README TODO is updated and a PR opened on
completion.
