# I — Smlouvy v PDF (design)

**Status:** schváleno (brainstorming 2026-06-21)
**Větev:** `i-smlouvy-pdf`

## Cíl

Admin u potvrzené rezervace vygeneruje nájemní smlouvu v PDF (česky), systém ji
odešle e-mailem hostovi (kopie majiteli) a posune rezervaci do nového stavu
`contract_sent`. Dvě oddělené šablony: **se zálohou** / **bez zálohy**.

## Právní kontext (research)

La Mata / Torrevieja spadá pod **Comunidad Valenciana**. Decreto-ley 9/2024
definuje *vivienda de uso turístico* jako pronájem témuž hostu na **max. 10 po
sobě jdoucích dní**; delší pronájem spadá pod **LAU (Ley 29/1994) jako
*arrendamiento de temporada*** a nevyžaduje turistickou licenci.

→ Proto je každá smlouva na **10 nocí / 11 dní** (překračuje 10denní hranici =
temporada, ne turístico). Majitel provozuje byt **výhradně jako temporada bez
licence** (potvrzeno), takže je to legitimní provozní model, ne obcházení registru.

**⚠️ Není to právní poradenství.** Smlouvy jsou v této fázi **pouze v češtině**
pro české hosty. Případnou španělskou/dvojjazyčnou verzi a odsouhlasení znění
*gestorem/abogadem* řešíme později. Pravidlo „10 nocí" a počítání „dní" je
rozhodnutí majitele o riziku.

## Rozhodnutí z brainstormingu

| # | Téma | Rozhodnutí |
|---|------|-----------|
| 1 | Právní režim | Čistá temporada bez licence |
| 2 | Text smlouvy | Připraví Claude, **pouze česky**; právník ověří později |
| 3 | Zdroj dat | **Vše v admin formuláři**; pronajímatel + popis bytu + domovní řád **napevno v šabloně** (bez konfigurace) |
| 4 | Trigger | **Ručně adminem** u confirmed rezervace + nový stav `contract_sent` |
| 5 | Varianta zálohy | **Dvě oddělené šablony** (se zálohou / bez) |
| 6 | PDF technologie | **pdfmake** (čisté JS, embed font pro diakritiku, žádný Chromium) |

> **Vymyšlená data:** identita pronajímatele, popis bytu, domovní řád a sankční
> klauzule jsou napevno v šabloně s realistickými placeholdery označenými
> `// TODO: doplnit reálné údaje`. Upraví se později.

## Architektura — onion `contract` slice (kopíruje `inquiry`)

```
api/src/
  domain/contract/
    contract.ts                    — entita (immutable snapshot) + invariant 10 nocí
    contract-variant.ts            — type 'with-deposit' | 'without-deposit'
    contract.repository.port.ts    — CONTRACT_REPOSITORY
    contract-pdf-renderer.port.ts  — CONTRACT_PDF_RENDERER: render(contract) → Buffer
    contract-notifier.port.ts      — CONTRACT_NOTIFIER: sendToGuest(contract, pdf)
    errors/
      inquiry-not-confirmed.error.ts   (409)
      contract-already-sent.error.ts   (409)
  application/contract/
    generate-contract.command.ts + handler
    get-contract-pdf.query.ts + handler
  infrastructure/
    persistence/pg-contract.repository.ts
    pdf/pdfmake-contract-renderer.ts   — definice dokumentu + templaty obou variant
    pdf/fonts/                          — Roboto (TTF) pro českou diakritiku
    notify/smtp-contract-notifier.ts
    contract.module.ts                 — wiring (handlery + porty + renderer + notifier + pg pool)
  migrations/
    1700000006000_contracts.sql
  interface/http/
    admin-contract.controller.ts        — žije v AdminModule (ne v ContractModule)
web/
  app/admin/page.tsx                    — tlačítko „Smlouva" + modal formulář
  lib/api.ts                            — generateContract(), contractPdfUrl()
```

Wiring kopíruje existující vzor: `ContractModule` vlastní CQRS handlery, repozitář,
renderer, notifier a pg pool. `AdminContractController` patří do **`AdminModule`**
vedle `AdminInquiryController` (admin controllery + `AdminGuard` jsou v AdminModule;
feature moduly vlastní handlery/porty — viz poznámka v `admin.module.ts`
o duplicitní registraci CQRS handlerů). `AppModule` zaregistruje `ContractModule`.

## Datový model — `contracts`

