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

## Fotky a obsah

Obsah je v `web/content/*.md` (frontmatter + markdown tělo).
Fotky jsou v `web/public/images/{home,apartment,surroundings,trips}/`.
Nahraď placeholder soubory vlastními se **stejnými názvy** — žádná změna kódu není potřeba.

Výletní tipy: každý soubor `web/content/trips/<slug>.md` má frontmatter
`title`, `category`, `image`, `summary`, `order` (volitelně `externalLink`, `distanceKm`).
Stránka `/tipy-na-vylety/<slug>` se vygeneruje automaticky (`generateStaticParams`).

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
- [ ] I — Smlouvy v PDF (varianty se zálohou / bez zálohy), generované a odeslané e-mailem; navázat na stavy rezervace; Vsechny smlouvy musi byt na 10 noci, 11 dni, jeste radsi udelej research legislativy
- [ ] J — iCal export (přidání rezervace do Google Calendaru včetně jména, příjmení a tel. čísla hosta)
- [ ] K — E-maily (rozmyslet typy a design)
- [ ] L — Logo a design
- [ ] M — Instalace na produkci
- [ ] N — Zkontrolovat loginy a bezpečnost (silný `JWT_SECRET` při bootu, audit admin endpointů)
- [ ] O - Stranka s info "Z letiste"
- [ ] P - Multi apartman
- [ ] Q - Rozsireni administrace o pridani vice uzivatelu (neni nutny prehled, jen prihlaseni a pripadne role pozdeji pro vice apartmanu)
- [ ] R - Editace nekterych veci v administraci, jmeno, email a telefon
