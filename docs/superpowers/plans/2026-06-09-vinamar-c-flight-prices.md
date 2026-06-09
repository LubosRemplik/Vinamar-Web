# Vinamar Web — Sub-project C (Flight Prices) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch, cache (9-month horizon, daily refresh) and display cheapest EUR round-trip flight prices from PED/WRO/PRG to ALC behind a swappable `FlightPriceProvider` port (Travelpayouts adapter + Mock fallback), with a homepage teaser and a `/letenky` page carrying affiliate deep links.

**Architecture:** Extends sub-project A's onion. New `flight` domain slice (port + repo), `RefreshFlightPrices`/`GetCheapestPerOrigin`/`GetQuotesForOrigin` handlers, raw-SQL `flight_quotes` repository, Travelpayouts HTTP adapter with a Mock fallback selected by env, and a `@nestjs/schedule` cron. Independent of B — the manual refresh endpoint uses its own header secret, not B's AdminGuard.

**Tech Stack:** As A, plus `@nestjs/schedule`. No new web deps beyond TanStack Query (added in B; install here if C is built before B).

**Spec:** [docs/superpowers/specs/2026-06-09-vinamar-c-flight-prices-design.md](../specs/2026-06-09-vinamar-c-flight-prices-design.md)

**Prerequisite:** Sub-project A merged.

---

## File Structure (new/changed)

```
api/src/domain/flight/
  origin.ts  money.ts  flight-quote.ts
  flight-price-provider.port.ts  flight-quote.repository.port.ts
api/src/application/flight/
  refresh-flight-prices.command.ts   refresh-flight-prices.handler.ts
  get-cheapest-per-origin.query.ts   get-cheapest-per-origin.handler.ts
  get-quotes-for-origin.query.ts     get-quotes-for-origin.handler.ts
api/src/infrastructure/flight/
  pg-flight-quote.repository.ts  mock-flight-price-provider.ts
  travelpayouts-flight-price-provider.ts  aviasales-deep-link.ts
  flight-provider.factory.ts  flight-price.cron.ts
api/src/interface/
  http/flight.controller.ts  http/admin-flight.controller.ts  flight.module.ts
api/migrations/1700000002000_flight-quotes.sql
web/app/letenky/page.tsx  web/components/FlightCard.tsx  (web/lib/api.ts extended)
```

---

## Task 1: Flight domain — Origin, Money, FlightQuote, ports (TDD)

**Files:**
- Create: `api/src/domain/flight/origin.ts`, `money.ts`, `flight-quote.ts`, `flight-price-provider.port.ts`, `flight-quote.repository.port.ts`, `api/test/domain/flight.spec.ts`

- [ ] **Step 1: Write failing test** — `api/test/domain/flight.spec.ts`

```ts
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';

describe('Origin', () => {
  it('lists the three supported origins with names', () => {
    expect(Origin.all().map((o) => o.code)).toEqual(['PED', 'WRO', 'PRG']);
    expect(Origin.fromCode('WRO').name).toBe('Vratislav');
  });
  it('rejects an unknown origin', () => {
    expect(() => Origin.fromCode('XXX')).toThrow();
  });
});

describe('Money', () => {
  it('holds a non-negative EUR amount', () => {
    expect(new Money(58).currency).toBe('EUR');
  });
  it('rejects negative amounts', () => {
    expect(() => new Money(-1)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && npx jest test/domain/flight.spec.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `api/src/domain/flight/origin.ts`**

```ts
export const DESTINATION = 'ALC';
export type OriginCode = 'PED' | 'WRO' | 'PRG';

const NAMES: Record<OriginCode, string> = {
  PED: 'Pardubice',
  WRO: 'Vratislav',
  PRG: 'Praha',
};

export class Origin {
  private constructor(public readonly code: OriginCode) {}

  static fromCode(code: string): Origin {
    if (code !== 'PED' && code !== 'WRO' && code !== 'PRG') {
      throw new Error(`unknown origin ${code}`);
    }
    return new Origin(code);
  }

  static all(): Origin[] {
    return (['PED', 'WRO', 'PRG'] as OriginCode[]).map((c) => new Origin(c));
  }

  get name(): string {
    return NAMES[this.code];
  }
}
```

- [ ] **Step 4: Create `api/src/domain/flight/money.ts`**

```ts
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: 'EUR' = 'EUR',
  ) {
    if (amount < 0) {
      throw new Error('amount must be non-negative');
    }
  }
}
```

- [ ] **Step 5: Create `api/src/domain/flight/flight-quote.ts`**

```ts
import { Origin } from './origin';
import { Money } from './money';

