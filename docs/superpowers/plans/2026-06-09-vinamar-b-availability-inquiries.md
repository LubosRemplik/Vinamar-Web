# Vinamar Web — Sub-project B (Availability & Inquiries) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an availability calendar (open-by-default, owner blocks), guest booking inquiries (≥7 nights, minimal fields, email to owner), and a JWT-protected admin to confirm/decline inquiries and manage blocks.

**Architecture:** Extends sub-project A's onion (`domain → application → infrastructure → interface`) and Next.js app. New domain slices `availability` and `inquiry` follow the established `health` slice pattern: port in `domain/`, handler in `application/`, raw-SQL adapter in `infrastructure/`, controller in `interface/`. Public availability/inquiry endpoints + admin endpoints behind an `AdminGuard`.

**Tech Stack:** As A, plus `@nestjs/jwt`, `nodemailer`, `bcrypt-free` constant-time compare via `crypto.timingSafeEqual`, MailHog, TanStack Query (already available in A? — installed here if missing).

**Spec:** [docs/superpowers/specs/2026-06-09-vinamar-b-availability-inquiries-design.md](../specs/2026-06-09-vinamar-b-availability-inquiries-design.md)

**Prerequisite:** Sub-project A merged; `docker compose up` works; `/api/health` green.

---

## File Structure (new/changed)

```
api/src/domain/
  shared/date-range.ts            shared/email-address.ts  shared/clock.port.ts
  availability/calendar-block.ts  availability/availability.repository.port.ts
  availability/dates-unavailable.error.ts
  inquiry/inquiry.ts              inquiry/inquiry.repository.port.ts
  inquiry/owner-notifier.port.ts  inquiry/minimum-stay-not-met.error.ts
  inquiry/arrival-in-past.error.ts
api/src/application/
  availability/{get-availability.query.ts,get-availability.handler.ts}
  availability/{block-dates.command.ts,block-dates.handler.ts}
  availability/{unblock-dates.command.ts,unblock-dates.handler.ts}
  inquiry/{submit-inquiry.command.ts,submit-inquiry.handler.ts}
  inquiry/{confirm-inquiry.command.ts,confirm-inquiry.handler.ts}
  inquiry/{decline-inquiry.command.ts,decline-inquiry.handler.ts}
  inquiry/{list-inquiries.query.ts,list-inquiries.handler.ts}
api/src/infrastructure/
  persistence/pg-availability.repository.ts  persistence/pg-inquiry.repository.ts
  notify/smtp-owner-notifier.ts              time/system-clock.ts
  auth/{admin-credentials.ts,jwt.config.ts}
api/src/interface/
  http/availability.controller.ts  http/inquiry.controller.ts
  http/admin-inquiry.controller.ts http/admin-block.controller.ts
  http/admin-auth.controller.ts    http/admin.guard.ts
  availability.module.ts inquiry.module.ts admin.module.ts
api/migrations/1700000001000_availability-and-inquiries.sql
web/app/rezervace/page.tsx  web/components/AvailabilityCalendar.tsx  web/components/InquiryForm.tsx
web/app/admin/login/page.tsx web/app/admin/page.tsx web/lib/api.ts
```

---

## Task 1: Shared value objects — DateRange, EmailAddress, Clock (TDD)

**Files:**
- Create: `api/src/domain/shared/date-range.ts`, `api/src/domain/shared/email-address.ts`, `api/src/domain/shared/clock.port.ts`, `api/test/domain/date-range.spec.ts`, `api/test/domain/email-address.spec.ts`

- [ ] **Step 1: Write failing tests** — `api/test/domain/date-range.spec.ts`

```ts
import { DateRange } from '../../src/domain/shared/date-range';

describe('DateRange', () => {
  it('counts nights between arrival and departure', () => {
    const r = new DateRange(new Date('2026-05-01'), new Date('2026-05-08'));
    expect(r.nights()).toBe(7);
  });

  it('rejects a departure on or before arrival', () => {
    expect(() => new DateRange(new Date('2026-05-08'), new Date('2026-05-01'))).toThrow();
  });

  it('detects overlap', () => {
    const a = new DateRange(new Date('2026-05-01'), new Date('2026-05-08'));
    const b = new DateRange(new Date('2026-05-07'), new Date('2026-05-10'));
    const c = new DateRange(new Date('2026-05-08'), new Date('2026-05-12'));
    expect(a.overlaps(b)).toBe(true);
    expect(a.overlaps(c)).toBe(false);
  });
});
```

And `api/test/domain/email-address.spec.ts`:

```ts
import { EmailAddress } from '../../src/domain/shared/email-address';

describe('EmailAddress', () => {
  it('accepts a valid address', () => {
    expect(new EmailAddress('a@b.cz').value).toBe('a@b.cz');
  });
  it('rejects an invalid address', () => {
    expect(() => new EmailAddress('nope')).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && npx jest test/domain`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `api/src/domain/shared/date-range.ts`**

```ts
const MS_PER_NIGHT = 1000 * 60 * 60 * 24;

export class DateRange {
  constructor(
    public readonly arrival: Date,
    public readonly departure: Date,
  ) {
    if (departure.getTime() <= arrival.getTime()) {
      throw new Error('departure must be after arrival');
    }
  }

  nights(): number {
    return Math.round((this.departure.getTime() - this.arrival.getTime()) / MS_PER_NIGHT);
  }

  overlaps(other: DateRange): boolean {
    return this.arrival < other.departure && other.arrival < this.departure;
  }
}
```

- [ ] **Step 4: Implement `api/src/domain/shared/email-address.ts`**

```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress {
  constructor(public readonly value: string) {
    if (!EMAIL_RE.test(value)) {
      throw new Error('invalid email address');
    }
  }
}
```

- [ ] **Step 5: Implement `api/src/domain/shared/clock.port.ts`**

```ts
export const CLOCK = Symbol('Clock');

export interface Clock {
  now(): Date;
}
```

- [ ] **Step 6: Run to verify pass**

Run: `cd api && npx jest test/domain`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/src/domain/shared api/test/domain
git commit -m "feat(api): add shared DateRange, EmailAddress and Clock port"
```

---

## Task 2: Availability domain (block + ports + error)

**Files:**
- Create: `api/src/domain/availability/calendar-block.ts`, `api/src/domain/availability/availability.repository.port.ts`, `api/src/domain/availability/dates-unavailable.error.ts`

- [ ] **Step 1: Create `api/src/domain/availability/calendar-block.ts`**

```ts
import { DateRange } from '../shared/date-range';

export type BlockReason = 'blocked' | 'booked';

