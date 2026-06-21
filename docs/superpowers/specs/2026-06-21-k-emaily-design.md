# K — E-maily: specifikace

**Status:** návrh (brainstorming dokončen, čeká na implementační plán)
**Datum:** 2026-06-21
**Sub-projekt:** K z TODO v `README.md`

## Kontext a cíl

Web Vinamar dnes posílá jediný e-mail: notifikaci majiteli při nové poptávce
(`SmtpOwnerNotifier.inquiryReceived`). Směrem k hostovi nejde nic. Cílem K je
zavést sadu transakčních e-mailů navázaných na životní cyklus rezervace —
host i majitel dostanou jasnou, česky psanou a profesionálně vypadající zprávu
v každém klíčovém okamžiku.

Všechny e-maily jsou **pouze v češtině**.

## Spouštěče a příjemci

| # | Událost | Spouští se v | Příjemce | Poznámka |
|---|---|---|---|---|
| 1 | Poptávka přijata (veřejný tok) | `submit-inquiry.handler` (větev `!isAdmin`) | host | nový mail (potvrzení „přijali jsme") |
| 1b | Poptávka přijata (veřejný tok) | `submit-inquiry.handler` (větev `!isAdmin`) | majitel | už existuje (`inquiryReceived`), ponecháváme |
| 2 | Rezervace potvrzena | `confirm-inquiry.handler` (pending → confirmed) **i** `submit-inquiry.handler` (větev `isAdmin`, rovnou firm) | host | závazné potvrzení; sem se v bodě **I** připojí smlouva (PDF) |
| 3 | Poptávka odmítnuta | `confirm-inquiry.handler` (auto-decline překryvů) **i** ruční `decline-inquiry.handler` | host | zdvořilé odmítnutí |
| 4 | Rezervace zrušena | `cancel-calendar-entry.handler` | host **i** majitel | dva maily, různý text (přepínač `isOwner`) |
| 5 | Připomínka 14 dní před příjezdem | denní cron | host | minimální obsah |

### Detail #3 — odmítnutí

`confirm-inquiry.handler` po potvrzení jedné poptávky automaticky odmítá všechny
ostatní `pending` poptávky, jejichž termín se s potvrzenou překrývá (stávající
chování, viz `confirm-inquiry.handler.ts`). **Každá** takto auto-odmítnutá
poptávka dostane e-mail #3, stejně jako poptávka odmítnutá ručně přes
`decline-inquiry.handler`. Mail tedy posílá sdílená cesta volaná z obou handlerů.

### Detail #5 — připomínka

- Právě **jedna** připomínka, **14 dní** před příjezdem.
- Obsah **minimální**: „blíží se termín, těšíme se" — **bez** pokynů k příjezdu
  / „z letiště" (to je bod **O**, který sem zatím nezasahuje).
- Posílá se jen pro rezervace ve stavu `confirmed`.

## Architektura (onion)

Respektuje stávající vrstvení (`domain` → `application` → `infrastructure` →
`interface`). E-mail je infrastrukturní detail; doména o HTML/SMTP neví.

### Doména (`api/src/domain/inquiry/`)
- Nový port **`GuestNotifier`** (`guest-notifier.port.ts`) se symbolem
  `GUEST_NOTIFIER` a metodami:
  - `inquiryReceived(inquiry: Inquiry): Promise<void>`
  - `bookingConfirmed(inquiry: Inquiry): Promise<void>`
  - `inquiryDeclined(inquiry: Inquiry): Promise<void>`
  - `bookingCancelled(inquiry: Inquiry): Promise<void>`
  - `arrivalReminder(inquiry: Inquiry): Promise<void>`
- Stávající port **`OwnerNotifier`** rozšířit o `bookingCancelled(inquiry: Inquiry)`.
- Porty přijímají doménový objekt `Inquiry`, nikdy HTML ani SMTP typy.

### Aplikace (`api/src/application/`)
- `submit-inquiry.handler`:
  - **veřejný tok (`!isAdmin`)** — po zápisu poptávky zavolá
    `ownerNotifier.inquiryReceived` (stávající) **a** `guestNotifier.inquiryReceived`.
  - **admin tok (`isAdmin`, firm rezervace)** — rezervace vzniká rovnou `confirmed`
    a obsadí termín; notifikace majiteli se (jako dnes) **přeskakuje** (majitel
    jedná sám). Host dostane `guestNotifier.bookingConfirmed` (#2), **ne**
    „přijali jsme poptávku".
- `confirm-inquiry.handler` — po `updateStatus('confirmed')` zavolá
  `guestNotifier.bookingConfirmed`; pro každou auto-odmítnutou poptávku
  `guestNotifier.inquiryDeclined`.
- `decline-inquiry.handler` — po odmítnutí zavolá `guestNotifier.inquiryDeclined`.
- `cancel-calendar-entry.handler` — pokud rušený záznam patří k poptávce
  (`inquiryId`), zavolá `guestNotifier.bookingCancelled` **a**
  `ownerNotifier.bookingCancelled`.
- Nový command **`SendArrivalRemindersCommand`** + handler:
  - načte `confirmed` poptávky, kde `arrival_reminder_sent_at IS NULL`
    a `arrival` spadá do okna `(dnes, dnes + 14 dní]` (tj. příjezd je v budoucnu
    a max. 14 dní daleko),
  - pro každou zavolá `guestNotifier.arrivalReminder`,
  - po úspěšném odeslání nastaví `arrival_reminder_sent_at = now()` (viz datový model).
  - **Okno, ne přesná shoda `= dnes+14`:** je robustní vůči vynechanému běhu cronu
    a pokrývá i rezervace vytvořené méně než 14 dní před příjezdem (admin firm
    booking na poslední chvíli) — ty dostanou připomínku při nejbližším běhu.

### Infrastruktura (`api/src/infrastructure/notify/`)
- Jeden SMTP adaptér (rozšíření / náhrada `SmtpOwnerNotifier`) implementuje
  **oba** porty `GuestNotifier` i `OwnerNotifier`. Použije stávající
  `nodemailer` (multipart: `html` + `text`).
- Adresát hosta: `inquiry.email`. Adresát majitele: `OWNER_EMAIL` (env).
- Šablony viz následující sekce.
- Cron: nový **`ArrivalReminderCron`** (`infrastructure/notify/arrival-reminder.cron.ts`)
  podle vzoru `infrastructure/flight/flight-price.cron.ts`:
  `@Cron(CronExpression.EVERY_DAY_AT_8AM)` → `commandBus.execute(new SendArrivalRemindersCommand())`.

## Šablony (styly z Postmark, render v čistém TS)

Vizuální základ je open-source šablona **Postmark `basic-full`**
(`ActiveCampaign/postmark-templates`, MIT) — tatáž kostra, kterou používá projekt
HKDev/Revize (`booking_*` Twig šablony) jako předlohu. Sem ji bereme **přímo ze
zdroje**, nikoli přes Twig.

- **Žádný šablonovací engine, žádná nová závislost.** Twig bloky se mapují na
  parametry TS funkce.
- `base.ts` → funkce `baseLayout({ preheader, content, cta? }): string` vrací
  kompletní HTML s Postmark kostrou: responzivní table layout, 600px container,
  bílá zaoblená karta `.main`, primary tlačítko `.btn-primary`, skrytý
  `.preheader`, mobilní breakpointy, kompat. třídy (`.apple-link`,
  `.ExternalClass`, `#MessageViewBody`). CSS zůstává ve `<style>` bloku
  (neinlinujeme — pro náš SMTP/mailpit a moderní klienty to stačí).
- Per mail jedna funkce (`booking-confirmed.ts`, …), která složí `content` a `cta`
  a zavolá `baseLayout(...)`; vrací `{ subject, html, text }`.
- **Branding (placeholder → finální v bodě L):**
  - hlavička: text „Vinamar", odkaz na `PUBLIC_BASE_URL`,
  - patička: „Vinamar — Apartmán La Mata, Torrevieja",
  - akcentová barva: konstanta (výchozí Postmark modrá `#2563eb`).
- **Datum** formátováno česky (`14. 7. 2025`).
- **Plaintext fallback:** krátká textová verze per mail (`text` v nodemailer).

### Mapování na předlohy Postmark/Revize

| Vinamar mail | Předloha |
|---|---|
| Poptávka přijata (host) | `booking_request_created` |
| Rezervace potvrzena (host) | `booking_confirmed` |
| Poptávka odmítnuta (host) | `booking_request_declined` |
| Zrušení (host + majitel) | `booking_cancelled` (přepínač `isOwner`) |
| Připomínka 14 dní (host) | `booking_upcoming_d1` |

### Obsah jednotlivých mailů (osnova)

Společné: oslovení „Dobrý den {jméno hosta}," + termín pobytu (příjezd → odjezd).

1. **Poptávka přijata** — potvrzujeme přijetí, ozveme se s potvrzením dostupnosti.
2. **Rezervace potvrzena** — termín je závazně rezervovaný; (později) v příloze smlouva.
3. **Poptávka odmítnuta** — termín bohužel nelze potvrdit, nabídka jiných termínů (odkaz na kalendář).
4. **Zrušení** — host: rezervace zrušena; majitel: termín se uvolnil.
5. **Připomínka** — minimální: blíží se termín, těšíme se.

## Datový model

Migrace `1700000006000_inquiry-arrival-reminder.sql` (navazuje na poslední
`1700000005000_calendar-block-inquiry-link.sql`):

```sql
-- Up
ALTER TABLE inquiries ADD COLUMN arrival_reminder_sent_at timestamptz;
-- Down
ALTER TABLE inquiries DROP COLUMN arrival_reminder_sent_at;
```

Sloupec zajišťuje **idempotenci** připomínky: cron vybírá jen poptávky, kde je
`arrival_reminder_sent_at IS NULL`, a po odeslání ho nastaví na `now()`. Brání
duplicitnímu odeslání při restartu nebo dvojím běhu cronu.

## Chybové stavy

- Odeslání e-mailu **nesmí** shodit příkaz ani rollbacknout změnu stavu rezervace.
  Notifikace běží `try/catch` s log-and-continue (chyba se zaloguje přes `Logger`,
  ale handler doběhne úspěšně). Rezervace je byznysově důležitější než její mail.
- U připomínky: pokud odeslání selže, `arrival_reminder_sent_at` se **nenastaví**,
  aby cron zkusil mail příští den znovu (akceptujeme možnost mírného zpoždění místo
  ztráty mailu).
- Adresa hosta je v `inquiries.email` `NOT NULL`, takže chybějící příjemce nehrozí.

## Konfigurace (env)

| Proměnná | Význam | Stav |
|---|---|---|
| `SMTP_HOST`, `SMTP_PORT` | SMTP server | existuje |
| `SMTP_FROM` | odesílatel (adresa) | existuje |
| `MAIL_FROM_NAME` | jméno odesílatele („Vinamar") | nové |
| `OWNER_EMAIL` | adresa majitele | existuje |
| `PUBLIC_BASE_URL` | základ URL pro odkazy v mailech | nové |

## Testy

- **Unit** — render funkce každého mailu: vrací `subject`/`html`/`text`, HTML
  obsahuje klíčová data (jméno hosta, termín, případně CTA odkaz).
- **Unit** — `SendArrivalRemindersHandler`: vybírá pouze `confirmed` poptávky
  s příjezdem za 14 dní a `arrival_reminder_sent_at IS NULL`; po úspěchu nastaví
  sloupec; při chybě odeslání ho nechá `NULL`.
- **Unit** — `confirm-inquiry.handler`: auto-odmítnuté poptávky dostanou
  `inquiryDeclined` (ověřit přes mock `GuestNotifier`).
- **E2E** — proti běžícímu **mailpit**: odeslání poptávky → e-mail hostovi
  i majiteli dorazí (kontrola subjectu/příjemce přes mailpit API).

## Rozhodnuto

**Adminem vytvořená rezervace posílá hostovi mail #2 „Rezervace potvrzena".**
Admin tok plní guest e-mail stejně jako veřejný tok, takže příjemce je vždy
platný. Je to moment závazné rezervace a zároveň místo, kam se v bodě **I**
napojí smlouva. Notifikace majiteli se (jako dnes) přeskakuje — majitel jedná sám.

## Mimo rozsah (YAGNI)

- Post-pobytový e-mail (poděkování / žádost o recenzi) — vědomě vynecháno.
- Jiné jazyky než čeština.
- Inlining CSS, fronta na odesílání, retry s exponenciálním backoffem.
- Příloha smlouvy v mailu „Rezervace potvrzena" — návrh jen **počítá se seamem**
  (metoda `bookingConfirmed`), samotná příloha je bod **I**.
- Branding (logo, finální barvy) — bod **L**; zde jen proměnné s placeholdery.

## Závislosti na dalších sub-projektech

- **I (smlouvy):** napojí se do `bookingConfirmed` jako příloha PDF.
- **L (logo/design):** naplní branding proměnné v `baseLayout`.
- **O (z letiště):** případné budoucí obohacení připomínky (teď mimo rozsah).
- **P (multi-apartmán):** až bude, e-maily budou potřebovat kontext apartmánu
  (název v hlavičce/obsahu). Dnes řešíme jeden apartmán; rozšíření je aditivní.