```sql
CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES inquiries(id),
  variant text NOT NULL,                 -- 'with-deposit' | 'without-deposit'
  -- host (z formuláře)
  guest_name text NOT NULL,
  guest_address text NOT NULL,
  guest_id_number text NOT NULL,         -- číslo OP / pasu
  guest_birth_date date,
  -- pobyt (vynuceno: departure = arrival + 10 nocí)
  arrival date NOT NULL,
  departure date NOT NULL,
  -- cena
  total_price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  deposit_amount numeric(10,2),          -- NULL u 'without-deposit'
  deposit_due_date date,
  -- výstup (immutable snapshot odeslaného dokumentu)
  pdf bytea NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX contracts_inquiry_id_idx ON contracts (inquiry_id);
```

Identita pronajímatele a popis bytu se **neukládají** (jsou napevno v rendereru) —
snapshot je v uloženém `pdf`.

**Stav rezervace:** `InquiryStatus` rozšířen o `'contract_sent'`. Migrace nemění
enum (status je `text`), jen doménový union type a UI badge. `contract_sent`
následuje po `confirmed`; `cancelled` je možné i poté.

## Doménový model `Contract`

```ts
export const CONTRACT_NIGHTS = 10;

export class Contract {
  // ...readonly pole dle tabulky
  static create(params): Contract {
    if (params.range.nights() !== CONTRACT_NIGHTS) throw new ContractNightsError();
    if (params.variant === 'with-deposit' && params.depositAmount == null)
      throw new DepositRequiredError();
    if (params.variant === 'without-deposit' && params.depositAmount != null)
      throw new DepositNotAllowedError();
    // ...
  }
}
```

Handler odvodí `departure = arrival + 10 nocí` z data příjezdu rezervace, takže
formulář nikdy neumožní jinou délku.

## Flow

1. Admin v `/admin` u **confirmed** rezervace klikne **„Smlouva"** → modal.
2. Modal předvyplní: jméno/e-mail/tel. z rezervace, **příjezd z rezervace**,
   **odjezd = příjezd + 10 nocí** (read-only). Admin doplní: adresu hosta,
   číslo OP/pasu, datum narození, **celkovou cenu**, **variantu**
   (se zálohou → částka + splatnost / bez zálohy).
3. `POST /api/admin/reservations/:inquiryId/contract` → `GenerateContractHandler`:
   - načte inquiry, ověří `status === 'confirmed'` (jinak `InquiryNotConfirmedError`),
   - ověří, že smlouva ještě neexistuje (`ContractAlreadySentError`),
   - sestaví `Contract` (invarianty), vyrenderuje PDF (pdfmake, dle varianty),
   - uloží `contract` (vč. `pdf`), pošle e-mail hostovi + kopii majiteli,
     nastaví `sent_at`,
   - posune inquiry na `contract_sent` (přes `InquiryRepository.updateStatus`).
   - Persistence je raw SQL přes `pg` repozitáře (commit per dotaz, jako zbytek API).
4. `GET /api/admin/contracts/:id/pdf` → vrátí uložené `pdf`
   (`Content-Type: application/pdf`).

## PDF (pdfmake)

- Font **Roboto** (TTF v `infrastructure/pdf/fonts/`) registrovaný přes
  `pdfmake` virtual file system → plná česká diakritika.
- Dvě funkce `withDepositDocDefinition(contract)` /
  `withoutDepositDocDefinition(contract)` vracející `TDocumentDefinitions`.
- Společné bloky: hlavička (pronajímatel — **napevno**), strany, předmět nájmu
  (popis bytu — **napevno**), doba nájmu (10 nocí, konkrétní data), nájemné,
  (jen se zálohou) záloha, práva/povinnosti, domovní řád, sankce, podpisy.
- Renderer vrací `Buffer` (deterministicky, testovatelně).

## E-mail

Rozšířit notifikační vrstvu: `SmtpContractNotifier` (nodemailer, stejný transport
jako `SmtpOwnerNotifier`). Předmět „Nájemní smlouva — La Mata", tělo česky,
příloha `smlouva.pdf`. Příjemce: host (`inquiry.email`), kopie `OWNER_EMAIL`.

## Testy

- **Doména:** `contract.spec.ts` — invariant 10 nocí, varianta vs. záloha (4 případy).
- **Application:** `generate-contract.handler.spec.ts` — confirmed gate, již
  odeslaná smlouva, posun stavu, volání rendereru a notifikátoru (fakes).
- **Infrastructure:** `pdfmake-contract-renderer.spec.ts` — vrátí neprázdný PDF
  buffer s hlavičkou `%PDF` pro obě varianty.
- **E2E:** `contract.e2e-spec.ts` — login → confirm inquiry → generovat smlouvu
  (mailpit zachytí e-mail) → GET PDF vrátí `application/pdf`.

## Mimo rozsah (YAGNI)

- Elektronický podpis, verzování smluv, regenerace po editaci.
- Španělská/dvojjazyčná verze, právní validace znění.
- Konfigurace pronajímatele/bytu (napevno v šabloně).
- Veřejný tok, kde host doplňuje vlastní údaje.
