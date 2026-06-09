# Availability-first portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the portal around apartment availability — a calendar wall of free dates over the next 12 months, each open window annotated with the cheapest flight — replacing the two flight-first pages.

**Architecture:** New backend read-model slice (`calendar`) that reuses the existing `CheapestWindowFinder` to overlay flight prices on availability, then a new `AvailabilityCalendarBuilder` domain service reshapes the result into a month grid. A new `/calendar` endpoint feeds a single React page `/volne-terminy`. The flight backend and the booking-inquiry flow are unchanged; the two old flight-first pages and components are removed. Typography is fixed by loading Inter.

**Tech Stack:** NestJS + CQRS + raw-SQL (api), Next.js App Router + Tailwind (web), Jest/ts-jest + supertest (api tests), Vitest + Playwright (web tests).

**Spec:** `docs/superpowers/specs/2026-06-09-availability-first-portal-design.md`

**Conventions reminder:**
- API tests live under `api/test/**` (mirroring `src`), named `*.spec.ts` (unit) / `*.e2e-spec.ts` (e2e).
- Run api unit tests: `npm --prefix api test`. Run a single file: `npm --prefix api test -- test/domain/<file>.spec.ts`.
- Run api e2e (needs db): `cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run test:e2e`.
- Onion rule: `src/domain/**` must not import framework/infra. ESLint enforces it (`npm --prefix api run lint`).
- No `flush` in handlers; this slice is read-only anyway.
- Commit messages: NO `Co-Authored-By` trailer.
- npm installs must use `npm --prefix <dir>` (global npm-install is denied).

---

## File Structure

**Backend (api):**
- Create `src/domain/calendar/month-availability.ts` — value object for one month.
- Create `src/domain/calendar/availability-calendar.ts` — value object wrapping ordered months.
- Create `src/domain/calendar/availability-calendar-builder.ts` — domain service (free-range complement + month bucketing + cheapest-per-month).
- Create `src/application/calendar/find-availability-calendar.query.ts`
- Create `src/application/calendar/find-availability-calendar.handler.ts`
- Create `src/interface/http/calendar.controller.ts`
- Create `src/interface/calendar.module.ts`
- Modify `src/app.module.ts` — register `CalendarModule`.
- Tests: `test/domain/availability-calendar-builder.spec.ts`, `test/calendar.e2e-spec.ts`.

**Frontend (web):**
- Modify `app/layout.tsx` — load Inter via `next/font`, update meta description.
- Modify `tailwind.config.ts` — point font families at Inter; add radius/shadow scale tokens.
- Modify `app/globals.css` — heading tracking.
- Modify `lib/api.ts` — add `fetchAvailabilityCalendar`; remove old flight helpers/types.
- Create `app/volne-terminy/page.tsx`
- Create `components/CalendarWall.tsx`
- Create `components/MonthCard.tsx`
- Modify `components/Nav.tsx` — swap links.
- Modify `app/page.tsx` + `content/home.md` — flip the lead teaser.
- Delete `app/letenky/`, `app/najit-terminy/`, `components/FlightCard.tsx`, `components/WindowFinder.tsx`.
- Tests: create `e2e/volne-terminy.spec.ts`; delete `e2e/flights.spec.ts`, `e2e/finder.spec.ts`.

---

## Task 1: `AvailabilityCalendarBuilder` domain service

**Files:**
- Create: `api/src/domain/calendar/month-availability.ts`
- Create: `api/src/domain/calendar/availability-calendar.ts`
- Create: `api/src/domain/calendar/availability-calendar-builder.ts`
- Test: `api/test/domain/availability-calendar-builder.spec.ts`

- [ ] **Step 1: Write the value objects**

`api/src/domain/calendar/month-availability.ts`:
```ts
import { DateRange } from '../shared/date-range';
import { WindowSuggestion } from '../optimizer/window-suggestion';

export class MonthAvailability {
  constructor(
    public readonly year: number,
    public readonly month: number, // 1–12
    public readonly freeRanges: DateRange[],
    public readonly cheapestWindow: WindowSuggestion | null,
  ) {}
}
```

`api/src/domain/calendar/availability-calendar.ts`:
```ts
import { MonthAvailability } from './month-availability';

export class AvailabilityCalendar {
  constructor(public readonly months: MonthAvailability[]) {}
}
```

- [ ] **Step 2: Write the failing test**

