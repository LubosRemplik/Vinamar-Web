# Admin – správa rezervací

Spec: rozšíření administrace o odhlášení, admin rezervace přes veřejný tok a jednotný
seznam položek kalendáře s možností zrušení.

## Kontext (současný stav)

- **`calendar_blocks`** (`id`, `start_date`, `end_date`, `reason ∈ {'blocked','booked'}`,
  `created_at`) je jediný zdroj obsazenosti. **Není** propojený s `inquiries`.
- **`inquiries`** (`status ∈ {'pending','confirmed','declined'}`) – poptávky hostů.
- Pravidla pobytu se vynucují na dvou místech:
  - **Klient** `web/components/CalendarWall.tsx` → `departureProblem`: min. 7 nocí,
    overlap, orphan-gap.
  - **Server** `submit-inquiry.handler`: min. 7 nocí + příjezd v minulosti
    (doména `Inquiry.create`), orphan-gap (handler), overlap.
- Admin už existuje: `POST /admin/login` (JWT, jediný owner účet), `AdminGuard`,
  `admin/inquiries` (list/confirm/decline – confirm uloží `booked`), `admin/blocks`
  (list/block/unblock). Frontend: `/admin/login`, `/admin` (tabulka poptávek).

## Cíle

1. **Odhlášení** z administrace + automatické odhlášení při vypršení tokenu.
2. **Admin rezervace za zákazníka** přes existující veřejný tok „volné termíny“ –
   přihlášenému adminovi neplatí pravidla pobytu **kromě obsazenosti termínu**.
3. **Jednotný seznam položek kalendáře** v adminu (rezervace i bloky) s možností
   každou položku **zrušit** (uvolnit termín).

Mimo rozsah: nový formulář ani kalendář v adminu pro zadání rezervace (admin používá
veřejnou stránku); správa obsahu webu; vícero admin účtů.

## Návrh

### 1. Odhlášení

- Čistě frontend. Hlavička `/admin` dostane tlačítko **Odhlásit** → smaže
  `vinamar_admin_token` z `localStorage` a přesměruje na `/admin/login`.
- Sjednotit ošetření `401`: jakékoli admin volání, které vrátí `401`, vede k odhlášení
  (smazání tokenu + redirect na login). Dnes to dělá jen dashboard.

### 2. Admin rezervace přes veřejný tok

**Detekce admina (klient):** `CalendarWall` po mountu přečte `vinamar_admin_token`
z `localStorage` → stav `isAdmin`.

**Klientská validace (`CalendarWall`):** je-li `isAdmin`, `departureProblem` přeskočí
min. noci, orphan-gap i příjezd v minulosti; **overlap a „odjezd po příjezdu“ zůstávají**.
Zobrazí nenápadný pruh: „Režim správce — pravidla pobytu se neuplatní.“

**Odeslání (`BookingForm` / `lib/api submitInquiry`):** je-li admin, přidá hlavičku
`Authorization: Bearer <token>`.

**Server (`POST /inquiries`, `InquiryController`):** volitelně přečte bearer token;
je-li platný admin JWT (ověřeno stejně jako `AdminGuard`), předá `isAdmin = true` do
`SubmitInquiryCommand`. Bez tokenu / s neplatným tokenem = běžný veřejný režim.

**Handler (`SubmitInquiryHandler`):** je-li `isAdmin`:
- poptávka se vytvoří přes `Inquiry.createByAdmin(...)` – přeskočí min-stay
  i arrival-in-past,
- přeskočí se orphan-gap kontrola,
- **overlap se vynutí** (jediné platné pravidlo),
- poptávka se uloží rovnou jako `confirmed` a okamžitě vznikne `booked` řádek
  v `calendar_blocks` s vazbou `inquiry_id` (varianta **A** – rezervace v jednom kroku).

Doménová změna: `Inquiry.create` ponechán; přidán `Inquiry.createByAdmin(params)`,
který vynechá `MinimumStayNotMetError` a `ArrivalInPastError`, jinak shodný. Tím zůstává
pravidlo explicitní v doméně.

### 3. Propojení + jednotný seznam s rušením

**Migrace** (nová `*_calendar-block-inquiry-link.sql`): do `calendar_blocks` přidat
- `note text NULL` – popis u ručních bloků,
- `inquiry_id uuid NULL REFERENCES inquiries(id)` – vazba na poptávku u rezervací.

