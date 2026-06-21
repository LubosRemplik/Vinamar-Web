# Todo O — Stránka „Z letiště"

**Datum:** 2026-06-21
**Větev:** `o-stranka-z-letiste`
**Status:** Návrh schválen, čeká na implementační plán

## Cíl

Veřejná informační stránka, která hostovi vysvětlí, jak se dostane z letiště
Alicante (ALC) do apartmánu v La Mata / Torrevieja. Doplňuje stávající letecké
rozvrhy (todo G) o „poslední míli" po přistání.

## Rozsah (scope)

**Co stránka pokrývá** (vše veřejně, jen obecná oblast):

1. **Půjčení auta + trasa** — autopůjčovny na ALC, orientační cena, jízdní doba
   ~40–50 min do La Mata, parkování u apartmánu.
2. **Veřejná doprava (bus / ALSA)** — spojení ALC → Torrevieja, kde koupit lístek,
   jízdní doba, návaznost na La Matu.
3. **Taxi / transfer** — orientační cena taxi, tip na soukromý transfer, stanoviště
   u terminálu.
4. **Mapa + oblast** — odkaz na trasu v Google Maps (ALC → La Mata, Torrevieja).
   Veřejně jen obecná oblast, **ne přesná adresa**.

**Mimo rozsah (YAGNI):**

- Přesná adresa apartmánu, GPS, kódy ke vstupu — host je dostane až **po potvrzení
  rezervace** (naváže na e-maily / smlouvy, todo I/K). Na této veřejné stránce nejsou.
- Žádná vložená mapa (iframe). Jen odkaz „Trasa z ALC do La Mata" do Google Maps.
- Žádná `AreaMap` komponenta ani závislost na mapovém API klíči.
- Žádná dynamická data / API volání. Stránka je čistě statická.

## Architektura

Drží se zavedeného vzoru statických stránek z markdownu (jako `okoli`):

- **Obsah:** `web/content/z-letiste.md` — frontmatter (`title`, `intro`) + markdown
  tělo se 4 sekcemi. Text edituje majitel bez zásahu do kódu.
- **Route:** `web/app/z-letiste/page.tsx` — server komponenta podle vzoru
  `web/app/okoli/page.tsx`: `readPage('z-letiste.md')` + `renderMarkdown(body)`,
  vyrenderuje `<h1>`, `intro` a prose tělo.
- **CTA odkaz na trasu:** ve stránce (mimo prose) výrazné tlačítko-odkaz
  „Trasa z letiště ALC do La Mata", `target="_blank"`, na URL Google Maps directions:
  `https://www.google.com/maps/dir/?api=1&origin=Alicante+Airport+ALC&destination=La+Mata,+Torrevieja`.
  Bez API klíče. URL je konstanta v komponentě.
- **Navigace:** přidat položku `{ href: '/z-letiste', label: 'Z letiště' }` do pole
  `links` v `web/components/Nav.tsx` (desktop i mobilní menu se renderují ze stejného pole).

### Datový tok

`page.tsx` (build / SSG) → `readPage('z-letiste.md')` → `gray-matter` rozdělí
frontmatter a tělo → `renderMarkdown` (remark→html) → `dangerouslySetInnerHTML`.
Žádné runtime závislosti, plně staticky generováno (`generateStaticParams` netřeba,
je to pevná route).

### Ošetření chyb

`readPage` čte soubor synchronně při buildu. Když `z-letiste.md` chybí, build
selže — což je žádoucí (chybějící obsah se nedostane do produkce). Žádné runtime
fallbacky netřeba.

## Komponenty a zodpovědnosti

| Jednotka | Co dělá | Závisí na |
|---|---|---|
| `content/z-letiste.md` | nese veškerý text (4 sekce) | — |
| `app/z-letiste/page.tsx` | načte md, vyrenderuje stránku + CTA na trasu | `lib/content` (`readPage`, `renderMarkdown`) |
| `components/Nav.tsx` (úprava) | přidá odkaz „Z letiště" do menu | — |

## Testy

- **Web vitest** (`web/`): test, že `readPage('z-letiste.md')` projde a tělo
  obsahuje všechny 4 sekce (kontrola klíčových nadpisů). Rozšíří stávající
  content-loader testy.
- **Playwright smoke** (`web/`): route `/z-letiste` se načte (status 200),
  obsahuje `<h1>` „Z letiště" a odkaz s `href` na `google.com/maps/dir`.

## Otevřené body / návaznosti

- Konkrétní texty (ceny autopůjčoven, ALSA jízdné, taxi tarif) doplní majitel /
  upřesníme při psaní obsahu — orientační hodnoty, ne závazné.
- „Přesná adresa po rezervaci" je explicitně mimo rozsah a naváže na todo I/K
  (smlouvy / e-maily).
