# Todo R — Admin Contact Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow editing guest name/email/phone of an inquiry in admin, reflected in both Poptávky and Rezervace.

**Architecture:** Name/email/phone live only on `inquiries`. One `PATCH /admin/inquiries/:id/contact` endpoint + a domain method + repo `updateContact`. Frontend reuses the shared `GuestCell` with an inline edit mode, wired in both admin sections.

**Tech Stack:** NestJS + @nestjs/cqrs + raw `pg` (API), Next.js + Tailwind (web), Jest.

## Global Constraints

- API base path prefix: `/api` (set via `setGlobalPrefix`).
- Repos use direct SQL; no flush/load-save (mirror `updateStatus`). `save` is INSERT-only.
- DTO validation via `class-validator` (mirror `CreateInquiryDto`).
- Admin routes guarded by `AdminGuard`.
- e2e specs run only under `RUN_DB_INTEGRATION=1`.
- Czech UI copy. No Co-Authored-By in commits.

---

### Task 1: Domain + repository + command handler (backend logic)

**Files:**
- Modify: `api/src/domain/inquiry/inquiry.ts`
- Modify: `api/src/domain/inquiry/inquiry.repository.port.ts`
- Create: `api/src/application/inquiry/update-inquiry-contact.command.ts`
- Create: `api/src/application/inquiry/update-inquiry-contact.handler.ts`
- Modify: `api/test/fakes/index.ts` (add `updateContact` to `InMemoryInquiries`)
- Test: `api/test/application/update-inquiry-contact.handler.spec.ts`

**Interfaces:**
- Produces: `UpdateInquiryContactCommand(id: string, guestName: string, email: string, phone: string)`; `InquiryRepository.updateContact(id, guestName, email, phone): Promise<void>`; `Inquiry.withContact({guestName, email, phone}): Inquiry`.

- [ ] **Step 1: Write the failing handler test**

```ts
// api/test/application/update-inquiry-contact.handler.spec.ts
import { UpdateInquiryContactHandler } from '../../src/application/inquiry/update-inquiry-contact.handler';
import { UpdateInquiryContactCommand } from '../../src/application/inquiry/update-inquiry-contact.command';
import { Inquiry } from '../../src/domain/inquiry/inquiry';
import { EmailAddress } from '../../src/domain/shared/email-address';
import { DateRange } from '../../src/domain/shared/date-range';
import { InMemoryInquiries } from '../fakes';

const seed = (inquiries: InMemoryInquiries) =>
  inquiries.items.push(
    new Inquiry(
      'id-1', 'Jan', new EmailAddress('jan@x.cz'), '+420111',
      new DateRange(new Date('2026-05-01'), new Date('2026-05-08')),
      'ahoj', 'confirmed', new Date('2026-01-01'),
    ),
  );

describe('UpdateInquiryContactHandler', () => {
  it('updates guest name, email and phone', async () => {
    const inquiries = new InMemoryInquiries();
    seed(inquiries);
    const handler = new UpdateInquiryContactHandler(inquiries);
    await handler.execute(new UpdateInquiryContactCommand('id-1', 'Jana', 'jana@x.cz', '+420222'));
    const updated = await inquiries.get('id-1');
    expect(updated!.guestName).toBe('Jana');
    expect(updated!.email.value).toBe('jana@x.cz');
    expect(updated!.phone).toBe('+420222');
    expect(updated!.status).toBe('confirmed');
  });

  it('throws when the inquiry does not exist', async () => {
    const handler = new UpdateInquiryContactHandler(new InMemoryInquiries());
    await expect(
      handler.execute(new UpdateInquiryContactCommand('missing', 'X', 'x@x.cz', '')),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd api && npx jest test/application/update-inquiry-contact.handler.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Add `withContact` to `Inquiry`** (after `createByAdmin`)

```ts
  withContact(params: { guestName: string; email: EmailAddress; phone: string }): Inquiry {
    return new Inquiry(
      this.id, params.guestName, params.email, params.phone,
      this.range, this.message, this.status, this.createdAt,
    );
  }
