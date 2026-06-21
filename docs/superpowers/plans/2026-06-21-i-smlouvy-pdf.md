# Smlouvy v PDF (I) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Admin u potvrzené rezervace vygeneruje nájemní smlouvu (PDF, česky), systém ji odešle e-mailem hostovi a posune rezervaci na `contract_sent`.

**Architecture:** Onion `contract` slice kopírující `inquiry` (domain → application CQRS → infrastructure raw-SQL/pdfmake/SMTP → interface HTTP). Immutable snapshot smlouvy vč. uloženého PDF.

**Tech Stack:** NestJS 11, @nestjs/cqrs, raw SQL přes `pg`, node-pg-migrate, **pdfmake** (+ Roboto TTF), nodemailer, Next.js (web admin).

## Global Constraints

- Doména bez frameworku; závislosti míří dovnitř (ESLint rule pro `src/domain/**`).
- Každá smlouva **přesně 10 nocí / 11 dní** (`departure = arrival + 10`).
- Smlouvy **pouze česky**. Identita pronajímatele, popis bytu, domovní řád, sankce **napevno v rendereru** (placeholdery `// TODO: doplnit reálné údaje`).
- Dvě varianty: `'with-deposit'` (vyžaduje `depositAmount`) / `'without-deposit'` (nesmí mít `depositAmount`).
- Handlery jen `persist/remove/update` přes repozitáře (raw SQL, commit per dotaz).
- Admin endpointy chráněné `AdminGuard` (JWT).
- DB e2e běží jen při `RUN_DB_INTEGRATION=1`.

---

### Task 0: Závislost pdfmake + font

**Files:**
- Modify: `api/package.json`
- Create: `api/src/infrastructure/pdf/fonts/Roboto-Regular.ttf`, `Roboto-Medium.ttf`

- [ ] **Step 1:** `npm --prefix api install pdfmake @types/pdfmake`
- [ ] **Step 2:** Stáhnout Roboto Regular + Medium TTF do `api/src/infrastructure/pdf/fonts/` (z balíčku `pdfmake/build/vfs_fonts` lze použít vestavěný Roboto — viz Task 6, font řešíme přes pdfmake VFS, takže krok stažení je volitelný, pokud použijeme `vfs_fonts`).
- [ ] **Step 3:** Commit `chore(i): add pdfmake dependency`.

---

### Task 1: Doména — `ContractVariant`, `Contract`, chyby

**Files:**
- Create: `api/src/domain/contract/contract-variant.ts`
- Create: `api/src/domain/contract/contract.ts`
- Create: `api/src/domain/contract/errors/contract-nights.error.ts`
- Create: `api/src/domain/contract/errors/deposit-required.error.ts`
- Create: `api/src/domain/contract/errors/deposit-not-allowed.error.ts`
- Test: `api/test/domain/contract.spec.ts`

**Interfaces — Produces:**
```ts
export type ContractVariant = 'with-deposit' | 'without-deposit';
export const CONTRACT_NIGHTS = 10;
export class Contract {
  constructor(
    readonly id: string,
    readonly inquiryId: string,
    readonly variant: ContractVariant,
    readonly guestName: string,
    readonly guestAddress: string,
    readonly guestIdNumber: string,
    readonly guestBirthDate: Date | null,
    readonly range: DateRange,
    readonly totalPrice: number,
    readonly currency: string,
    readonly depositAmount: number | null,
    readonly depositDueDate: Date | null,
    readonly generatedAt: Date,
  ) {}
  static create(params: {
    id: string; inquiryId: string; variant: ContractVariant;
    guestName: string; guestAddress: string; guestIdNumber: string;
    guestBirthDate: Date | null; range: DateRange; totalPrice: number;
    currency: string; depositAmount: number | null; depositDueDate: Date | null;
    now: Date;
  }): Contract
}
```
Chyby rozšiřují `DomainError` (viz `src/domain/errors/domain-error.ts`), `status = 409`/`422`.

