# Admin – správa rezervací – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rozšířit administraci o odhlášení, admin rezervaci přes veřejný tok (s relaxací pravidel kromě obsazenosti) a jednotný seznam položek kalendáře s možností zrušení.

**Architecture:** NestJS onion (domain → application → infrastructure → interface), CQRS přes `@nestjs/cqrs`, raw SQL přes `pg`. Frontend Next.js App Router, admin přes JWT v `localStorage`. Admin se na veřejném toku detekuje volitelným bearer tokenem v `POST /inquiries`.

**Tech Stack:** TypeScript, NestJS, @nestjs/cqrs, pg, node-pg-migrate, Jest; Next.js, React, Tailwind, Playwright.

## Global Constraints

- Handlery nevolají `flush`/transakce frameworku — projekt **nemá** transakční middleware. Cross-table zápisy se dělají sekvenčně v handleru (vzor `confirm-inquiry.handler`), případně explicitní transakce v repo (`pool.connect()`+`BEGIN/COMMIT`) jen tam, kde je to nutné.
- Onion závislosti míří dovnitř (hlídá ESLint `src/domain/**`).
- Doménové chyby dědí z `DomainError` → `ProblemDetailFilter` je převede na RFC-7807.
- Datum se ukládá jako `date`; pg parser vrací UTC půlnoc.
- Admin token v `localStorage` pod klíčem `vinamar_admin_token`.
- Minimální pobyt `MINIMUM_NIGHTS = 7`.

---

### Task 1: Doména – `cancelled` stav a `Inquiry.createByAdmin`

**Files:**
- Modify: `api/src/domain/inquiry/inquiry.ts`
- Test: `api/test/domain/inquiry.spec.ts` (create)

**Interfaces:**
- Produces: `InquiryStatus` rozšířen o `'cancelled'`; `Inquiry.createByAdmin(params): Inquiry` se shodnou signaturou jako `create`, ale bez `MinimumStayNotMetError` a `ArrivalInPastError`, výsledný `status='confirmed'`.

- [ ] **Step 1: Napiš padající testy**

```ts
import { Inquiry } from '../../src/domain/inquiry/inquiry';
import { EmailAddress } from '../../src/domain/shared/email-address';
import { DateRange } from '../../src/domain/shared/date-range';

const base = {
  id: 'i1', guestName: 'Jan', email: new EmailAddress('jan@x.cz'),
  phone: '', message: '', now: new Date('2026-01-01'),
};

describe('Inquiry.createByAdmin', () => {
  it('allows a stay shorter than the minimum', () => {
    const range = new DateRange(new Date('2026-05-01'), new Date('2026-05-03'));
    const inq = Inquiry.createByAdmin({ ...base, range });
    expect(inq.status).toBe('confirmed');
  });
  it('allows arrival in the past', () => {
    const range = new DateRange(new Date('2025-01-01'), new Date('2025-01-08'));
    expect(() => Inquiry.createByAdmin({ ...base, range })).not.toThrow();
  });
});

describe('Inquiry.create', () => {
  it('still rejects a short stay', () => {
    const range = new DateRange(new Date('2026-05-01'), new Date('2026-05-03'));
    expect(() => Inquiry.create({ ...base, range })).toThrow();
  });
});
```

- [ ] **Step 2: Spusť test (FAIL)** — `cd api && npm test -- inquiry.spec` → FAIL (`createByAdmin` neexistuje).

- [ ] **Step 3: Implementace v `inquiry.ts`**

Změň typ a přidej factory (sdílí konstrukci s `create`):

```ts
export type InquiryStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';
```

```ts
  static createByAdmin(params: {
    id: string; guestName: string; email: EmailAddress; phone: string;
    range: DateRange; message: string; now: Date;
  }): Inquiry {
    return new Inquiry(
      params.id, params.guestName, params.email, params.phone,
      params.range, params.message, 'confirmed', params.now,
    );
  }
```

- [ ] **Step 4: Spusť test (PASS)** — `cd api && npm test -- inquiry.spec`