`api/test/domain/availability-calendar-builder.spec.ts`:
```ts
import { AvailabilityCalendarBuilder } from '../../src/domain/calendar/availability-calendar-builder';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { WindowSuggestion } from '../../src/domain/optimizer/window-suggestion';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';

const WRO = Origin.fromCode('WRO');
const d = (s: string) => new Date(s);
const block = (start: string, end: string): CalendarBlock =>
  new CalendarBlock('b', new DateRange(d(start), d(end)), 'booked', d('2026-01-01'));
const win = (arrival: string, departure: string, price: number, penalty = 0): WindowSuggestion =>
  new WindowSuggestion(new DateRange(d(arrival), d(departure)), WRO, new Money(price), penalty);

const builder = new AvailabilityCalendarBuilder();
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe('AvailabilityCalendarBuilder', () => {
  it('emits one MonthAvailability per month across the horizon in order', () => {
    const cal = builder.build([], [], d('2026-03-10'), d('2026-05-20'));
    expect(cal.months.map((m) => `${m.year}-${m.month}`)).toEqual(['2026-3', '2026-4', '2026-5']);
  });

  it('computes free ranges as the complement of blocks, clamped to the horizon', () => {
    const blocks = [block('2026-03-15', '2026-03-20')];
    const cal = builder.build(blocks, [], d('2026-03-10'), d('2026-03-31'));
    const march = cal.months.find((m) => m.month === 3)!;
    const ranges = march.freeRanges.map((r) => [iso(r.arrival), iso(r.departure)]);
    expect(ranges).toEqual([
      ['2026-03-10', '2026-03-15'],
      ['2026-03-20', '2026-03-31'],
    ]);
  });

  it('splits a free range that crosses a month boundary', () => {
    const cal = builder.build([], [], d('2026-03-20'), d('2026-04-10'));
    const march = cal.months.find((m) => m.month === 3)!;
    const april = cal.months.find((m) => m.month === 4)!;
    expect(march.freeRanges.map((r) => [iso(r.arrival), iso(r.departure)])).toEqual([
      ['2026-03-20', '2026-04-01'],
    ]);
    expect(april.freeRanges.map((r) => [iso(r.arrival), iso(r.departure)])).toEqual([
      ['2026-04-01', '2026-04-10'],
    ]);
  });

  it('attaches the cheapest window whose arrival falls in the month', () => {
    const windows = [
      win('2026-03-09', '2026-03-16', 80),
      win('2026-03-23', '2026-03-30', 55),
      win('2026-04-06', '2026-04-13', 70),
    ];
    const cal = builder.build([], windows, d('2026-03-01'), d('2026-04-30'));
    const march = cal.months.find((m) => m.month === 3)!;
    const april = cal.months.find((m) => m.month === 4)!;
    expect(march.cheapestWindow!.indicativePrice.amount).toBe(55);
    expect(april.cheapestWindow!.indicativePrice.amount).toBe(70);
  });

  it('leaves cheapestWindow null for a month with no window', () => {
    const cal = builder.build([], [win('2026-03-09', '2026-03-16', 80)], d('2026-03-01'), d('2026-04-30'));
    expect(cal.months.find((m) => m.month === 4)!.cheapestWindow).toBeNull();
  });

  it('emits a fully-booked month with no free ranges and no window', () => {
    const blocks = [block('2026-03-01', '2026-04-01')];
    const cal = builder.build(blocks, [], d('2026-03-01'), d('2026-03-31'));
    const march = cal.months.find((m) => m.month === 3)!;
    expect(march.freeRanges).toEqual([]);
    expect(march.cheapestWindow).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm --prefix api test -- test/domain/availability-calendar-builder.spec.ts`
Expected: FAIL — `Cannot find module '.../availability-calendar-builder'`.

- [ ] **Step 4: Implement the builder**

