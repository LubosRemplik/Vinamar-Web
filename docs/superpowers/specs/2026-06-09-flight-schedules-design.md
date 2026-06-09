# Letové spojení do Alicante — vyhledávání podle termínu (návrh)

> Stav: **research + návrh k odsouhlasení**. Připraveno autonomně přes noc 2026‑06‑09.
> Implementace ještě nezačala (čeká na schválení návrhu). Hotový je ověřený průzkum
> zdrojů dat a funkční proof‑of‑concept (`docs/research/flight-schedules-poc.mjs`).

## 1. Co je cílem

Na webu umožnit zadat **rozsah termínu** (od–do) a zobrazit, **jaké přímé lety do
Alicante (ALC)** jsou v tom období dostupné — z těchto letišť, v tomto pořadí
preference:

1. Pardubice (PED)
2. Praha (PRG)
3. Vratislav / Wrocław (WRO)
4. Linec / Linz (LNZ)
5. Bratislava (BTS)
6. Vídeň / Wien (VIE)
7. Katovice / Katowice (KTW)

Důraz není na ceně, ale na tom **kdy** spojení jede a **v kolik hodin** (odlet/přílet).
Vzorem je flightconnections.com (mapa + dny/časy spojení).

## 2. Klíčové zjištění (ověřeno živými dotazy 2026‑06‑09)

### 2.1 Zdroj dat: Ryanair je zdaleka nejlepší volba

Ryanair má **veřejné (neoficiální) timetable endpointy** — bez API klíče, bez
registrace, bez ceny — které vracejí přesně to, co potřebujeme: **dny a časy** letů.

- Dostupné dny: `GET https://www.ryanair.com/api/farfnd/3/oneWayFares/{ORIGIN}/ALC/availabilities`
  → pole dat (`["2026-07-06", ...]`).
- Jízdní řád: `GET https://www.ryanair.com/api/timtbl/3/schedules/{ORIGIN}/ALC/years/{Y}/months/{M}`
  → `{ month, days: [{ day, flights: [{ carrierCode, number, departureTime, arrivalTime }] }] }`.
- Destinace z letiště: `GET https://www.ryanair.com/api/views/locate/searchWidget/routes/en/airport/{ORIGIN}`
  → seznam destinací (s příznakem `seasonal`, `operator`).

Příklad reálné odpovědi (PED→ALC, červenec 2026):
`FR1495, odlet 12:00 → přílet 15:00`. Funguje i pro malá letiště.

### 2.2 Matice pokrytí — která letiště mají PŘÍMÝ let Ryanairu do ALC

| # | Letiště | Přímý Ryanair do ALC? | Frekvence (léto 2026) | Poznámka |
|---|---------|-----------------------|------------------------|----------|
| 1 | Pardubice (PED) | **ANO** | ~3–4× týdně (FR1495) | Překvapivě ano — i malé letiště |
| 2 | Praha (PRG) | **NE (Ryanair)** | — | Přímo létá **Smartwings** a **Eurowings**, ne Ryanair |
| 3 | Vratislav (WRO) | **ANO** | skoro denně, někdy 2×/den | Nejhustší spojení |
| 4 | Linec (LNZ) | **ANO** | ~2× týdně (FR3487) | Malé letiště, ale jede |
| 5 | Bratislava (BTS) | **ANO** | několikrát týdně (FR5699) | |
| 6 | Vídeň (VIE) | **ANO** | skoro denně (FR1567) | Báze Ryanairu |
| 7 | Katovice (KTW) | **ANO** | skoro denně (FR3596/3950) | |

**Závěr:** Ryanair sám pokryje **6 ze 7** požadovaných letišť pro přímé lety do
Alicante, kompletně s daty i časy, zdarma a bez klíče. Jediná výjimka je **Praha**,
kam Ryanair do ALC nelétá (přímo tam létají čeští/němečtí dopravci Smartwings a
Eurowings).

### 2.3 Ostatní zvažované zdroje