- [ ] **Step 5: Commit** — `git commit -am "feat(inquiry): createByAdmin factory + cancelled status"`

---

### Task 2: Doména – `CalendarBlock` nese `note` a `inquiryId`

**Files:**
- Modify: `api/src/domain/availability/calendar-block.ts`
- Test: `api/test/domain/calendar-block.spec.ts` (create)

**Interfaces:**
- Produces: `new CalendarBlock(id, range, reason, createdAt, note?: string | null = null, inquiryId?: string | null = null)`; nové readonly vlastnosti `note`, `inquiryId`.

- [ ] **Step 1: Padající test**

```ts
import { CalendarBlock } from '../../src/domain/availability/calendar-block';
import { DateRange } from '../../src/domain/shared/date-range';

it('defaults note and inquiryId to null', () => {
  const b = new CalendarBlock('b1', new DateRange(new Date('2026-05-01'), new Date('2026-05-08')), 'booked', new Date());
  expect(b.note).toBeNull();
  expect(b.inquiryId).toBeNull();
});
it('carries note and inquiryId when provided', () => {
  const b = new CalendarBlock('b1', new DateRange(new Date('2026-05-01'), new Date('2026-05-08')), 'booked', new Date(), 'vlastní pobyt', 'i1');
  expect(b.note).toBe('vlastní pobyt');
  expect(b.inquiryId).toBe('i1');
});
```

- [ ] **Step 2: Spusť (FAIL)** — `cd api && npm test -- calendar-block.spec`

- [ ] **Step 3: Implementace** — přidej do konstruktoru poslední dva volitelné parametry:

```ts
  constructor(
    public readonly id: string,
    public readonly range: DateRange,
    public readonly reason: BlockReason,
    public readonly createdAt: Date,
    public readonly note: string | null = null,
    public readonly inquiryId: string | null = null,
  ) {}
```

- [ ] **Step 4: Spusť (PASS)**

- [ ] **Step 5: Commit** — `git commit -am "feat(availability): CalendarBlock note + inquiryId"`

---

### Task 3: Migrace – sloupce `note` a `inquiry_id`

**Files:**
- Create: `api/migrations/1700000005000_calendar-block-inquiry-link.sql`

- [ ] **Step 1: Napiš migraci**

```sql
-- Up Migration
ALTER TABLE calendar_blocks ADD COLUMN note text;
ALTER TABLE calendar_blocks ADD COLUMN inquiry_id uuid REFERENCES inquiries(id);

-- Down Migration
ALTER TABLE calendar_blocks DROP COLUMN inquiry_id;
ALTER TABLE calendar_blocks DROP COLUMN note;
```

- [ ] **Step 2: Spusť migraci** — `docker compose exec api npm run migrate` → Expected: migrace projde, sloupce přibydou.

- [ ] **Step 3: Commit** — `git commit -am "feat(db): calendar_blocks note + inquiry_id link"`

---

### Task 4: Port a repo – `save(opts)`, `delete` vrací `inquiryId`, `listEntries`

**Files:**
- Modify: `api/src/domain/availability/availability.repository.port.ts`
- Modify: `api/src/infrastructure/persistence/pg-availability.repository.ts`
- Modify: `api/test/fakes/index.ts` (InMemoryAvailability)
- Test: `api/test/infrastructure/pg-availability.repository.spec.ts` (rozšířit)

**Interfaces:**
- Produces:
  - `SaveOptions = { inquiryId?: string; note?: string }`
  - `CalendarEntryView = { id: string; start: string; end: string; reason: BlockReason; note: string | null; inquiryId: string | null; guestName: string | null; email: string | null; phone: string | null }`
  - `save(range, reason, opts?: SaveOptions): Promise<CalendarBlock>`
  - `delete(id): Promise<{ inquiryId: string | null }>`
  - `listEntries(): Promise<CalendarEntryView[]>`

- [ ] **Step 1: Uprav port** (`availability.repository.port.ts`)

