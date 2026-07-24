# Nasazení www.vinamar.cz na vps.hkdev.cz

Datum: 2026-07-24
Stav: schváleno (brainstorm s Lubošem)

## Cíl

Zprovoznit produkční web www.vinamar.cz na stávajícím VPS `vps.hkdev.cz` vedle
revizeplus, stejným vzorem: Caddy (automatický Let's Encrypt) + docker compose
v `/opt/vinamar`, kontejnery na externí síti `caddy_proxy` bez publikovaných
portů. DNS pro `vinamar.cz` i `www.vinamar.cz` už míří na VPS.

Rozhodnutí z brainstormu:

- **Deploy:** build image lokálně, přenos přes SSH (`docker save | ssh docker load`).
  Žádný registr, žádný build na serveru.
- **E-maily:** reálné SMTP; credentials doplní Luboš do `.env` na serveru
  (do té doby zůstávají placeholdery a maily neodejdou).
- **Zálohy DB:** noční `pg_dump` do `/opt/vinamar/backups`, který si odnese
  stávající celoserverový restic běžící ve 3:30 (`/opt` je ve zdrojích,
  retence 7 denních / 4 týdenní / 6 měsíčních).

## 1. Produkční image (změny v repu)

`api/Dockerfile` a `web/Dockerfile` se přepíšou na multi-stage se dvěma targety:

- `dev` — současné chování (`npm run start:dev` / `next dev`), používá ho
  lokální `docker-compose.yml` (doplní se `build.target: dev`).
- `production`:
  - **api:** `npm ci` → `nest build` → runtime stage jen s produkčními
    závislostmi (`npm ci --omit=dev`); start `npm run migrate up && node dist/main`
    (migrace při startu, stejné pořadí jako dnes).
  - **web:** `npm ci` → `next build` s build-arg `NEXT_PUBLIC_API_URL=/api` →
    runtime `next start`. `API_PROXY_TARGET=http://api:3001` zůstává runtime env
    pro Next rewrites.

## 2. Makefile

- Výchozí target je `help` — vypíše dostupné targety s popisem
  (samodokumentace přes `##` komentáře a awk).
- Nový target `deploy-prod`:
  1. build obou image lokálně s `--platform linux/amd64` (Mac je ARM, VPS x86_64),
     tagy `vinamar/api:latest` + `vinamar/api:<git-sha>` (dtto web) kvůli rollbacku,
  2. `docker save vinamar/api:latest vinamar/web:latest | ssh vps.hkdev.cz docker load`,
  3. `ssh vps.hkdev.cz 'cd /opt/vinamar && docker compose up -d'`.

## 3. Server `/opt/vinamar`

`docker-compose.yml` (name: `vinamar`, síť `caddy_proxy` external):

- `db`: `postgres:16-alpine`, volume `db_data`, healthcheck `pg_isready`,
  jen interní default síť, bez publikovaných portů.
- `api`: `vinamar/api:latest`, `container_name: vinamar-api`, `env_file: .env`,
  `depends_on: db (healthy)`, sítě default + `caddy_proxy`, restart unless-stopped.
- `web`: `vinamar/web:latest`, `container_name: vinamar-web`,
  `API_PROXY_TARGET=http://api:3001`, síť default + `caddy_proxy`,
  restart unless-stopped.

`.env` (na serveru, mode 600):

- vygenerované silné hodnoty: `POSTGRES_PASSWORD`, `JWT_SECRET`,
  `ADMIN_PASSWORD`, `ICAL_FEED_TOKEN`, `FLIGHTS_REFRESH_TOKEN`
  (`openssl rand -hex 32`),
- `PUBLIC_BASE_URL=https://www.vinamar.cz`, `ADMIN_USERNAME`, `OWNER_EMAIL`,
- `SMTP_HOST/PORT/FROM` + případné přihlašovací údaje — **placeholdery,
  doplní Luboš**,
- `TRAVELPAYOUTS_TOKEN/MARKER` — placeholdery (volitelné).

Kontejner `tailscale` z lokálního compose se na prod nepřenáší (je jen pro
lokální preview).

## 4. Caddy

Do `/opt/caddy/Caddyfile` (před úpravou timestamped záloha
`Caddyfile.bak.YYYYMMDDHHMMSS`, po úpravě `caddy reload`):

```
vinamar.cz {
    redir https://www.vinamar.cz{uri} permanent
}

www.vinamar.cz {
    encode zstd gzip

    @api path /api/*
    reverse_proxy @api vinamar-api:3001

    reverse_proxy vinamar-web:3000
}
```

Let's Encrypt certifikáty pro obě jména vyřídí Caddy automaticky. Žádný
robots.txt disallow — produkční web se má indexovat.

## 5. Zálohy DB

Cron na serveru (uživatel lubos) ve 3:00:

- `docker compose -f /opt/vinamar/docker-compose.yml exec -T db pg_dump -U vinamar vinamar | gzip > /opt/vinamar/backups/vinamar-YYYYMMDD.sql.gz`
- lokální rotace: mazat dumpy starší 7 dní,
- restic ve 3:30 odnese `/opt` včetně čerstvého dumpu.

## 6. Ověření po nasazení

1. `https://vinamar.cz` → 301 na `https://www.vinamar.cz` (platný LE certifikát).
2. `https://www.vinamar.cz` → 200, vyrenderovaný obsah.
3. `https://www.vinamar.cz/api/health` → 200.
4. Kalendář dostupnosti na webu načítá data (`/api/availability`).
5. Admin login na `/admin` s novými credentials.
6. Test e-mailu až po doplnění SMTP credentials.

## Mimo rozsah

- CI build/push image (zůstává jen testovací CI).
- Vlastní mailpit / mail UI pro Vinamar.
- Monitoring nad rámec stávajícího beszel-agenta.
