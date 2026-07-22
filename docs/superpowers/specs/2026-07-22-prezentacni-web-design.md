# Prezentační web — vizuální identita a přestavba (TODO L)

Datum: 2026-07-22
Větev: `l-logo-a-design` (odbočena z `ceny-100-70`)

## Cíl

Dotáhnout veřejnou část webu do stavu, ve kterém obstojí jako hlavní prezentace
apartmánu: vlastní vizuální identita včetně loga a faviconu, reálné fotky místo
placeholderů, sjednocený layout a přestavěná struktura stránek.

Rezervační tok a administrace se mění jen tam, kde je nutné je vizuálně sladit —
jejich logika zůstává beze změny.

## Rozhodnutí učiněná se zadavatelem

| Téma | Rozhodnutí |
|---|---|
| Hloubka zásahu | Výrazný redesign, ne polish stávající šablony |
| Atmosféra | Tišší, elegantní — světlá paleta, vzduch, jemná antikva |
| Logo | Psané písmo, verzálky, základ „ViñaMar" → **Kaushan Script** + podtitul |
| Favicon | „V" v tmavém kolečku |
| Vizuální směr | **A — Klidný střed**: střední osa, fotopásy, žádné karty se stíny |
| Jazyk | Pouze čeština |
| Stránky | **Apartmán a Okolí sloučeny do jedné stránky** |
| Výlety | Reálné tipy v dojezdové vzdálenosti, fotky z volných zdrojů |
| Texty | Vzniknou v této iteraci jako funkční základ, doladí se později |

## Vizuální identita

### Barvy

Nahrazují dosavadní `terracotta / ochre / sand / sea`.

| Token | Hodnota | Použití |
|---|---|---|
| `ink` | `#1F3A34` | text, tmavé plochy, plná tlačítka |
| `paper` | `#FBF8F3` | podklad stránky |
| `sage` | `#61716A` | sekundární text, popisky, oční linky (4,86:1 na paper) |
| `brass` | `#A9885A` | ikony, jemné akcenty, oddělovače (3,12:1 na paper) |
| `line` | `#E4DCCF` | rámečky a dělicí čáry |

Staré tokeny zůstávají v konfiguraci jen tak dlouho, dokud je používá administrace;
prezentační stránky je nepoužívají.

### Písma

Načítají se přes `next/font/google` (self-hosted, `display: swap`).

- **Kaushan Script** — výhradně logo a favicon.
- **Cormorant Garamond** 300/400 — nadpisy, perex, čísla v kalendáři.
- **Jost** 300/400/500 — běžný text, navigace, popisky, formuláře.

Inter se z projektu odstraní.

### Logo

`components/Logo.tsx` — nápis `VIÑAMAR` v Kaushan Script, volitelný podtitul
`LA MATA · TORREVIEJA` v prostrkaných verzálkách Jost. Props: `size` (`sm` do
hlavičky, `lg` do patičky), `subtitle` (bool), `tone` (`ink` | `paper` pro
použití na fotce).

### Favicon

Skript `web/scripts/generate-favicon.mjs` vyrenderuje přes Playwright písmeno „V"
v Kaushan Script (paper na ink, kruh) do `app/icon.png` (512 px) a
`app/apple-icon.png` (180 px). Spouští se ručně (`npm run favicon`), ne při buildu —
výstupní PNG jsou verzované v gitu. Důvod pro rasterizaci: SVG favicon si v
prohlížeči nenačte webfont, písmo musí být zapečené v obrázku.

## Design systém

- `components/Container.tsx` — jediná šířka `max-w-6xl` + `px-6`. Nahrazuje dnešní
  mix `max-w-4xl / 5xl / 6xl` a domovskou stránku bez kontejneru.
- `components/Section.tsx` — svislý rytmus sekcí (`py-16 sm:py-24`) a volitelný
  oční nadpis.
- `components/SectionHeading.tsx` — oční linka (verzálky, `sage`) + nadpis v antikvě
  + volitelný mosazný oddělovač.
- Tlačítka: `.btn` (obrys) a `.btn-solid` (plocha `ink`), hrana 2 px, verzálky
  s prostrkáním `0.16em`. Pilulky (`rounded-full`) na prezentačních stránkách mizí.