```ts
import { CalendarBlock, BlockReason } from './calendar-block';
import { DateRange } from '../shared/date-range';

export const AVAILABILITY_REPOSITORY = Symbol('AvailabilityRepository');

export interface SaveOptions { inquiryId?: string; note?: string }

export interface CalendarEntryView {
  id: string; start: string; end: string; reason: BlockReason;
  note: string | null; inquiryId: string | null;
  guestName: string | null; email: string | null; phone: string | null;
}

export interface AvailabilityRepository {
  listBetween(from: Date, to: Date): Promise<CalendarBlock[]>;
  findOverlapping(range: DateRange): Promise<CalendarBlock | null>;
  save(range: DateRange, reason: BlockReason, opts?: SaveOptions): Promise<CalendarBlock>;
  delete(id: string): Promise<{ inquiryId: string | null }>;
  listEntries(): Promise<CalendarEntryView[]>;
}
```

- [ ] **Step 2: Uprav fake** (`api/test/fakes/index.ts`, `InMemoryAvailability`)

```ts
  async save(range: DateRange, reason: BlockReason, opts?: { inquiryId?: string; note?: string }): Promise<CalendarBlock> {
    const block = new CalendarBlock(`b${++this.seq}`, range, reason, new Date(), opts?.note ?? null, opts?.inquiryId ?? null);
    this.blocks.push(block);
    return block;
  }
  async delete(id: string): Promise<{ inquiryId: string | null }> {
    const found = this.blocks.find((b) => b.id === id) ?? null;
    this.blocks = this.blocks.filter((b) => b.id !== id);
    return { inquiryId: found?.inquiryId ?? null };
  }
  async listEntries() {
    return this.blocks.map((b) => ({
      id: b.id, start: b.range.arrival.toISOString().slice(0, 10), end: b.range.departure.toISOString().slice(0, 10),
      reason: b.reason, note: b.note, inquiryId: b.inquiryId,
      guestName: null, email: null, phone: null,
    }));
  }
```

- [ ] **Step 3: Implementuj v pg repo** (`pg-availability.repository.ts`)

`toBlock` rozšiř o note/inquiry_id; `save`:

```ts
  async save(range: DateRange, reason: BlockReason, opts: SaveOptions = {}): Promise<CalendarBlock> {
    const { rows } = await this.pool.query(
      `INSERT INTO calendar_blocks (start_date, end_date, reason, note, inquiry_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [range.arrival, range.departure, reason, opts.note ?? null, opts.inquiryId ?? null],
    );
    return this.toBlock(rows[0]);
  }

  async delete(id: string): Promise<{ inquiryId: string | null }> {
    const { rows } = await this.pool.query(
      `DELETE FROM calendar_blocks WHERE id = $1 RETURNING inquiry_id`, [id]);
    return { inquiryId: rows[0]?.inquiry_id ?? null };
  }

  async listEntries(): Promise<CalendarEntryView[]> {
    const { rows } = await this.pool.query(
      `SELECT cb.id, cb.start_date, cb.end_date, cb.reason, cb.note, cb.inquiry_id,
              i.guest_name, i.email, i.phone
       FROM calendar_blocks cb
       LEFT JOIN inquiries i ON i.id = cb.inquiry_id
       ORDER BY cb.start_date`);
    return rows.map((r) => ({
      id: r.id,
      start: (r.start_date instanceof Date ? r.start_date.toISOString() : new Date(r.start_date).toISOString()).slice(0, 10),
      end: (r.end_date instanceof Date ? r.end_date.toISOString() : new Date(r.end_date).toISOString()).slice(0, 10),
      reason: r.reason, note: r.note, inquiryId: r.inquiry_id,
      guestName: r.guest_name ?? null, email: r.email ?? null, phone: r.phone ?? null,
    }));
  }