`api/src/domain/calendar/availability-calendar-builder.ts`:
```ts
import { DateRange } from '../shared/date-range';
import { CalendarBlock } from '../availability/calendar-block';
import { WindowSuggestion } from '../optimizer/window-suggestion';
import { MonthAvailability } from './month-availability';
import { AvailabilityCalendar } from './availability-calendar';

export class AvailabilityCalendarBuilder {
  build(
    blocks: CalendarBlock[],
    windows: WindowSuggestion[],
    now: Date,
    horizonEnd: Date,
  ): AvailabilityCalendar {
    const freeRanges = this.freeRanges(blocks, now, horizonEnd);
    const months: MonthAvailability[] = [];

    let cursor = this.monthStart(now);
    while (cursor.getTime() < horizonEnd.getTime()) {
      const next = this.addMonth(cursor);
      const monthRange = new DateRange(cursor, next);
      months.push(
        new MonthAvailability(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth() + 1,
          this.clip(freeRanges, monthRange),
          this.cheapestIn(windows, cursor, next),
        ),
      );
      cursor = next;
    }

    return new AvailabilityCalendar(months);
  }

  private freeRanges(blocks: CalendarBlock[], now: Date, horizonEnd: Date): DateRange[] {
    const merged = this.merge(
      blocks
        .map((b) => b.range)
        .filter((r) => r.departure.getTime() > now.getTime() && r.arrival.getTime() < horizonEnd.getTime()),
    );

    const free: DateRange[] = [];
    let cursor = now.getTime();
    for (const r of merged) {
      const start = Math.max(r.arrival.getTime(), now.getTime());
      if (start > cursor) {
        free.push(new DateRange(new Date(cursor), new Date(start)));
      }
      cursor = Math.max(cursor, Math.min(r.departure.getTime(), horizonEnd.getTime()));
    }
    if (cursor < horizonEnd.getTime()) {
      free.push(new DateRange(new Date(cursor), new Date(horizonEnd.getTime())));
    }
    return free;
  }

  private merge(ranges: DateRange[]): DateRange[] {
    const sorted = [...ranges].sort((a, b) => a.arrival.getTime() - b.arrival.getTime());
    const out: DateRange[] = [];
    for (const r of sorted) {
      const last = out[out.length - 1];
      if (last && r.arrival.getTime() <= last.departure.getTime()) {
        if (r.departure.getTime() > last.departure.getTime()) {
          out[out.length - 1] = new DateRange(last.arrival, r.departure);
        }
      } else {
        out.push(r);
      }
    }
    return out;
  }

  private clip(freeRanges: DateRange[], month: DateRange): DateRange[] {
    const out: DateRange[] = [];
    for (const r of freeRanges) {
      const start = Math.max(r.arrival.getTime(), month.arrival.getTime());
      const end = Math.min(r.departure.getTime(), month.departure.getTime());
      if (end > start) {
        out.push(new DateRange(new Date(start), new Date(end)));
      }
    }
    return out;
  }

  private cheapestIn(windows: WindowSuggestion[], monthStart: Date, monthEnd: Date): WindowSuggestion | null {
    let best: WindowSuggestion | null = null;
    for (const w of windows) {
      const a = w.range.arrival.getTime();
      if (a < monthStart.getTime() || a >= monthEnd.getTime()) {
        continue;
      }
      if (!best || w.indicativePrice.amount < best.indicativePrice.amount) {
        best = w;
      }
    }
    return best;
  }

  private monthStart(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private addMonth(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm --prefix api test -- test/domain/availability-calendar-builder.spec.ts`
Expected: PASS (6 passing).

- [ ] **Step 6: Run the onion lint to confirm no forbidden imports**

Run: `npm --prefix api run lint`
Expected: no errors for `src/domain/calendar/**`.

- [ ] **Step 7: Commit**

```bash
git add api/src/domain/calendar api/test/domain/availability-calendar-builder.spec.ts
git commit -m "feat(api): add AvailabilityCalendarBuilder domain service"
```

---

## Task 2: `FindAvailabilityCalendar` query + handler

**Files:**
- Create: `api/src/application/calendar/find-availability-calendar.query.ts`
- Create: `api/src/application/calendar/find-availability-calendar.handler.ts`
- Test: `api/test/application/find-availability-calendar.handler.spec.ts`

- [ ] **Step 1: Write the query**

`api/src/application/calendar/find-availability-calendar.query.ts`:
```ts
export class FindAvailabilityCalendarQuery {
  constructor(
    public readonly origin: string,
    public readonly nights: number = 7,
    public readonly months: number = 12,
  ) {}
}
```

- [ ] **Step 2: Write the failing handler test**