export class FlightQuote {
  constructor(
    public readonly origin: Origin,
    public readonly departureDate: Date,
    public readonly returnDate: Date,
    public readonly price: Money,
    public readonly airline: string,
    public readonly deepLink: string,
    public readonly fetchedAt: Date,
  ) {}
}
```

- [ ] **Step 6: Create the two ports**

`api/src/domain/flight/flight-price-provider.port.ts`:
```ts
import { Origin } from './origin';
import { FlightQuote } from './flight-quote';

export const FLIGHT_PRICE_PROVIDER = Symbol('FlightPriceProvider');

export interface FlightPriceProvider {
  cheapestForOrigin(origin: Origin, horizonMonths: number): Promise<FlightQuote[]>;
}
```

`api/src/domain/flight/flight-quote.repository.port.ts`:
```ts
import { Origin } from './origin';
import { FlightQuote } from './flight-quote';

export const FLIGHT_QUOTE_REPOSITORY = Symbol('FlightQuoteRepository');

export interface FlightQuoteRepository {
  replaceForOrigin(origin: Origin, quotes: FlightQuote[]): Promise<void>;
  cheapestPerOrigin(): Promise<FlightQuote[]>;
  listForOrigin(origin: Origin): Promise<FlightQuote[]>;
}
```

- [ ] **Step 7: Run to verify pass**

Run: `cd api && npx jest test/domain/flight.spec.ts`
Expected: PASS (4 assertions).

- [ ] **Step 8: Commit**

```bash
git add api/src/domain/flight api/test/domain/flight.spec.ts
git commit -m "feat(api): add flight domain (origin, money, quote, ports)"
```

---

## Task 2: Application handlers (TDD)

**Files:**
- Create: `api/src/application/flight/refresh-flight-prices.command.ts`, `refresh-flight-prices.handler.ts`, `get-cheapest-per-origin.query.ts`, `get-cheapest-per-origin.handler.ts`, `get-quotes-for-origin.query.ts`, `get-quotes-for-origin.handler.ts`
- Create: `api/test/application/refresh-flight-prices.handler.spec.ts`, `api/test/fakes/flight.ts`

- [ ] **Step 1: Create flight fakes** — `api/test/fakes/flight.ts`

```ts
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';
import { FlightPriceProvider } from '../../src/domain/flight/flight-price-provider.port';
import { FlightQuoteRepository } from '../../src/domain/flight/flight-quote.repository.port';

export function quote(origin: Origin, amount: number): FlightQuote {
  return new FlightQuote(
    origin,
    new Date('2026-05-01'),
    new Date('2026-05-08'),
    new Money(amount),
    'FR',
    'https://example/deep',
    new Date('2026-01-01'),
  );
}

export class StubProvider implements FlightPriceProvider {
  constructor(private readonly priceByCode: Record<string, number>, private readonly failCode?: string) {}
  async cheapestForOrigin(origin: Origin): Promise<FlightQuote[]> {
    if (origin.code === this.failCode) {
      throw new Error('provider failed');
    }
    return [quote(origin, this.priceByCode[origin.code] ?? 100)];
  }
}

export class InMemoryFlightQuotes implements FlightQuoteRepository {
  store = new Map<string, FlightQuote[]>();
  async replaceForOrigin(origin: Origin, quotes: FlightQuote[]): Promise<void> {
    this.store.set(origin.code, quotes);
  }
  async cheapestPerOrigin(): Promise<FlightQuote[]> {
    return [...this.store.values()]
      .map((qs) => qs.slice().sort((a, b) => a.price.amount - b.price.amount)[0])
      .filter(Boolean);
  }
  async listForOrigin(origin: Origin): Promise<FlightQuote[]> {
    return this.store.get(origin.code) ?? [];
  }
}
```

- [ ] **Step 2: Write failing test** — `api/test/application/refresh-flight-prices.handler.spec.ts`

```ts
import { RefreshFlightPricesHandler } from '../../src/application/flight/refresh-flight-prices.handler';
import { RefreshFlightPricesCommand } from '../../src/application/flight/refresh-flight-prices.command';
import { GetCheapestPerOriginHandler } from '../../src/application/flight/get-cheapest-per-origin.handler';
import { StubProvider, InMemoryFlightQuotes } from '../fakes/flight';