export class CalendarBlock {
  constructor(
    public readonly id: string,
    public readonly range: DateRange,
    public readonly reason: BlockReason,
    public readonly createdAt: Date,
  ) {}
}
```

- [ ] **Step 2: Create `api/src/domain/availability/availability.repository.port.ts`**

```ts
import { CalendarBlock, BlockReason } from './calendar-block';
import { DateRange } from '../shared/date-range';

export const AVAILABILITY_REPOSITORY = Symbol('AvailabilityRepository');

export interface AvailabilityRepository {
  listBetween(from: Date, to: Date): Promise<CalendarBlock[]>;
  findOverlapping(range: DateRange): Promise<CalendarBlock | null>;
  save(range: DateRange, reason: BlockReason): Promise<CalendarBlock>;
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 3: Create `api/src/domain/availability/dates-unavailable.error.ts`**

```ts
import { DomainError } from '../errors/domain-error';

export class DatesUnavailableError extends DomainError {
  readonly status = 409;
  readonly type = 'https://vinamar.example/errors/dates-unavailable';
  constructor() {
    super('The requested dates are not available');
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/domain/availability
git commit -m "feat(api): add availability domain (block, port, error)"
```

---

## Task 3: Inquiry domain (entity + ports + errors)

**Files:**
- Create: `api/src/domain/inquiry/inquiry.ts`, `api/src/domain/inquiry/inquiry.repository.port.ts`, `api/src/domain/inquiry/owner-notifier.port.ts`, `api/src/domain/inquiry/minimum-stay-not-met.error.ts`, `api/src/domain/inquiry/arrival-in-past.error.ts`

- [ ] **Step 1: Create `api/src/domain/inquiry/minimum-stay-not-met.error.ts`**

```ts
import { DomainError } from '../errors/domain-error';

export class MinimumStayNotMetError extends DomainError {
  readonly status = 422;
  readonly type = 'https://vinamar.example/errors/minimum-stay';
  constructor(public readonly minimumNights: number) {
    super(`Minimum stay is ${minimumNights} nights`);
  }
}
```

- [ ] **Step 2: Create `api/src/domain/inquiry/arrival-in-past.error.ts`**

```ts
import { DomainError } from '../errors/domain-error';

export class ArrivalInPastError extends DomainError {
  readonly status = 422;
  readonly type = 'https://vinamar.example/errors/arrival-in-past';
  constructor() {
    super('Arrival date must be in the future');
  }
}
```

- [ ] **Step 3: Create `api/src/domain/inquiry/inquiry.ts`**

```ts
import { DateRange } from '../shared/date-range';
import { EmailAddress } from '../shared/email-address';
import { MinimumStayNotMetError } from './minimum-stay-not-met.error';
import { ArrivalInPastError } from './arrival-in-past.error';

export type InquiryStatus = 'pending' | 'confirmed' | 'declined';

export const MINIMUM_NIGHTS = 7;

export class Inquiry {
  constructor(
    public readonly id: string,
    public readonly guestName: string,
    public readonly email: EmailAddress,
    public readonly range: DateRange,
    public readonly message: string,
    public readonly status: InquiryStatus,
    public readonly createdAt: Date,
  ) {}

  static create(params: {
    id: string;
    guestName: string;
    email: EmailAddress;
    range: DateRange;
    message: string;
    now: Date;
  }): Inquiry {
    if (params.range.nights() < MINIMUM_NIGHTS) {
      throw new MinimumStayNotMetError(MINIMUM_NIGHTS);
    }
    if (params.range.arrival.getTime() <= params.now.getTime()) {
      throw new ArrivalInPastError();
    }
    return new Inquiry(
      params.id,
      params.guestName,
      params.email,
      params.range,
      params.message,
      'pending',
      params.now,
    );
  }
}
```

- [ ] **Step 4: Create `api/src/domain/inquiry/inquiry.repository.port.ts`**

```ts
import { Inquiry, InquiryStatus } from './inquiry';

export const INQUIRY_REPOSITORY = Symbol('InquiryRepository');

export interface InquiryRepository {
  save(inquiry: Inquiry): Promise<void>;
  get(id: string): Promise<Inquiry | null>;
  list(): Promise<Inquiry[]>;
  updateStatus(id: string, status: InquiryStatus): Promise<void>;
}
```

- [ ] **Step 5: Create `api/src/domain/inquiry/owner-notifier.port.ts`**

```ts
import { Inquiry } from './inquiry';

export const OWNER_NOTIFIER = Symbol('OwnerNotifier');

export interface OwnerNotifier {
  inquiryReceived(inquiry: Inquiry): Promise<void>;
}
```

- [ ] **Step 6: Commit**

```bash
git add api/src/domain/inquiry
git commit -m "feat(api): add inquiry domain (entity, rules, ports, errors)"
```

---

## Task 4: SubmitInquiry handler (TDD)

**Files:**
- Create: `api/src/application/inquiry/submit-inquiry.command.ts`, `api/src/application/inquiry/submit-inquiry.handler.ts`, `api/test/application/submit-inquiry.handler.spec.ts`
- Create test fakes: `api/test/fakes/index.ts`

- [ ] **Step 1: Create reusable fakes** — `api/test/fakes/index.ts`

```ts
import { Clock } from '../../src/domain/shared/clock.port';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock, BlockReason } from '../../src/domain/availability/calendar-block';
import { AvailabilityRepository } from '../../src/domain/availability/availability.repository.port';
import { Inquiry, InquiryStatus } from '../../src/domain/inquiry/inquiry';
import { InquiryRepository } from '../../src/domain/inquiry/inquiry.repository.port';
import { OwnerNotifier } from '../../src/domain/inquiry/owner-notifier.port';

export class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

export class InMemoryAvailability implements AvailabilityRepository {
  blocks: CalendarBlock[] = [];
  private seq = 0;
  async listBetween(): Promise<CalendarBlock[]> {
    return this.blocks;
  }
  async findOverlapping(range: DateRange): Promise<CalendarBlock | null> {
    return this.blocks.find((b) => b.range.overlaps(range)) ?? null;
  }
  async save(range: DateRange, reason: BlockReason): Promise<CalendarBlock> {
    const block = new CalendarBlock(`b${++this.seq}`, range, reason, new Date());
    this.blocks.push(block);
    return block;
  }
  async delete(id: string): Promise<void> {
    this.blocks = this.blocks.filter((b) => b.id !== id);
  }
}

export class InMemoryInquiries implements InquiryRepository {
  items: Inquiry[] = [];
  async save(inquiry: Inquiry): Promise<void> {
    this.items.push(inquiry);
  }
  async get(id: string): Promise<Inquiry | null> {
    return this.items.find((i) => i.id === id) ?? null;
  }
  async list(): Promise<Inquiry[]> {
    return this.items;
  }
  async updateStatus(id: string, status: InquiryStatus): Promise<void> {
    this.items = this.items.map((i) =>
      i.id === id
        ? new Inquiry(i.id, i.guestName, i.email, i.range, i.message, status, i.createdAt)
        : i,
    );
  }
}

export class SpyNotifier implements OwnerNotifier {
  received: Inquiry[] = [];
  async inquiryReceived(inquiry: Inquiry): Promise<void> {
    this.received.push(inquiry);
  }
}
```

- [ ] **Step 2: Write failing test** — `api/test/application/submit-inquiry.handler.spec.ts`

```ts
import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { DatesUnavailableError } from '../../src/domain/availability/dates-unavailable.error';
import { MinimumStayNotMetError } from '../../src/domain/inquiry/minimum-stay-not-met.error';
import { DateRange } from '../../src/domain/shared/date-range';
import { FixedClock, InMemoryAvailability, InMemoryInquiries, SpyNotifier } from '../fakes';

const make = () => {
  const availability = new InMemoryAvailability();
  const inquiries = new InMemoryInquiries();
  const notifier = new SpyNotifier();
  const clock = new FixedClock(new Date('2026-01-01'));
  const handler = new SubmitInquiryHandler(inquiries, availability, notifier, clock, () => 'id-1');
  return { handler, availability, inquiries, notifier };
};

const validCmd = () =>
  new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', 'ahoj');

describe('SubmitInquiryHandler', () => {
  it('persists a pending inquiry and notifies the owner', async () => {
    const { handler, inquiries, notifier } = make();
    await handler.execute(validCmd());
    expect(inquiries.items).toHaveLength(1);
    expect(inquiries.items[0].status).toBe('pending');
    expect(notifier.received).toHaveLength(1);
  });

  it('rejects a stay shorter than 7 nights', async () => {
    const { handler } = make();
    const cmd = new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-04', '');
    await expect(handler.execute(cmd)).rejects.toBeInstanceOf(MinimumStayNotMetError);
  });

  it('rejects dates overlapping an existing block', async () => {
    const { handler, availability } = make();
    await availability.save(new DateRange(new Date('2026-05-03'), new Date('2026-05-10')), 'blocked');
    await expect(handler.execute(validCmd())).rejects.toBeInstanceOf(DatesUnavailableError);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd api && npx jest test/application/submit-inquiry.handler.spec.ts`
Expected: FAIL — handler/command not found.

- [ ] **Step 4: Create `api/src/application/inquiry/submit-inquiry.command.ts`**

```ts
export class SubmitInquiryCommand {
  constructor(
    public readonly guestName: string,
    public readonly email: string,
    public readonly arrival: string,
    public readonly departure: string,
    public readonly message: string,
  ) {}
}
```

- [ ] **Step 5: Create `api/src/application/inquiry/submit-inquiry.handler.ts`**

```ts
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { SubmitInquiryCommand } from './submit-inquiry.command';
import { Inquiry } from '../../domain/inquiry/inquiry';
import { EmailAddress } from '../../domain/shared/email-address';
import { DateRange } from '../../domain/shared/date-range';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';
import {
  OWNER_NOTIFIER,
  OwnerNotifier,
} from '../../domain/inquiry/owner-notifier.port';
import { CLOCK, Clock } from '../../domain/shared/clock.port';
import { DatesUnavailableError } from '../../domain/availability/dates-unavailable.error';

@CommandHandler(SubmitInquiryCommand)
export class SubmitInquiryHandler implements ICommandHandler<SubmitInquiryCommand> {
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(OWNER_NOTIFIER) private readonly notifier: OwnerNotifier,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly idFactory: () => string = randomUUID,
  ) {}

  async execute(cmd: SubmitInquiryCommand): Promise<{ id: string }> {
    const range = new DateRange(new Date(cmd.arrival), new Date(cmd.departure));
    const inquiry = Inquiry.create({
      id: this.idFactory(),
      guestName: cmd.guestName,
      email: new EmailAddress(cmd.email),
      range,
      message: cmd.message,
      now: this.clock.now(),
    });
    if (await this.availability.findOverlapping(range)) {
      throw new DatesUnavailableError();
    }
    await this.inquiries.save(inquiry);
    await this.notifier.inquiryReceived(inquiry);
    return { id: inquiry.id };
  }
}
```

- [ ] **Step 6: Run to verify pass**

Run: `cd api && npx jest test/application/submit-inquiry.handler.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add api/test/fakes api/src/application/inquiry/submit-inquiry.command.ts api/src/application/inquiry/submit-inquiry.handler.ts api/test/application/submit-inquiry.handler.spec.ts
git commit -m "feat(api): add SubmitInquiry handler with tests"
```

---

## Task 5: Confirm/Decline inquiry + availability handlers (TDD)

**Files:**
- Create: `confirm-inquiry.command.ts`, `confirm-inquiry.handler.ts`, `decline-inquiry.command.ts`, `decline-inquiry.handler.ts`, `block-dates.command.ts`, `block-dates.handler.ts`, `unblock-dates.command.ts`, `unblock-dates.handler.ts`, `get-availability.query.ts`, `get-availability.handler.ts`, `list-inquiries.query.ts`, `list-inquiries.handler.ts` (all under `api/src/application/...`)
- Create: `api/test/application/confirm-inquiry.handler.spec.ts`

- [ ] **Step 1: Write failing test** — `api/test/application/confirm-inquiry.handler.spec.ts`

```ts
import { ConfirmInquiryHandler } from '../../src/application/inquiry/confirm-inquiry.handler';
import { ConfirmInquiryCommand } from '../../src/application/inquiry/confirm-inquiry.command';
import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { FixedClock, InMemoryAvailability, InMemoryInquiries, SpyNotifier } from '../fakes';

describe('ConfirmInquiryHandler', () => {
  it('confirms an inquiry and blocks its dates as booked', async () => {
    const availability = new InMemoryAvailability();
    const inquiries = new InMemoryInquiries();
    const clock = new FixedClock(new Date('2026-01-01'));
    const submit = new SubmitInquiryHandler(inquiries, availability, new SpyNotifier(), clock, () => 'id-1');
    await submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', ''));

    const confirm = new ConfirmInquiryHandler(inquiries, availability);
    await confirm.execute(new ConfirmInquiryCommand('id-1'));

    expect((await inquiries.get('id-1'))!.status).toBe('confirmed');
    expect(availability.blocks).toHaveLength(1);
    expect(availability.blocks[0].reason).toBe('booked');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd api && npx jest test/application/confirm-inquiry.handler.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Create confirm command + handler**

`api/src/application/inquiry/confirm-inquiry.command.ts`:
```ts
export class ConfirmInquiryCommand {
  constructor(public readonly id: string) {}
}
```

`api/src/application/inquiry/confirm-inquiry.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmInquiryCommand } from './confirm-inquiry.command';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';
import { DatesUnavailableError } from '../../domain/availability/dates-unavailable.error';