`api/test/application/find-availability-calendar.handler.spec.ts`:
```ts
import { FindAvailabilityCalendarHandler } from '../../src/application/calendar/find-availability-calendar.handler';
import { FindAvailabilityCalendarQuery } from '../../src/application/calendar/find-availability-calendar.query';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';

const now = new Date('2026-03-01');
const WRO = Origin.fromCode('WRO');
const quote = (day: string, price: number) =>
  new FlightQuote(WRO, new Date(day), new Date(day), new Money(price), 'FR', 'x', now);

const quotes = {
  listForOrigin: jest.fn().mockResolvedValue([quote('2026-03-09', 80), quote('2026-03-23', 55)]),
};
const availability = {
  listBetween: jest
    .fn()
    .mockResolvedValue([new CalendarBlock('b', new DateRange(new Date('2026-03-12'), new Date('2026-03-16')), 'booked', now)]),
};
const deepLink = { forDates: jest.fn().mockReturnValue('https://aviasales.com/search/WROALC') };
const clock = { now: () => now };

describe('FindAvailabilityCalendarHandler', () => {
  const handler = new FindAvailabilityCalendarHandler(
    quotes as never,
    availability as never,
    deepLink as never,
    clock as never,
  );

  it('returns months with free ranges and a cheapest window carrying a deep link', async () => {
    const out = await handler.execute(new FindAvailabilityCalendarQuery('WRO', 7, 2));
    expect(out.origin).toBe('WRO');
    expect(out.months.length).toBe(2);
    const march = out.months.find((m) => m.month === 3)!;
    expect(march.cheapest!.indicativePrice).toBe(55);
    expect(march.cheapest!.flightDeepLink).toBe('https://aviasales.com/search/WROALC');
    expect(march.freeRanges.length).toBeGreaterThan(0);
    expect(march.freeRanges[0].start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm --prefix api test -- test/application/find-availability-calendar.handler.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the handler**

`api/src/application/calendar/find-availability-calendar.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindAvailabilityCalendarQuery } from './find-availability-calendar.query';
import { CheapestWindowFinder } from '../../domain/optimizer/cheapest-window-finder';
import { AvailabilityCalendarBuilder } from '../../domain/calendar/availability-calendar-builder';
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

const iso = (d: Date): string => d.toISOString().slice(0, 10);

export interface MonthDto {
  year: number;
  month: number;
  freeRanges: { start: string; end: string }[];
  cheapest: {
    arrival: string;
    departure: string;
    nights: number;
    indicativePrice: number;
    currency: string;
    flightDeepLink: string;
    hasOrphanGap: boolean;
  } | null;
}

export interface AvailabilityCalendarDto {
  origin: string;
  nights: number;
  months: MonthDto[];
}