| Zdroj | Co umí | Cena / přístup | Verdikt pro nás |
|-------|--------|----------------|-----------------|
| **Ryanair timetable API** (neoficiální) | dny + časy přímých letů | zdarma, bez klíče | ✅ **Primární zdroj** — přesně náš use‑case |
| **developer.aero (SITA)** | Flight Connection / Flight Information API | enterprise, komerční smlouva | ❌ Overkill, není rychlý self‑service. (To je ten „developer.aero", na který ses ptal — existuje, ale je pro letiště/aerolinky, ne pro malý web.) |
| **Amadeus for Developers** | Flight Schedules, Airport/Airline Routes, Flight Offers | self‑service free tier (test kvóta), nutný API klíč | 🟡 Dobrý **doplněk pro Prahu** (pokryje i ne‑Ryanair dopravce) |
| **AeroDataBox** (RapidAPI) | rozvrh odletů celého letiště (všichni dopravci, i budoucí) | free tier / od ~$5 měs. | 🟡 Alternativa pro Prahu / úplnost; přidává externí závislost |
| **flightconnections.com** | mapa spojení (vzor UX) | **nemá veřejné API**, scraping zakázán (interně používá Skyscanner) | ❌ Nepoužitelné jako zdroj dat |
| **OAG / Cirium (FlightStats)** | kompletní globální rozvrhy | enterprise, drahé | ❌ Overkill |
| **Travelpayouts/Aviasales** (už v repu) | ceny letenek | affiliate API + token | ⚠️ Cenově orientované — ne náš cíl; necháváme stranou |

> Pozn. k „raději bez externích služeb": Ryanair endpoint je sice externí, ale
> **bez registrace, klíče a poplatku** — fakticky jen veřejný jízdní řád dopravce.
> Amadeus/AeroDataBox jsou volitelné rozšíření jen pokud budeme chtít i Prahu/ostatní
> dopravce.

## 3. Doporučení

1. **Primárně Ryanair timetable API** jako jediný zdroj v první verzi. Pokryje 6/7
   letišť, zdarma a bez klíče.
2. **Praha**: v první verzi zobrazit poctivě „Ryanair sem přímo nelétá; přímé spojení
   nabízí Smartwings / Eurowings" + odkaz na vyhledání. Volitelně později doplnit
   Amadeus/AeroDataBox jako druhý provider za stejným portem.
3. Data **cachovat** (jízdní řády se mění řádově dny/týdny, ne minuty), aby web
   nebombardoval Ryanair při každém požadavku.

## 4. Návrh architektury (zapadá do stávající `flight` slice)

V repu už existuje cenově orientovaná flight slice (Travelpayouts). Tu **necháme být**
a přidáme paralelní, rozvrhově orientovanou část — stejné DDD/CQRS vrstvy.

### 4.1 Doména
- **Rozšířit `api/src/domain/flight/origin.ts`** ze 3 na 7 letišť, včetně pořadí
  preference (`order`) a IATA jména. Dnes: `OriginCode = 'PED' | 'WRO' | 'PRG'` →
  rozšířit o `LNZ | BTS | VIE | KTW`. Doplnit `Origin.allByPreference()`.
- **Nová hodnota `FlightSchedule`** (`domain/flight/flight-schedule.ts`): jeden
  konkrétní let — `origin`, `date`, `departureTime`, `arrivalTime`, `carrier`,
  `flightNumber`. Bez ceny.
- **Nový port `FlightScheduleProvider`** (`domain/flight/flight-schedule-provider.port.ts`):
  `schedulesForOrigin(origin, from, to): Promise<FlightSchedule[]>`.

### 4.2 Infrastruktura
- **`RyanairScheduleProvider`** (`infrastructure/flight/ryanair-schedule-provider.ts`)
  implementuje port; logika je už ověřená v PoC (`monthsInRange`, fetch timetable,
  filtrace na rozsah). Injektovatelný `fetch` kvůli testům (stejný vzor jako
  `TravelpayoutsFlightPriceProvider`).
- **Cache**: jednoduchá in‑memory TTL cache (např. 6–24 h) klíčovaná
  `origin|year-month`. Volitelně později persistovaná tabulka `flight_schedules`
  + cron refresh (vzor `flight-price.cron.ts`).

### 4.3 Aplikace (CQRS)
- **`FindSchedulesQuery(from, to)`** + handler: pro každý origin v pořadí preference
  zavolá provider, vrátí strukturu seskupenou po letišti. Handler je read‑only
  (žádný flush — viz CLAUDE.md pravidlo o CQRS).

### 4.4 Interface (HTTP)
- **`GET /api/flights/schedules?from=YYYY-MM-DD&to=YYYY-MM-DD`** → 
  ```json
  [{ "origin": "PED", "originName": "Pardubice", "order": 1,
     "flights": [{ "date": "2026-07-08", "departureTime": "12:00",
                   "arrivalTime": "15:00", "carrier": "FR", "flightNumber": "1495" }],
     "directRyanair": true, "note": null }]
  ```
  Praha: `directRyanair: false`, `note: "Ryanair sem nelétá; přímo Smartwings/Eurowings"`.

### 4.5 Frontend (Next.js)
- Sekce/stránka napojená na reframovaný web (apartmán první, doprava jako doplněk).
  Návrh: na stránce „Volné termíny" tlačítko/odkaz „Jak se sem dostat" nebo nová
  stránka `/letecke-spojeni`.
- **Výběr termínu**: předvyplnit rozsahem, který si uživatel zvolil v kalendáři
  (pokud přišel odtud), jinak vlastní date‑range picker.
- **Zobrazení**: karty po letišti v pořadí preference; v kartě seznam dní s časy
  (`Po 12:00 → 15:00 FR1495`). U Prahy poctivá poznámka. Žádné ceny.
- České formátování dat (`formatCzDate`) a dnů v týdnu — sjednotit se stávajícím UI.

## 5. Testování
- Unit test `RyanairScheduleProvider` s injektovaným fake `fetch` (fixture odpovědi
  Ryanairu) — ověří `monthsInRange`, filtraci na rozsah, mapování na `FlightSchedule`.
- Unit test rozšířeného `Origin` (7 letišť, pořadí).
- E2e (Playwright) na frontend: zadat rozsah → vidět karty letišť + časy.
- POZOR (CLAUDE.md): nespouštět api DB testy proti živé DB (mažou `calendar_blocks`).
  Tato slice je read‑only a bez DB, takže riziko nehrozí, dokud nepřidáme persistenci.

## 6. Otevřené otázky k rozhodnutí (ráno)

1. **Praha**: stačí v první verzi poznámka „přímo Smartwings/Eurowings" + odkaz, nebo
   chceš rovnou i druhý zdroj (Amadeus/AeroDataBox), aby Praha měla reálné časy?
2. **Umístění ve webu**: samostatná stránka `/letecke-spojeni`, nebo to napojit pod
   kalendář „Volné termíny" (předvyplnit zvoleným termínem)?
3. **Zpáteční lety**: chceš jen směr DO Alicante, nebo i ZPĚT (ALC→origin) ve stejném
   rozsahu? (Ryanair API to umí stejně.)
4. **Cache/persistence**: stačí in‑memory TTL, nebo rovnou tabulka + denní cron jako
   u cen?
5. **Odkaz na rezervaci letenky**: přidat deep‑link na ryanair.com pro daný let/datum
   (umíme složit), nebo nechat jen informativní rozvrh?

## 7. Proof of concept

`docs/research/flight-schedules-poc.mjs` — spustitelný bez závislostí:

```bash
node docs/research/flight-schedules-poc.mjs 2026-07-06 2026-07-13
```

Vypíše reálné rozvrhy všech 7 letišť do ALC pro zadaný týden (ověřeno, funguje).
Logika fetch + normalizace je 1:1 přenositelná do `RyanairScheduleProvider`.
