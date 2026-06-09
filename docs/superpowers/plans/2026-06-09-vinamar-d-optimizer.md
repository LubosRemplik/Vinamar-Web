# Vinamar Web — Sub-project D (Cheapest-Dates Optimizer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guest-facing dates-finder that, given an origin and stay length (≥7 nights), returns available date windows ranked cheapest-flight-first with a gap-fill tiebreak, then pre-fills the inquiry and offers an exact-date flight booking link.

**Architecture:** Extends sub-project A's onion and integrates B (availability) + C (flight quotes). The core is a **pure domain service** `CheapestWindowFinder`; a `FindCheapestWindows` query composes B's `AVAILABILITY_REPOSITORY` and C's `FLIGHT_QUOTE_REPOSITORY` and enriches results with exact-date affiliate deep links via a new `FlightDeepLinkBuilder` port.

**Tech Stack:** As A/B/C. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-06-09-vinamar-d-optimizer-design.md](../specs/2026-06-09-vinamar-d-optimizer-design.md)

**Prerequisite:** Sub-projects A, B, and C merged. D wires ports defined in B and C.

---

## File Structure (new/changed)

```
api/src/domain/optimizer/
  window-suggestion.ts  cheapest-window-finder.ts
api/src/domain/flight/flight-deep-link-builder.port.ts
api/src/application/optimizer/
  find-cheapest-windows.query.ts  find-cheapest-windows.handler.ts
api/src/infrastructure/flight/aviasales-deep-link-builder.ts
api/src/interface/http/optimizer.controller.ts
api/src/interface/optimizer.module.ts   (+ app.module.ts)
web/app/najit-terminy/page.tsx  web/components/WindowFinder.tsx
web/lib/api.ts (extended)  web/components/InquiryForm.tsx (prefill)
web/app/rezervace/page.tsx (read query params)  web/app/page.tsx + components/Hero.tsx (CTA)
web/e2e/finder.spec.ts
```

---

## Task 1: CheapestWindowFinder domain service (exhaustive TDD)

**Files:**
- Create: `api/src/domain/optimizer/window-suggestion.ts`, `api/src/domain/optimizer/cheapest-window-finder.ts`, `api/test/domain/cheapest-window-finder.spec.ts`

- [ ] **Step 1: Write the failing tests** — `api/test/domain/cheapest-window-finder.spec.ts`

```ts
import { CheapestWindowFinder } from '../../src/domain/optimizer/cheapest-window-finder';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';

const WRO = Origin.fromCode('WRO');
const now = new Date('2026-01-01');
const quote = (day: string, price: number) =>
  new FlightQuote(WRO, new Date(day), new Date(day), new Money(price), 'FR', 'x', now);
const block = (start: string, end: string) =>
  new CalendarBlock('b', new DateRange(new Date(start), new Date(end)), 'booked', now);

describe('CheapestWindowFinder', () => {
  const finder = new CheapestWindowFinder();

  it('ranks windows cheapest flight first', () => {
    const quotes = [quote('2026-05-08', 90), quote('2026-05-15', 58), quote('2026-05-22', 70)];
    const out = finder.find(quotes, [], 7, now);
    expect(out.map((s) => s.indicativePrice.amount)).toEqual([58, 70, 90]);
  });

  it('skips windows that overlap a block', () => {
    const quotes = [quote('2026-05-08', 58)];
    const blocks = [block('2026-05-10', '2026-05-14')];
    expect(finder.find(quotes, blocks, 7, now)).toHaveLength(0);
  });

  it('ignores arrivals in the past', () => {
    const quotes = [quote('2025-05-08', 30), quote('2026-05-08', 58)];
    const out = finder.find(quotes, [], 7, now);
    expect(out).toHaveLength(1);
    expect(out[0].range.arrival.toISOString().slice(0, 10)).toBe('2026-05-08');
  });

  it('supports arbitrary stay length', () => {
    const out = finder.find([quote('2026-05-08', 58)], [], 10, now);
    expect(out[0].range.nights()).toBe(10);
  });

  it('breaks price ties by preferring windows that leave no orphan gap', () => {
    // Block ends 2026-05-08. Window A arrives 2026-05-08 (flush, 0 gap).
    // Window B arrives 2026-05-10 (2-night orphan before, unbookable). Same price.
    const quotes = [quote('2026-05-08', 58), quote('2026-05-10', 58)];
    const blocks = [block('2026-05-01', '2026-05-08')];
    const out = finder.find(quotes, blocks, 7, now);
    expect(out[0].range.arrival.toISOString().slice(0, 10)).toBe('2026-05-08');
    expect(out[0].orphanPenalty).toBe(0);
    expect(out[1].orphanPenalty).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && npx jest test/domain/cheapest-window-finder.spec.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `api/src/domain/optimizer/window-suggestion.ts`**

```ts
import { DateRange } from '../shared/date-range';
import { Origin } from '../flight/origin';
import { Money } from '../flight/money';