- [ ] **Step 1: Napsat failing testy** `api/test/domain/contract.spec.ts`:
```ts
import { Contract, CONTRACT_NIGHTS } from '../../src/domain/contract/contract';
import { DateRange } from '../../src/domain/shared/date-range';
import { ContractNightsError } from '../../src/domain/contract/errors/contract-nights.error';
import { DepositRequiredError } from '../../src/domain/contract/errors/deposit-required.error';
import { DepositNotAllowedError } from '../../src/domain/contract/errors/deposit-not-allowed.error';

const base = {
  id: 'c1', inquiryId: 'i1', guestName: 'Jan Novák', guestAddress: 'Praha 1',
  guestIdNumber: '123456', guestBirthDate: new Date('1990-01-01'),
  totalPrice: 1000, currency: 'EUR', now: new Date('2026-01-01'),
};
const range = (n: number) =>
  new DateRange(new Date('2026-05-01'), new Date(`2026-05-${String(1 + n).padStart(2, '0')}`));

describe('Contract', () => {
  it('creates a valid 10-night with-deposit contract', () => {
    const c = Contract.create({ ...base, variant: 'with-deposit', range: range(CONTRACT_NIGHTS),
      depositAmount: 200, depositDueDate: new Date('2026-04-01') });
    expect(c.range.nights()).toBe(10);
    expect(c.depositAmount).toBe(200);
  });
  it('rejects a stay that is not exactly 10 nights', () => {
    expect(() => Contract.create({ ...base, variant: 'without-deposit', range: range(7),
      depositAmount: null, depositDueDate: null })).toThrow(ContractNightsError);
  });
  it('requires a deposit amount for with-deposit', () => {
    expect(() => Contract.create({ ...base, variant: 'with-deposit', range: range(10),
      depositAmount: null, depositDueDate: null })).toThrow(DepositRequiredError);
  });
  it('forbids a deposit amount for without-deposit', () => {
    expect(() => Contract.create({ ...base, variant: 'without-deposit', range: range(10),
      depositAmount: 200, depositDueDate: null })).toThrow(DepositNotAllowedError);
  });
});
```
- [ ] **Step 2:** Spustit `DATABASE_URL=… npm --prefix api test -- contract.spec` → FAIL (module not found).
- [ ] **Step 3:** Implementovat `contract-variant.ts`, tři chyby a `Contract` s invarianty v `create()`.
- [ ] **Step 4:** Spustit test → PASS.
- [ ] **Step 5:** `npm --prefix api run lint` → bez chyb (onion rule).
- [ ] **Step 6:** Commit `feat(i): contract domain entity with 10-night and deposit invariants`.

---

### Task 2: Doménové porty

**Files:**
- Create: `api/src/domain/contract/contract.repository.port.ts`
- Create: `api/src/domain/contract/contract-pdf-renderer.port.ts`
- Create: `api/src/domain/contract/contract-notifier.port.ts`

**Interfaces — Produces:**
```ts
export const CONTRACT_REPOSITORY = Symbol('ContractRepository');
export interface ContractRepository {
  save(contract: Contract, pdf: Buffer): Promise<void>;
  markSent(id: string, sentAt: Date): Promise<void>;
  get(id: string): Promise<{ contract: Contract; pdf: Buffer } | null>;
  existsForInquiry(inquiryId: string): Promise<boolean>;
}
export const CONTRACT_PDF_RENDERER = Symbol('ContractPdfRenderer');
export interface ContractPdfRenderer { render(contract: Contract): Promise<Buffer>; }
export const CONTRACT_NOTIFIER = Symbol('ContractNotifier');
export interface ContractNotifier { sendToGuest(contract: Contract, guestEmail: string, pdf: Buffer): Promise<void>; }
```
- [ ] **Step 1:** Vytvořit tři soubory s výše uvedenými interfacy.
- [ ] **Step 2:** `npm --prefix api run lint` → OK.
- [ ] **Step 3:** Commit `feat(i): contract domain ports`.

---

### Task 3: Migrace `contracts` + stav `contract_sent`

**Files:**
- Create: `api/migrations/1700000006000_contracts.sql`
- Modify: `api/src/domain/inquiry/inquiry.ts:6` (přidat `'contract_sent'` do `InquiryStatus`)

- [ ] **Step 1:** Vytvořit migraci dle schématu ze specu (tabulka `contracts`, index `contracts_inquiry_id_idx`). Down migration: `DROP TABLE contracts;`.
- [ ] **Step 2:** Rozšířit union: `export type InquiryStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'contract_sent';`
- [ ] **Step 3:** `npm --prefix api run lint` → OK.
- [ ] **Step 4:** Commit `feat(i): contracts table migration and contract_sent status`.