```

`toBlock` map: `new CalendarBlock(row.id, range, row.reason, new Date(row.created_at), row.note ?? null, row.inquiry_id ?? null)`.

- [ ] **Step 4: Rozšiř repo test** — v `pg-availability.repository.spec.ts` ověř, že `save` s `{ inquiryId, note }` uloží, `listEntries` vrátí joinovaného hosta a `delete` vrátí `inquiryId`. Spusť: `cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm test -- pg-availability` → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(availability): save opts, delete returns inquiryId, listEntries join"`

---

### Task 5: `confirm-inquiry` ukládá vazbu `inquiry_id`

**Files:**
- Modify: `api/src/application/inquiry/confirm-inquiry.handler.ts:execute`
- Test: `api/test/application/confirm-inquiry.handler.spec.ts` (rozšířit)

- [ ] **Step 1: Rozšiř test** — po `confirm` ověř `availability.blocks[0].inquiryId === 'id-1'`.

- [ ] **Step 2: Spusť (FAIL)** — `cd api && npm test -- confirm-inquiry`

- [ ] **Step 3: Implementace** — poslední řádek handleru:

```ts
    await this.availability.save(inquiry.range, 'booked', { inquiryId: inquiry.id });
```

- [ ] **Step 4: Spusť (PASS)**

- [ ] **Step 5: Commit** — `git commit -am "feat(inquiry): link booked block to inquiry on confirm"`

---

### Task 6: `submit-inquiry` admin režim (auto-confirm, relaxace pravidel)

**Files:**
- Modify: `api/src/application/inquiry/submit-inquiry.command.ts`
- Modify: `api/src/application/inquiry/submit-inquiry.handler.ts`
- Test: `api/test/application/submit-inquiry.handler.spec.ts` (rozšířit)

**Interfaces:**
- Produces: `SubmitInquiryCommand(..., phone='', isAdmin = false)`. V admin režimu: `Inquiry.createByAdmin`, přeskočí overlap-gap, **vynutí overlap**, uloží inquiry `confirmed` + availability `booked` s `inquiryId`, přeskočí notifier.

- [ ] **Step 1: Rozšiř command** — přidej `public readonly isAdmin: boolean = false` na konec konstruktoru.

- [ ] **Step 2: Padající testy** (admin režim)

```ts
it('admin booking: short stay, auto-confirmed, booked block linked', async () => {
  const availability = new InMemoryAvailability();
  const inquiries = new InMemoryInquiries();
  const clock = new FixedClock(new Date('2026-01-01'));
  const notifier = new SpyNotifier();
  const submit = new SubmitInquiryHandler(inquiries, availability, notifier, clock, () => 'id-1');
  await submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-03', '', '', true));
  expect((await inquiries.get('id-1'))!.status).toBe('confirmed');
  expect(availability.blocks[0].reason).toBe('booked');
  expect(availability.blocks[0].inquiryId).toBe('id-1');
  expect(notifier.received).toHaveLength(0);
});

it('admin booking still rejects overlap', async () => {
  const availability = new InMemoryAvailability();
  const inquiries = new InMemoryInquiries();
  const submit = new SubmitInquiryHandler(inquiries, availability, new SpyNotifier(), new FixedClock(new Date('2026-01-01')), () => 'id-1');
  await submit.execute(new SubmitInquiryCommand('A', 'a@x.cz', '2026-05-01', '2026-05-08', '', '', true));
  await expect(
    submit.execute(new SubmitInquiryCommand('B', 'b@x.cz', '2026-05-03', '2026-05-10', '', '', true)),
  ).rejects.toThrow();
});
```

- [ ] **Step 3: Spusť (FAIL)** — `cd api && npm test -- submit-inquiry`

- [ ] **Step 4: Implementace** — v `execute` rozděl tok:

```ts
  async execute(cmd: SubmitInquiryCommand): Promise<{ id: string }> {
    const range = new DateRange(new Date(cmd.arrival), new Date(cmd.departure));
    const params = {
      id: this.idFactory(), guestName: cmd.guestName, email: new EmailAddress(cmd.email),
      phone: cmd.phone, range, message: cmd.message, now: this.clock.now(),
    };
    const inquiry = cmd.isAdmin ? Inquiry.createByAdmin(params) : Inquiry.create(params);

    if (await this.availability.findOverlapping(range)) {
      throw new DatesUnavailableError();
    }

    if (!cmd.isAdmin) {
      const windowStart = new Date(range.arrival);
      windowStart.setDate(windowStart.getDate() - MINIMUM_NIGHTS);
      const windowEnd = new Date(range.departure);
      windowEnd.setDate(windowEnd.getDate() + MINIMUM_NIGHTS);
      const neighbours = await this.availability.listBetween(windowStart, windowEnd);
      if (this.gapPolicy.wouldCreateOrphanGap(range, neighbours, MINIMUM_NIGHTS)) {
        throw new OrphanGapError();
      }
    }

    await this.inquiries.save(inquiry);

    if (cmd.isAdmin) {
      await this.availability.save(range, 'booked', { inquiryId: inquiry.id });
      return { id: inquiry.id };
    }

    try {
      await this.notifier.inquiryReceived(inquiry);
    } catch (err) {
      this.logger.warn(`owner notification failed for inquiry ${inquiry.id}: ${String(err)}`);
    }
    return { id: inquiry.id };
  }
```

- [ ] **Step 5: Spusť (PASS)** — `cd api && npm test -- submit-inquiry`. Ověř i `confirm-inquiry` stále zelený.

- [ ] **Step 6: Commit** — `git commit -am "feat(inquiry): admin auto-confirm booking with relaxed rules"`

---

### Task 7: Application – list a cancel kalendáře

**Files:**
- Create: `api/src/application/availability/list-calendar.query.ts`
- Create: `api/src/application/availability/list-calendar.handler.ts`
- Create: `api/src/application/availability/cancel-calendar-entry.command.ts`
- Create: `api/src/application/availability/cancel-calendar-entry.handler.ts`
- Test: `api/test/application/cancel-calendar-entry.handler.spec.ts` (create)

**Interfaces:**
- Produces: `ListCalendarQuery` → handler vrací `CalendarEntryView[]` (z `availability.listEntries()`). `CancelCalendarEntryCommand(id)` → handler: `availability.delete(id)`; má-li `inquiryId`, `inquiries.updateStatus(inquiryId, 'cancelled')`.

- [ ] **Step 1: Query + handler**

`list-calendar.query.ts`:
```ts
export class ListCalendarQuery {}
```
`list-calendar.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListCalendarQuery } from './list-calendar.query';
import { AVAILABILITY_REPOSITORY, AvailabilityRepository } from '../../domain/availability/availability.repository.port';

@QueryHandler(ListCalendarQuery)
export class ListCalendarHandler implements IQueryHandler<ListCalendarQuery> {
  constructor(@Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository) {}
  execute() { return this.availability.listEntries(); }
}
```

- [ ] **Step 2: Command + handler**

`cancel-calendar-entry.command.ts`:
```ts
export class CancelCalendarEntryCommand {
  constructor(public readonly id: string) {}
}
```
`cancel-calendar-entry.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelCalendarEntryCommand } from './cancel-calendar-entry.command';
import { AVAILABILITY_REPOSITORY, AvailabilityRepository } from '../../domain/availability/availability.repository.port';
import { INQUIRY_REPOSITORY, InquiryRepository } from '../../domain/inquiry/inquiry.repository.port';

@CommandHandler(CancelCalendarEntryCommand)
export class CancelCalendarEntryHandler implements ICommandHandler<CancelCalendarEntryCommand> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
  ) {}
  async execute(cmd: CancelCalendarEntryCommand): Promise<void> {
    const { inquiryId } = await this.availability.delete(cmd.id);
    if (inquiryId) {
      await this.inquiries.updateStatus(inquiryId, 'cancelled');
    }
  }
}
```

- [ ] **Step 3: Test cancel handleru**