export class WindowSuggestion {
  constructor(
    public readonly range: DateRange,
    public readonly origin: Origin,
    public readonly indicativePrice: Money,
    public readonly orphanPenalty: number,
  ) {}
}
```

- [ ] **Step 4: Create `api/src/domain/optimizer/cheapest-window-finder.ts`**

```ts
import { DateRange } from '../shared/date-range';
import { CalendarBlock } from '../availability/calendar-block';
import { FlightQuote } from '../flight/flight-quote';
import { WindowSuggestion } from './window-suggestion';

const NIGHT_MS = 1000 * 60 * 60 * 24;

export class CheapestWindowFinder {
  find(
    quotes: FlightQuote[],
    blocks: CalendarBlock[],
    desiredNights: number,
    now: Date,
    minStay = 7,
  ): WindowSuggestion[] {
    const suggestions: WindowSuggestion[] = [];

    for (const quote of quotes) {
      const arrival = quote.departureDate;
      if (arrival.getTime() <= now.getTime()) {
        continue;
      }
      const departure = new Date(arrival.getTime() + desiredNights * NIGHT_MS);
      const window = new DateRange(arrival, departure);
      if (blocks.some((b) => b.range.overlaps(window))) {
        continue;
      }
      const penalty = this.orphanPenalty(window, blocks, minStay);
      suggestions.push(new WindowSuggestion(window, quote.origin, quote.price, penalty));
    }

    return suggestions.sort(
      (a, b) =>
        a.indicativePrice.amount - b.indicativePrice.amount ||
        a.orphanPenalty - b.orphanPenalty ||
        a.range.arrival.getTime() - b.range.arrival.getTime(),
    );
  }

  // Orphans are leftover free gaps (1..minStay-1 nights) bounded by an existing block.
  private orphanPenalty(window: DateRange, blocks: CalendarBlock[], minStay: number): number {
    const prevEnds = blocks
      .map((b) => b.range.departure)
      .filter((d) => d.getTime() <= window.arrival.getTime());
    const beforeGap = prevEnds.length
      ? Math.round((window.arrival.getTime() - Math.max(...prevEnds.map((d) => d.getTime()))) / NIGHT_MS)
      : minStay; // no previous block => no orphan

    const nextStarts = blocks
      .map((b) => b.range.arrival)
      .filter((d) => d.getTime() >= window.departure.getTime());
    const afterGap = nextStarts.length
      ? Math.round((Math.min(...nextStarts.map((d) => d.getTime())) - window.departure.getTime()) / NIGHT_MS)
      : minStay; // no next block => no orphan

    return this.sidePenalty(beforeGap, minStay) + this.sidePenalty(afterGap, minStay);
  }