---

### Task 4: Application — `GenerateContractHandler`

**Files:**
- Create: `api/src/application/contract/generate-contract.command.ts`
- Create: `api/src/application/contract/generate-contract.handler.ts`
- Modify: `api/test/fakes/index.ts` (přidat `InMemoryContracts`, `SpyContractRenderer`, `SpyContractNotifier`)
- Test: `api/test/application/generate-contract.handler.spec.ts`

**Interfaces — Consumes:** `Contract`, porty z Task 2, `InquiryRepository`, `Clock`, `idFactory: () => string`.
**Produces:**
```ts
export class GenerateContractCommand {
  constructor(
    readonly inquiryId: string, readonly variant: ContractVariant,
    readonly guestAddress: string, readonly guestIdNumber: string,
    readonly guestBirthDate: string | null, readonly totalPrice: number,
    readonly currency: string, readonly depositAmount: number | null,
    readonly depositDueDate: string | null,
  ) {}
}
```

Handler logika:
1. `inquiry = inquiries.get(inquiryId)`; není-li → `Error('inquiry not found')`.
2. `inquiry.status !== 'confirmed'` → `InquiryNotConfirmedError` (409, nový soubor `api/src/domain/contract/errors/inquiry-not-confirmed.error.ts`).
3. `contracts.existsForInquiry(inquiryId)` → `ContractAlreadySentError` (409, nový soubor).
4. `range = new DateRange(inquiry.range.arrival, arrival + 10 nocí)`.
5. `contract = Contract.create({...})` (invarianty).
6. `pdf = renderer.render(contract)`.
7. `contracts.save(contract, pdf)`; `notifier.sendToGuest(contract, inquiry.email.value, pdf)`; `contracts.markSent(id, now)`.
8. `inquiries.updateStatus(inquiryId, 'contract_sent')`.