```

- [ ] **Step 4: Add `updateContact` to the repo port**

```ts
// inquiry.repository.port.ts — add to interface
  updateContact(id: string, guestName: string, email: string, phone: string): Promise<void>;
```

- [ ] **Step 5: Add `updateContact` to `InMemoryInquiries` fake**

```ts
  async updateContact(id: string, guestName: string, email: string, phone: string): Promise<void> {
    this.items = this.items.map((i) =>
      i.id === id
        ? i.withContact({ guestName, email: new EmailAddress(email), phone })
        : i,
    );
  }
```
(Add `import { EmailAddress } from '../../src/domain/shared/email-address';` if not present.)

- [ ] **Step 6: Create the command**

```ts
// api/src/application/inquiry/update-inquiry-contact.command.ts
export class UpdateInquiryContactCommand {
  constructor(
    public readonly id: string,
    public readonly guestName: string,
    public readonly email: string,
    public readonly phone: string,
  ) {}
}
```

- [ ] **Step 7: Create the handler**

```ts
// api/src/application/inquiry/update-inquiry-contact.handler.ts
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateInquiryContactCommand } from './update-inquiry-contact.command';
import { INQUIRY_REPOSITORY, InquiryRepository } from '../../domain/inquiry/inquiry.repository.port';

@CommandHandler(UpdateInquiryContactCommand)
export class UpdateInquiryContactHandler implements ICommandHandler<UpdateInquiryContactCommand> {
  constructor(@Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository) {}

  async execute(cmd: UpdateInquiryContactCommand): Promise<void> {
    const inquiry = await this.inquiries.get(cmd.id);
    if (!inquiry) {
      throw new Error('inquiry not found');
    }
    await this.inquiries.updateContact(cmd.id, cmd.guestName, cmd.email, cmd.phone);
  }
}
```

- [ ] **Step 8: Implement `updateContact` in `PgInquiryRepository`**

```ts
  async updateContact(id: string, guestName: string, email: string, phone: string): Promise<void> {
    await this.pool.query(
      `UPDATE inquiries SET guest_name = $2, email = $3, phone = $4 WHERE id = $1`,
      [id, guestName, email, phone],
    );
  }
```

- [ ] **Step 9: Run test, verify it passes**

Run: `cd api && npx jest test/application/update-inquiry-contact.handler.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add api/src/domain/inquiry api/src/application/inquiry/update-inquiry-contact.* api/src/infrastructure/persistence/pg-inquiry.repository.ts api/test
git commit -m "feat(api): update-inquiry-contact command, handler and repo method"
```

---

### Task 2: HTTP endpoint + DTO + e2e

**Files:**
- Modify: `api/src/interface/http/admin-inquiry.controller.ts`
- Modify: `api/src/interface/inquiry.module.ts` (register `UpdateInquiryContactHandler`)
- Test: `api/test/inquiry.e2e-spec.ts`

**Interfaces:**
- Consumes: `UpdateInquiryContactCommand` from Task 1.
- Produces: `PATCH /api/admin/inquiries/:id/contact` accepting `{ guestName, email, phone }`.

- [ ] **Step 1: Add e2e tests** (inside the existing `dbDescribe` block in `inquiry.e2e-spec.ts`)

```ts
  it('admin edits guest contact and it is reflected in the list', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({ guestName: 'Jan', email: 'jan@x.cz', arrival: future(40), departure: future(47), message: '' });
    expect(create.status).toBe(201);
    const { rows } = await pool.query('SELECT id FROM inquiries ORDER BY created_at DESC LIMIT 1');
    const id = rows[0].id;

    const patch = await request(app.getHttpServer())
      .patch(`/api/admin/inquiries/${id}/contact`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ guestName: 'Jana', email: 'jana@x.cz', phone: '+420222' });
    expect(patch.status).toBe(200);

    const after = await pool.query('SELECT guest_name, email, phone FROM inquiries WHERE id = $1', [id]);
    expect(after.rows[0]).toMatchObject({ guest_name: 'Jana', email: 'jana@x.cz', phone: '+420222' });
  });

  it('rejects an invalid email with 400', async () => {
    const { rows } = await pool.query('SELECT id FROM inquiries LIMIT 1');
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/inquiries/${rows[0].id}/contact`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ guestName: 'X', email: 'not-an-email', phone: '' });
    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated contact edit with 401', async () => {
    const { rows } = await pool.query('SELECT id FROM inquiries LIMIT 1');
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/inquiries/${rows[0].id}/contact`)
      .send({ guestName: 'X', email: 'x@x.cz', phone: '' });
    expect(res.status).toBe(401);
  });