describe('RefreshFlightPrices', () => {
  it('stores quotes for every origin', async () => {
    const repo = new InMemoryFlightQuotes();
    const provider = new StubProvider({ PED: 80, WRO: 58, PRG: 70 });
    await new RefreshFlightPricesHandler(provider, repo).execute(new RefreshFlightPricesCommand(9));
    const cheapest = await new GetCheapestPerOriginHandler(repo).execute();
    expect(cheapest).toHaveLength(3);
    expect(cheapest.find((c) => c.origin === 'WRO')!.price).toBe(58);
  });

  it('continues when one origin fails', async () => {
    const repo = new InMemoryFlightQuotes();
    const provider = new StubProvider({ PED: 80, PRG: 70 }, 'WRO');
    await new RefreshFlightPricesHandler(provider, repo).execute(new RefreshFlightPricesCommand(9));
    const cheapest = await new GetCheapestPerOriginHandler(repo).execute();
    expect(cheapest.map((c) => c.origin).sort()).toEqual(['PED', 'PRG']);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd api && npx jest test/application/refresh-flight-prices.handler.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Create command + handler**

`api/src/application/flight/refresh-flight-prices.command.ts`:
```ts
export class RefreshFlightPricesCommand {
  constructor(public readonly horizonMonths: number = 9) {}
}
```

`api/src/application/flight/refresh-flight-prices.handler.ts`:
```ts
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshFlightPricesCommand } from './refresh-flight-prices.command';
import { Origin } from '../../domain/flight/origin';
import {
  FLIGHT_PRICE_PROVIDER,
  FlightPriceProvider,
} from '../../domain/flight/flight-price-provider.port';
import {
  FLIGHT_QUOTE_REPOSITORY,
  FlightQuoteRepository,
} from '../../domain/flight/flight-quote.repository.port';

@CommandHandler(RefreshFlightPricesCommand)
export class RefreshFlightPricesHandler implements ICommandHandler<RefreshFlightPricesCommand> {
  private readonly logger = new Logger(RefreshFlightPricesHandler.name);

  constructor(
    @Inject(FLIGHT_PRICE_PROVIDER) private readonly provider: FlightPriceProvider,
    @Inject(FLIGHT_QUOTE_REPOSITORY) private readonly repo: FlightQuoteRepository,
  ) {}

  async execute(cmd: RefreshFlightPricesCommand): Promise<void> {
    for (const origin of Origin.all()) {
      try {
        const quotes = await this.provider.cheapestForOrigin(origin, cmd.horizonMonths);
        await this.repo.replaceForOrigin(origin, quotes);
        this.logger.log(`refreshed ${origin.code}: ${quotes.length} quotes`);
      } catch (err) {
        this.logger.warn(`refresh failed for ${origin.code}: ${String(err)}`);
      }
    }
  }
}
```

- [ ] **Step 5: Create the two queries + handlers**

`api/src/application/flight/get-cheapest-per-origin.query.ts`:
```ts
export class GetCheapestPerOriginQuery {}
```

`api/src/application/flight/get-cheapest-per-origin.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCheapestPerOriginQuery } from './get-cheapest-per-origin.query';
import {
  FLIGHT_QUOTE_REPOSITORY,
  FlightQuoteRepository,
} from '../../domain/flight/flight-quote.repository.port';

@QueryHandler(GetCheapestPerOriginQuery)
export class GetCheapestPerOriginHandler implements IQueryHandler<GetCheapestPerOriginQuery> {
  constructor(@Inject(FLIGHT_QUOTE_REPOSITORY) private readonly repo: FlightQuoteRepository) {}

  async execute() {
    const quotes = await this.repo.cheapestPerOrigin();
    return quotes.map((q) => ({
      origin: q.origin.code,
      originName: q.origin.name,
      price: q.price.amount,
      currency: q.price.currency,
      departureDate: q.departureDate.toISOString().slice(0, 10),
      returnDate: q.returnDate.toISOString().slice(0, 10),
      airline: q.airline,
      deepLink: q.deepLink,
    }));
  }
}
```

`api/src/application/flight/get-quotes-for-origin.query.ts`:
```ts
export class GetQuotesForOriginQuery {
  constructor(public readonly origin: string) {}
}
```

`api/src/application/flight/get-quotes-for-origin.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetQuotesForOriginQuery } from './get-quotes-for-origin.query';
import { Origin } from '../../domain/flight/origin';
import {
  FLIGHT_QUOTE_REPOSITORY,
  FlightQuoteRepository,
} from '../../domain/flight/flight-quote.repository.port';

@QueryHandler(GetQuotesForOriginQuery)
export class GetQuotesForOriginHandler implements IQueryHandler<GetQuotesForOriginQuery> {
  constructor(@Inject(FLIGHT_QUOTE_REPOSITORY) private readonly repo: FlightQuoteRepository) {}

  async execute(q: GetQuotesForOriginQuery) {
    const quotes = await this.repo.listForOrigin(Origin.fromCode(q.origin));
    return quotes.map((quote) => ({
      origin: quote.origin.code,
      price: quote.price.amount,
      currency: quote.price.currency,
      departureDate: quote.departureDate.toISOString().slice(0, 10),
      returnDate: quote.returnDate.toISOString().slice(0, 10),
      airline: quote.airline,
      deepLink: quote.deepLink,
    }));
  }
}
```

- [ ] **Step 6: Run to verify pass**

Run: `cd api && npx jest test/application/refresh-flight-prices.handler.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add api/src/application/flight api/test/fakes/flight.ts api/test/application/refresh-flight-prices.handler.spec.ts
git commit -m "feat(api): add flight refresh and query handlers with tests"
```

---

## Task 3: Migration + PgFlightQuoteRepository (integration)

**Files:**
- Create: `api/migrations/1700000002000_flight-quotes.sql`, `api/src/infrastructure/flight/pg-flight-quote.repository.ts`, `api/test/infrastructure/pg-flight-quote.repository.spec.ts`

- [ ] **Step 1: Create migration `api/migrations/1700000002000_flight-quotes.sql`**

```sql
-- Up Migration
CREATE TABLE flight_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  departure_date date NOT NULL,
  return_date date NOT NULL,
  price_amount numeric NOT NULL,
  price_currency text NOT NULL DEFAULT 'EUR',
  airline text NOT NULL DEFAULT '',
  deep_link text NOT NULL DEFAULT '',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origin, departure_date)
);

-- Down Migration
DROP TABLE flight_quotes;
```

- [ ] **Step 2: Create `api/src/infrastructure/flight/pg-flight-quote.repository.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../persistence/pg-connection';
import { Origin } from '../../domain/flight/origin';
import { Money } from '../../domain/flight/money';
import { FlightQuote } from '../../domain/flight/flight-quote';
import { FlightQuoteRepository } from '../../domain/flight/flight-quote.repository.port';

@Injectable()
export class PgFlightQuoteRepository implements FlightQuoteRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toQuote(row: any): FlightQuote {
    return new FlightQuote(
      Origin.fromCode(row.origin),
      new Date(row.departure_date),
      new Date(row.return_date),
      new Money(Number(row.price_amount), row.price_currency),
      row.airline,
      row.deep_link,
      new Date(row.fetched_at),
    );
  }

  async replaceForOrigin(origin: Origin, quotes: FlightQuote[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM flight_quotes WHERE origin = $1', [origin.code]);
      for (const q of quotes) {
        await client.query(
          `INSERT INTO flight_quotes
             (origin, departure_date, return_date, price_amount, price_currency, airline, deep_link, fetched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            q.origin.code,
            q.departureDate,
            q.returnDate,
            q.price.amount,
            q.price.currency,
            q.airline,
            q.deepLink,
            q.fetchedAt,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async cheapestPerOrigin(): Promise<FlightQuote[]> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT ON (origin) * FROM flight_quotes ORDER BY origin, price_amount ASC`,
    );
    return rows.map((r) => this.toQuote(r));
  }

  async listForOrigin(origin: Origin): Promise<FlightQuote[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM flight_quotes WHERE origin = $1 ORDER BY departure_date`,
      [origin.code],
    );
    return rows.map((r) => this.toQuote(r));
  }
}
```

- [ ] **Step 3: Write integration test** — `api/test/infrastructure/pg-flight-quote.repository.spec.ts`

```ts
import { Pool } from 'pg';
import { PgFlightQuoteRepository } from '../../src/infrastructure/flight/pg-flight-quote.repository';
import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';
import { FlightQuote } from '../../src/domain/flight/flight-quote';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';
const q = (origin: Origin, amount: number, day: string) =>
  new FlightQuote(origin, new Date(day), new Date(day), new Money(amount), 'FR', 'x', new Date());

describe('PgFlightQuoteRepository (integration)', () => {
  const pool = new Pool({ connectionString: url });
  const repo = new PgFlightQuoteRepository(pool);

  afterAll(async () => {
    await pool.query('DELETE FROM flight_quotes');
    await pool.end();
  });

  it('replaces per origin and returns the cheapest per origin', async () => {
    await pool.query('DELETE FROM flight_quotes');
    const wro = Origin.fromCode('WRO');
    await repo.replaceForOrigin(wro, [q(wro, 90, '2026-05-01'), q(wro, 58, '2026-05-08')]);
    await repo.replaceForOrigin(wro, [q(wro, 70, '2026-06-01')]); // replace wipes the old rows
    const cheapest = await repo.cheapestPerOrigin();
    expect(cheapest).toHaveLength(1);
    expect(cheapest[0].price.amount).toBe(70);
  });
});
```

- [ ] **Step 4: Run migration + test** (db up)

Run:
```bash
cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run migrate up
DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npx jest test/infrastructure/pg-flight-quote.repository.spec.ts
```
Expected: migration applies; test PASSES.

- [ ] **Step 5: Commit**

```bash
git add api/migrations/1700000002000_flight-quotes.sql api/src/infrastructure/flight/pg-flight-quote.repository.ts api/test/infrastructure/pg-flight-quote.repository.spec.ts
git commit -m "feat(api): add flight_quotes table and raw-SQL repository"
```

---

## Task 4: Mock provider + Travelpayouts adapter + deep-link builder (TDD)

**Files:**
- Create: `api/src/infrastructure/flight/aviasales-deep-link.ts`, `mock-flight-price-provider.ts`, `travelpayouts-flight-price-provider.ts`, `flight-provider.factory.ts`
- Create: `api/test/infrastructure/aviasales-deep-link.spec.ts`, `api/test/infrastructure/travelpayouts-provider.spec.ts`

- [ ] **Step 1: Write failing deep-link test** — `api/test/infrastructure/aviasales-deep-link.spec.ts`

```ts
import { buildDeepLink } from '../../src/infrastructure/flight/aviasales-deep-link';

describe('buildDeepLink', () => {
  it('appends the affiliate marker to the aviasales link', () => {
    const url = buildDeepLink('/search/WRO0805ALC15081', 'marker123');
    expect(url).toContain('aviasales.com/search/WRO0805ALC15081');
    expect(url).toContain('marker=marker123');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && npx jest test/infrastructure/aviasales-deep-link.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Create `api/src/infrastructure/flight/aviasales-deep-link.ts`**

```ts
export function buildDeepLink(relativeLink: string, marker: string): string {
  const base = relativeLink.startsWith('http')
    ? relativeLink
    : `https://www.aviasales.com${relativeLink}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}marker=${encodeURIComponent(marker)}`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd api && npx jest test/infrastructure/aviasales-deep-link.spec.ts`
Expected: PASS.

- [ ] **Step 5: Create `api/src/infrastructure/flight/mock-flight-price-provider.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { Origin } from '../../domain/flight/origin';
import { Money } from '../../domain/flight/money';
import { FlightQuote } from '../../domain/flight/flight-quote';
import { FlightPriceProvider } from '../../domain/flight/flight-price-provider.port';

@Injectable()
export class MockFlightPriceProvider implements FlightPriceProvider {
  async cheapestForOrigin(origin: Origin, horizonMonths: number): Promise<FlightQuote[]> {
    const base = { PED: 95, WRO: 58, PRG: 75 }[origin.code];
    const quotes: FlightQuote[] = [];
    const start = new Date('2026-07-01');
    const weeks = horizonMonths * 4;
    for (let w = 0; w < weeks; w++) {
      const departure = new Date(start);
      departure.setDate(start.getDate() + w * 7);
      const ret = new Date(departure);
      ret.setDate(departure.getDate() + 7);
      const price = base + ((w * 7) % 40);
      quotes.push(
        new FlightQuote(
          origin,
          departure,
          ret,
          new Money(price),
          'FR',
          `https://www.aviasales.com/search/${origin.code}ALC?marker=mock`,
          new Date(),
        ),
      );
    }
    return quotes;
  }
}
```

- [ ] **Step 6: Write failing Travelpayouts test (recorded fixture, no live HTTP)** — `api/test/infrastructure/travelpayouts-provider.spec.ts`

```ts
import { TravelpayoutsFlightPriceProvider } from '../../src/infrastructure/flight/travelpayouts-flight-price-provider';
import { Origin } from '../../src/domain/flight/origin';

const fixture = {
  success: true,
  data: [
    { origin: 'WRO', destination: 'ALC', price: 58, airline: 'FR', departure_at: '2026-05-08T06:00:00', return_at: '2026-05-15T20:00:00', link: '/search/WRO0805ALC15081' },
    { origin: 'WRO', destination: 'ALC', price: 71, airline: 'FR', departure_at: '2026-05-15T06:00:00', return_at: '2026-05-22T20:00:00', link: '/search/WRO1505ALC22051' },
  ],
};

describe('TravelpayoutsFlightPriceProvider', () => {
  it('maps the API payload to flight quotes with affiliate deep links', async () => {
    const fetchStub = async () => ({ ok: true, json: async () => fixture }) as any;
    const provider = new TravelpayoutsFlightPriceProvider('token123', 'marker123', fetchStub);
    const quotes = await provider.cheapestForOrigin(Origin.fromCode('WRO'), 1);
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0].price.amount).toBe(58);
    expect(quotes[0].deepLink).toContain('marker=marker123');
    expect(quotes[0].origin.code).toBe('WRO');
  });
});
```

- [ ] **Step 7: Run to verify failure**

Run: `cd api && npx jest test/infrastructure/travelpayouts-provider.spec.ts`
Expected: FAIL.

- [ ] **Step 8: Create `api/src/infrastructure/flight/travelpayouts-flight-price-provider.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { Origin, DESTINATION } from '../../domain/flight/origin';
import { Money } from '../../domain/flight/money';
import { FlightQuote } from '../../domain/flight/flight-quote';
import { FlightPriceProvider } from '../../domain/flight/flight-price-provider.port';
import { buildDeepLink } from './aviasales-deep-link';

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<any> }>;