  private sidePenalty(gap: number, minStay: number): number {
    if (gap >= 1 && gap <= minStay - 1) {
      return minStay - gap;
    }
    return 0;
  }
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd api && npx jest test/domain/cheapest-window-finder.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add api/src/domain/optimizer api/test/domain/cheapest-window-finder.spec.ts
git commit -m "feat(api): add pure CheapestWindowFinder domain service with tests"
```

---

## Task 2: FlightDeepLinkBuilder port + FindCheapestWindows handler (TDD)

**Files:**
- Create: `api/src/domain/flight/flight-deep-link-builder.port.ts`, `api/src/application/optimizer/find-cheapest-windows.query.ts`, `api/src/application/optimizer/find-cheapest-windows.handler.ts`, `api/test/application/find-cheapest-windows.handler.spec.ts`

- [ ] **Step 1: Create the port** — `api/src/domain/flight/flight-deep-link-builder.port.ts`

```ts
import { Origin } from './origin';

export const FLIGHT_DEEP_LINK_BUILDER = Symbol('FlightDeepLinkBuilder');

export interface FlightDeepLinkBuilder {
  forDates(origin: Origin, arrival: Date, departure: Date): string;
}
```

- [ ] **Step 2: Write failing test** — `api/test/application/find-cheapest-windows.handler.spec.ts`

```ts
import { FindCheapestWindowsHandler } from '../../src/application/optimizer/find-cheapest-windows.handler';
import { FindCheapestWindowsQuery } from '../../src/application/optimizer/find-cheapest-windows.query';
import { Origin } from '../../src/domain/flight/origin';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { InMemoryFlightQuotes, quote } from '../fakes/flight';
import { InMemoryAvailability, FixedClock } from '../fakes';

const stubDeepLink = { forDates: () => 'https://book/exact?marker=m' };

describe('FindCheapestWindows', () => {
  it('returns available windows cheapest-first with exact-date deep links', async () => {
    const WRO = Origin.fromCode('WRO');
    const quotes = new InMemoryFlightQuotes();
    await quotes.replaceForOrigin(WRO, [
      { ...quote(WRO, 90), departureDate: new Date('2026-05-08'), returnDate: new Date('2026-05-15') } as any,
      { ...quote(WRO, 58), departureDate: new Date('2026-05-15'), returnDate: new Date('2026-05-22') } as any,
    ]);
    const availability = new InMemoryAvailability();
    availability.blocks.push(
      new CalendarBlock('b', new DateRange(new Date('2026-05-09'), new Date('2026-05-12')), 'booked', new Date()),
    );

    const handler = new FindCheapestWindowsHandler(
      quotes,
      availability,
      stubDeepLink,
      new FixedClock(new Date('2026-01-01')),
    );
    const out = await handler.execute(new FindCheapestWindowsQuery('WRO', 7));

    // The 2026-05-08 window overlaps the block and is dropped; only 2026-05-15 remains.
    expect(out).toHaveLength(1);
    expect(out[0].arrival).toBe('2026-05-15');
    expect(out[0].indicativePrice).toBe(58);
    expect(out[0].flightDeepLink).toContain('marker=m');
  });
});
```

> Note: `quote(...)` in `test/fakes/flight.ts` builds a `FlightQuote`; this test overrides its dates via spread for clarity. If your TS config rejects the `as any` spread, construct `new FlightQuote(...)` directly with the dates instead.

- [ ] **Step 3: Run to verify failure**

Run: `cd api && npx jest test/application/find-cheapest-windows.handler.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Create the query** — `api/src/application/optimizer/find-cheapest-windows.query.ts`

```ts
export class FindCheapestWindowsQuery {
  constructor(
    public readonly origin: string,
    public readonly nights: number,
    public readonly limit: number = 10,
  ) {}
}
```

- [ ] **Step 5: Create the handler** — `api/src/application/optimizer/find-cheapest-windows.handler.ts`

```ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindCheapestWindowsQuery } from './find-cheapest-windows.query';
import { CheapestWindowFinder } from '../../domain/optimizer/cheapest-window-finder';
import { Origin } from '../../domain/flight/origin';
import {
  FLIGHT_QUOTE_REPOSITORY,
  FlightQuoteRepository,
} from '../../domain/flight/flight-quote.repository.port';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';
import {
  FLIGHT_DEEP_LINK_BUILDER,
  FlightDeepLinkBuilder,
} from '../../domain/flight/flight-deep-link-builder.port';
import { CLOCK, Clock } from '../../domain/shared/clock.port';

const iso = (d: Date) => d.toISOString().slice(0, 10);

@QueryHandler(FindCheapestWindowsQuery)
export class FindCheapestWindowsHandler implements IQueryHandler<FindCheapestWindowsQuery> {
  private readonly finder = new CheapestWindowFinder();

  constructor(
    @Inject(FLIGHT_QUOTE_REPOSITORY) private readonly quotes: FlightQuoteRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(FLIGHT_DEEP_LINK_BUILDER) private readonly deepLink: FlightDeepLinkBuilder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(q: FindCheapestWindowsQuery) {
    const origin = Origin.fromCode(q.origin);
    const now = this.clock.now();
    const horizonEnd = new Date(now);
    horizonEnd.setMonth(horizonEnd.getMonth() + 12);

    const quotes = await this.quotes.listForOrigin(origin);
    const blocks = await this.availability.listBetween(now, horizonEnd);

    return this.finder
      .find(quotes, blocks, q.nights, now)
      .slice(0, q.limit)
      .map((s) => ({
        origin: s.origin.code,
        arrival: iso(s.range.arrival),
        departure: iso(s.range.departure),
        nights: q.nights,
        indicativePrice: s.indicativePrice.amount,
        currency: s.indicativePrice.currency,
        flightDeepLink: this.deepLink.forDates(s.origin, s.range.arrival, s.range.departure),
        hasOrphanGap: s.orphanPenalty > 0,
      }));
  }
}
```

- [ ] **Step 6: Run to verify pass**

Run: `cd api && npx jest test/application/find-cheapest-windows.handler.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/src/domain/flight/flight-deep-link-builder.port.ts api/src/application/optimizer api/test/application/find-cheapest-windows.handler.spec.ts
git commit -m "feat(api): add FindCheapestWindows query handler with deep-link port"
```

---

## Task 3: Deep-link builder + controller + module + e2e

**Files:**
- Create: `api/src/infrastructure/flight/aviasales-deep-link-builder.ts`, `api/src/interface/http/optimizer.controller.ts`, `api/src/interface/optimizer.module.ts`, `api/test/optimizer.e2e-spec.ts`, `api/test/infrastructure/aviasales-deep-link-builder.spec.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Write failing builder test** — `api/test/infrastructure/aviasales-deep-link-builder.spec.ts`

```ts
import { AviasalesDeepLinkBuilder } from '../../src/infrastructure/flight/aviasales-deep-link-builder';
import { Origin } from '../../src/domain/flight/origin';

describe('AviasalesDeepLinkBuilder', () => {
  it('builds an exact-date search url with the marker', () => {
    process.env.TRAVELPAYOUTS_MARKER = 'm99';
    const builder = new AviasalesDeepLinkBuilder();
    const url = builder.forDates(Origin.fromCode('WRO'), new Date('2026-05-08'), new Date('2026-05-15'));
    expect(url).toContain('/search/WRO0805ALC1505');
    expect(url).toContain('marker=m99');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && npx jest test/infrastructure/aviasales-deep-link-builder.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Create `api/src/infrastructure/flight/aviasales-deep-link-builder.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { Origin, DESTINATION } from '../../domain/flight/origin';
import { FlightDeepLinkBuilder } from '../../domain/flight/flight-deep-link-builder.port';
import { buildDeepLink } from './aviasales-deep-link';

function ddmm(d: Date): string {
  return String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCMonth() + 1).padStart(2, '0');
}

@Injectable()
export class AviasalesDeepLinkBuilder implements FlightDeepLinkBuilder {
  forDates(origin: Origin, arrival: Date, departure: Date): string {
    const marker = process.env.TRAVELPAYOUTS_MARKER ?? '';
    const path = `/search/${origin.code}${ddmm(arrival)}${DESTINATION}${ddmm(departure)}1`;
    return buildDeepLink(path, marker);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd api && npx jest test/infrastructure/aviasales-deep-link-builder.spec.ts`
Expected: PASS.

- [ ] **Step 5: Create `api/src/interface/http/optimizer.controller.ts`**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FindCheapestWindowsQuery } from '../../application/optimizer/find-cheapest-windows.query';

@Controller('optimizer')
export class OptimizerController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('cheapest-windows')
  find(
    @Query('origin') origin: string,
    @Query('nights') nights: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryBus.execute(
      new FindCheapestWindowsQuery(origin, Number(nights ?? 7), Number(limit ?? 10)),
    );
  }
}
```

- [ ] **Step 6: Create `api/src/interface/optimizer.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OptimizerController } from './http/optimizer.controller';
import { FindCheapestWindowsHandler } from '../application/optimizer/find-cheapest-windows.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgFlightQuoteRepository } from '../infrastructure/flight/pg-flight-quote.repository';
import { PgAvailabilityRepository } from '../infrastructure/persistence/pg-availability.repository';
import { AviasalesDeepLinkBuilder } from '../infrastructure/flight/aviasales-deep-link-builder';
import { SystemClock } from '../infrastructure/time/system-clock';
import { FLIGHT_QUOTE_REPOSITORY } from '../domain/flight/flight-quote.repository.port';
import { AVAILABILITY_REPOSITORY } from '../domain/availability/availability.repository.port';
import { FLIGHT_DEEP_LINK_BUILDER } from '../domain/flight/flight-deep-link-builder.port';
import { CLOCK } from '../domain/shared/clock.port';

@Module({
  imports: [CqrsModule],
  controllers: [OptimizerController],
  providers: [
    FindCheapestWindowsHandler,
    pgPoolProvider,
    { provide: FLIGHT_QUOTE_REPOSITORY, useClass: PgFlightQuoteRepository },
    { provide: AVAILABILITY_REPOSITORY, useClass: PgAvailabilityRepository },
    { provide: FLIGHT_DEEP_LINK_BUILDER, useClass: AviasalesDeepLinkBuilder },
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class OptimizerModule {}
```

- [ ] **Step 7: Register in `api/src/app.module.ts`** (add `OptimizerModule` to imports)

```ts
import { OptimizerModule } from './interface/optimizer.module';
// ...add OptimizerModule to the @Module imports array
```

- [ ] **Step 8: Write e2e** — `api/test/optimizer.e2e-spec.ts`

```ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

describe('Optimizer (e2e)', () => {
  let app: INestApplication;
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    delete process.env.TRAVELPAYOUTS_TOKEN; // mock provider seeds quotes on bootstrap
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    // block a week far in the mock horizon to prove exclusion
    await pool.query('DELETE FROM calendar_blocks');
    await pool.query(
      `INSERT INTO calendar_blocks (start_date, end_date, reason) VALUES ('2026-07-01','2026-07-15','booked')`,
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM calendar_blocks');
    await pool.query('DELETE FROM flight_quotes');
    await pool.end();
    await app.close();
  });

  it('returns windows cheapest-first that skip blocked dates', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/optimizer/cheapest-windows?origin=WRO&nights=7',
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // prices are non-decreasing
    const prices = res.body.map((w: any) => w.indicativePrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    // none overlaps the 2026-07-01..15 block
    for (const w of res.body) {
      expect(w.arrival >= '2026-07-15' || w.departure <= '2026-07-01').toBe(true);
    }
  });
});
```

- [ ] **Step 9: Run e2e + full suite + lint** (db up, migrations applied)

Run:
```bash
cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run test:e2e
DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm test && npm run lint
```
Expected: optimizer e2e PASS; all unit specs PASS; lint clean.

- [ ] **Step 10: Commit**

```bash
git add api/src/infrastructure/flight/aviasales-deep-link-builder.ts api/src/interface/http/optimizer.controller.ts api/src/interface/optimizer.module.ts api/src/app.module.ts api/test/optimizer.e2e-spec.ts api/test/infrastructure/aviasales-deep-link-builder.spec.ts
git commit -m "feat(api): wire optimizer endpoint, deep-link builder and e2e"
```

---

## Task 4: Frontend dates-finder + inquiry prefill + CTAs

**Files:**
- Create: `web/components/WindowFinder.tsx`, `web/app/najit-terminy/page.tsx`, `web/e2e/finder.spec.ts`
- Modify: `web/lib/api.ts`, `web/components/InquiryForm.tsx`, `web/app/rezervace/page.tsx`, `web/components/Hero.tsx`, `web/components/Nav.tsx`

- [ ] **Step 1: Extend `web/lib/api.ts`** (append)

```ts
export interface Window {
  origin: string;
  arrival: string;
  departure: string;
  nights: number;
  indicativePrice: number;
  currency: string;
  flightDeepLink: string;
}

export async function fetchCheapestWindows(origin: string, nights: number): Promise<Window[]> {
  const res = await fetch(`${BASE}/optimizer/cheapest-windows?origin=${origin}&nights=${nights}`);
  if (!res.ok) throw new Error('optimizer failed');
  return res.json();
}
```

- [ ] **Step 2: Create `web/components/WindowFinder.tsx`**

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { fetchCheapestWindows, Window } from '@/lib/api';

const ORIGINS = [
  { code: 'PED', name: 'Pardubice' },
  { code: 'WRO', name: 'Vratislav' },
  { code: 'PRG', name: 'Praha' },
];

export default function WindowFinder() {
  const [origin, setOrigin] = useState('WRO');
  const [nights, setNights] = useState(7);
  const [windows, setWindows] = useState<Window[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      setWindows(await fetchCheapestWindows(origin, Math.max(7, nights)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex flex-wrap gap-3 items-end mb-6">
        <label className="text-sm">Odkud
          <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="border p-2 rounded block">
            {ORIGINS.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Počet nocí
          <input type="number" min={7} value={nights} onChange={(e) => setNights(Number(e.target.value))} className="border p-2 rounded block w-24" />
        </label>
        <button className="bg-terracotta text-white py-2 px-4 rounded">Najít termíny</button>
      </form>

      {loading && <p>Hledám…</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {windows.map((w) => (
          <div key={w.arrival} className="bg-white rounded-xl p-4 shadow-sm">
            <p className="font-display text-lg">{w.arrival} → {w.departure}</p>
            <p className="text-terracotta">orientační letenka od {w.indicativePrice} €</p>
            <div className="flex gap-4 mt-2 text-sm">
              <Link href={`/rezervace?arrival=${w.arrival}&departure=${w.departure}`} className="text-sea underline">
                Vybrat termín
              </Link>
              <a href={w.flightDeepLink} target="_blank" rel="sponsored noopener" className="text-sea underline">
                Rezervovat letenku
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `web/app/najit-terminy/page.tsx`**

```tsx
import WindowFinder from '@/components/WindowFinder';

export const metadata = { title: 'Najít nejlevnější termíny — Vinamar' };

export default function NajitTerminy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">Najděte nejlevnější termíny</h1>
      <p className="text-ink/80 mb-6">Vyberte odkud poletíte a na jak dlouho (min. 7 nocí).</p>
      <WindowFinder />
    </main>
  );
}
```

- [ ] **Step 4: Make `web/components/InquiryForm.tsx` accept prefilled dates**

Replace the `useState` initializer line so the component accepts optional initial dates:
```tsx
export default function InquiryForm({
  initialArrival = '',
  initialDeparture = '',
}: {
  initialArrival?: string;
  initialDeparture?: string;
}) {
  const [form, setForm] = useState({
    guestName: '',
    email: '',
    arrival: initialArrival,
    departure: initialDeparture,
    message: '',
  });
  // ...rest unchanged
```

- [ ] **Step 5: Make `web/app/rezervace/page.tsx` read query params**

```tsx
import InquiryForm from '@/components/InquiryForm';

export const metadata = { title: 'Rezervace — Vinamar' };

export default async function Rezervace({
  searchParams,
}: {
  searchParams: Promise<{ arrival?: string; departure?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">Rezervace</h1>
      <p className="text-ink/80 mb-6">Minimální pobyt 7 nocí. Pošlete nám poptávku a my se ozveme.</p>
      <InquiryForm initialArrival={sp.arrival ?? ''} initialDeparture={sp.departure ?? ''} />
    </main>
  );
}
```

- [ ] **Step 6: Point the hero CTA at the finder** — in `web/components/Hero.tsx` change the CTA `href` from `/tipy-na-vylety` to `/najit-terminy`:

```tsx
        <Link
          href="/najit-terminy"
          className="inline-block bg-terracotta px-6 py-3 rounded-full font-semibold"
        >
          Zjistit nejlevnější termíny →
        </Link>
```

- [ ] **Step 7: Add a nav link** — in `web/components/Nav.tsx` add to the `links` array:

```tsx
  { href: '/najit-terminy', label: 'Najít termíny' },
```

- [ ] **Step 8: Create Playwright e2e** — `web/e2e/finder.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('finder returns windows and Vybrat termín prefills the inquiry', async ({ page }) => {
  await page.goto('/najit-terminy');
  await page.getByRole('button', { name: 'Najít termíny' }).click();
  const first = page.getByRole('link', { name: 'Vybrat termín' }).first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/rezervace\?arrival=\d{4}-\d{2}-\d{2}&departure=\d{4}-\d{2}-\d{2}/);
  await expect(page.locator('input[type=date]').first()).not.toHaveValue('');
});
```

- [ ] **Step 9: Run the full stack + e2e**

Run:
```bash
docker compose up -d --build
cd web && E2E_BASE_URL=http://localhost:3000 npm run e2e
curl -s "http://localhost:3001/api/optimizer/cheapest-windows?origin=WRO&nights=7"
```
Expected: finder e2e PASS; the curl returns ranked windows (mock provider).

- [ ] **Step 10: Mark README TODO D done + commit**

Change `- [ ] D — Cheapest-Dates Optimizer` to `- [x]` in `README.md`.

```bash
git add web/lib/api.ts web/components/WindowFinder.tsx web/app/najit-terminy web/components/InquiryForm.tsx web/app/rezervace/page.tsx web/components/Hero.tsx web/components/Nav.tsx web/e2e/finder.spec.ts README.md
git commit -m "feat(web): add dates-finder, inquiry prefill and CTAs; mark D complete"
```

---

## Self-Review Notes

- **Spec coverage:** pure `CheapestWindowFinder` with price ordering + gap-fill tiebreak + availability filter + future-only + arbitrary length (T1, exhaustive tests) · `FindCheapestWindows` composing B's `AVAILABILITY_REPOSITORY` and C's `FLIGHT_QUOTE_REPOSITORY` (T2) · indicative price + exact-date deep link via `FlightDeepLinkBuilder` (T2, T3) · `/optimizer/cheapest-windows` endpoint (T3) · `/najit-terminy` finder, `/rezervace` prefill, hero/nav CTAs (T4) · all acceptance items map to T3 (e2e) and T4 (Playwright).
- **No placeholders:** every step has complete code or exact commands with expected output.
- **Type consistency:** reuses B's `DateRange`/`CalendarBlock`/`AVAILABILITY_REPOSITORY` and C's `FlightQuote`/`Origin`/`Money`/`FLIGHT_QUOTE_REPOSITORY`/`buildDeepLink` exactly as defined there; new symbols `FLIGHT_DEEP_LINK_BUILDER`, `WindowSuggestion(range, origin, indicativePrice, orphanPenalty)`, and the suggestion DTO (`origin, arrival, departure, nights, indicativePrice, currency, flightDeepLink, hasOrphanGap`) are consumed identically by the controller and the web `Window` type.
- **Note on orphan heuristic:** the implemented `orphanPenalty` counts only gaps bounded by an actual block (not by `now`), which is the cleaner reading of the spec's intent — it penalises windows that strand unbookable space against existing bookings, and leaves near-term windows unpenalised.
```