@CommandHandler(ConfirmInquiryCommand)
export class ConfirmInquiryHandler implements ICommandHandler<ConfirmInquiryCommand> {
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
  ) {}

  async execute(cmd: ConfirmInquiryCommand): Promise<void> {
    const inquiry = await this.inquiries.get(cmd.id);
    if (!inquiry) {
      throw new Error('inquiry not found');
    }
    if (await this.availability.findOverlapping(inquiry.range)) {
      throw new DatesUnavailableError();
    }
    await this.inquiries.updateStatus(cmd.id, 'confirmed');
    await this.availability.save(inquiry.range, 'booked');
  }
}
```

- [ ] **Step 4: Create decline command + handler**

`api/src/application/inquiry/decline-inquiry.command.ts`:
```ts
export class DeclineInquiryCommand {
  constructor(public readonly id: string) {}
}
```

`api/src/application/inquiry/decline-inquiry.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeclineInquiryCommand } from './decline-inquiry.command';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';

@CommandHandler(DeclineInquiryCommand)
export class DeclineInquiryHandler implements ICommandHandler<DeclineInquiryCommand> {
  constructor(@Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository) {}
  async execute(cmd: DeclineInquiryCommand): Promise<void> {
    await this.inquiries.updateStatus(cmd.id, 'declined');
  }
}
```

- [ ] **Step 5: Create block/unblock commands + handlers**

`api/src/application/availability/block-dates.command.ts`:
```ts
export class BlockDatesCommand {
  constructor(public readonly arrival: string, public readonly departure: string) {}
}
```

`api/src/application/availability/block-dates.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlockDatesCommand } from './block-dates.command';
import { DateRange } from '../../domain/shared/date-range';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';