@Injectable()
export class TravelpayoutsFlightPriceProvider implements FlightPriceProvider {
  constructor(
    private readonly token: string,
    private readonly marker: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async cheapestForOrigin(origin: Origin, horizonMonths: number): Promise<FlightQuote[]> {
    const months = this.horizonMonths(horizonMonths);
    const byDate = new Map<string, FlightQuote>();
    for (const month of months) {
      const url =
        `https://api.travelpayouts.com/aviasales/v3/prices_for_dates` +
        `?origin=${origin.code}&destination=${DESTINATION}` +
        `&departure_at=${month}&currency=eur&sorting=price&direct=false` +
        `&limit=100&token=${this.token}`;
      const res = await this.fetchImpl(url);
      if (!res.ok) {
        continue;
      }
      const payload = await res.json();
      for (const row of payload.data ?? []) {
        const departure = new Date(row.departure_at);
        const key = departure.toISOString().slice(0, 10);
        const ret = row.return_at ? new Date(row.return_at) : this.plusNights(departure, 7);
        const quote = new FlightQuote(
          origin,
          departure,
          ret,
          new Money(Number(row.price)),
          row.airline ?? '',
          buildDeepLink(row.link ?? `/search/${origin.code}${DESTINATION}`, this.marker),
          new Date(),
        );
        const existing = byDate.get(key);
        if (!existing || quote.price.amount < existing.price.amount) {
          byDate.set(key, quote);
        }
      }
    }
    return [...byDate.values()].sort(
      (a, b) => a.departureDate.getTime() - b.departureDate.getTime(),
    );
  }

  private plusNights(date: Date, nights: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + nights);
    return d;
  }