- [ ] **Step 1: Napsat failing test** `generate-contract.handler.spec.ts`:
```ts
import { GenerateContractHandler } from '../../src/application/contract/generate-contract.handler';
import { GenerateContractCommand } from '../../src/application/contract/generate-contract.command';
import { SubmitInquiryHandler } from '../../src/application/inquiry/submit-inquiry.handler';
import { SubmitInquiryCommand } from '../../src/application/inquiry/submit-inquiry.command';
import { ConfirmInquiryHandler } from '../../src/application/inquiry/confirm-inquiry.handler';
import { ConfirmInquiryCommand } from '../../src/application/inquiry/confirm-inquiry.command';
import {
  FixedClock, InMemoryAvailability, InMemoryInquiries, SpyNotifier,
  InMemoryContracts, SpyContractRenderer, SpyContractNotifier,
} from '../fakes';
import { InquiryNotConfirmedError } from '../../src/domain/contract/errors/inquiry-not-confirmed.error';

function setup() {
  const availability = new InMemoryAvailability();
  const inquiries = new InMemoryInquiries();
  const contracts = new InMemoryContracts();
  const renderer = new SpyContractRenderer();
  const notifier = new SpyContractNotifier();
  const clock = new FixedClock(new Date('2026-01-01'));
  const submit = new SubmitInquiryHandler(inquiries, availability, new SpyNotifier(), clock, () => 'i1');
  const handler = new GenerateContractHandler(inquiries, contracts, renderer, notifier, clock, () => 'c1');
  return { availability, inquiries, contracts, renderer, notifier, clock, submit, handler };
}
const cmd = (over = {}) => new GenerateContractCommand(
  'i1', 'without-deposit', 'Praha 1', 'OP123', null, 1000, 'EUR', null, null, ...[], // see below
);

describe('GenerateContractHandler', () => {
  it('generates, sends and moves inquiry to contract_sent (10 nights regardless of inquiry length)', async () => {
    const s = setup();
    await s.submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', ''));
    await new ConfirmInquiryHandler(s.inquiries, s.availability).execute(new ConfirmInquiryCommand('i1'));
    await s.handler.execute(new GenerateContractCommand('i1', 'without-deposit', 'Praha 1', 'OP123', null, 1000, 'EUR', null, null));
    const saved = s.contracts.items[0];
    expect(saved.contract.range.nights()).toBe(10);
    expect(s.renderer.rendered).toHaveLength(1);
    expect(s.notifier.sent).toHaveLength(1);
    expect(s.contracts.items[0].sentAt).not.toBeNull();
    expect((await s.inquiries.get('i1'))!.status).toBe('contract_sent');
  });
  it('refuses to generate for a non-confirmed inquiry', async () => {
    const s = setup();
    await s.submit.execute(new SubmitInquiryCommand('Jan', 'jan@x.cz', '2026-05-01', '2026-05-08', ''));
    await expect(s.handler.execute(new GenerateContractCommand('i1', 'without-deposit', 'Praha 1', 'OP123', null, 1000, 'EUR', null, null)))
      .rejects.toBeInstanceOf(InquiryNotConfirmedError);
  });
});
```
- [ ] **Step 2:** Přidat fakes do `test/fakes/index.ts`:
```ts
export class InMemoryContracts implements ContractRepository {
  items: { contract: Contract; pdf: Buffer; sentAt: Date | null }[] = [];
  async save(contract: Contract, pdf: Buffer) { this.items.push({ contract, pdf, sentAt: null }); }
  async markSent(id: string, sentAt: Date) { const it = this.items.find((x) => x.contract.id === id); if (it) it.sentAt = sentAt; }
  async get(id: string) { const it = this.items.find((x) => x.contract.id === id); return it ? { contract: it.contract, pdf: it.pdf } : null; }
  async existsForInquiry(inquiryId: string) { return this.items.some((x) => x.contract.inquiryId === inquiryId); }
}
export class SpyContractRenderer implements ContractPdfRenderer {
  rendered: Contract[] = [];
  async render(c: Contract) { this.rendered.push(c); return Buffer.from('%PDF-fake'); }
}
export class SpyContractNotifier implements ContractNotifier {
  sent: { contract: Contract; email: string }[] = [];
  async sendToGuest(contract: Contract, email: string) { this.sent.push({ contract, email }); }
}
```
- [ ] **Step 3:** Spustit test → FAIL.
- [ ] **Step 4:** Implementovat command, handler, dvě nové chyby (`inquiry-not-confirmed`, `contract-already-sent`).
- [ ] **Step 5:** Spustit test → PASS; `npm --prefix api run lint` → OK.
- [ ] **Step 6:** Commit `feat(i): generate-contract command handler`.

---

### Task 5: Application — `GetContractPdfHandler`

**Files:**
- Create: `api/src/application/contract/get-contract-pdf.query.ts`
- Create: `api/src/application/contract/get-contract-pdf.handler.ts`
- Test: `api/test/application/get-contract-pdf.handler.spec.ts`

**Produces:** `GetContractPdfQuery(readonly id: string)`; handler vrací `Buffer` (nebo `null`).

- [ ] **Step 1:** Failing test: uloží contract do `InMemoryContracts`, query vrátí stejný buffer; neexistující id → `null`.
- [ ] **Step 2:** Spustit → FAIL.
- [ ] **Step 3:** Implementovat query + handler (čte `contracts.get(id)`).
- [ ] **Step 4:** Spustit → PASS; lint OK.
- [ ] **Step 5:** Commit `feat(i): get-contract-pdf query handler`.

---

### Task 6: Infrastructure — pdfmake renderer

**Files:**
- Create: `api/src/infrastructure/pdf/pdfmake-contract-renderer.ts`
- Create: `api/src/infrastructure/pdf/contract-templates.ts` (doc-definition pro obě varianty, **napevno** pronajímatel/byt/řád/sankce)
- Test: `api/test/infrastructure/pdfmake-contract-renderer.spec.ts`

**Interfaces — Consumes:** `Contract`, `ContractPdfRenderer`. **Produces:** `PdfmakeContractRenderer`.

Pozn.: použít `pdfmake/build/pdfmake` + `pdfmake/build/vfs_fonts` (vestavěný Roboto → česká diakritika). Renderer vytvoří `PdfPrinter`-free variantu přes `pdfMake.createPdf(docDef).getBuffer(cb)` zabalené do Promise. Pokud `vfs_fonts` import v Node selže, použít `pdfmake/src/printer` (`PdfPrinter`) s lokálními TTF z Task 0.