@CommandHandler(BlockDatesCommand)
export class BlockDatesHandler implements ICommandHandler<BlockDatesCommand> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
  ) {}
  async execute(cmd: BlockDatesCommand): Promise<{ id: string }> {
    const block = await this.availability.save(
      new DateRange(new Date(cmd.arrival), new Date(cmd.departure)),
      'blocked',
    );
    return { id: block.id };
  }
}
```

`api/src/application/availability/unblock-dates.command.ts`:
```ts
export class UnblockDatesCommand {
  constructor(public readonly id: string) {}
}
```

`api/src/application/availability/unblock-dates.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnblockDatesCommand } from './unblock-dates.command';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';

@CommandHandler(UnblockDatesCommand)
export class UnblockDatesHandler implements ICommandHandler<UnblockDatesCommand> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
  ) {}
  async execute(cmd: UnblockDatesCommand): Promise<void> {
    await this.availability.delete(cmd.id);
  }
}
```

- [ ] **Step 6: Create availability + inquiry queries**

`api/src/application/availability/get-availability.query.ts`:
```ts
export class GetAvailabilityQuery {
  constructor(public readonly from: string, public readonly to: string) {}
}
```

`api/src/application/availability/get-availability.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAvailabilityQuery } from './get-availability.query';
import {
  AVAILABILITY_REPOSITORY,
  AvailabilityRepository,
} from '../../domain/availability/availability.repository.port';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler implements IQueryHandler<GetAvailabilityQuery> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
  ) {}
  async execute(q: GetAvailabilityQuery) {
    const blocks = await this.availability.listBetween(new Date(q.from), new Date(q.to));
    return blocks.map((b) => ({
      start: b.range.arrival.toISOString().slice(0, 10),
      end: b.range.departure.toISOString().slice(0, 10),
    }));
  }
}
```

`api/src/application/inquiry/list-inquiries.query.ts`:
```ts
export class ListInquiriesQuery {}
```

`api/src/application/inquiry/list-inquiries.handler.ts`:
```ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListInquiriesQuery } from './list-inquiries.query';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';

@QueryHandler(ListInquiriesQuery)
export class ListInquiriesHandler implements IQueryHandler<ListInquiriesQuery> {
  constructor(@Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository) {}
  async execute() {
    const items = await this.inquiries.list();
    return items
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((i) => ({
        id: i.id,
        guestName: i.guestName,
        email: i.email.value,
        arrival: i.range.arrival.toISOString().slice(0, 10),
        departure: i.range.departure.toISOString().slice(0, 10),
        message: i.message,
        status: i.status,
      }));
  }
}
```

- [ ] **Step 7: Run confirm test + full unit suite**

Run: `cd api && npx jest test/application`
Expected: PASS (submit + confirm specs).

- [ ] **Step 8: Commit**

```bash
git add api/src/application/inquiry api/src/application/availability api/test/application/confirm-inquiry.handler.spec.ts
git commit -m "feat(api): add confirm/decline/block/query handlers with tests"
```

---

## Task 6: Migration + raw-SQL repositories (integration tests)

**Files:**
- Create: `api/migrations/1700000001000_availability-and-inquiries.sql`, `api/src/infrastructure/persistence/pg-availability.repository.ts`, `api/src/infrastructure/persistence/pg-inquiry.repository.ts`, `api/src/infrastructure/time/system-clock.ts`, `api/test/infrastructure/pg-availability.repository.spec.ts`

- [ ] **Step 1: Create migration `api/migrations/1700000001000_availability-and-inquiries.sql`**

```sql
-- Up Migration
CREATE TABLE calendar_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name text NOT NULL,
  email text NOT NULL,
  arrival date NOT NULL,
  departure date NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE inquiries;
DROP TABLE calendar_blocks;
```

- [ ] **Step 2: Create `api/src/infrastructure/time/system-clock.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { Clock } from '../../domain/shared/clock.port';

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
```

- [ ] **Step 3: Create `api/src/infrastructure/persistence/pg-availability.repository.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './pg-connection';
import { DateRange } from '../../domain/shared/date-range';
import { CalendarBlock, BlockReason } from '../../domain/availability/calendar-block';
import { AvailabilityRepository } from '../../domain/availability/availability.repository.port';