@QueryHandler(FindAvailabilityCalendarQuery)
export class FindAvailabilityCalendarHandler
  implements IQueryHandler<FindAvailabilityCalendarQuery, AvailabilityCalendarDto>
{
  private readonly finder = new CheapestWindowFinder();
  private readonly builder = new AvailabilityCalendarBuilder();

  constructor(
    @Inject(FLIGHT_QUOTE_REPOSITORY) private readonly quotes: FlightQuoteRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(FLIGHT_DEEP_LINK_BUILDER) private readonly deepLink: FlightDeepLinkBuilder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(q: FindAvailabilityCalendarQuery): Promise<AvailabilityCalendarDto> {
    const origin = Origin.fromCode(q.origin);
    const now = this.clock.now();
    const horizonEnd = new Date(now);
    horizonEnd.setMonth(horizonEnd.getMonth() + q.months);

    const quotes = await this.quotes.listForOrigin(origin);
    const blocks = await this.availability.listBetween(now, horizonEnd);
    const windows = this.finder.find(quotes, blocks, q.nights, now);
    const calendar = this.builder.build(blocks, windows, now, horizonEnd);

    return {
      origin: origin.code,
      nights: q.nights,
      months: calendar.months.map((m) => ({
        year: m.year,
        month: m.month,
        freeRanges: m.freeRanges.map((r) => ({ start: iso(r.arrival), end: iso(r.departure) })),
        cheapest: m.cheapestWindow
          ? {
              arrival: iso(m.cheapestWindow.range.arrival),
              departure: iso(m.cheapestWindow.range.departure),
              nights: m.cheapestWindow.range.nights(),
              indicativePrice: m.cheapestWindow.indicativePrice.amount,
              currency: m.cheapestWindow.indicativePrice.currency,
              flightDeepLink: this.deepLink.forDates(
                m.cheapestWindow.origin,
                m.cheapestWindow.range.arrival,
                m.cheapestWindow.range.departure,
              ),
              hasOrphanGap: m.cheapestWindow.orphanPenalty > 0,
            }
          : null,
      })),
    };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm --prefix api test -- test/application/find-availability-calendar.handler.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/src/application/calendar api/test/application/find-availability-calendar.handler.spec.ts
git commit -m "feat(api): add FindAvailabilityCalendar query handler"
```

---

## Task 3: `/calendar` controller, module, and e2e

**Files:**
- Create: `api/src/interface/http/calendar.controller.ts`
- Create: `api/src/interface/calendar.module.ts`
- Modify: `api/src/app.module.ts`
- Test: `api/test/calendar.e2e-spec.ts`

- [ ] **Step 1: Write the controller**

`api/src/interface/http/calendar.controller.ts`:
```ts
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FindAvailabilityCalendarQuery } from '../../application/calendar/find-availability-calendar.query';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  find(
    @Query('origin') origin: string,
    @Query('nights') nights?: string,
    @Query('months') months?: string,
  ) {
    return this.queryBus.execute(
      new FindAvailabilityCalendarQuery(origin, Number(nights ?? 7), Number(months ?? 12)),
    );
  }
}
```

- [ ] **Step 2: Write the module** (mirror `optimizer.module.ts`)

`api/src/interface/calendar.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CalendarController } from './http/calendar.controller';
import { FindAvailabilityCalendarHandler } from '../application/calendar/find-availability-calendar.handler';
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
  controllers: [CalendarController],
  providers: [
    FindAvailabilityCalendarHandler,
    pgPoolProvider,
    { provide: FLIGHT_QUOTE_REPOSITORY, useClass: PgFlightQuoteRepository },
    { provide: AVAILABILITY_REPOSITORY, useClass: PgAvailabilityRepository },
    { provide: FLIGHT_DEEP_LINK_BUILDER, useClass: AviasalesDeepLinkBuilder },
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class CalendarModule {}
```

- [ ] **Step 3: Register the module in `app.module.ts`**

Add the import and list entry alongside `OptimizerModule`:
```ts
import { CalendarModule } from './interface/calendar.module';
```
and add `CalendarModule,` to the `imports` array.

- [ ] **Step 4: Write the failing e2e** (mirrors `test/optimizer.e2e-spec.ts`)

`api/test/calendar.e2e-spec.ts`:
```ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

interface MonthDto {
  year: number;
  month: number;
  freeRanges: { start: string; end: string }[];
  cheapest: { arrival: string; flightDeepLink: string } | null;
}

describe('Calendar (e2e)', () => {
  let app: INestApplication;
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    delete process.env.TRAVELPAYOUTS_TOKEN;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
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

  it('returns 12 chronological months with free ranges and at least one priced window', async () => {
    const res = await request(app.getHttpServer()).get('/api/calendar?origin=WRO&nights=7');
    expect(res.status).toBe(200);
    expect(res.body.origin).toBe('WRO');
    const months = res.body.months as MonthDto[];
    expect(months.length).toBe(12);

    const keys = months.map((m) => m.year * 12 + m.month);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));

    const priced = months.filter((m) => m.cheapest !== null);
    expect(priced.length).toBeGreaterThan(0);
    expect(priced[0].cheapest!.flightDeepLink).toContain('aviasales.com/search/WRO');

    const blockedMonth = months.find((m) => m.year === 2026 && m.month === 7)!;
    for (const r of blockedMonth.freeRanges) {
      expect(r.start >= '2026-07-15' || r.end <= '2026-07-01').toBe(true);
    }
  });
});
```

- [ ] **Step 5: Run the e2e to verify it passes**

Run: `cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run test:e2e -- test/calendar.e2e-spec.ts`
(Requires `docker compose up -d db` first.)
Expected: PASS.

- [ ] **Step 6: Run lint + full api unit suite**

Run: `npm --prefix api run lint && npm --prefix api test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add api/src/interface/http/calendar.controller.ts api/src/interface/calendar.module.ts api/src/app.module.ts api/test/calendar.e2e-spec.ts
git commit -m "feat(api): expose GET /calendar availability read model with e2e"
```

---

## Task 4: Fix typography (load Inter)

**Files:**
- Modify: `web/app/layout.tsx`
- Modify: `web/tailwind.config.ts`
- Modify: `web/app/globals.css`

- [ ] **Step 1: Load Inter in `layout.tsx`**

Replace the top of `web/app/layout.tsx` so the font is loaded and applied to `<html>`, and update the meta description away from "levné letenky":
```tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Vinamar — apartmán u moře, La Mata',
  description:
    'Apartmán k pronájmu v La Mata, Torrevieja. Podívejte se, kdy je volno a jak se levně dostat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={inter.variable}>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Point Tailwind font families at Inter**

In `web/tailwind.config.ts`, replace the `fontFamily` block so both families resolve to Inter (keeps existing `font-display`/`font-body` utility usages working) and add radius/shadow tokens for the card aesthetic:
```ts
      fontFamily: {
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)',
        cardHover: '0 8px 24px rgba(16,24,40,0.12)',
      },
```

- [ ] **Step 3: Tighten heading tracking in `globals.css`**

Replace the heading rule in `web/app/globals.css`:
```css
h1, h2, h3 {
  @apply font-display tracking-tight;
}
h1 { @apply text-4xl font-semibold leading-tight; }
h2 { @apply text-2xl font-semibold; }
```