  private horizonMonths(count: number): string[] {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }
}
```

- [ ] **Step 9: Run to verify pass**

Run: `cd api && npx jest test/infrastructure/travelpayouts-provider.spec.ts`
Expected: PASS.

- [ ] **Step 10: Create the provider factory** — `api/src/infrastructure/flight/flight-provider.factory.ts`

```ts
import { FlightPriceProvider } from '../../domain/flight/flight-price-provider.port';
import { MockFlightPriceProvider } from './mock-flight-price-provider';
import { TravelpayoutsFlightPriceProvider } from './travelpayouts-flight-price-provider';

export function createFlightPriceProvider(): FlightPriceProvider {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  const marker = process.env.TRAVELPAYOUTS_MARKER ?? '';
  if (token) {
    return new TravelpayoutsFlightPriceProvider(token, marker);
  }
  return new MockFlightPriceProvider();
}
```

- [ ] **Step 11: Commit**

```bash
git add api/src/infrastructure/flight/aviasales-deep-link.ts api/src/infrastructure/flight/mock-flight-price-provider.ts api/src/infrastructure/flight/travelpayouts-flight-price-provider.ts api/src/infrastructure/flight/flight-provider.factory.ts api/test/infrastructure/aviasales-deep-link.spec.ts api/test/infrastructure/travelpayouts-provider.spec.ts
git commit -m "feat(api): add mock + travelpayouts flight providers and deep links"
```

---

## Task 5: Cron + controllers + module + e2e

**Files:**
- Create: `api/src/infrastructure/flight/flight-price.cron.ts`, `api/src/interface/http/flight.controller.ts`, `api/src/interface/http/admin-flight.controller.ts`, `api/src/interface/flight.module.ts`, `api/test/flight.e2e-spec.ts`
- Modify: `api/src/app.module.ts`, `.env.example`
- Install: `@nestjs/schedule`

- [ ] **Step 1: Install schedule**

Run: `cd api && npm install @nestjs/schedule`

- [ ] **Step 2: Create `api/src/infrastructure/flight/flight-price.cron.ts`**

```ts
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import { RefreshFlightPricesCommand } from '../../application/flight/refresh-flight-prices.command';

