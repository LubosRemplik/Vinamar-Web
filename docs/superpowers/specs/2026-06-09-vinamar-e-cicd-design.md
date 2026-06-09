# Sub-project E — CI/CD

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Parent:** [System Architecture & Decomposition](./2026-06-09-vinamar-system-architecture-design.md)
**Depends on:** A (and benefits from B/C/D existing, but the workflow is generic over whatever tests exist)

## 1. Goal

Continuous integration via GitHub Actions: on every push and pull request, run backend lint + unit tests + e2e tests (against a Postgres service), and the frontend build + unit tests + Playwright e2e (against the Docker stack). No deployment — that's a later decision once a hosting target exists.

## 2. Key decisions

| Topic | Decision |
|---|---|
| Platform | **GitHub Actions** (matches the "create a GitHub pull request" workflow). |
| Scope | **CI only** — lint, unit, e2e, build. No CD/deploy yet. |
| Backend e2e DB | A `postgres:16` **service container**; migrations run before tests. |
| Frontend e2e | Bring up the full `docker compose` stack, run Playwright against it. |
| Triggers | `push` to `main` and `pull_request`. |
| Node | 22 (matches the Docker images). |

## 3. Jobs

1. **api** — Node 22; `postgres:16` service; `npm ci` in `api/`; `npm run migrate up`; `npm run lint`; `npm test`; `npm run test:e2e`. `DATABASE_URL` points at the service.
2. **web** — Node 22; `npm ci` in `web/`; `npm run build`; `npm test` (Vitest).
3. **e2e** — needs the stack: `docker compose up -d --build`; wait for `/api/health`; `npx playwright install --with-deps chromium`; `E2E_BASE_URL=http://localhost:3000 npm run e2e` in `web/`; tear down. Uses the mock flight provider (no `TRAVELPAYOUTS_TOKEN`), so no secrets required.

## 4. Testing / acceptance

1. The workflow file is valid YAML and runs all three jobs on push/PR.
2. `api` job: lint + unit + e2e green against the service Postgres.
3. `web` job: build + Vitest green.
4. `e2e` job: Playwright green against the composed stack.
5. A failing test fails the workflow (non-zero exit).

## 5. Out of scope

Deployment, container registry publishing, environment promotion, secrets for a live Travelpayouts token (CI uses the mock provider).