- [ ] **Step 4: Verify the web build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds. (If the build host has no network and the Google font fetch fails, fall back to `npm --prefix web install @fontsource-variable/inter` and `import '@fontsource-variable/inter'` in `globals.css`, setting the families to `'Inter Variable'`.)

- [ ] **Step 5: Commit**

```bash
git add web/app/layout.tsx web/tailwind.config.ts web/app/globals.css
git commit -m "feat(web): load Inter and refine typography/surface tokens"
```

---

## Task 5: API client `fetchAvailabilityCalendar`

**Files:**
- Modify: `web/lib/api.ts`

- [ ] **Step 1: Add the calendar types + fetch function**

Append to `web/lib/api.ts`:
```ts
export interface CalendarWindow {
  arrival: string;
  departure: string;
  nights: number;
  indicativePrice: number;
  currency: string;
  flightDeepLink: string;
  hasOrphanGap: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  freeRanges: { start: string; end: string }[];
  cheapest: CalendarWindow | null;
}

export interface AvailabilityCalendar {
  origin: string;
  nights: number;
  months: CalendarMonth[];
}

export async function fetchAvailabilityCalendar(
  origin: string,
  nights: number,
): Promise<AvailabilityCalendar> {
  const res = await fetch(`${BASE}/calendar?origin=${origin}&nights=${nights}`);
  if (!res.ok) throw new Error('calendar failed');
  return res.json();
}
```

- [ ] **Step 2: Commit** (removal of the old flight helpers happens in Task 9 after their consumers are deleted)

```bash
git add web/lib/api.ts
git commit -m "feat(web): add fetchAvailabilityCalendar API client"
```

---

## Task 6: `MonthCard` component

**Files:**
- Create: `web/components/MonthCard.tsx`

- [ ] **Step 1: Implement the month card**

`web/components/MonthCard.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { CalendarMonth } from '@/lib/api';

const MONTHS_CS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];

function freeDaySet(m: CalendarMonth): Set<number> {
  const days = new Set<number>();
  for (const r of m.freeRanges) {
    const start = new Date(r.start);
    const end = new Date(r.end); // checkout-exclusive
    for (let t = start.getTime(); t < end.getTime(); t += 86400000) {
      days.add(new Date(t).getUTCDate());
    }
  }
  return days;
}

export default function MonthCard({ m }: { m: CalendarMonth }) {
  const free = freeDaySet(m);
  const daysInMonth = new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(m.year, m.month - 1, 1)).getUTCDay() + 6) % 7; // Mon=0

  return (
    <div className="bg-white rounded-2xl shadow-card hover:shadow-cardHover transition-shadow p-5 border border-ink/5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-semibold">
          {MONTHS_CS[m.month - 1]} <span className="text-ink/40">{m.year}</span>
        </h3>
        {m.cheapest ? (
          <span className="text-sm font-semibold text-white bg-terracotta rounded-full px-3 py-1">
            od {m.cheapest.indicativePrice} {m.cheapest.currency === 'EUR' ? '€' : m.cheapest.currency}
          </span>
        ) : (
          <span className="text-xs text-ink/40">bez letenky</span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d) => (
          <div key={d} className="text-ink/40">{d}</div>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isFree = free.has(day);
          return (
            <div
              key={day}
              className={
                isFree
                  ? 'rounded-md py-1 bg-sea/10 text-sea font-medium'
                  : 'rounded-md py-1 text-ink/25'
              }
            >
              {day}
            </div>
          );
        })}
      </div>

      {m.cheapest && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-ink/70">
            {m.cheapest.arrival} → {m.cheapest.departure}
          </span>
          <Link
            href={`/rezervace?arrival=${m.cheapest.arrival}&departure=${m.cheapest.departure}`}
            className="font-medium text-sea underline underline-offset-2"
          >
            Rezervovat termín
          </Link>
          <a
            href={m.cheapest.flightDeepLink}
            target="_blank"
            rel="sponsored noopener"
            className="font-medium text-sea underline underline-offset-2"
          >
            Letenka
          </a>
          {m.cheapest.hasOrphanGap && <span className="text-ochre text-xs">kratší mezera</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/MonthCard.tsx
git commit -m "feat(web): add MonthCard calendar component"
```

---

## Task 7: `CalendarWall` component

**Files:**
- Create: `web/components/CalendarWall.tsx`

- [ ] **Step 1: Implement the wall** (origin/nights controls, fetch, states)