@Injectable()
export class FlightPriceCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(FlightPriceCron.name);
  private readonly horizon = Number(process.env.FLIGHTS_HORIZON_MONTHS ?? 9);

  constructor(private readonly commandBus: CommandBus) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('initial flight price refresh');
    await this.commandBus.execute(new RefreshFlightPricesCommand(this.horizon));
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async daily(): Promise<void> {
    await this.commandBus.execute(new RefreshFlightPricesCommand(this.horizon));
  }
}
```

- [ ] **Step 3: Create `api/src/interface/http/flight.controller.ts`**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetCheapestPerOriginQuery } from '../../application/flight/get-cheapest-per-origin.query';
import { GetQuotesForOriginQuery } from '../../application/flight/get-quotes-for-origin.query';

@Controller('flights')
export class FlightController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('cheapest')
  cheapest() {
    return this.queryBus.execute(new GetCheapestPerOriginQuery());
  }

  @Get()
  forOrigin(@Query('origin') origin: string) {
    return this.queryBus.execute(new GetQuotesForOriginQuery(origin));
  }
}
```

- [ ] **Step 4: Create `api/src/interface/http/admin-flight.controller.ts`** (header-secret, independent of B)

```ts
import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RefreshFlightPricesCommand } from '../../application/flight/refresh-flight-prices.command';

@Controller('admin/flights')
export class AdminFlightController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('refresh')
  async refresh(@Headers('x-refresh-token') token?: string) {
    const expected = process.env.FLIGHTS_REFRESH_TOKEN ?? '';
    if (!expected || token !== expected) {
      throw new ForbiddenException();
    }
    await this.commandBus.execute(
      new RefreshFlightPricesCommand(Number(process.env.FLIGHTS_HORIZON_MONTHS ?? 9)),
    );
    return { refreshed: true };
  }
}
```