**Stav poptávky:** rozšířit `InquiryStatus` o `'cancelled'`.

**Zápis vazby:** `confirm-inquiry.handler` a admin rezervace (bod 2) uloží `booked`
řádek s `inquiry_id`. Rozšířit `AvailabilityRepository.save` o volitelné `inquiryId`
a `note` (resp. dedikovanou metodu) – viz „Rozhraní“.

**Čtení (`GET /admin/calendar`):** vrátí všechny `calendar_blocks` (booked i blocked),
seřazené dle `start_date`. U booked přijoinuje z `inquiries` jméno/e-mail/telefon;
u blocked vrátí `note`. Tvar položky:
```
{ id, start, end, reason, note, guestName?, email?, phone?, inquiryId? }
```

**Rušení (`DELETE /admin/calendar/:id`):** smaže řádek `calendar_blocks` (uvolní termín);
má-li `inquiry_id`, nastaví danou poptávku na `cancelled`. Obě operace v rámci jedné
transakce (middleware) – buď obojí, nebo nic.

**Frontend `/admin`:** pod stávající sekcí „Poptávky“ přidat sekci
**„Kalendář — rezervace a bloky“** se seznamem z `GET /admin/calendar`; u každé položky
tlačítko **Zrušit** (`DELETE /admin/calendar/:id`) s potvrzením, po akci refresh.

## Rozhraní (porty a kontrakty)

- **`AvailabilityRepository`**: `save(range, reason, opts?: { inquiryId?, note? })` →
  uloží i `inquiry_id` / `note`. (Zpětně kompatibilní – `opts` volitelné.)
  `listBetween` ponechán; pro admin seznam přidat metodu vracející i `note`/`inquiry_id`,
  nebo rozšířit `CalendarBlock` o tato pole.
- **`CalendarBlock`** (doména): doplnit `note?: string | null` a `inquiryId?: string | null`.
- **`InquiryRepository`**: `updateStatus` už existuje (přijme `'cancelled'`).
- **Nové application prvky:** `ListCalendarQuery` + handler (join inquiries),
  `CancelCalendarEntryCommand` + handler (delete + případný `updateStatus('cancelled')`).
- **Nový/rozšířený controller:** `AdminCalendarController` (`GET /admin/calendar`,
  `DELETE /admin/calendar/:id`, `@UseGuards(AdminGuard)`). Lze sloučit do
  `AdminBlockController` nebo zavést samostatný – preferován samostatný kvůli SRP.

## Ošetření chyb

- `POST /inquiries` s neplatným/expirovaným tokenem → tiše spadne do veřejného režimu
  (token se neověří → `isAdmin = false`). Nehází 401, aby běžný host nikdy nedostal chybu.
- `DELETE /admin/calendar/:id` na neexistující id → 404 (doménová chyba přes
  `ProblemDetailFilter`).
- Overlap u admin rezervace → `DatesUnavailableError` (RFC-7807) jako dnes.
- Zrušení rezervace + revert poptávky musí být atomické (transakční middleware).

## Testy

- **api (unit/doména):** `Inquiry.createByAdmin` vynechá min-stay a arrival-in-past;
  `Inquiry.create` je beze změny.
- **api (handlery):** `SubmitInquiryHandler` v admin režimu přeskočí min-stay/gap,
  ale vynutí overlap a uloží `confirmed` + `booked` s `inquiry_id`;
  `CancelCalendarEntryHandler` smaže řádek a u rezervace nastaví `cancelled`.
- **api (e2e):** `POST /inquiries` s admin tokenem → 201 + záznam je `confirmed`/`booked`;
  bez tokenu krátký pobyt → chyba pravidla; `GET /admin/calendar` vrací booked i blocked;
  `DELETE` uvolní termín a překlopí poptávku.
- **web (e2e):** admin přihlášen → na `/volne-terminy` lze vybrat krátký termín a odeslat;
  `/admin` zobrazí položku a umožní ji zrušit; tlačítko Odhlásit funguje.

## Migrace / kompatibilita

- Nové sloupce jsou nullable → existující řádky a kód beze změny.
- `submit-inquiry` bez tokenu se chová identicky jako dnes.
- `AvailabilityRepository.save` rozšířen zpětně kompatibilně.