@Injectable()
export class PgAvailabilityRepository implements AvailabilityRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toBlock(row: any): CalendarBlock {
    return new CalendarBlock(
      row.id,
      new DateRange(new Date(row.start_date), new Date(row.end_date)),
      row.reason as BlockReason,
      new Date(row.created_at),
    );
  }

  async listBetween(from: Date, to: Date): Promise<CalendarBlock[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM calendar_blocks WHERE start_date < $2 AND end_date > $1 ORDER BY start_date`,
      [from, to],
    );
    return rows.map((r) => this.toBlock(r));
  }

  async findOverlapping(range: DateRange): Promise<CalendarBlock | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM calendar_blocks WHERE start_date < $2 AND end_date > $1 LIMIT 1`,
      [range.arrival, range.departure],
    );
    return rows[0] ? this.toBlock(rows[0]) : null;
  }

  async save(range: DateRange, reason: BlockReason): Promise<CalendarBlock> {
    const { rows } = await this.pool.query(
      `INSERT INTO calendar_blocks (start_date, end_date, reason) VALUES ($1, $2, $3) RETURNING *`,
      [range.arrival, range.departure, reason],
    );
    return this.toBlock(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM calendar_blocks WHERE id = $1`, [id]);
  }
}
```

- [ ] **Step 4: Create `api/src/infrastructure/persistence/pg-inquiry.repository.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './pg-connection';
import { DateRange } from '../../domain/shared/date-range';
import { EmailAddress } from '../../domain/shared/email-address';
import { Inquiry, InquiryStatus } from '../../domain/inquiry/inquiry';
import { InquiryRepository } from '../../domain/inquiry/inquiry.repository.port';

@Injectable()
export class PgInquiryRepository implements InquiryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toInquiry(row: any): Inquiry {
    return new Inquiry(
      row.id,
      row.guest_name,
      new EmailAddress(row.email),
      new DateRange(new Date(row.arrival), new Date(row.departure)),
      row.message,
      row.status as InquiryStatus,
      new Date(row.created_at),
    );
  }

  async save(inquiry: Inquiry): Promise<void> {
    await this.pool.query(
      `INSERT INTO inquiries (id, guest_name, email, arrival, departure, message, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        inquiry.id,
        inquiry.guestName,
        inquiry.email.value,
        inquiry.range.arrival,
        inquiry.range.departure,
        inquiry.message,
        inquiry.status,
        inquiry.createdAt,
      ],
    );
  }

  async get(id: string): Promise<Inquiry | null> {
    const { rows } = await this.pool.query(`SELECT * FROM inquiries WHERE id = $1`, [id]);
    return rows[0] ? this.toInquiry(rows[0]) : null;
  }

  async list(): Promise<Inquiry[]> {
    const { rows } = await this.pool.query(`SELECT * FROM inquiries ORDER BY created_at DESC`);
    return rows.map((r) => this.toInquiry(r));
  }

  async updateStatus(id: string, status: InquiryStatus): Promise<void> {
    await this.pool.query(`UPDATE inquiries SET status = $2 WHERE id = $1`, [id, status]);
  }
}
```

- [ ] **Step 5: Write integration test** — `api/test/infrastructure/pg-availability.repository.spec.ts`

```ts
import { Pool } from 'pg';
import { PgAvailabilityRepository } from '../../src/infrastructure/persistence/pg-availability.repository';
import { DateRange } from '../../src/domain/shared/date-range';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

describe('PgAvailabilityRepository (integration)', () => {
  const pool = new Pool({ connectionString: url });
  const repo = new PgAvailabilityRepository(pool);

  afterAll(async () => {
    await pool.query('DELETE FROM calendar_blocks');
    await pool.end();
  });

  it('saves and finds overlapping blocks', async () => {
    await pool.query('DELETE FROM calendar_blocks');
    await repo.save(new DateRange(new Date('2026-06-01'), new Date('2026-06-08')), 'blocked');
    const hit = await repo.findOverlapping(
      new DateRange(new Date('2026-06-05'), new Date('2026-06-12')),
    );
    const miss = await repo.findOverlapping(
      new DateRange(new Date('2026-07-01'), new Date('2026-07-08')),
    );
    expect(hit).not.toBeNull();
    expect(miss).toBeNull();
  });
});
```

- [ ] **Step 6: Run migration + integration test** (db up)

Run:
```bash
cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run migrate up
DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npx jest test/infrastructure/pg-availability.repository.spec.ts
```
Expected: migration applies; integration test PASSES.

- [ ] **Step 7: Commit**

```bash
git add api/migrations/1700000001000_availability-and-inquiries.sql api/src/infrastructure/persistence/pg-availability.repository.ts api/src/infrastructure/persistence/pg-inquiry.repository.ts api/src/infrastructure/time/system-clock.ts api/test/infrastructure/pg-availability.repository.spec.ts
git commit -m "feat(api): add availability & inquiry tables and raw-SQL repositories"
```

---

## Task 7: SMTP notifier + MailHog

**Files:**
- Create: `api/src/infrastructure/notify/smtp-owner-notifier.ts`
- Modify: `docker-compose.yml` (add `mailhog`), `.env.example`
- Install: `nodemailer`

- [ ] **Step 1: Install nodemailer**

Run: `cd api && npm install nodemailer && npm install -D @types/nodemailer`

- [ ] **Step 2: Create `api/src/infrastructure/notify/smtp-owner-notifier.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { OwnerNotifier } from '../../domain/inquiry/owner-notifier.port';
import { Inquiry } from '../../domain/inquiry/inquiry';

@Injectable()
export class SmtpOwnerNotifier implements OwnerNotifier {
  private readonly transport: Transporter = createTransport({
    host: process.env.SMTP_HOST ?? 'mailhog',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async inquiryReceived(inquiry: Inquiry): Promise<void> {
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? 'vinamar@example.com',
      to: process.env.OWNER_EMAIL ?? 'owner@example.com',
      subject: `Nová poptávka: ${inquiry.guestName}`,
      text:
        `${inquiry.guestName} (${inquiry.email.value})\n` +
        `${inquiry.range.arrival.toISOString().slice(0, 10)} → ` +
        `${inquiry.range.departure.toISOString().slice(0, 10)}\n\n${inquiry.message}`,
    });
  }
}
```

- [ ] **Step 3: Add `mailhog` to `docker-compose.yml`**

```yaml
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "8025:8025"
```

- [ ] **Step 4: Append mail + auth env to `.env.example`**

```
JWT_SECRET=change-me
ADMIN_USERNAME=owner
ADMIN_PASSWORD=change-me
OWNER_EMAIL=owner@example.com
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM=vinamar@example.com
```

- [ ] **Step 5: Commit**

```bash
git add api/package.json api/package-lock.json api/src/infrastructure/notify docker-compose.yml .env.example
git commit -m "feat(api): add smtp owner notifier and mailhog"
```

---

## Task 8: Admin auth — login endpoint + JWT guard (TDD)

**Files:**
- Create: `api/src/infrastructure/auth/admin-credentials.ts`, `api/src/interface/http/admin.guard.ts`, `api/src/interface/http/admin-auth.controller.ts`, `api/test/auth.e2e-spec.ts`
- Install: `@nestjs/jwt`

- [ ] **Step 1: Install jwt**

Run: `cd api && npm install @nestjs/jwt`

- [ ] **Step 2: Create `api/src/infrastructure/auth/admin-credentials.ts`**

```ts
import { timingSafeEqual } from 'node:crypto';

