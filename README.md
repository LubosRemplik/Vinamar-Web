# Vinamar Web

Web pro pronájem apartmánu v La Mata, Torrevieja. Monorepo: `api/` (NestJS, onion) + `web/` (Next.js).

## Spuštění

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API health: http://localhost:3001/api/health

Migrace se spustí automaticky při startu kontejneru `api` (před nasloucháním aplikace).

### Běh na alternativních portech (worktree / kolize portů)

Porty jsou parametrizované přes `.env` (`WEB_PORT`, `API_PORT`). Pro izolovaný běh
(např. když je `3000` obsazený jiným projektem) buď nastav proměnné prostředí:

```bash
WEB_PORT=3100 API_PORT=3101 docker compose up --build
```

…nebo zkopíruj `docker-compose.override.yml.example` do `docker-compose.override.yml`
(soubor je v `.gitignore`) a uprav porty.

### Přístup přes Tailscale (MagicDNS, jen tvůj tailnet)

Služba `tailscale` (sidecar, userspace režim) zpřístupní aplikaci v rámci tvého
tailnetu přes HTTPS na MagicDNS jménu — bez veřejné expozice (Tailscale Serve, ne Funnel).

1. V [admin konzoli Tailscale](https://login.tailscale.com/admin/settings/keys) vygeneruj
   **reusable** auth key (doporučeno tagged, např. `tag:vinamar`).
2. V konzoli zapni **HTTPS certifikáty** (MagicDNS → HTTPS) pro tailnet — Serve je bez nich
   nevydá.
3. Vlož klíč do `.env.local` (je v `.gitignore`):
   ```bash
   echo "TS_AUTHKEY=tskey-auth-…" >> .env.local
   ```
4. `cp .env.example .env` (nastavuje `TS_HOSTNAME`, výchozí `vinamar`) a spusť:
   ```bash
   docker compose up --build
   ```
5. Z libovolného zařízení v tailnetu otevři **`https://vinamar.<tvůj-tailnet>.ts.net`**.

Prohlížeč mluví s API přes stejný původ: Next.js přepisuje `/api/*` na službu `api`
(`API_PROXY_TARGET`), takže přes MagicDNS i přes `localhost` to funguje bez napevno
zadaného hostu. Identita uzlu přežívá restarty ve volume `tailscale_state`; serve
konfigurace je v `tailscale/serve.json`.

## Architektura

- **api/** — onion vrstvy: `domain` (bez frameworku) → `application` (CQRS handlery) → `infrastructure` (raw SQL přes `pg`, migrace `node-pg-migrate`) → `interface` (HTTP). Závislosti míří dovnitř; hlídá ESLint (`api/.eslintrc.cjs`, rule pro `src/domain/**`).
- **web/** — Next.js App Router, staticky generované stránky z markdownu v `web/content/`.

### Referenční vertikální řez (`/api/health`)

`HealthController` → `QueryBus` → `CheckHealthHandler` → port `DbHealthChecker`
→ infra adaptér `PgHealthChecker` (raw SQL `SELECT 1`) → `HealthStatus`.
Typované doménové chyby (`DomainError`) převádí `ProblemDetailFilter` na RFC-7807
`application/problem+json`.

### Vzor pro nové funkce (B/C/D)

Kopíruj `health` slice: port v `domain/`, handler v `application/`, raw-SQL adaptér
v `infrastructure/`, controller v `interface/`, zapojení v modulu.

## Vizuální identita

Logo **ViñaMar** je verzálkový nápis v Kaushan Script (`web/components/Logo.tsx`).
Nadpisy sází Cormorant Garamond, běžný text Jost; všechna tři písma se načítají
přes `next/font/google`.

Paleta (`web/tailwind.config.ts`): `ink` `#1F3A34`, `paper` `#FBF8F3`,
`sage` `#61716A`, `brass` `#A9885A`, `line` `#E4DCCF`. Tokeny `terracotta`,
`ochre`, `sand` a `sea` zůstávají už jen kvůli administraci.

Hodnoty `sage` a `brass` jsou zvolené podle kontrastu na podkladu `paper`:
4,86:1 pro sekundární text (WCAG AA i pro 11px oční linky) a 3,12:1 pro ikony
a linky (AA pro grafické prvky). Když je budeš ladit, kontrast přepočítej.

Favicon se generuje rasterizací písmene „V“ — po změně loga spusť:

```bash
cd web && npm run favicon      # zapíše app/icon.png a app/apple-icon.png
```

## Fotky a obsah

Obsah je v `web/content/*.md` (frontmatter + markdown tělo).

**Fotky apartmánu** — originály patří do `Assets/` (mimo git). Skript je zmenší
na 2000 px, uloží jako JPEG do `web/public/images/` a pojmenuje podle mapování
uvnitř skriptu:

```bash
web/scripts/prepare-photos.sh
```

Chceš-li vyměnit konkrétní fotku, uprav v tom skriptu dvojici
`zdrojový soubor|cílová cesta` a spusť ho znovu.

**Fotky výletů** pocházejí z Wikimedia Commons pod licencemi CC BY / CC BY-SA / CC0.
Stahuje je `web/scripts/fetch-trip-photos.py`; u každé je v něm uvedený autor
a licence, které se musí shodovat s polem `imageCredit` v příslušném markdownu.
Nikdy sem nepřidávej fotku, u které jsi neověřil licenci.

Výletní tipy: každý soubor `web/content/trips/<slug>.md` má frontmatter
`title`, `category`, `summary`, `order` (volitelně `image`, `imageCredit`,
`imageCreditUrl`, `externalLink`, `distanceKm`, `driveMinutes`).
Tip bez `image` se vykreslí jako typografická dlaždice s monogramem — používá se
tam, kde volně licencovaná fotka místa neexistuje (Aquopolis, pouť v Torrevieji).
Stránka `/tipy-na-vylety/<slug>` se vygeneruje automaticky (`generateStaticParams`).

## E-maily

Transakční maily používají následující proměnné prostředí:

| Proměnná | Popis |
|---|---|
| `SMTP_HOST` | SMTP server (v dev: `mailpit`) |
| `SMTP_PORT` | SMTP port (v dev: `1025`) |
| `SMTP_FROM` | Adresa odesílatele |
| `MAIL_FROM_NAME` | Jméno odesílatele (zobrazí se v klientovi jako „Od:") |
| `OWNER_EMAIL` | E-mail majitele apartmánu (dostává notifikace) |
| `PUBLIC_BASE_URL` | Veřejná URL webu — slouží pro sestavení odkazů v mailech (např. `http://localhost:3000`) |

V dev prostředí zachytává všechny odchozí maily **mailpit** (UI: http://localhost:8025).
Pro přístup na alternativním portu nastav `MAILPIT_UI_PORT` v `.env`.

## Testy

```bash
# api (potřebuje běžící db: docker compose up -d db)
cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm test
cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run test:e2e
cd api && npm run lint        # onion dependency rule

# web
cd web && npm test            # vitest (content loader)
cd web && npm run e2e         # playwright smoke (proti běžící aplikaci)
```

## TODO (další sub-projekty)
- [x] A — Foundation & Showcase
- [x] B — Availability & Inquiries
- [x] C — Flight Prices (Travelpayouts)
- [x] D — Cheapest-Dates Optimizer
- [x] E — CI/CD (GitHub Actions)
- [x] F — Availability-first reframe (calendar wall, retire flight-first pages)
- [x] G — Letecké spojení do Alicante (rozvrh tam/zpět z 7 letišť, Ryanair timetable, tabulka + cron)
- [x] H — Administrace rezervací (odhlášení, admin rezervace přes veřejný tok s relaxací pravidel, jednotný seznam kalendáře s rušením)
- [x] I — Smlouvy v PDF (varianty se zálohou / bez zálohy), generované a odeslané e-mailem; navázat na stavy rezervace; Vsechny smlouvy musi byt na 10 noci, 11 dni, jeste radsi udelej research legislativy
- [x] J — iCal export (přidání rezervace do Google Calendaru včetně jména, příjmení a tel. čísla hosta)
- [x] K — E-maily (transakční maily kolem rezervace: poptávka, potvrzení, odmítnutí, zrušení, připomínka 14 dní; HTML šablony, čeština)
- [x] L — Logo a design (identita ViñaMar, nová paleta a písma, reálné fotky, sloučení Apartmán + Okolí, přestavěné tipy na výlety)
- [ ] M — Instalace na produkci
- [ ] N — Zkontrolovat loginy a bezpečnost (silný `JWT_SECRET` při bootu, audit admin endpointů)
- [x] O - Stranka s info "Z letiste" (statická stránka /z-letiste: auto / bus / taxi + odkaz na Google Maps trasu, odkaz v navigaci)
- [ ] P - Multi apartman
- [ ] Q - Rozsireni administrace o pridani vice uzivatelu (neni nutny prehled, jen prihlaseni a pripadne role pozdeji pro vice apartmanu)
- [x] R - Editace nekterych veci v administraci, jmeno, email a telefon