- [ ] **Step 1: Failing test:**
```ts
import { PdfmakeContractRenderer } from '../../src/infrastructure/pdf/pdfmake-contract-renderer';
import { Contract } from '../../src/domain/contract/contract';
import { DateRange } from '../../src/domain/shared/date-range';
const make = (variant: 'with-deposit' | 'without-deposit') => Contract.create({
  id: 'c1', inquiryId: 'i1', variant, guestName: 'Jan Novák', guestAddress: 'Praha 1',
  guestIdNumber: 'OP1', guestBirthDate: new Date('1990-01-01'),
  range: new DateRange(new Date('2026-05-01'), new Date('2026-05-11')),
  totalPrice: 1000, currency: 'EUR',
  depositAmount: variant === 'with-deposit' ? 200 : null,
  depositDueDate: variant === 'with-deposit' ? new Date('2026-04-01') : null,
  now: new Date('2026-01-01'),
});
describe('PdfmakeContractRenderer', () => {
  const renderer = new PdfmakeContractRenderer();
  it('renders a with-deposit PDF buffer', async () => {
    const pdf = await renderer.render(make('with-deposit'));
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
  it('renders a without-deposit PDF buffer', async () => {
    const pdf = await renderer.render(make('without-deposit'));
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
```
- [ ] **Step 2:** Spustit → FAIL.
- [ ] **Step 3:** Implementovat `contract-templates.ts` (česká nájemní smlouva — náležitosti temporada/LAU: strany, předmět nájmu, doba 10 nocí + data, nájemné, [se zálohou] záloha + splatnost + vrácení, práva/povinnosti, domovní řád, sankce, podpisy; napevno placeholder pronajímatel/byt s `// TODO`) + `PdfmakeContractRenderer`.
- [ ] **Step 4:** Spustit → PASS; lint OK.
- [ ] **Step 5:** Commit `feat(i): pdfmake czech contract renderer (both variants)`.

---

### Task 7: Infrastructure — pg repozitář + SMTP notifier

**Files:**
- Create: `api/src/infrastructure/persistence/pg-contract.repository.ts`
- Create: `api/src/infrastructure/notify/smtp-contract-notifier.ts`

**Interfaces — Consumes:** `ContractRepository`, `ContractNotifier`, `PG_POOL`. Žádný unit test (integrace ověří e2e).

- [ ] **Step 1:** `PgContractRepository`: `save` (INSERT vč. `pdf` bytea, `generated_at`), `markSent` (UPDATE `sent_at`), `get` (SELECT → `Contract` + `pdf` buffer), `existsForInquiry` (SELECT 1). Mapování řádku → `Contract` (date OID už parsuje pool).
- [ ] **Step 2:** `SmtpContractNotifier`: nodemailer transport (stejná konfigurace jako `SmtpOwnerNotifier`), `sendMail` s přílohou `smlouva.pdf`, `to: guestEmail`, `cc: OWNER_EMAIL`, předmět/tělo česky.
- [ ] **Step 3:** `npm --prefix api run build` → kompiluje; lint OK.
- [ ] **Step 4:** Commit `feat(i): pg contract repository and smtp notifier`.

---

### Task 8: Interface — modul + controller + registrace

**Files:**
- Create: `api/src/interface/contract.module.ts`
- Create: `api/src/interface/http/admin-contract.controller.ts`
- Modify: `api/src/interface/admin.module.ts` (přidat `AdminContractController` do `controllers`)
- Modify: `api/src/app.module.ts` (importovat `ContractModule`)

**ContractModule** providuje: `GenerateContractHandler`, `GetContractPdfHandler`, `pgPoolProvider`, `{ provide: CONTRACT_REPOSITORY, useClass: PgContractRepository }`, renderer, notifier, `{ provide: INQUIRY_REPOSITORY, useClass: PgInquiryRepository }`, `{ provide: CLOCK, useClass: SystemClock }`, `{ provide: 'ID_FACTORY' … }` nebo idFactory přes `randomUUID`. (Vzor: `inquiry.module.ts`.)