export function adminCredentialsValid(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? 'owner';
  const expectedPass = process.env.ADMIN_PASSWORD ?? '';
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPass);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
}
```

- [ ] **Step 3: Create `api/src/interface/http/admin.guard.ts`**

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    try {
      this.jwt.verify(token, { secret: process.env.JWT_SECRET ?? 'change-me' });
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

- [ ] **Step 4: Create `api/src/interface/http/admin-auth.controller.ts`**

```ts
import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString } from 'class-validator';
import { adminCredentialsValid } from '../../infrastructure/auth/admin-credentials';

class LoginDto {
  @IsString() username!: string;
  @IsString() password!: string;
}

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly jwt: JwtService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    if (!adminCredentialsValid(dto.username, dto.password)) {
      throw new UnauthorizedException();
    }
    const token = this.jwt.sign(
      { sub: dto.username },
      { secret: process.env.JWT_SECRET ?? 'change-me', expiresIn: '12h' },
    );
    return { token };
  }
}
```

- [ ] **Step 5: Install class-validator if missing**

Run: `cd api && npm install class-validator class-transformer`

- [ ] **Step 6: Write e2e** — `api/test/auth.e2e-spec.ts` (built after the admin module exists in Task 9; placeholder note)

> This e2e is written and run in Task 9 Step 6 once `AdminModule` wires the controller + guard. Skip here.

- [ ] **Step 7: Commit**

```bash
git add api/package.json api/package-lock.json api/src/infrastructure/auth api/src/interface/http/admin.guard.ts api/src/interface/http/admin-auth.controller.ts
git commit -m "feat(api): add admin login endpoint and jwt guard"
```

---

## Task 9: Controllers + modules + wiring + e2e

**Files:**
- Create: `api/src/interface/http/availability.controller.ts`, `inquiry.controller.ts`, `admin-inquiry.controller.ts`, `admin-block.controller.ts`, `api/src/interface/availability.module.ts`, `inquiry.module.ts`, `admin.module.ts`
- Create: `api/test/inquiry.e2e-spec.ts`, `api/test/auth.e2e-spec.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create `api/src/interface/http/availability.controller.ts`**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAvailabilityQuery } from '../../application/availability/get-availability.query';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async availability(@Query('from') from: string, @Query('to') to: string) {
    const blocks = await this.queryBus.execute(new GetAvailabilityQuery(from, to));
    return { blocks };
  }
}
```

- [ ] **Step 2: Create `api/src/interface/http/inquiry.controller.ts`**

```ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IsEmail, IsISO8601, IsOptional, IsString } from 'class-validator';
import { SubmitInquiryCommand } from '../../application/inquiry/submit-inquiry.command';

class CreateInquiryDto {
  @IsString() guestName!: string;
  @IsEmail() email!: string;
  @IsISO8601() arrival!: string;
  @IsISO8601() departure!: string;
  @IsOptional() @IsString() message = '';
}

@Controller('inquiries')
export class InquiryController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateInquiryDto) {
    return this.commandBus.execute(
      new SubmitInquiryCommand(dto.guestName, dto.email, dto.arrival, dto.departure, dto.message),
    );
  }
}
```

- [ ] **Step 3: Create `api/src/interface/http/admin-inquiry.controller.ts`**

```ts
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminGuard } from './admin.guard';
import { ListInquiriesQuery } from '../../application/inquiry/list-inquiries.query';
import { ConfirmInquiryCommand } from '../../application/inquiry/confirm-inquiry.command';
import { DeclineInquiryCommand } from '../../application/inquiry/decline-inquiry.command';

@Controller('admin/inquiries')
@UseGuards(AdminGuard)
export class AdminInquiryController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  list() {
    return this.queryBus.execute(new ListInquiriesQuery());
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.commandBus.execute(new ConfirmInquiryCommand(id));
  }

  @Post(':id/decline')
  decline(@Param('id') id: string) {
    return this.commandBus.execute(new DeclineInquiryCommand(id));
  }
}
```

- [ ] **Step 4: Create `api/src/interface/http/admin-block.controller.ts`**

```ts
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsISO8601 } from 'class-validator';
import { AdminGuard } from './admin.guard';
import { GetAvailabilityQuery } from '../../application/availability/get-availability.query';
import { BlockDatesCommand } from '../../application/availability/block-dates.command';
import { UnblockDatesCommand } from '../../application/availability/unblock-dates.command';

class BlockDto {
  @IsISO8601() arrival!: string;
  @IsISO8601() departure!: string;
}

@Controller('admin/blocks')
@UseGuards(AdminGuard)
export class AdminBlockController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  list(@Query('from') from: string, @Query('to') to: string) {
    return this.queryBus.execute(new GetAvailabilityQuery(from, to));
  }

  @Post()
  block(@Body() dto: BlockDto) {
    return this.commandBus.execute(new BlockDatesCommand(dto.arrival, dto.departure));
  }

  @Delete(':id')
  unblock(@Param('id') id: string) {
    return this.commandBus.execute(new UnblockDatesCommand(id));
  }
}
```

- [ ] **Step 5: Create the three modules**

`api/src/interface/availability.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AvailabilityController } from './http/availability.controller';
import { GetAvailabilityHandler } from '../application/availability/get-availability.handler';
import { BlockDatesHandler } from '../application/availability/block-dates.handler';
import { UnblockDatesHandler } from '../application/availability/unblock-dates.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgAvailabilityRepository } from '../infrastructure/persistence/pg-availability.repository';
import { AVAILABILITY_REPOSITORY } from '../domain/availability/availability.repository.port';

const availabilityRepo = { provide: AVAILABILITY_REPOSITORY, useClass: PgAvailabilityRepository };

@Module({
  imports: [CqrsModule],
  controllers: [AvailabilityController],
  providers: [GetAvailabilityHandler, BlockDatesHandler, UnblockDatesHandler, pgPoolProvider, availabilityRepo],
  exports: [availabilityRepo, pgPoolProvider],
})
export class AvailabilityModule {}
```

`api/src/interface/inquiry.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { InquiryController } from './http/inquiry.controller';
import { SubmitInquiryHandler } from '../application/inquiry/submit-inquiry.handler';
import { ConfirmInquiryHandler } from '../application/inquiry/confirm-inquiry.handler';
import { DeclineInquiryHandler } from '../application/inquiry/decline-inquiry.handler';
import { ListInquiriesHandler } from '../application/inquiry/list-inquiries.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgInquiryRepository } from '../infrastructure/persistence/pg-inquiry.repository';
import { PgAvailabilityRepository } from '../infrastructure/persistence/pg-availability.repository';
import { SmtpOwnerNotifier } from '../infrastructure/notify/smtp-owner-notifier';
import { SystemClock } from '../infrastructure/time/system-clock';
import { INQUIRY_REPOSITORY } from '../domain/inquiry/inquiry.repository.port';
import { AVAILABILITY_REPOSITORY } from '../domain/availability/availability.repository.port';
import { OWNER_NOTIFIER } from '../domain/inquiry/owner-notifier.port';
import { CLOCK } from '../domain/shared/clock.port';