`web/components/CalendarWall.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchAvailabilityCalendar, AvailabilityCalendar } from '@/lib/api';
import MonthCard from '@/components/MonthCard';

const ORIGINS = [
  { code: 'WRO', name: 'Vratislav' },
  { code: 'PED', name: 'Pardubice' },
  { code: 'PRG', name: 'Praha' },
];

export default function CalendarWall() {
  const [origin, setOrigin] = useState('WRO');
  const [nights, setNights] = useState(7);
  const [data, setData] = useState<AvailabilityCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchAvailabilityCalendar(origin, Math.max(7, nights))
      .then((d) => active && setData(d))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [origin, nights]);

  return (
    <div>
      <form className="flex flex-wrap gap-4 items-end mb-8" onSubmit={(e) => e.preventDefault()}>
        <label className="text-sm">
          Odkud poletíte
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="border border-ink/15 p-2 rounded-lg block mt-1 bg-white"
          >
            {ORIGINS.map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Počet nocí
          <input
            type="number"
            min={7}
            value={nights}
            onChange={(e) => setNights(Number(e.target.value))}
            className="border border-ink/15 p-2 rounded-lg block mt-1 w-24 bg-white"
          />
        </label>
      </form>

      {error && <p className="text-terracotta">Dostupnost se nepodařilo načíst.</p>}
      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card p-5 h-64 animate-pulse" />
          ))}
        </div>
      )}
      {!loading && !error && data && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.months.map((m) => (
            <MonthCard key={`${m.year}-${m.month}`} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/CalendarWall.tsx
git commit -m "feat(web): add CalendarWall component"
```

---

## Task 8: `/volne-terminy` page

**Files:**
- Create: `web/app/volne-terminy/page.tsx`

- [ ] **Step 1: Implement the page**

`web/app/volne-terminy/page.tsx`:
```tsx
import CalendarWall from '@/components/CalendarWall';

export const metadata = { title: 'Volné termíny — Vinamar' };

export default function VolneTerminy() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="mb-2">Volné termíny</h1>
      <p className="text-ink/70 mb-8 max-w-2xl">
        Vyberte termín, kdy je apartmán volný — u každého měsíce ukážeme nejlevnější letenku
        do Alicante a odkaz na rezervaci.
      </p>
      <CalendarWall />
    </main>
  );
}
```

- [ ] **Step 2: Manually verify against a running stack**

Run (from repo root, db + api + web up): open `http://localhost:3000/volne-terminy`.
Expected: month cards render, price badges appear on months with quotes, picking a window's "Rezervovat termín" navigates to `/rezervace` with prefilled dates.

- [ ] **Step 3: Commit**

```bash
git add web/app/volne-terminy/page.tsx
git commit -m "feat(web): add /volne-terminy calendar page"
```

---

## Task 9: Information architecture — nav, home, cleanup

**Files:**
- Modify: `web/components/Nav.tsx`
- Modify: `web/app/page.tsx`
- Modify: `web/lib/api.ts`
- Delete: `web/app/letenky/`, `web/app/najit-terminy/`, `web/components/FlightCard.tsx`, `web/components/WindowFinder.tsx`

- [ ] **Step 1: Update the nav links**

In `web/components/Nav.tsx`, replace the `links` array:
```tsx
const links = [
  { href: '/volne-terminy', label: 'Volné termíny' },
  { href: '/apartman', label: 'Apartmán' },
  { href: '/okoli', label: 'Okolí' },
  { href: '/tipy-na-vylety', label: 'Tipy na výlety' },
];
```
(The `Rezervace` link below the map stays.)

- [ ] **Step 2: Flip the lead teaser on the home page**

In `web/app/page.tsx`, reorder the teaser row so availability leads and replace the Letenky teaser:
```tsx
      <section className="flex flex-col md:flex-row gap-4 px-6">
        <SectionTeaser
          href="/volne-terminy"
          title="Volné termíny"
          text="Podívejte se, kdy je volno a jak se levně dostat"
        />
        <SectionTeaser href="/apartman" title="Apartmán" text="Prohlédněte si fotky a vybavení" />
        <SectionTeaser href="/okoli" title="Okolí" text="La Mata, solná jezera, Torrevieja" />
      </section>
```

- [ ] **Step 3: Delete the retired pages and components**

```bash
git rm -r web/app/letenky web/app/najit-terminy web/components/FlightCard.tsx web/components/WindowFinder.tsx
```

- [ ] **Step 4: Remove now-unused flight API helpers**

In `web/lib/api.ts`, delete `fetchCheapestFlights`, `fetchCheapestWindows`, and the `CheapestFlight` / `CheapestWindow` interfaces (no remaining importers after Step 3).