- Karty se stíny (`shadow-card`, `shadow-cardHover`) se z prezentačních stránek
  odstraní; oddělují se vzduchem a vlasovou linkou `line`.
- `components/icons.tsx` — inline SVG sada (stroke 1,5 px, `currentColor`):
  pláž, bazén, lůžko, klimatizace, auto, wi-fi, kuchyně. Nahrazuje emoji.
  Bez externí knihovny.

### Oprava chyby

`app/globals.css` nastavuje `h1 { @apply text-ink }`, což přebíjí `text-white`
v Heru — dnešní titulek na hero fotce je proto nečitelný. Globální pravidla pro
`h1`–`h3` přestanou určovat barvu; tu si řídí komponenta.

## Struktura stránek

| URL | Stav | Obsah |
|---|---|---|
| `/` | přestavba | Hero, perex, vybavení, fotopás, teasery, výlety, CTA |
| `/apartman` | **sloučení** | Apartmán **i** okolí a pláž La Mata |
| `/okoli` | **zrušeno** | Trvalý redirect (308) na `/apartman` |
| `/tipy-na-vylety` | přestavba | Reálné tipy s dojezdovou vzdáleností |
| `/tipy-na-vylety/[slug]` | přestavba | Detail tipu, sladěný vzhled |
| `/z-letiste` | sladění | Beze změny obsahu, nový vzhled |
| `/volne-terminy` | sladění | Kalendář a formulář v nové paletě, logika beze změny |

### `/` — úvod

1. Hero — večerní nasvícený bazén, oční linka `LA MATA · COSTA BLANCA`, titulek
   v antikvě, tlačítko na volné termíny.
2. Perex na střední ose + mosazný oddělovač + sazba `100 € / noc v sezóně ·
   70 € mimo sezónu · úklid 70 € za pobyt`.
3. Vybavení — viz níže.
4. Fotopás — tři fotky bez mezer (obývací pokoj, lávka na pláž, bazén za dne).
5. Teaser `Apartmán a okolí` a `Tipy na výlety`.
6. Uzavírací CTA na volné termíny.

### Vybavení

Šest položek s ikonami, v tomto pořadí. Parkování se neuvádí.

| Ikona | Popisek | Doplněk |
|---|---|---|
| pláž | 300 m k pláži | |
| bazén | Bazén | společný, v rezidenci |
| lůžko | 4 osoby | postel + rozkládací gauč jako plnohodnotná postel |
| klimatizace | Klimatizace | |
| kuchyně | Vybavená kuchyně | |
| wi-fi | Wi-Fi zdarma | |

Doplněk se sází menším řezem pod popisek, aby řádek u „4 osoby" nenutil ostatní
položky roztahovat.

### `/apartman` — Apartmán a okolí

Sloučená stránka ve dvou částech oddělených fotopásem:

1. **Apartmán** — perex, galerie (obývací pokoj, ložnice, jídelní stůl, kuchyňský
   kout, koupelna, balkon), seznam vybavení s ikonami.
2. **Bazén a rezidence** — fotky bazénu ve dne i večer.
3. **Pláž a La Mata** — text z dosavadního `okoli.md`, fotky pláže (lávka dunami,
   slunečníky, moře, promenáda).

Obsah čerpá ze dvou markdownů (`apartman.md`, `okoli.md`) — zůstávají oddělené,
skládá je až stránka.

### Galerie

`components/Gallery.tsx` se rozšíří o lightbox: klik otevře fotku přes celou
obrazovku, ovládání šipkami a klávesou Esc, `aria-modal`, vrácení fokusu na
spouštěcí dlaždici. Bez externí knihovny.

## Fotky

### Zdroj a zpracování

Originály zůstávají v `Assets/` (v `.gitignore`, mimo repozitář). Skript
`web/scripts/prepare-photos.sh` je pomocí `sips` zmenší na max 2000 px delší
strany, uloží jako JPEG kvality 80 do `web/public/images/` pod sémantickými názvy.
Next.js `<Image>` je za běhu převede do WebP. Skript se pouští ručně, není
součástí buildu.

### Výběr