**AdminContractController** (`@Controller('admin')`, `@UseGuards(AdminGuard)`):
- `POST reservations/:inquiryId/contract` — body DTO (class-validator) → `GenerateContractCommand`.
- `GET contracts/:id/pdf` — `@Res()` set `Content-Type: application/pdf`, `Content-Disposition: inline; filename="smlouva.pdf"`, pošle buffer; 404 když `null`.

- [ ] **Step 1:** Vytvořit DTO `GenerateContractDto` (validace: variant enum, totalPrice > 0, podmíněně depositAmount).
- [ ] **Step 2:** Vytvořit controller + modul; zapojit do `admin.module.ts` a `app.module.ts`.
- [ ] **Step 3:** `npm --prefix api run build` → OK; lint OK.
- [ ] **Step 4:** Commit `feat(i): contract module, admin controller, app wiring`.

---

### Task 9: E2E test

**Files:**
- Create: `api/test/contract.e2e-spec.ts`

- [ ] **Step 1:** Test (`dbDescribe`, `RUN_DB_INTEGRATION=1`): login (získat token) → POST inquiry → confirm → `POST /api/admin/reservations/:id/contract` (200/201) → `GET /api/admin/contracts/:id/pdf` vrátí `application/pdf` a `%PDF`. Cleanup `DELETE FROM contracts; inquiries; calendar_blocks`.
- [ ] **Step 2:** `RUN_DB_INTEGRATION=1 DATABASE_URL=… npm --prefix api run test:e2e -- contract` (proti běžící db v worktree, port 5442) → PASS.
- [ ] **Step 3:** Commit `test(i): contract e2e (generate + download)`.

---

### Task 10: Web — admin UI

**Files:**
- Modify: `web/lib/api.ts` (přidat `generateContract(token, inquiryId, payload)`, `contractPdfUrl(id)`)
- Modify: `web/app/admin/page.tsx` (tlačítko „Smlouva" u confirmed řádku + modal formulář; badge pro `contract_sent`)

- [ ] **Step 1:** `lib/api.ts`: `generateContract` (POST s Bearer, vrací `{id}`), `contractPdfUrl(id)` → `${BASE}/admin/contracts/${id}/pdf`.
- [ ] **Step 2:** Přidat do `STATUS` mapy `contract_sent: { label: 'Smlouva odeslána', cls: 'bg-sky-100 text-sky-800' }` a do `FILTERS`.
- [ ] **Step 3:** Modal s poli: adresa, číslo OP/pasu, datum narození, celková cena, varianta (radio), [se zálohou] částka + splatnost. Příjezd z rezervace, odjezd = příjezd+10 (read-only). Submit → `generateContract` → po úspěchu refetch + odkaz na PDF.
- [ ] **Step 4:** `npm --prefix web run build` → OK (typy).
- [ ] **Step 5:** Commit `feat(i): admin UI for generating and downloading contracts`.

---

### Task 11: Manuální ověření + README + PR

**Files:**
- Modify: `README.md:102` (`- [ ]` → `- [x]` pro I)

- [ ] **Step 1:** `docker compose up --build` v worktree; v `/admin` (port 3140) potvrdit rezervaci, vygenerovat smlouvu, zkontrolovat e-mail v mailpit (8126), stáhnout PDF (čeština OK).
- [ ] **Step 2:** Plný test suite: `npm --prefix api test` + `RUN_DB_INTEGRATION=1 npm --prefix api run test:e2e`.
- [ ] **Step 3:** Označit README TODO I jako hotové; commit `docs: mark TODO I done`.
- [ ] **Step 4:** Push větve + `gh pr create` proti `main` (NIKDY merge).

## Self-Review (proti specu)

- Datový model `contracts` → Task 3 ✔
- Stav `contract_sent` → Task 3 (doména) + Task 10 (UI) ✔
- Invariant 10 nocí + varianta/záloha → Task 1 ✔
- Dvě šablony → Task 6 ✔
- pdfmake/diakritika → Task 0/6 ✔
- Trigger ručně + gate confirmed/already-sent → Task 4 ✔
- E-mail host+kopie → Task 7 ✔
- Endpointy POST/GET + AdminGuard → Task 8 ✔
- UI formulář → Task 10 ✔
- Testy doména/app/infra/e2e → Task 1/4/5/6/9 ✔
- Napevno pronajímatel/byt → Task 6 ✔