- [ ] **Step 5: Verify no dangling imports**

Run: `npm --prefix web run build`
Expected: build succeeds with no "module not found" / unused-import errors.

- [ ] **Step 6: Commit**

```bash
git add web/components/Nav.tsx web/app/page.tsx web/lib/api.ts
git commit -m "refactor(web): make availability the lead; retire flight-first pages"
```

---

## Task 10: Web e2e — replace flight tests with calendar smoke

**Files:**
- Create: `web/e2e/volne-terminy.spec.ts`
- Delete: `web/e2e/flights.spec.ts`, `web/e2e/finder.spec.ts`

- [ ] **Step 1: Delete the obsolete e2e specs**

```bash
git rm web/e2e/flights.spec.ts web/e2e/finder.spec.ts
```

- [ ] **Step 2: Write the calendar smoke test**

`web/e2e/volne-terminy.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('volné termíny shows month cards and a window prefills the inquiry', async ({ page }) => {
  await page.goto('/volne-terminy');
  await expect(page.getByRole('heading', { level: 1, name: 'Volné termíny' })).toBeVisible();

  const book = page.getByRole('link', { name: 'Rezervovat termín' }).first();
  await expect(book).toBeVisible();
  await book.click();

  await expect(page).toHaveURL(
    /\/rezervace\?arrival=\d{4}-\d{2}-\d{2}&departure=\d{4}-\d{2}-\d{2}/,
  );
  await expect(page.locator('input[type=date]').first()).not.toHaveValue('');
});
```

- [ ] **Step 3: Run the web e2e against a running stack**

Run (db + api + web up): `npm --prefix web run e2e -- volne-terminy.spec.ts`
Expected: PASS. (If no month has a priced window in the seeded data, the "Rezervovat termín" link is absent — ensure the mock provider seeded quotes by confirming the api booted without `TRAVELPAYOUTS_TOKEN`.)

- [ ] **Step 4: Run the full web test + e2e suite for regressions**

Run: `npm --prefix web test` then `npm --prefix web run e2e`
Expected: all pass (showcase + booking + volne-terminy).

- [ ] **Step 5: Commit**

```bash
git add web/e2e/volne-terminy.spec.ts
git commit -m "test(web): replace flight e2e with /volne-terminy smoke"
```

---

## Task 11: Update README TODO and finish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a completed line under the TODO list**

Append to the TODO section in `README.md`:
```markdown
- [x] F — Availability-first reframe (calendar wall, retire flight-first pages)
```
Also update the "Letenky" / "Najít termíny" mentions in the prose so docs match the new IA (single `/volne-terminy` page).

- [ ] **Step 2: Run the complete verification sweep**

Run:
```bash
npm --prefix api run lint
npm --prefix api test
cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run test:e2e && cd ..
npm --prefix web test
npm --prefix web run build
```
Expected: every command succeeds.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: mark availability-first reframe complete in README TODO"
```

- [ ] **Step 4: Open the PR** (per repo convention)

```bash
git push -u origin availability-first-portal
gh pr create --fill --title "Availability-first portal reframe"
```
(If no GitHub remote is configured, skip the push/PR and report the branch is ready locally.)

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Transport scope (flights only) — preserved; no new modes. ✓
- Calendar-first / calendar wall layout — Tasks 6–8. ✓
- Backend read-model slice mirroring optimizer — Tasks 1–3. ✓
- DTO shape matches spec — Task 2 (`AvailabilityCalendarDto`). ✓
- One `/volne-terminy` page; remove both old pages — Tasks 8–9. ✓
- Nav + home reframe — Task 9. ✓
- Typography fix (root cause: no web font) — Task 4. ✓
- Truthfulness (free month without quote → no badge) — covered by builder test (Task 1) + `MonthCard` "bez letenky"/null branch. ✓
- Flight backend kept — no task touches `/flights/*` or the cron. ✓
- Testing: domain unit + api e2e + web e2e — Tasks 1, 3, 10. ✓

**Placeholder scan:** none — every code step has full code; every command has expected output.

**Type consistency:** `AvailabilityCalendarDto.months[].cheapest` (api) ↔ `CalendarMonth.cheapest: CalendarWindow | null` (web) ↔ `MonthCard` `m.cheapest` usage — field names (`arrival`, `departure`, `nights`, `indicativePrice`, `currency`, `flightDeepLink`, `hasOrphanGap`) match across all three. `FindAvailabilityCalendarQuery(origin, nights, months)` signature matches controller call. `AvailabilityCalendarBuilder.build(blocks, windows, now, horizonEnd)` matches handler call and test.