| Cíl | Motiv |
|---|---|
| `home/hero.jpg` | bazén večer, nasvícený |
| `home/strip-01..03.jpg` | obývací pokoj · lávka na pláž · bazén za dne |
| `apartment/living-01, -02` | obývací pokoj, dva úhly |
| `apartment/bedroom.jpg` | ložnice |
| `apartment/dining.jpg` | jídelní stůl |
| `apartment/kitchen.jpg` | kuchyňský kout |
| `apartment/bathroom-01, -02` | koupelna, umyvadlo |
| `apartment/balcony.jpg` | balkon se stolkem |
| `pool/pool-day.jpg`, `pool/pool-night.jpg` | bazén |
| `surroundings/beach-boardwalk.jpg` | lávka dunami |
| `surroundings/beach-parasols.jpg` | slunečníky a lehátka |
| `surroundings/sea.jpg` | moře |
| `surroundings/promenade.jpg` | promenáda |

Vyřazeno: technické detaily (těsnění, sprchová baterie, rozvaděč), úložné prostory
a duplicitní záběry ložnice, bazénu a koupelny.

Známá omezení materiálu, se kterými design počítá: ultraširoký objektiv se
znatelným zkreslením, zatažená obloha u plážové série, ložnice bez povlečení
(záměr zadavatele — na jihu se spí na prostěradle). Potlačuje se kadrováním
`object-cover` a klidnou sazbou; fotky se nezvětšují nad původní rozlišení.

## Tipy na výlety

Dosavadní tři soubory (`solna-jezera`, `la-mata-plaz`, `torrevieja-pristav`) se
nahradí sadou reálných tipů seřazených podle dojezdové vzdálenosti autem z La Mata.
`la-mata-plaz` zaniká — pláž je nově součástí `/apartman`.

Sada tipů; vzdálenosti a dojezdové časy se před zápisem do obsahu ověří proti
mapovému podkladu a do frontmatteru se zapisují zaokrouhlené:

| Tip | Vzdálenost |
|---|---|
| Solná jezera La Mata a Torrevieja (růžová laguna) | ~3 km |
| Torrevieja — přístav, promenáda, Muzeum moře a soli | ~10 km |
| Guardamar del Segura — duny a hrad | ~15 km |
| Santa Pola — přístav, mys, solné pánve | ~30 km |
| Isla de Tabarca — ostrov lodí ze Santa Poly | ~30 km + loď |
| Elche — palmový háj (UNESCO) | ~40 km |
| Alicante — hrad Santa Bárbara, Explanada | ~50 km |
| Murcia — katedrála a staré město | ~70 km |
| Cartagena — římské divadlo | ~90 km |
| Mar Menor a La Manga | ~45 km |

Každý tip: `title`, `category`, `distanceKm`, `driveMinutes`, `image`, `imageCredit`,
`summary`, `order`, volitelně `externalLink`, plus tělo v markdownu.

### Fotky výletů a licence

Fotky se stahují **výhradně z Wikimedia Commons** pod licencemi CC BY, CC BY-SA
nebo public domain. Ke každé se ukládá `imageCredit` (autor, licence, odkaz na
zdroj) a zobrazuje se u fotky na detailu tipu. Fotky z komerčních a redakčních
webů se nepoužijí — cizí autorská práva.

## Patička

`components/Footer.tsx`: logo s podtitulem, odkaz na volné termíny, odkazy na
stránky, řádek `Vinamar · La Mata, Torrevieja`. Telefon ani adresa se neuvádějí —
kontaktním kanálem je formulář poptávky. Rok se počítá za běhu, ne natvrdo.

## Testy

- `web/lib/content.test.ts` — rozšířit o načtení nových polí tipu
  (`distanceKm`, `driveMinutes`, `imageCredit`).
- `web/e2e/` — Playwright smoke: každá veřejná stránka vrací 200 a má `h1`;
  `/okoli` přesměruje na `/apartman`; lightbox se otevře a zavře přes Esc.
- Vizuální kontrola přes screenshoty na 1440 px a 390 px.

## Mimo rozsah

- SEO nad rámec `metadata` u jednotlivých stránek (sitemap, strukturovaná data,
  OG obrázky) — zadavatel je z rozsahu vyřadil.
- Jazykové mutace.
- Vzhled administrace (`/admin/**`) — mění se jen tokeny, které sdílí s webem.
- Provázání ceníku s generováním PDF smlouvy (`totalPrice` se v administraci
  stále zadává ručně) — samostatný úkol.
- Finální znění textů — vzniká funkční základ, doladí se v další iteraci.