```ts
import { CancelCalendarEntryHandler } from '../../src/application/availability/cancel-calendar-entry.handler';
import { CancelCalendarEntryCommand } from '../../src/application/availability/cancel-calendar-entry.command';
import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { FixedClock, InMemoryAvailability, InMemoryInquiries, SpyNotifier } from '../fakes';

it('cancel frees the term and marks the linked inquiry cancelled', async () => {
  const availability = new InMemoryAvailability();
  const inquiries = new InMemoryInquiries();
  const submit = new SubmitInquiryHandler(inquiries, availability, new SpyNotifier(), new FixedClock(new Date('2026-01-01')), () => 'id-1');
  await submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', '', '', true));
  const blockId = availability.blocks[0].id;

  const cancel = new CancelCalendarEntryHandler(availability, inquiries);
  await cancel.execute(new CancelCalendarEntryCommand(blockId));

  expect(availability.blocks).toHaveLength(0);
  expect((await inquiries.get('id-1'))!.status).toBe('cancelled');
});
```

- [ ] **Step 4: Spusť (PASS)** — `cd api && npm test -- cancel-calendar-entry`

- [ ] **Step 5: Commit** — `git commit -am "feat(availability): list + cancel calendar entries"`

---

### Task 8: Interface – admin detekce v `POST /inquiries` + `AdminCalendarController`

**Files:**
- Modify: `api/src/interface/http/inquiry.controller.ts`
- Create: `api/src/interface/http/admin-calendar.controller.ts`
- Modify: `api/src/interface/inquiry.module.ts` (přidat `JwtModule`, `ListCalendarHandler`, `CancelCalendarEntryHandler`)
- Modify: `api/src/interface/admin.module.ts` (zaregistrovat `AdminCalendarController`)

**Interfaces:**
- Consumes: `SubmitInquiryCommand(..., isAdmin)`, `ListCalendarQuery`, `CancelCalendarEntryCommand`, `AdminGuard`.
- Produces: `POST /inquiries` čte volitelný `Authorization: Bearer`, ověří admin JWT → `isAdmin`. `GET /admin/calendar`, `DELETE /admin/calendar/:id` (guard).

- [ ] **Step 1: `inquiry.controller.ts`** — přečti hlavičku, ověř token:

```ts
import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// ...
@Controller('inquiries')
export class InquiryController {
  constructor(private readonly commandBus: CommandBus, private readonly jwt: JwtService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateInquiryDto, @Headers('authorization') auth?: string) {
    const isAdmin = this.isAdminToken(auth);
    return this.commandBus.execute(
      new SubmitInquiryCommand(dto.guestName, dto.email, dto.arrival, dto.departure, dto.message, dto.phone, isAdmin),
    );
  }

  private isAdminToken(auth?: string): boolean {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return false;
    try {
      this.jwt.verify(token, { secret: process.env.JWT_SECRET ?? 'change-me' });
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 2: `admin-calendar.controller.ts`**

```ts
import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminGuard } from './admin.guard';
import { ListCalendarQuery } from '../../application/availability/list-calendar.query';
import { CancelCalendarEntryCommand } from '../../application/availability/cancel-calendar-entry.command';