@Module({
  imports: [CqrsModule],
  controllers: [InquiryController],
  providers: [
    SubmitInquiryHandler,
    ConfirmInquiryHandler,
    DeclineInquiryHandler,
    ListInquiriesHandler,
    pgPoolProvider,
    { provide: INQUIRY_REPOSITORY, useClass: PgInquiryRepository },
    { provide: AVAILABILITY_REPOSITORY, useClass: PgAvailabilityRepository },
    { provide: OWNER_NOTIFIER, useClass: SmtpOwnerNotifier },
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class InquiryModule {}
```

`api/src/interface/admin.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthController } from './http/admin-auth.controller';
import { AdminInquiryController } from './http/admin-inquiry.controller';
import { AdminBlockController } from './http/admin-block.controller';
import { AdminGuard } from './admin.guard';

// NOTE: Do NOT re-register the CQRS handlers or repositories here. They are
// already provided by InquiryModule and AvailabilityModule and are bound to the
// app-global CommandBus/QueryBus. Re-providing the same handler class in a second
// module makes @nestjs/cqrs throw on duplicate registration. AdminModule only owns
// its controllers, the JWT guard, and JwtModule for token verification.
@Module({
  imports: [CqrsModule, JwtModule.register({})],
  controllers: [AdminAuthController, AdminInquiryController, AdminBlockController],
  providers: [AdminGuard],
})
export class AdminModule {}
```

> AppModule must import `AvailabilityModule`, `InquiryModule`, and `AdminModule` (Task 9 Step 6). Because the handlers live in the first two and the bus is global, the admin controllers dispatch successfully without re-registering anything.

- [ ] **Step 6: Register modules in `api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './interface/health.module';
import { AvailabilityModule } from './interface/availability.module';
import { InquiryModule } from './interface/inquiry.module';
import { AdminModule } from './interface/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AvailabilityModule,
    InquiryModule,
    AdminModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Write e2e tests** — `api/test/inquiry.e2e-spec.ts`

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { ProblemDetailFilter } from '../src/interface/http/problem-detail.filter';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

describe('Inquiries (e2e)', () => {
  let app: INestApplication;
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new ProblemDetailFilter());
    await app.init();
    await pool.query('DELETE FROM calendar_blocks');
    await pool.query('DELETE FROM inquiries');
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it('accepts a valid 7-night inquiry', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({ guestName: 'Jan', email: 'jan@x.cz', arrival: future(30), departure: future(37), message: 'ahoj' });
    expect(res.status).toBe(201);
  });

  it('rejects a stay shorter than 7 nights with 422', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({ guestName: 'Jan', email: 'jan@x.cz', arrival: future(30), departure: future(33), message: '' });
    expect(res.status).toBe(422);
  });
});
```

And `api/test/auth.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.JWT_SECRET = 'test-secret';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects admin endpoints without a token', async () => {
    const res = await request(app.getHttpServer()).get('/api/admin/inquiries');
    expect(res.status).toBe(401);
  });

  it('issues a token for valid credentials and accepts it', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ username: 'owner', password: 'secret' });
    expect(login.status).toBe(201);
    const res = await request(app.getHttpServer())
      .get('/api/admin/inquiries')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 8: Run e2e + full suite** (db up, migrations applied)

Run:
```bash
cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run test:e2e
DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm test
```
Expected: inquiry + auth e2e PASS; all unit specs PASS; lint passes (`npm run lint`).

- [ ] **Step 9: Commit**

```bash
git add api/src/interface api/src/app.module.ts api/test/inquiry.e2e-spec.ts api/test/auth.e2e-spec.ts
git commit -m "feat(api): wire availability, inquiry and admin endpoints with e2e"
```

---

## Task 10: Frontend API client + booking page

**Files:**
- Create: `web/lib/api.ts`, `web/components/AvailabilityCalendar.tsx`, `web/components/InquiryForm.tsx`, `web/app/rezervace/page.tsx`
- Modify: `web/components/Nav.tsx` (enable Rezervace link)
- Install (if missing): `@tanstack/react-query`

- [ ] **Step 1: Install TanStack Query**

Run: `cd web && npm install @tanstack/react-query`

- [ ] **Step 2: Create `web/lib/api.ts`**

```ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface Block {
  start: string;
  end: string;
}

export async function fetchAvailability(from: string, to: string): Promise<Block[]> {
  const res = await fetch(`${BASE}/availability?from=${from}&to=${to}`);
  if (!res.ok) throw new Error('availability failed');
  const data = await res.json();
  return data.blocks as Block[];
}

export async function submitInquiry(input: {
  guestName: string;
  email: string;
  arrival: string;
  departure: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.ok) return { ok: true };
  const problem = await res.json().catch(() => ({}));
  return { ok: false, error: problem.detail ?? 'Odeslání se nezdařilo' };
}
```

- [ ] **Step 3: Create `web/components/AvailabilityCalendar.tsx`**

```tsx
'use client';
import { Block } from '@/lib/api';

function isBlocked(date: string, blocks: Block[]): boolean {
  return blocks.some((b) => date >= b.start && date < b.end);
}

export default function AvailabilityCalendar({
  blocks,
  monthStart,
}: {
  blocks: Block[];
  monthStart: string;
}) {
  const start = new Date(monthStart);
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => (
        <div
          key={d}
          className={`text-center text-xs py-2 rounded ${
            isBlocked(d, blocks) ? 'bg-ink/20 text-ink/50 line-through' : 'bg-white'
          }`}
        >
          {d.slice(8)}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `web/components/InquiryForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { submitInquiry } from '@/lib/api';

export default function InquiryForm() {
  const [form, setForm] = useState({ guestName: '', email: '', arrival: '', departure: '', message: '' });
  const [result, setResult] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await submitInquiry(form);
    setResult(r.ok ? 'Děkujeme, ozveme se vám.' : (r.error ?? 'Chyba'));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 max-w-md">
      <input required placeholder="Jméno" value={form.guestName} onChange={set('guestName')} className="border p-2 rounded" />
      <input required type="email" placeholder="E-mail" value={form.email} onChange={set('email')} className="border p-2 rounded" />
      <label className="text-sm">Příjezd<input required type="date" value={form.arrival} onChange={set('arrival')} className="border p-2 rounded w-full" /></label>
      <label className="text-sm">Odjezd<input required type="date" value={form.departure} onChange={set('departure')} className="border p-2 rounded w-full" /></label>
      <textarea placeholder="Zpráva" value={form.message} onChange={set('message')} className="border p-2 rounded" />
      <button type="submit" className="bg-terracotta text-white py-2 rounded">Odeslat poptávku</button>
      {result && <p className="text-sm">{result}</p>}
    </form>
  );
}
```

- [ ] **Step 5: Create `web/app/rezervace/page.tsx`**

```tsx
import InquiryForm from '@/components/InquiryForm';

