# Vinamar Web — Sub-project E (CI/CD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions CI workflow that lints, unit-tests, and e2e-tests the backend and frontend on every push to `main` and every pull request.

**Architecture:** One workflow file, three jobs — `api` (lint + unit + e2e against a Postgres service), `web` (build + Vitest), `e2e` (Playwright against the composed Docker stack with the mock flight provider).

**Tech Stack:** GitHub Actions, Node 22, `postgres:16` service container, Docker Compose, Playwright.

**Spec:** [docs/superpowers/specs/2026-06-09-vinamar-e-cicd-design.md](../specs/2026-06-09-vinamar-e-cicd-design.md)

**Prerequisite:** Sub-project A merged (the `api/` and `web/` test scripts must exist). Jobs that reference B/C/D tests simply pick them up automatically once those exist.

---

## File Structure

```
.github/workflows/ci.yml
```

---

## Task 1: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  api:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: vinamar
          POSTGRES_PASSWORD: vinamar
          POSTGRES_DB: vinamar
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U vinamar"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    env:
      DATABASE_URL: postgres://vinamar:vinamar@localhost:5432/vinamar
    defaults:
      run:
        working-directory: api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: api/package-lock.json
      - run: npm ci
      - run: npm run migrate up
      - run: npm run lint
      - run: npm test
      - run: npm run test:e2e

  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start the stack
        run: |
          cp .env.example .env
          docker compose up -d --build
      - name: Wait for the API
        run: |
          for i in $(seq 1 30); do
            if curl -sf http://localhost:3001/api/health; then echo ready; break; fi
            sleep 3
          done
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - name: Install Playwright + run e2e
        working-directory: web
        run: |
          npm ci
          npx playwright install --with-deps chromium
          E2E_BASE_URL=http://localhost:3000 npm run e2e
      - name: Tear down
        if: always()
        run: docker compose down -v
```

- [ ] **Step 2: Validate the workflow YAML locally**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('valid yaml')"`
Expected: `valid yaml`.

- [ ] **Step 3: Mark README TODO E (add it) + commit**

Add to the README TODO list `- [x] E — CI/CD` (done once this workflow exists), then:

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: add github actions workflow for api, web and e2e"
```

> The workflow runs on GitHub once the repo is pushed to a GitHub remote. Locally, the equivalent of each job is the test commands already run during A–D; this task only adds the automation file and validates its syntax.

---

## Self-Review Notes

- **Spec coverage:** GitHub Actions (T1) · CI-only, no deploy (T1 has no deploy job) · Postgres service + migrations before tests (api job) · full-stack Playwright with mock provider, no secrets (e2e job) · push/PR triggers (T1 `on:`). All acceptance items map to T1.
- **No placeholders:** the workflow is complete; the validation step has an exact command + expected output.
- **Consistency:** job steps call exactly the scripts defined in the A plan (`migrate`, `lint`, `test`, `test:e2e` in `api`; `build`, `test`, `e2e` in `web`) and the compose health endpoint `/api/health`.
```
