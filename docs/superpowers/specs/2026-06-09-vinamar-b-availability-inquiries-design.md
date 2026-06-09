# Sub-project B — Availability & Inquiries

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Parent:** [System Architecture & Decomposition](./2026-06-09-vinamar-system-architecture-design.md)
**Depends on:** A (Foundation & Showcase)

## 1. Goal

Let guests see which dates are free and submit a booking inquiry; let the owner manage availability and act on inquiries. No online payment — inquiries are confirmed/declined manually, and confirmation blocks the dates.

## 2. Key decisions

| Topic | Decision |
|---|---|
| Availability model | **Open by default.** All future dates bookable unless covered by a block. Owner creates blocks for personal use/maintenance; confirming an inquiry creates a `booked` block automatically. |
| Minimum stay | **7 nights**, check-in to check-out. Inquiry departure must be ≥ 7 nights after arrival. |
| Inquiry fields | **Minimal:** name, email, arrival, departure, message. |
| Admin auth | **Single admin**, credentials from env, JWT bearer token. No user management. |
| Notifications | Email to the owner on each new inquiry, via SMTP (nodemailer); `mailhog` captures mail in dev. |

## 3. Domain model

- **`DateRange`** (value object): `arrival`, `departure` (departure exclusive). `nights()`; throws if departure ≤ arrival. `overlaps(other)`.
- **`EmailAddress`** (value object): validated email.
- **`CalendarBlock`** (entity): `id`, `range: DateRange`, `reason: 'blocked' | 'booked'`, `createdAt`. `blocked` = owner manual; `booked` = created by confirming an inquiry.
- **`Inquiry`** (entity): `id`, `guestName`, `email: EmailAddress`, `range: DateRange`, `message`, `status: 'pending' | 'confirmed' | 'declined'`, `createdAt`.
- **Domain rules:**
  - Inquiry `range.nights() >= 7` else `MinimumStayNotMetError`.
  - Inquiry `arrival` must be in the future (`Clock` injected) else `ArrivalInPastError`.
  - Submitting over an existing block → `DatesUnavailableError`.
  - Confirming an inquiry whose dates were blocked since submission → `DatesUnavailableError`.
- **Ports:** `AvailabilityRepository` (list blocks in window, save block, delete block, find overlapping block), `InquiryRepository` (save, get, list, updateStatus), `OwnerNotifier` (`inquiryReceived(inquiry)`), `Clock` (`now()`).

## 4. Application handlers (CQRS-lite)

- `SubmitInquiry` (command): build `DateRange` → enforce rules → check no overlap → persist `pending` → `OwnerNotifier.inquiryReceived`.
- `ConfirmInquiry` (command): re-check overlap → set `confirmed` → create `booked` block for the range.
- `DeclineInquiry` (command): set `declined`.
- `BlockDates` / `UnblockDates` (commands): owner manual block create/delete.
- `GetAvailability` (query): blocks intersecting `[from, to]` → public calendar.
- `ListInquiries` (query, admin): inquiries, newest first.

## 5. Infrastructure

- **Migrations** (`node-pg-migrate`, raw SQL):
  - `calendar_blocks(id uuid pk default gen_random_uuid(), start_date date, end_date date, reason text, created_at timestamptz default now())`
  - `inquiries(id uuid pk default gen_random_uuid(), guest_name text, email text, arrival date, departure date, message text, status text default 'pending', created_at timestamptz default now())`
- **Raw-SQL repositories** implementing the ports.
- **`SmtpOwnerNotifier`**: nodemailer transport from `SMTP_*` env; sends to `OWNER_EMAIL`.
- **`SystemClock`**: wraps `new Date()`.
- **Auth**: `POST /api/admin/login` checks `ADMIN_USERNAME`/`ADMIN_PASSWORD` (constant-time compare), returns a JWT signed with `JWT_SECRET`. `AdminGuard` validates the bearer token on `/api/admin/*`.

## 6. Interface (HTTP)

Public:
- `GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ blocks: [{ start, end }] }`
- `POST /api/inquiries` → body `{ guestName, email, arrival, departure, message }` → 201 or problem-detail

Admin (bearer):
- `POST /api/admin/login` → `{ token }`
- `GET /api/admin/inquiries`
- `POST /api/admin/inquiries/:id/confirm`
- `POST /api/admin/inquiries/:id/decline`
- `GET /api/admin/blocks` · `POST /api/admin/blocks` · `DELETE /api/admin/blocks/:id`

## 7. Frontend

- **`/rezervace`** (enable the previously-disabled nav link): client island with an availability calendar (free vs unavailable), 7-night-minimum range selection, and the inquiry form posting to the API. Success + error (e.g. dates unavailable) states.
- **`/admin/login`** and **`/admin`**: token stored client-side; inquiries list with confirm/decline; a block-management calendar (add/remove blocks). Admin pages are client-rendered and excluded from SEO (`robots: noindex`).
- TanStack Query for all API calls; availability fetched fresh (not statically generated).

## 8. Containers / config

- Add `mailhog` to docker-compose (`MailHog`, SMTP 1025 / UI 8025).
- New env: `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `OWNER_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`.

## 9. Testing

- **Domain:** `DateRange.nights/overlaps`, minimum-stay rule, past-arrival rule (TDD).
- **Application:** `SubmitInquiry` (happy + each rejection) and `ConfirmInquiry` (creates block, re-checks overlap) against in-memory fakes + fake notifier + fixed clock.
- **Infrastructure:** repositories against test PostgreSQL; notifier against a captured transport.
- **E2E:** submit inquiry (201 + mail captured), submit over a block (problem-detail), admin login + confirm flips status and blocks dates.
- **Playwright:** guest picks dates on `/rezervace` and submits; admin logs in and confirms an inquiry.

## 10. Acceptance criteria

1. `GET /api/availability` returns blocks; owner blocks hide dates publicly.
2. `POST /api/inquiries` rejects < 7 nights, past arrival, and overlapping dates with problem-details; accepts valid ones and emails the owner (visible in MailHog).
3. Admin login issues a JWT; `/api/admin/*` rejects missing/invalid tokens.
4. Confirming an inquiry sets `confirmed` and makes those dates unavailable; declining sets `declined`.
5. `/rezervace` lets a guest pick a ≥7-night range and submit; `/admin` lets the owner confirm/decline and manage blocks.
6. All tests pass; domain dependency rule still holds.

## 11. Out of scope

Payments, guest accounts, multi-unit, iCal sync (Airbnb/Booking), automated pricing — later or never per system spec.