export const metadata = { title: 'Rezervace — Vinamar' };

export default function Rezervace() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">Rezervace</h1>
      <p className="text-ink/80 mb-6">Minimální pobyt 7 nocí. Pošlete nám poptávku a my se ozveme.</p>
      <InquiryForm />
    </main>
  );
}
```

- [ ] **Step 6: Enable the Rezervace link in `web/components/Nav.tsx`**

Replace the disabled `<span>Rezervace</span>` block with:
```tsx
        <Link href="/rezervace" className="hover:text-terracotta">
          Rezervace
        </Link>
```

- [ ] **Step 7: Verify build**

Run: `cd web && npm run build`
Expected: build succeeds; `/rezervace` present.

- [ ] **Step 8: Commit**

```bash
git add web/lib/api.ts web/components/AvailabilityCalendar.tsx web/components/InquiryForm.tsx web/app/rezervace web/components/Nav.tsx package.json
git commit -m "feat(web): add booking page with availability calendar and inquiry form"
```

---

## Task 11: Admin frontend (login + dashboard)

**Files:**
- Create: `web/app/admin/login/page.tsx`, `web/app/admin/page.tsx`

- [ ] **Step 1: Create `web/app/admin/login/page.tsx`**

```tsx
'use client';
import { useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function AdminLogin() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    if (!res.ok) return setErr('Neplatné přihlášení');
    const { token } = await res.json();
    localStorage.setItem('vinamar_admin_token', token);
    window.location.href = '/admin';
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <h1 className="text-2xl mb-4">Administrace</h1>
      <form onSubmit={login} className="flex flex-col gap-3">
        <input placeholder="Uživatel" value={u} onChange={(e) => setU(e.target.value)} className="border p-2 rounded" />
        <input type="password" placeholder="Heslo" value={p} onChange={(e) => setP(e.target.value)} className="border p-2 rounded" />
        <button className="bg-terracotta text-white py-2 rounded">Přihlásit</button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Create `web/app/admin/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface Row {
  id: string;
  guestName: string;
  email: string;
  arrival: string;
  departure: string;
  status: string;
}

export default function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('vinamar_admin_token');
    if (!t) {
      window.location.href = '/admin/login';
      return;
    }
    setToken(t);
  }, []);

  async function load(t: string) {
    const res = await fetch(`${BASE}/admin/inquiries`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) return (window.location.href = '/admin/login');
    setRows(await res.json());
  }

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  async function act(id: string, action: 'confirm' | 'decline') {
    if (!token) return;
    await fetch(`${BASE}/admin/inquiries/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    load(token);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl mb-4">Poptávky</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Host</th><th>Termín</th><th>Stav</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.guestName}<br /><span className="text-ink/60">{r.email}</span></td>
              <td>{r.arrival} → {r.departure}</td>
              <td>{r.status}</td>
              <td className="text-right">
                {r.status === 'pending' && (
                  <>
                    <button onClick={() => act(r.id, 'confirm')} className="text-sea mr-3">Potvrdit</button>
                    <button onClick={() => act(r.id, 'decline')} className="text-red-600">Zamítnout</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd web && npm run build`
Expected: build succeeds; `/admin` and `/admin/login` present.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin
git commit -m "feat(web): add admin login and inquiry dashboard"
```

---

## Task 12: Playwright e2e + acceptance

**Files:**
- Create: `web/e2e/booking.spec.ts`

- [ ] **Step 1: Create `web/e2e/booking.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

test('guest can submit a valid inquiry', async ({ page }) => {
  await page.goto('/rezervace');
  await page.getByPlaceholder('Jméno').fill('Jan Novák');
  await page.getByPlaceholder('E-mail').fill('jan@example.cz');
  await page.locator('input[type=date]').first().fill(future(30));
  await page.locator('input[type=date]').last().fill(future(37));
  await page.getByRole('button', { name: 'Odeslat poptávku' }).click();
  await expect(page.getByText(/Děkujeme/)).toBeVisible();
});
```

- [ ] **Step 2: Run the full stack + e2e**

Run:
```bash
docker compose up -d --build
cd web && E2E_BASE_URL=http://localhost:3000 npm run e2e
```
Expected: booking + earlier showcase specs PASS. Check MailHog UI at http://localhost:8025 shows the inquiry email.

- [ ] **Step 3: Acceptance sweep (spec §10)**

Run:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/admin/login -H 'Content-Type: application/json' -d '{"username":"owner","password":"change-me"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s -o /dev/null -w "no-token=%{http_code}\n" http://localhost:3001/api/admin/inquiries
curl -s -o /dev/null -w "with-token=%{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/inquiries
```
Expected: `no-token=401`, `with-token=200`. (Use the `ADMIN_PASSWORD` from your `.env`.)

- [ ] **Step 4: Mark README TODO B done + commit**

Change `- [ ] B — Availability & Inquiries` to `- [x]` in `README.md`.

```bash
git add web/e2e/booking.spec.ts README.md
git commit -m "test(web): add booking e2e and mark sub-project B complete"
```

---

## Self-Review Notes

- **Spec coverage:** open-by-default availability + owner blocks (T2, T5, T6, T9) · 7-night minimum (T3 `MINIMUM_NIGHTS`, tested T4) · minimal inquiry fields (T9 DTO) · JWT admin (T8, T9) · SMTP + MailHog (T7) · public availability + booking UI (T10) · admin UI (T11) · confirm auto-blocks (T5 `ConfirmInquiryHandler`) · all acceptance items mapped to T9/T12.
- **No placeholders:** every step has complete code or exact commands with expected output. (Task 8 Step 6 intentionally defers the auth e2e to Task 9, where the module exists — the test code is provided there in full.)
- **Type consistency:** `DateRange(arrival, departure)`, `EmailAddress.value`, `CalendarBlock(id, range, reason, createdAt)`, `Inquiry.create({...})`, port tokens `AVAILABILITY_REPOSITORY`/`INQUIRY_REPOSITORY`/`OWNER_NOTIFIER`/`CLOCK`, and the `findOverlapping/save/listBetween/delete` signatures are used identically across application, infrastructure, and test-fake code.
```