```

`adminToken()` helper — add near the top of the spec if not present (mirror `auth.e2e-spec.ts` token minting):

```ts
import { JwtService } from '@nestjs/jwt';
const adminToken = () =>
  new JwtService().sign({ sub: 'owner' }, { secret: process.env.JWT_SECRET ?? 'change-me' });
```
> Verify the exact claim/secret against `admin.guard.ts` before finalizing; match its `verify` call.

- [ ] **Step 2: Run e2e, verify the new ones fail**

Run: `cd api && RUN_DB_INTEGRATION=1 DATABASE_URL=postgres://vinamar:vinamar@localhost:5532/vinamar npx jest --config test/jest-e2e.json test/inquiry.e2e-spec.ts`
Expected: the 3 new tests FAIL (404/route missing), existing ones PASS.

- [ ] **Step 3: Add the DTO + route to `AdminInquiryController`**

```ts
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { UpdateInquiryContactCommand } from '../../application/inquiry/update-inquiry-contact.command';

class UpdateContactDto {
  @IsString() guestName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone = '';
}
// ... inside the class:
  @Patch(':id/contact')
  updateContact(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.commandBus.execute(
      new UpdateInquiryContactCommand(id, dto.guestName, dto.email, dto.phone),
    );
  }
```

- [ ] **Step 4: Register the handler in `InquiryModule`**

Add `UpdateInquiryContactHandler` to the `providers` array (and its import). Do NOT add it to AdminModule.

- [ ] **Step 5: Run e2e, verify all pass**

Run: `cd api && RUN_DB_INTEGRATION=1 DATABASE_URL=postgres://vinamar:vinamar@localhost:5532/vinamar npx jest --config test/jest-e2e.json test/inquiry.e2e-spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/src/interface api/test/inquiry.e2e-spec.ts
git commit -m "feat(api): PATCH /admin/inquiries/:id/contact endpoint"
```

---

### Task 3: Frontend inline edit in shared GuestCell

**Files:**
- Modify: `web/lib/api.ts` (add `updateInquiryContact`)
- Modify: `web/app/admin/page.tsx` (`GuestCell` edit mode + wiring)

**Interfaces:**
- Consumes: `PATCH /admin/inquiries/:id/contact` from Task 2.
- Produces: `updateInquiryContact(token, id, { guestName, email, phone })`.

- [ ] **Step 1: Add the API helper to `web/lib/api.ts`**

```ts
export async function updateInquiryContact(
  token: string,
  id: string,
  data: { guestName: string; email: string; phone: string },
): Promise<boolean> {
  const res = await fetch(`${BASE}/admin/inquiries/${id}/contact`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('update failed');
  return true;
}
```
> Match `BASE`/error handling to the existing helpers in the file (e.g. `cancelCalendarEntry`).

- [ ] **Step 2: Give `GuestCell` an inline edit mode**

Add props `inquiryId?: string | null` and `onSave?: (data: {guestName: string; email: string; phone: string}) => Promise<void>`. When both are present, render an **Upravit** button (pencil); clicking switches the cell to three inputs (jméno/e-mail/telefon) with **Uložit** / **Zrušit**. On Uložit call `onSave`, then exit edit mode. Hide the button when `inquiryId` is null/absent.