- [ ] **Step 5: Create `api/src/interface/flight.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { FlightController } from './http/flight.controller';
import { AdminFlightController } from './http/admin-flight.controller';
import { RefreshFlightPricesHandler } from '../application/flight/refresh-flight-prices.handler';
import { GetCheapestPerOriginHandler } from '../application/flight/get-cheapest-per-origin.handler';
import { GetQuotesForOriginHandler } from '../application/flight/get-quotes-for-origin.handler';
import { FlightPriceCron } from '../infrastructure/flight/flight-price.cron';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgFlightQuoteRepository } from '../infrastructure/flight/pg-flight-quote.repository';
import { createFlightPriceProvider } from '../infrastructure/flight/flight-provider.factory';
import { FLIGHT_QUOTE_REPOSITORY } from '../domain/flight/flight-quote.repository.port';
import { FLIGHT_PRICE_PROVIDER } from '../domain/flight/flight-price-provider.port';

@Module({
  imports: [CqrsModule, ScheduleModule.forRoot()],
  controllers: [FlightController, AdminFlightController],
  providers: [
    RefreshFlightPricesHandler,
    GetCheapestPerOriginHandler,
    GetQuotesForOriginHandler,
    FlightPriceCron,
    pgPoolProvider,
    { provide: FLIGHT_QUOTE_REPOSITORY, useClass: PgFlightQuoteRepository },
    { provide: FLIGHT_PRICE_PROVIDER, useFactory: createFlightPriceProvider },
  ],
})
export class FlightModule {}
```

- [ ] **Step 6: Register in `api/src/app.module.ts`** (add `FlightModule` to imports)

```ts
import { FlightModule } from './interface/flight.module';
// ...add FlightModule to the imports array of @Module
```

- [ ] **Step 7: Append env to `.env.example`**

```
TRAVELPAYOUTS_TOKEN=
TRAVELPAYOUTS_MARKER=
FLIGHTS_HORIZON_MONTHS=9
FLIGHTS_REFRESH_TOKEN=change-me
```

- [ ] **Step 8: Write e2e** — `api/test/flight.e2e-spec.ts`

```ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

describe('Flights (e2e, mock provider)', () => {
  let app: INestApplication;
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    delete process.env.TRAVELPAYOUTS_TOKEN; // force mock provider
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init(); // bootstrap triggers the initial refresh
  });

  afterAll(async () => {
    await pool.query('DELETE FROM flight_quotes');
    await pool.end();
    await app.close();
  });

  it('returns one cheapest quote per origin in EUR', async () => {
    const res = await request(app.getHttpServer()).get('/api/flights/cheapest');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.map((r: any) => r.origin).sort()).toEqual(['PED', 'PRG', 'WRO']);
    expect(res.body[0].currency).toBe('EUR');
  });
});
```

- [ ] **Step 9: Run e2e + full suite** (db up, migrations applied)

Run:
```bash
cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run migrate up
DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run test:e2e
DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm test && npm run lint
```
Expected: flight e2e PASS; all unit specs PASS; lint clean.

- [ ] **Step 10: Commit**

```bash
git add api/src/infrastructure/flight/flight-price.cron.ts api/src/interface/http/flight.controller.ts api/src/interface/http/admin-flight.controller.ts api/src/interface/flight.module.ts api/src/app.module.ts api/test/flight.e2e-spec.ts .env.example api/package.json api/package-lock.json
git commit -m "feat(api): wire flight cron, controllers and module with e2e"
```

---

## Task 6: Frontend — /letenky page + homepage teaser + Playwright

**Files:**
- Create: `web/components/FlightCard.tsx`, `web/app/letenky/page.tsx`, `web/e2e/flights.spec.ts`
- Modify: `web/lib/api.ts`, `web/app/page.tsx` (teaser), `web/components/Nav.tsx` (add Letenky link)