@Controller('admin/calendar')
@UseGuards(AdminGuard)
export class AdminCalendarController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  list() { return this.queryBus.execute(new ListCalendarQuery()); }

  @Delete(':id')
  cancel(@Param('id') id: string) { return this.commandBus.execute(new CancelCalendarEntryCommand(id)); }
}
```

- [ ] **Step 3: Wiring** — `inquiry.module.ts`: do `imports` přidej `JwtModule.register({})`; do `providers` přidej `ListCalendarHandler`, `CancelCalendarEntryHandler`. `admin.module.ts`: do `controllers` přidej `AdminCalendarController`. (Handlery NEregistruj v admin.module — žijí v inquiry.module.)

- [ ] **Step 4: Lint + build + e2e** — `cd api && npm run lint && npm run build`. Restart API: `docker compose restart api`. Ověř ručně:
  - `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3001/api/inquiries -H 'Content-Type: application/json' -d '{"guestName":"X","email":"x@x.cz","arrival":"2026-09-01","departure":"2026-09-03"}'` → `400/422` (krátký pobyt, veřejně).
  - se správným adminem token z `/admin/login`, stejný požadavek s `Authorization: Bearer <t>` → `201`.
  - `GET /admin/calendar` s tokenem → obsahuje nový záznam; `DELETE /admin/calendar/<id>` → uvolní.

- [ ] **Step 5: Commit** — `git commit -am "feat(admin): calendar list/cancel endpoints + admin detection on inquiries"`

---

### Task 9: Frontend – `lib/api` admin volání

**Files:**
- Modify: `web/lib/api.ts`
- Create: `web/lib/admin.ts`

**Interfaces:**
- Produces:
  - `web/lib/admin.ts`: `getAdminToken(): string | null`, `clearAdminToken(): void`, `adminLogout(): void` (clear + redirect `/admin/login`).
  - `submitInquiry(input, token?: string)` — při `token` pošle `Authorization`.
  - `fetchAdminCalendar(token): Promise<CalendarEntry[]>`, `cancelCalendarEntry(token, id): Promise<boolean>`, typ `CalendarEntry`.

- [ ] **Step 1: `web/lib/admin.ts`**

```ts
const KEY = 'vinamar_admin_token';
export const getAdminToken = (): string | null =>
  typeof window === 'undefined' ? null : localStorage.getItem(KEY);
export const clearAdminToken = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
};
export const adminLogout = (): void => {
  clearAdminToken();
  if (typeof window !== 'undefined') window.location.href = '/admin/login';
};
```

- [ ] **Step 2: `web/lib/api.ts`** — rozšiř `submitInquiry` a přidej calendar volání:

```ts
export async function submitInquiry(input: {
  guestName: string; email: string; phone: string;
  arrival: string; departure: string; message: string;
}, token?: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(input),
  });
  if (res.ok) return { ok: true };
  const problem = await res.json().catch(() => ({}));
  return { ok: false, error: problem.detail ?? 'Odeslání se nezdařilo' };
}