```tsx
function GuestCell({
  name, email, phone, message, inquiryId, onSave,
}: {
  name: string | null; email: string | null; phone: string | null; message: string | null;
  inquiryId?: string | null;
  onSave?: (data: { guestName: string; email: string; phone: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ guestName: name ?? '', email: email ?? '', phone: phone ?? '' });
  const [saving, setSaving] = useState(false);
  const canEdit = !!inquiryId && !!onSave;

  if (editing) {
    const input = 'w-full rounded-lg border border-ink/20 px-2 py-1 text-sm';
    return (
      <div className="min-w-0 space-y-1.5">
        <input className={input} value={form.guestName} placeholder="Jméno"
          onChange={(e) => setForm({ ...form, guestName: e.target.value })} />
        <input className={input} value={form.email} placeholder="E-mail" type="email"
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={input} value={form.phone} placeholder="Telefon"
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="flex gap-2 pt-1">
          <button disabled={saving} className={BTN_PRIMARY}
            onClick={async () => {
              setSaving(true);
              try { await onSave!(form); setEditing(false); } finally { setSaving(false); }
            }}>Uložit</button>
          <button className={BTN_NEUTRAL} onClick={() => { setForm({ guestName: name ?? '', email: email ?? '', phone: phone ?? '' }); setEditing(false); }}>Zrušit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="font-medium text-ink">{name}</div>
      {email && <div className="break-words text-ink/55">{email}</div>}
      {phone && <div className="text-ink/55">{phone}</div>}
      <Comment text={message} />
      {canEdit && (
        <button onClick={() => setEditing(true)}
          className="mt-1 text-xs font-medium text-sea hover:underline">Upravit</button>
      )}
    </div>
  );
}
```
> `BTN_PRIMARY`/`BTN_NEUTRAL` already exist in the file. If `useState` isn't imported, it is (line 2).

- [ ] **Step 3: Wire an `editContact` handler + pass props in both sections**

In `AdminDashboard`, add:

```tsx
  async function editContact(inquiryId: string, data: { guestName: string; email: string; phone: string }) {
    if (!token) return;
    try {
      await updateInquiryContact(token, inquiryId, data);
      reload(token);
    } catch {
      adminLogout();
    }
  }
```
Import `updateInquiryContact` from `@/lib/api`.

Then pass to every `GuestCell` (4 usages — Rezervace desktop+mobile, Poptávky desktop+mobile):
- Rezervace: `inquiryId={e.inquiryId}` `onSave={(d) => editContact(e.inquiryId!, d)}`
- Poptávky: `inquiryId={r.id}` `onSave={(d) => editContact(r.id, d)}`

- [ ] **Step 4: Typecheck / build the web app**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check** (optional, if Docker up)

Open admin at `http://localhost:3100/admin`, edit a guest in Poptávky and in Rezervace; confirm both reflect the change after save; confirm no Upravit on a manual block.

- [ ] **Step 6: Commit**

```bash
git add web/lib/api.ts web/app/admin/page.tsx
git commit -m "feat(web): inline edit of guest contact in admin (both sections)"
```

---

### Task 4: Mark README todo R done

- [ ] **Step 1:** In `README.md`, change `- [ ] R - Editace...` to `- [x] R - Editace...`.
- [ ] **Step 2:** Commit: `git add README.md && git commit -m "docs: mark todo R done"`

---

## Self-Review

- **Spec coverage:** backend method/repo/command/endpoint (Tasks 1–2), both-section inline edit hidden on null inquiry (Task 3), validation via DTO (Task 2 Step 3), editable-all-statuses (no status guard in handler — Task 1), tests (Tasks 1–2), README (Task 4). ✔
- **Placeholders:** none — all code shown. The two `>` notes are verification reminders against existing code, not deferred work.
- **Type consistency:** `updateContact(id, guestName, email, phone)` and `withContact({guestName, email, phone})` consistent across port/fake/pg/handler. `UpdateInquiryContactCommand(id, guestName, email, phone)` consistent across command/handler/controller.
