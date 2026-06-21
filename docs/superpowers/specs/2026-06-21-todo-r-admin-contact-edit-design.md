# Todo R — Editace údajů hosta v administraci

## Cíl

Umožnit v administraci upravit kontaktní údaje hosta — **jméno, e-mail, telefon** — u poptávek i u rezervací.

## Klíčové zjištění (datový model)

- Jméno/e-mail/telefon žijí **pouze v tabulce `inquiries`**.
- Sekce **Poptávky** = přímý seznam `inquiries`.
- Sekce **Rezervace** = `calendar_blocks LEFT JOIN inquiries` (`calendar_blocks.inquiry_id`).

Důsledek: editace cílí vždy na jeden `inquiry` záznam a změna se automaticky promítne do obou sekcí. **Jeden zdroj pravdy, jeden endpoint.**

## Rozsah

**V rozsahu:** úprava `guestName`, `email`, `phone` jednoho `inquiry`.

**Mimo rozsah (YAGNI):** termín (`arrival`/`departure`), zpráva (`message`), stav (`status`). Termín zasahuje do availability invariantů — neřešíme.

## Backend (API, NestJS + raw `pg`)

### Doména
`Inquiry.withContact({ guestName, email, phone })` → vrací novou instanci se zachovaným `range`/`status`/`createdAt`. **Nepouští** `create()` invarianty (min. nocí, arrival v minulosti) — kontaktní úprava je nemá vyvolávat.

### Repozitář
`InquiryRepository.updateContact(id, guestName, email, phone)` → přímý `UPDATE inquiries SET guest_name=$2, email=$3, phone=$4 WHERE id=$1` (stejný vzor jako `updateStatus`, žádný flush/load-save; `save` je INSERT-only).

### Command + handler
`UpdateInquiryContactCommand(id, guestName, email, phone)` → handler ověří existenci (`get`, jinak chyba → 404), zavolá `updateContact`.

### Endpoint
`PATCH /admin/inquiries/:id/contact` v `AdminInquiryController`, `@UseGuards(AdminGuard)`.

DTO (`class-validator`, jako `CreateInquiryDto`):
- `@IsString() guestName` — povinné, neprázdné
- `@IsEmail() email` — povinné, platný formát (validace na hranici → generický throw z `EmailAddress` nikdy neskončí jako 500)
- `@IsOptional() @IsString() phone = ''` — volitelné

### Editovatelné stavy
Všechny stavy (vč. `declined`/`cancelled`) — neškodné a nejjednodušší.

## Frontend (web, Next.js)

### `GuestCell` (sdílený komponent)
Dostane volitelné `inquiryId: string | null` a `onSaved` callback:
- `inquiryId` přítomné → tlačítko **Upravit** (ikona tužky), které přepne buňku na inline formulář (3 pole + Uložit/Zrušit).
- `inquiryId === null` (manuální calendar blok bez poptávky) → tlačítko se nezobrazí.

Jedno místo → inline editace funguje v desktop tabulce i mobilních kartách, v obou sekcích.

### Napojení v `admin/page.tsx`
- **Poptávky**: `inquiryId={r.id}`.
- **Rezervace**: `inquiryId={e.inquiryId}`.
- `onSaved` → existující `reload(token)`.

### `web/lib/api.ts`
`updateInquiryContact(token, id, { guestName, email, phone })` → `PATCH /admin/inquiries/:id/contact`.

## Validace

| Pole | Pravidlo |
|------|----------|
| jméno | povinné, neprázdné (trim) |
| e-mail | povinný, platný formát |
| telefon | volitelný (smí být prázdný) |

## Testy

- **API unit** (`test/application/update-inquiry-contact.handler.spec.ts`): úspěšná úprava; neexistující id → chyba.
- **API e2e** (rozšíření `test/inquiry.e2e-spec.ts`, běží v CI při `RUN_DB_INTEGRATION=1`): PATCH změní údaje a projeví se v listu; nevalidní e-mail → 400; bez admin tokenu → 401.
- **Web**: ruční ověření inline editace v obou sekcích a obou layoutech (desktop tabulka / mobil karty).

## Hotovo, když

- [ ] PATCH endpoint funguje, chráněný `AdminGuard`, validuje vstup
- [ ] Inline editace v Poptávkách i Rezervacích (skrytá u bloků bez poptávky)
- [ ] Změna se projeví v obou sekcích po uložení
- [ ] Unit + e2e testy procházejí
- [ ] README todo R označeno jako hotové
