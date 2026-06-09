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
- [ ] D — Cheapest-Dates Optimizer