export interface CalendarEntry {
  id: string; start: string; end: string; reason: 'booked' | 'blocked';
  note: string | null; inquiryId: string | null;
  guestName: string | null; email: string | null; phone: string | null;
}
export async function fetchAdminCalendar(token: string): Promise<CalendarEntry[]> {
  const res = await fetch(`${BASE}/admin/calendar`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('calendar failed');
  return res.json();
}
export async function cancelCalendarEntry(token: string, id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/admin/calendar/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error('unauthorized');
  return res.ok;
}
```

- [ ] **Step 3: Build** — `cd web && npm run build` → PASS.

- [ ] **Step 4: Commit** — `git commit -am "feat(web): admin token helpers + calendar api"`

---

### Task 10: Frontend – `CalendarWall` admin režim

**Files:**
- Modify: `web/components/CalendarWall.tsx`
- Modify: `web/components/BookingForm.tsx`

- [ ] **Step 1: `CalendarWall`** — detekce admina a relaxace pravidel:
  - Importuj `getAdminToken` z `@/lib/admin`. Stav `const [isAdmin, setIsAdmin] = useState(false);` a v `useEffect` na mountu `setIsAdmin(Boolean(getAdminToken()));`.
  - V `departureProblem` přidej parametr `admin: boolean`; je-li `admin`, vrať `null` u min-nocí i orphan-gap (overlap necháš). Uprav volání v `chooseDeparture` (předej `isAdmin`).
  - Nad mřížkou, je-li `isAdmin`, zobraz pruh: `<p className="mb-4 rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-2 text-sm font-medium text-terracotta">Režim správce — pravidla pobytu se neuplatní, rezervace se vytvoří jako potvrzená.</p>`
  - Předej `isAdmin` do `BookingForm`.

- [ ] **Step 2: `BookingForm`** — přijmi `isAdmin?: boolean` a `onBooked?: () => void`, použij token:
  - Import `getAdminToken`. V `submit` zavolej `submitInquiry({...}, isAdmin ? getAdminToken() ?? undefined : undefined)`.
  - Po úspěchu zavolej `onBooked?.()` (rodič v admin režimu refetchne dostupnost, aby se právě obsazený termín hned překreslil — server overlap stejně vynutí, jde o UX).
  - Pokud `isAdmin`: tlačítko „Vytvořit rezervaci“ místo „Odeslat poptávku“, hláška po úspěchu „Rezervace vytvořena.“ (jinak beze změny).
  - V `CalendarWall` předej `onBooked={isAdmin ? refetchAvailability : undefined}`, kde `refetchAvailability` znovu zavolá `fetchAvailability(from, to)` a aktualizuje `blocks`.

- [ ] **Step 3: Build + lint** — `cd web && npm run build`.

- [ ] **Step 4: Commit** — `git commit -am "feat(web): admin mode on availability calendar"`

---

### Task 11: Frontend – `/admin` odhlášení + seznam kalendáře

**Files:**
- Modify: `web/app/admin/page.tsx`

- [ ] **Step 1: Hlavička + logout** — přidej řádek s nadpisem a tlačítkem „Odhlásit“ volajícím `adminLogout()` z `@/lib/admin`. Nahraď přímé čtení `localStorage` za `getAdminToken()`. Centralizuj 401: helper `function onUnauthorized() { adminLogout(); }`.

- [ ] **Step 2: Sekce kalendáře** — pod tabulkou poptávek přidej:
  - Stav `const [entries, setEntries] = useState<CalendarEntry[]>([]);`
  - `loadCalendar(t)` přes `fetchAdminCalendar(t)` (na `unauthorized` → `adminLogout()`), volej po nastavení tokenu.
  - Tabulka: Termín (`start → end`), Typ (`reason==='booked' ? 'Rezervace' : 'Blok'`), Host (`guestName`/`email`/`phone` nebo `note`), tlačítko „Zrušit“ → `confirm('Opravdu zrušit?')` → `cancelCalendarEntry(t, id)` → reload obou seznamů.

- [ ] **Step 3: Build** — `cd web && npm run build`.

- [ ] **Step 4: Commit** — `git commit -am "feat(web): admin logout + calendar entries list with cancel"`

---

### Task 12: Verifikace E2E + README

**Files:**
- Modify: `README.md` (TODO sekce — přidej a odškrtni položku H)

- [ ] **Step 1: Plné API testy** — `cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm test && npm run lint`.
- [ ] **Step 2: Web build + e2e smoke** — `cd web && npm run build && npm run e2e` (proti běžící app na portu 3100).
- [ ] **Step 3: Ruční scénář v prohlížeči** (port 3100): admin login → na `/volne-terminy` vyber krátký termín → „Vytvořit rezervaci“ → `/admin` zobrazí rezervaci → Zrušit uvolní termín → Odhlásit.
- [ ] **Step 4: README** — do TODO přidej `- [x] H — Administrace rezervací (odhlášení, admin rezervace přes veřejný tok, seznam + rušení)`.
- [ ] **Step 5: Commit** — `git commit -am "docs(readme): mark admin reservations management done"`.

---

## Self-Review

- **Pokrytí specu:** odhlášení (T11) ✓; auto-logout 401 (T9 helpers, T11) ✓; admin detekce na `POST /inquiries` (T8) ✓; relaxace min-stay/gap/arrival-in-past + overlap (T1, T6) ✓; auto-confirm + booked s `inquiry_id` (T6) ✓; migrace note/inquiry_id (T3) ✓; `cancelled` stav (T1) ✓; `GET /admin/calendar` join (T4, T7, T8) ✓; `DELETE` + revert (T7, T8) ✓; frontend seznam + zrušení (T11) ✓; klientská relaxace + banner (T10) ✓.
- **Placeholdery:** žádné — každý krok má konkrétní kód/příkaz.
- **Typová konzistence:** `SaveOptions`, `CalendarEntryView`/`CalendarEntry`, `delete → { inquiryId }`, `createByAdmin`, `isAdmin` použity konzistentně napříč T1–T11.