- [ ] **Step 1: Extend `web/lib/api.ts`** (append)

```ts
export interface CheapestFlight {
  origin: string;
  originName: string;
  price: number;
  currency: string;
  departureDate: string;
  returnDate: string;
  airline: string;
  deepLink: string;
}

export async function fetchCheapestFlights(): Promise<CheapestFlight[]> {
  const res = await fetch(`${BASE}/flights/cheapest`);
  if (!res.ok) throw new Error('flights failed');
  return res.json();
}
```

- [ ] **Step 2: Create `web/components/FlightCard.tsx`**

```tsx
import { CheapestFlight } from '@/lib/api';

export default function FlightCard({ flight }: { flight: CheapestFlight }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-lg text-sea">{flight.originName} → Alicante</h3>
      <p className="text-2xl font-display text-terracotta mt-1">od {flight.price} €</p>
      <p className="text-sm text-ink/70">
        {flight.departureDate} → {flight.returnDate} · {flight.airline}
      </p>
      <a
        href={flight.deepLink}
        target="_blank"
        rel="sponsored noopener"
        className="inline-block mt-3 text-sea underline"
      >
        Zkontrolovat a rezervovat →
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Create `web/app/letenky/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchCheapestFlights, CheapestFlight } from '@/lib/api';
import FlightCard from '@/components/FlightCard';

export default function Letenky() {
  const [flights, setFlights] = useState<CheapestFlight[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCheapestFlights().then(setFlights).catch(() => setError(true));
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">Letenky do Alicante</h1>
      <p className="text-ink/80 mb-6">Orientační nejnižší ceny zpátečních letenek (7 nocí).</p>
      {error && <p>Ceny se nepodařilo načíst.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {flights.map((f) => (
          <FlightCard key={f.origin} flight={f} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Add the Letenky link in `web/components/Nav.tsx`** (insert into the `links` array)

```tsx
  { href: '/letenky', label: 'Letenky' },
```

- [ ] **Step 5: Make the homepage flight teaser live** — replace the static flights `SectionTeaser` in `web/app/page.tsx`

Replace the second `SectionTeaser` (the "Letenky od 58 €" placeholder) with a link to `/letenky`:
```tsx
        <SectionTeaser href="/letenky" title="Letenky" text="Najděte nejlevnější let do Alicante" />
```

- [ ] **Step 6: Create Playwright e2e** — `web/e2e/flights.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('letenky page shows three origin cards with deep links', async ({ page }) => {
  await page.goto('/letenky');
  await expect(page.getByRole('heading', { name: /Letenky do Alicante/ })).toBeVisible();
  const links = page.getByRole('link', { name: /Zkontrolovat a rezervovat/ });
  await expect(links).toHaveCount(3);
});
```

- [ ] **Step 7: Run the full stack + e2e**

Run:
```bash
docker compose up -d --build
cd web && E2E_BASE_URL=http://localhost:3000 npm run e2e
curl -s http://localhost:3001/api/flights/cheapest
```
Expected: flights e2e PASS; the curl returns three EUR quotes (mock provider, since no token set).

- [ ] **Step 8: Mark README TODO C done + commit**

Change `- [ ] C — Flight Prices (Travelpayouts)` to `- [x]` in `README.md`.

```bash
git add web/lib/api.ts web/components/FlightCard.tsx web/app/letenky web/components/Nav.tsx web/app/page.tsx web/e2e/flights.spec.ts README.md
git commit -m "feat(web): add letenky page and live flight teaser; mark C complete"
```

---

## Self-Review Notes

- **Spec coverage:** `FlightPriceProvider` port + Travelpayouts + Mock fallback (T1, T4) · EUR (T1 `Money`) · 7-night round trip (T4 providers) · 9-month horizon + daily cron + startup refresh (T5 `FlightPriceCron`) · `flight_quotes` cache + replace-per-origin (T3) · cheapest-per-origin + per-origin endpoints (T2, T5) · `/letenky` + teaser + affiliate deep links (T6) · one-origin-failure resilience (T2 test) · no live HTTP in tests (T4 fetch stub, T5 mock). All acceptance items map to T5/T6.
- **No placeholders:** every step has complete code or exact commands with expected output.
- **Type consistency:** `Origin.fromCode/all/code/name`, `Money(amount, currency)`, `FlightQuote(origin, departureDate, returnDate, price, airline, deepLink, fetchedAt)`, ports `FLIGHT_PRICE_PROVIDER`/`FLIGHT_QUOTE_REPOSITORY`, and `cheapestForOrigin/replaceForOrigin/cheapestPerOrigin/listForOrigin` are used identically across application, infrastructure, providers, and tests. The `GetQuotesForOrigin` DTO (`origin, price, currency, departureDate, returnDate, airline, deepLink`) is the exact contract D consumes.
```
