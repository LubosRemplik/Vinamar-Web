# Vinamar Web — Sub-project A (Foundation & Showcase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a containerized NestJS (onion) + Next.js + PostgreSQL monorepo that runs with one command, exposing a layered `/api/health` endpoint and four static Czech showcase pages in the Warm Mediterranean theme.

**Architecture:** Monorepo with `api/` (NestJS, onion layers: domain → application → infrastructure → interface, CQRS-lite via `@nestjs/cqrs`, raw SQL via `pg`, migrations via `node-pg-migrate`) and `web/` (Next.js App Router, statically-generated markdown-driven pages). docker-compose runs `db`, `api`, `web`.

**Tech Stack:** Node 22, TypeScript, NestJS 11, `@nestjs/cqrs`, `pg`, `node-pg-migrate`, Next.js 15 (App Router), Tailwind CSS, `gray-matter`, `remark`/`remark-html`, Jest (api), Vitest (web), Playwright (web e2e), Docker Compose, PostgreSQL 16.

**Spec:** [docs/superpowers/specs/2026-06-09-vinamar-a-foundation-showcase-design.md](../specs/2026-06-09-vinamar-a-foundation-showcase-design.md)

---

## File Structure

```
Vinamar-Web/
  docker-compose.yml                       # db, api, web
  docker-compose.override.yml.example      # alt-ports template for worktrees
  .env.example
  README.md
  api/
    Dockerfile
    package.json  tsconfig.json  .eslintrc.cjs  nest-cli.json
    migrations/
      1700000000000_init-extensions.sql
    src/
      main.ts
      app.module.ts
      domain/
        errors/domain-error.ts
        health/health-status.ts
        health/db-health-checker.port.ts
        health/database-unavailable.error.ts
      application/
        health/check-health.query.ts
        health/check-health.handler.ts
      infrastructure/
        config/database.config.ts
        persistence/pg-connection.ts
        persistence/pg-health-checker.ts
      interface/
        http/health.controller.ts
        http/problem-detail.filter.ts
        health.module.ts
    test/
      application/check-health.handler.spec.ts
      infrastructure/pg-health-checker.spec.ts
      health.e2e-spec.ts
  web/
    Dockerfile
    package.json  tsconfig.json  next.config.mjs  tailwind.config.ts  postcss.config.mjs
    vitest.config.ts  playwright.config.ts
    app/
      layout.tsx  globals.css
      page.tsx
      apartman/page.tsx
      okoli/page.tsx
      tipy-na-vylety/page.tsx
      tipy-na-vylety/[slug]/page.tsx
    components/
      Nav.tsx  Footer.tsx  Hero.tsx  Highlights.tsx  Gallery.tsx
      TripCard.tsx  SectionTeaser.tsx
    lib/
      content.ts
      content.test.ts
    content/
      home.md  apartman.md  okoli.md
      trips/la-mata-plaz.md  trips/solna-jezera.md  trips/torrevieja-pristav.md
    public/images/
      home/  apartment/  surroundings/  trips/
    e2e/
      showcase.spec.ts
```

**Responsibilities:** `domain/` holds framework-free types/ports; `application/` holds use-case handlers; `infrastructure/` holds SQL + config adapters; `interface/` holds HTTP controllers + the module wiring. On the web side, `lib/content.ts` is the only file that touches the filesystem; pages stay declarative.

---

## Task 1: Monorepo scaffold + docker-compose with PostgreSQL

**Files:**
- Create: `.gitignore` (exists — extend), `.env.example`, `docker-compose.yml`, `docker-compose.override.yml.example`

- [ ] **Step 1: Extend `.gitignore`**

Append to `/Users/lubos/Remplikovi/Vinamar-Web/.gitignore`:

```
# deps & build
node_modules/
dist/
.next/
out/
# env & logs
.env
*.log
# test artifacts
coverage/
playwright-report/
test-results/
```

- [ ] **Step 2: Create `.env.example`**

```
POSTGRES_USER=vinamar
POSTGRES_PASSWORD=vinamar
POSTGRES_DB=vinamar
DATABASE_URL=postgres://vinamar:vinamar@db:5432/vinamar
API_PORT=3001
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

- [ ] **Step 3: Create `docker-compose.yml`** (db only for now; api/web added in Tasks 9 & 17)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-vinamar}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-vinamar}
      POSTGRES_DB: ${POSTGRES_DB:-vinamar}
    ports:
      - "127.0.0.1:5432:5432"   # loopback-only: not exposed on the network (dev DB)
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-vinamar}"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  db_data:
```

- [ ] **Step 4: Create `docker-compose.override.yml.example`** (worktree alt-ports template)

```yaml
# Copy to docker-compose.override.yml in a worktree and bump ports to run
# isolated from the main environment.
services:
  db:
    ports:
      - "5532:5432"
  api:
    ports:
      - "3101:3001"
  web:
    ports:
      - "3100:3000"
```

- [ ] **Step 5: Verify db starts**

Run: `cp .env.example .env && docker compose up -d db && docker compose ps`
Expected: `db` service is `running` / healthy.

- [ ] **Step 6: Commit**

```bash
git add .gitignore .env.example docker-compose.yml docker-compose.override.yml.example
git commit -m "chore: scaffold monorepo and postgres compose service"
```

---

## Task 2: NestJS api scaffold with onion folders

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/nest-cli.json`, `api/.eslintrc.cjs`, `api/src/main.ts`, `api/src/app.module.ts`

- [ ] **Step 1: Scaffold the Nest app**

Run:
```bash
cd api
npm init -y
npm install @nestjs/common@^11 @nestjs/core@^11 @nestjs/platform-express@^11 @nestjs/cqrs@^11 @nestjs/config@^3 reflect-metadata rxjs pg
npm install -D typescript @types/node @types/pg ts-node tsconfig-paths @nestjs/cli @nestjs/testing jest ts-jest @types/jest supertest @types/supertest eslint@^8 @typescript-eslint/parser@^7 @typescript-eslint/eslint-plugin@^7 eslint-plugin-import node-pg-migrate
```

- [ ] **Step 2: Create `api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "declaration": false,
    "outDir": "./dist",
    "baseUrl": "./",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 3: Create `api/nest-cli.json`**

```json
{ "collection": "@nestjs/schematics", "sourceRoot": "src" }
```

- [ ] **Step 4: Set `api/package.json` scripts** (merge into the generated file)

```json
{
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:dev": "nest start --watch",
    "migrate": "node-pg-migrate --migrations-dir migrations",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.json",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\""
  }
}
```

- [ ] **Step 5: Create `api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './interface/health.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule],
})
export class AppModule {}
```

- [ ] **Step 6: Create `api/src/main.ts`**

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ProblemDetailFilter } from './interface/http/problem-detail.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ProblemDetailFilter());
  await app.listen(process.env.API_PORT ?? 3001);
}
bootstrap();
```

(`HealthModule` and `ProblemDetailFilter` are created in Tasks 4–7; the app will not compile until then — that is expected. Do not run yet.)

- [ ] **Step 7: Commit**

```bash
git add api/package.json api/package-lock.json api/tsconfig.json api/nest-cli.json
git commit -m "chore(api): scaffold nestjs app and dependencies"
```

---

## Task 3: PostgreSQL connection + migration runner

**Files:**
- Create: `api/src/infrastructure/config/database.config.ts`, `api/src/infrastructure/persistence/pg-connection.ts`, `api/migrations/1700000000000_init-extensions.sql`

- [ ] **Step 1: Create `api/migrations/1700000000000_init-extensions.sql`**

```sql
-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Down Migration
DROP EXTENSION IF EXISTS pgcrypto;
```

- [ ] **Step 2: Create `api/src/infrastructure/config/database.config.ts`**

```ts
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}
```

- [ ] **Step 3: Create `api/src/infrastructure/persistence/pg-connection.ts`**

```ts
import { Pool } from 'pg';
import { databaseUrl } from '../config/database.config';

export const PG_POOL = Symbol('PG_POOL');

export const pgPoolProvider = {
  provide: PG_POOL,
  useFactory: (): Pool => new Pool({ connectionString: databaseUrl() }),
};
```

- [ ] **Step 4: Verify the migration runs against the running db**

Run (from `api/`, with the compose db up and `DATABASE_URL` pointing at localhost):
```bash
DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run migrate up
```
Expected: output `Migrating files: > 1700000000000_init-extensions` and `Migrations complete!`. A `pgmigrations` table now exists.

- [ ] **Step 5: Commit**

```bash
git add api/migrations api/src/infrastructure
git commit -m "feat(api): add pg connection pool and initial migration"
```

---

## Task 4: Health domain layer (ports + value object + error)

**Files:**
- Create: `api/src/domain/errors/domain-error.ts`, `api/src/domain/health/health-status.ts`, `api/src/domain/health/db-health-checker.port.ts`, `api/src/domain/health/database-unavailable.error.ts`

- [ ] **Step 1: Create `api/src/domain/errors/domain-error.ts`**

```ts
export abstract class DomainError extends Error {
  abstract readonly status: number;
  abstract readonly type: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
```

- [ ] **Step 2: Create `api/src/domain/health/health-status.ts`**

```ts
export type DbState = 'ok' | 'down';

export class HealthStatus {
  constructor(
    public readonly database: DbState,
    public readonly checkedAt: Date,
  ) {}

  get isHealthy(): boolean {
    return this.database === 'ok';
  }
}
```

- [ ] **Step 3: Create `api/src/domain/health/db-health-checker.port.ts`**

```ts
export const DB_HEALTH_CHECKER = Symbol('DbHealthChecker');

export interface DbHealthChecker {
  ping(): Promise<boolean>;
}
```

- [ ] **Step 4: Create `api/src/domain/health/database-unavailable.error.ts`**

```ts
import { DomainError } from '../errors/domain-error';

export class DatabaseUnavailableError extends DomainError {
  readonly status = 503;
  readonly type = 'https://vinamar.example/errors/database-unavailable';

  constructor() {
    super('Database is not reachable');
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add api/src/domain
git commit -m "feat(api): add health domain port, value object and error"
```

---

## Task 5: CheckHealth application handler (TDD)

**Files:**
- Create: `api/src/application/health/check-health.query.ts`, `api/src/application/health/check-health.handler.ts`, `api/test/application/check-health.handler.spec.ts`
- Create: `api/jest.config.js`

- [ ] **Step 1: Create `api/jest.config.js`**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/test/**/*.spec.ts'],
  testPathIgnorePatterns: ['\\.e2e-spec\\.ts$'],
};
```

- [ ] **Step 2: Write the failing test** — `api/test/application/check-health.handler.spec.ts`

```ts
import { CheckHealthHandler } from '../../src/application/health/check-health.handler';
import { CheckHealthQuery } from '../../src/application/health/check-health.query';
import { DbHealthChecker } from '../../src/domain/health/db-health-checker.port';

const checkerReturning = (value: boolean): DbHealthChecker => ({
  ping: async () => value,
});

describe('CheckHealthHandler', () => {
  it('reports the database as ok when the checker pings successfully', async () => {
    const handler = new CheckHealthHandler(checkerReturning(true));
    const status = await handler.execute(new CheckHealthQuery());
    expect(status.database).toBe('ok');
    expect(status.isHealthy).toBe(true);
  });

  it('reports the database as down when the checker fails to ping', async () => {
    const handler = new CheckHealthHandler(checkerReturning(false));
    const status = await handler.execute(new CheckHealthQuery());
    expect(status.database).toBe('down');
    expect(status.isHealthy).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd api && npx jest test/application/check-health.handler.spec.ts`
Expected: FAIL — cannot find `check-health.handler` / `check-health.query`.

- [ ] **Step 4: Create `api/src/application/health/check-health.query.ts`**

```ts
export class CheckHealthQuery {}
```

- [ ] **Step 5: Create `api/src/application/health/check-health.handler.ts`**

```ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CheckHealthQuery } from './check-health.query';
import {
  DB_HEALTH_CHECKER,
  DbHealthChecker,
} from '../../domain/health/db-health-checker.port';
import { HealthStatus } from '../../domain/health/health-status';

@QueryHandler(CheckHealthQuery)
export class CheckHealthHandler
  implements IQueryHandler<CheckHealthQuery, HealthStatus>
{
  constructor(
    @Inject(DB_HEALTH_CHECKER) private readonly checker: DbHealthChecker,
  ) {}

  async execute(_query: CheckHealthQuery): Promise<HealthStatus> {
    const ok = await this.checker.ping();
    return new HealthStatus(ok ? 'ok' : 'down', new Date());
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd api && npx jest test/application/check-health.handler.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add api/jest.config.js api/src/application api/test/application
git commit -m "feat(api): add CheckHealth query handler with tests"
```

---

## Task 6: PgHealthChecker infrastructure adapter (integration test)

**Files:**
- Create: `api/src/infrastructure/persistence/pg-health-checker.ts`, `api/test/infrastructure/pg-health-checker.spec.ts`

- [ ] **Step 1: Write the failing integration test** — `api/test/infrastructure/pg-health-checker.spec.ts`

```ts
import { Pool } from 'pg';
import { PgHealthChecker } from '../../src/infrastructure/persistence/pg-health-checker';

const url =
  process.env.DATABASE_URL ??
  'postgres://vinamar:vinamar@localhost:5432/vinamar';

describe('PgHealthChecker (integration)', () => {
  it('returns true against a reachable database', async () => {
    const pool = new Pool({ connectionString: url });
    const checker = new PgHealthChecker(pool);
    await expect(checker.ping()).resolves.toBe(true);
    await pool.end();
  });

  it('returns false against an unreachable database', async () => {
    const pool = new Pool({
      connectionString: 'postgres://nobody:nobody@localhost:1/none',
    });
    const checker = new PgHealthChecker(pool);
    await expect(checker.ping()).resolves.toBe(false);
    await pool.end();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && npx jest test/infrastructure/pg-health-checker.spec.ts`
Expected: FAIL — cannot find `pg-health-checker`.

- [ ] **Step 3: Create `api/src/infrastructure/persistence/pg-health-checker.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DbHealthChecker } from '../../domain/health/db-health-checker.port';
import { PG_POOL } from './pg-connection';

@Injectable()
export class PgHealthChecker implements DbHealthChecker {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes** (db compose service must be up)

Run: `cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npx jest test/infrastructure/pg-health-checker.spec.ts`
Expected: PASS (2 tests). Second test may log a connection error — that is caught and expected.

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/persistence/pg-health-checker.ts api/test/infrastructure
git commit -m "feat(api): add raw-SQL pg health checker with integration tests"
```

---

## Task 7: Health controller + problem-detail filter + module + e2e

**Files:**
- Create: `api/src/interface/http/problem-detail.filter.ts`, `api/src/interface/http/health.controller.ts`, `api/src/interface/health.module.ts`, `api/test/health.e2e-spec.ts`, `api/test/jest-e2e.json`

- [ ] **Step 1: Create `api/src/interface/http/problem-detail.filter.ts`**

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../domain/errors/domain-error';

@Catch()
export class ProblemDetailFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError) {
      this.send(res, exception.status, exception.type, exception.name, exception.message);
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      this.send(res, status, 'about:blank', exception.name, exception.message);
      return;
    }
    this.send(
      res,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'about:blank',
      'InternalServerError',
      'Unexpected error',
    );
  }

  private send(
    res: Response,
    status: number,
    type: string,
    title: string,
    detail: string,
  ): void {
    res
      .status(status)
      .contentType('application/problem+json')
      .json({ type, title, status, detail });
  }
}
```

- [ ] **Step 2: Create `api/src/interface/http/health.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CheckHealthQuery } from '../../application/health/check-health.query';
import { HealthStatus } from '../../domain/health/health-status';
import { DatabaseUnavailableError } from '../../domain/health/database-unavailable.error';

@Controller('health')
export class HealthController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async health() {
    const status = await this.queryBus.execute<CheckHealthQuery, HealthStatus>(
      new CheckHealthQuery(),
    );
    if (!status.isHealthy) {
      throw new DatabaseUnavailableError();
    }
    return {
      status: 'ok',
      db: status.database,
      timestamp: status.checkedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 3: Create `api/src/interface/health.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthController } from './http/health.controller';
import { CheckHealthHandler } from '../application/health/check-health.handler';
import { pgPoolProvider } from '../infrastructure/persistence/pg-connection';
import { PgHealthChecker } from '../infrastructure/persistence/pg-health-checker';
import { DB_HEALTH_CHECKER } from '../domain/health/db-health-checker.port';

@Module({
  imports: [CqrsModule],
  controllers: [HealthController],
  providers: [
    CheckHealthHandler,
    pgPoolProvider,
    { provide: DB_HEALTH_CHECKER, useClass: PgHealthChecker },
  ],
})
export class HealthModule {}
```

- [ ] **Step 4: Create `api/test/jest-e2e.json`**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

- [ ] **Step 5: Write the e2e test** — `api/test/health.e2e-spec.ts`

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ProblemDetailFilter } from '../src/interface/http/problem-detail.filter';

describe('GET /api/health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new ProblemDetailFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with db ok when the database is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
    expect(typeof res.body.timestamp).toBe('string');
  });
});
```

- [ ] **Step 6: Run the e2e test** (db must be up; `DATABASE_URL` to localhost)

Run: `cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm run test:e2e`
Expected: PASS (1 test), proving controller → query bus → handler → checker → SQL.

- [ ] **Step 7: Run the full unit suite to confirm no regressions**

Run: `cd api && DATABASE_URL=postgres://vinamar:vinamar@localhost:5432/vinamar npm test`
Expected: PASS (handler + checker specs).

- [ ] **Step 8: Commit**

```bash
git add api/src/interface api/test/jest-e2e.json api/test/health.e2e-spec.ts
git commit -m "feat(api): expose /api/health through controller, filter and module"
```

---

## Task 8: Enforce the onion dependency rule (ESLint boundary)

**Files:**
- Create: `api/.eslintrc.cjs`

- [ ] **Step 1: Create `api/.eslintrc.cjs`** — forbid `domain/` importing outward

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: false, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist/', 'node_modules/', 'migrations/'],
  rules: {
    'no-restricted-imports': 'off',
  },
  overrides: [
    {
      files: ['src/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '**/application/**',
                  '**/infrastructure/**',
                  '**/interface/**',
                  '@nestjs/*',
                  'pg',
                ],
                message:
                  'Domain layer must not depend on outer layers or frameworks.',
              },
            ],
          },
        ],
      },
    },
  ],
};
```

- [ ] **Step 2: Run lint to verify the domain is clean**

Run: `cd api && npm run lint`
Expected: PASS, no boundary violations (the domain only imports within `domain/`).

- [ ] **Step 3: Verify the rule actually bites** (temporary check)

Add `import { Pool } from 'pg';` to the top of `src/domain/health/health-status.ts`, run `npm run lint`.
Expected: FAIL with "Domain layer must not depend on outer layers or frameworks." Then **remove the import** and re-run lint to confirm PASS.

- [ ] **Step 4: Commit**

```bash
git add api/.eslintrc.cjs
git commit -m "chore(api): enforce onion dependency rule via eslint"
```

---

## Task 9: Containerize the api + run migrations on start

**Files:**
- Create: `api/Dockerfile`, `api/.dockerignore`
- Modify: `docker-compose.yml` (add `api` service)

- [ ] **Step 1: Create `api/.dockerignore`**

```
node_modules
dist
test
```

- [ ] **Step 2: Create `api/Dockerfile`** (dev-oriented, runs migrations then watch)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["sh", "-c", "npm run migrate up && npm run start:dev"]
```

- [ ] **Step 3: Add the `api` service to `docker-compose.yml`** (insert under `services:`, after `db`)

```yaml
  api:
    build: ./api
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgres://vinamar:vinamar@db:5432/vinamar}
      API_PORT: 3001
    ports:
      - "${API_PORT:-3001}:3001"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./api:/app
      - /app/node_modules
```

- [ ] **Step 4: Bring up api via compose and verify migrations + health**

Run:
```bash
docker compose up -d --build api
sleep 8
curl -s http://localhost:3001/api/health
```
Expected: JSON `{"status":"ok","db":"ok","timestamp":"..."}`. Compose logs show the migration ran.

- [ ] **Step 5: Commit**

```bash
git add api/Dockerfile api/.dockerignore docker-compose.yml
git commit -m "feat: containerize api and run migrations on startup"
```

---

## Task 10: Next.js scaffold + Tailwind Warm Mediterranean theme

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/next.config.mjs`, `web/postcss.config.mjs`, `web/tailwind.config.ts`, `web/app/globals.css`, `web/app/layout.tsx`, `web/app/page.tsx` (temporary placeholder)

- [ ] **Step 1: Scaffold Next.js + install deps**

Run:
```bash
cd web
npm init -y
npm install next@^15 react@^18 react-dom@^18 gray-matter remark remark-html
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss@^3 postcss autoprefixer vitest @vitejs/plugin-react @playwright/test
```

- [ ] **Step 2: Set `web/package.json` scripts**

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "test": "vitest run",
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 3: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "incremental": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `web/next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
```

- [ ] **Step 5: Create `web/postcss.config.mjs`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: Create `web/tailwind.config.ts`** with Warm Mediterranean tokens

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terracotta: '#d9743f',
        ochre: '#e8a06a',
        sand: '#f3e6d4',
        sea: '#2c7a9e',
        ink: '#3d3a35',
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['system-ui', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 7: Create `web/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-sand text-ink font-body;
}
h1, h2, h3 {
  @apply font-display;
}
```

- [ ] **Step 8: Create `web/app/layout.tsx`** (Nav/Footer added in Task 13; minimal shell for now)

```tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vinamar — apartmán u moře, La Mata',
  description: 'Apartmán k pronájmu v La Mata, Torrevieja. Pláž, slunce, levné letenky.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create temporary `web/app/page.tsx`**

```tsx
export default function Home() {
  return <main className="p-8"><h1 className="text-3xl text-terracotta">Vinamar</h1></main>;
}
```

- [ ] **Step 10: Verify it builds and runs**

Run: `cd web && npm run build`
Expected: build succeeds; `/` is statically generated.

- [ ] **Step 11: Commit**

```bash
git add web/package.json web/package-lock.json web/tsconfig.json web/next.config.mjs web/postcss.config.mjs web/tailwind.config.ts web/app
git commit -m "chore(web): scaffold next.js with warm mediterranean tailwind theme"
```

---

## Task 11: Content loader library (TDD)

**Files:**
- Create: `web/lib/content.ts`, `web/lib/content.test.ts`, `web/vitest.config.ts`, `web/lib/__fixtures__/trips/sample.md`

- [ ] **Step 1: Create `web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
});
```

- [ ] **Step 2: Create fixture `web/lib/__fixtures__/trips/sample.md`**

```markdown
---
title: Sample Trip
category: plaze
image: /images/trips/sample.jpg
summary: A short summary.
order: 1
distanceKm: 2
---
Body **text** here.
```

- [ ] **Step 3: Write the failing test** — `web/lib/content.test.ts`

```ts
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { renderMarkdown, getAllTrips, getTrip } from './content';

const fixtures = path.join(__dirname, '__fixtures__');

describe('renderMarkdown', () => {
  it('renders markdown body to html', async () => {
    const html = await renderMarkdown('Body **text**');
    expect(html).toContain('<strong>text</strong>');
  });
});

describe('trip content', () => {
  it('lists trips with parsed frontmatter', () => {
    const trips = getAllTrips(fixtures);
    expect(trips).toHaveLength(1);
    expect(trips[0]).toMatchObject({
      slug: 'sample',
      title: 'Sample Trip',
      category: 'plaze',
      order: 1,
    });
  });

  it('loads a single trip with its body', () => {
    const { meta, body } = getTrip('sample', fixtures);
    expect(meta.title).toBe('Sample Trip');
    expect(body).toContain('Body');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd web && npx vitest run lib/content.test.ts`
Expected: FAIL — cannot resolve `./content`.

- [ ] **Step 5: Create `web/lib/content.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const DEFAULT_CONTENT_DIR = path.join(process.cwd(), 'content');

export interface TripTip {
  slug: string;
  title: string;
  category: 'plaze' | 'mesta' | 'priroda' | 'restaurace' | 'vylety';
  image: string;
  summary: string;
  order: number;
  externalLink?: string;
  distanceKm?: number;
}

export interface PageContent {
  data: Record<string, unknown>;
  body: string;
}

export async function renderMarkdown(body: string): Promise<string> {
  const processed = await remark().use(html).process(body);
  return processed.toString();
}

export function readPage(file: string, baseDir = DEFAULT_CONTENT_DIR): PageContent {
  const raw = fs.readFileSync(path.join(baseDir, file), 'utf8');
  const { data, content } = matter(raw);
  return { data, body: content };
}

export function getTrip(
  slug: string,
  baseDir = DEFAULT_CONTENT_DIR,
): { meta: TripTip; body: string } {
  const raw = fs.readFileSync(path.join(baseDir, 'trips', `${slug}.md`), 'utf8');
  const { data, content } = matter(raw);
  return { meta: { slug, ...(data as Omit<TripTip, 'slug'>) }, body: content };
}

export function getTripSlugs(baseDir = DEFAULT_CONTENT_DIR): string[] {
  const dir = path.join(baseDir, 'trips');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

export function getAllTrips(baseDir = DEFAULT_CONTENT_DIR): TripTip[] {
  return getTripSlugs(baseDir)
    .map((slug) => getTrip(slug, baseDir).meta)
    .sort((a, b) => a.order - b.order);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd web && npx vitest run lib/content.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add web/vitest.config.ts web/lib
git commit -m "feat(web): add markdown content loader with tests"
```

---

## Task 12: Content files + placeholder images

**Files:**
- Create: `web/content/home.md`, `web/content/apartman.md`, `web/content/okoli.md`, `web/content/trips/{la-mata-plaz,solna-jezera,torrevieja-pristav}.md`
- Create: placeholder images + `.gitkeep` in `web/public/images/{home,apartment,surroundings,trips}/`

- [ ] **Step 1: Create `web/content/home.md`**

```markdown
---
heroTitle: Apartmán u moře — La Mata, Torrevieja
heroSubtitle: Slunce, pláž 300 m, výhled na moře
heroImage: /images/home/hero.jpg
highlights:
  - icon: 🏖️
    label: 300 m k pláži
  - icon: 🛏️
    label: 4 osoby
  - icon: 🚗
    label: Parkování
  - icon: 📶
    label: Wi-Fi
---
Vítejte v našem apartmánu na Costa Blanca.
```

- [ ] **Step 2: Create `web/content/apartman.md`**

```markdown
---
title: Apartmán
intro: Útulný apartmán pár kroků od moře.
amenities:
  - Plně vybavená kuchyně
  - Klimatizace
  - Balkon s výhledem
  - Wi-Fi zdarma
gallery:
  - /images/apartment/gallery-01.jpg
  - /images/apartment/gallery-02.jpg
  - /images/apartment/gallery-03.jpg
---
Apartmán nabízí pohodlné ubytování pro čtyři osoby. Prostorný obývací pokoj,
oddělená ložnice a balkon s výhledem do okolí.
```

- [ ] **Step 3: Create `web/content/okoli.md`**

```markdown
---
title: Okolí
intro: La Mata, solná jezera a Torrevieja na dosah.
gallery:
  - /images/surroundings/okoli-01.jpg
  - /images/surroundings/okoli-02.jpg
---
La Mata je klidná čtvrť s dlouhou písečnou pláží. Nedaleko leží růžová solná
jezera a živé město Torrevieja s přístavem, restauracemi a trhy.
```

- [ ] **Step 4: Create the three trip files**

`web/content/trips/la-mata-plaz.md`:
```markdown
---
title: Pláž La Mata
category: plaze
image: /images/trips/la-mata-plaz.jpg
summary: Dlouhá písečná pláž pár minut chůze od apartmánu.
order: 1
distanceKm: 0.3
---
Jedna z nejdelších pláží v okolí, ideální pro rodiny s dětmi.
```

`web/content/trips/solna-jezera.md`:
```markdown
---
title: Růžová solná jezera
category: priroda
image: /images/trips/solna-jezera.jpg
summary: Fotogenická růžová laguna kousek od La Mata.
order: 2
distanceKm: 3
---
Přírodní park se solnými jezery, kde voda získává růžový odstín.
```

`web/content/trips/torrevieja-pristav.md`:
```markdown
---
title: Přístav Torrevieja
category: mesta
image: /images/trips/torrevieja-pristav.jpg
summary: Procházka po promenádě, restaurace a trhy.
order: 3
distanceKm: 6
---
Živý přístav s promenádou, kavárnami a večerními trhy.
```

- [ ] **Step 5: Add placeholder images**

Create a 1200×800 neutral placeholder JPG and copy it to every referenced path, plus a `.gitkeep` in each folder so empty dirs are tracked:
```bash
cd web/public/images
mkdir -p home apartment surroundings trips
# generate a simple placeholder (requires ImageMagick); if unavailable, drop any jpg in place
if command -v magick >/dev/null; then magick -size 1200x800 xc:'#e8a06a' placeholder.jpg; else : > placeholder.jpg; fi
cp placeholder.jpg home/hero.jpg
cp placeholder.jpg apartment/gallery-01.jpg
cp placeholder.jpg apartment/gallery-02.jpg
cp placeholder.jpg apartment/gallery-03.jpg
cp placeholder.jpg surroundings/okoli-01.jpg
cp placeholder.jpg surroundings/okoli-02.jpg
cp placeholder.jpg trips/la-mata-plaz.jpg
cp placeholder.jpg trips/solna-jezera.jpg
cp placeholder.jpg trips/torrevieja-pristav.jpg
touch home/.gitkeep apartment/.gitkeep surroundings/.gitkeep trips/.gitkeep
rm placeholder.jpg
```

- [ ] **Step 6: Run the content loader test against real content**

Run: `cd web && npx vitest run`
Expected: PASS. (Fixtures still drive the unit test; real content parses without error.)

- [ ] **Step 7: Commit**

```bash
git add web/content web/public/images
git commit -m "content(web): add czech showcase content and placeholder images"
```

---

## Task 13: Layout shell — Nav + Footer

**Files:**
- Create: `web/components/Nav.tsx`, `web/components/Footer.tsx`
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: Create `web/components/Nav.tsx`**

```tsx
import Link from 'next/link';

const links = [
  { href: '/apartman', label: 'Apartmán' },
  { href: '/okoli', label: 'Okolí' },
  { href: '/tipy-na-vylety', label: 'Tipy na výlety' },
];

export default function Nav() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-sand border-b border-ochre/40">
      <Link href="/" className="text-2xl font-display text-terracotta">
        Vinamar
      </Link>
      <nav className="flex gap-5 items-center">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-terracotta">
            {l.label}
          </Link>
        ))}
        <span
          className="text-ink/40 cursor-not-allowed"
          title="Připravujeme"
          aria-disabled="true"
        >
          Rezervace
        </span>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create `web/components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="text-center py-6 text-ink/70 border-t border-ochre/40 mt-12">
      Vinamar · La Mata, Torrevieja · © 2026
    </footer>
  );
}
```

- [ ] **Step 3: Wire them into `web/app/layout.tsx`** (replace the `<body>` contents)

```tsx
import './globals.css';
import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Vinamar — apartmán u moře, La Mata',
  description: 'Apartmán k pronájmu v La Mata, Torrevieja. Pláž, slunce, levné letenky.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd web && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add web/components/Nav.tsx web/components/Footer.tsx web/app/layout.tsx
git commit -m "feat(web): add nav and footer shell with disabled rezervace link"
```

---

## Task 14: Home page + presentational components

**Files:**
- Create: `web/components/Hero.tsx`, `web/components/Highlights.tsx`, `web/components/SectionTeaser.tsx`, `web/components/TripCard.tsx`
- Modify: `web/app/page.tsx`

- [ ] **Step 1: Create `web/components/Hero.tsx`**

```tsx
import Image from 'next/image';
import Link from 'next/link';

export default function Hero({
  title,
  subtitle,
  image,
}: {
  title: string;
  subtitle: string;
  image: string;
}) {
  return (
    <section className="relative h-[60vh] min-h-[360px] flex items-center justify-center text-center">
      <Image src={image} alt="" fill priority className="object-cover -z-10 brightness-75" />
      <div className="text-white px-6">
        <h1 className="text-4xl md:text-5xl mb-3">{title}</h1>
        <p className="text-lg mb-6">{subtitle}</p>
        <Link
          href="/tipy-na-vylety"
          className="inline-block bg-terracotta px-6 py-3 rounded-full font-semibold"
        >
          Zjistit nejlevnější termíny →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `web/components/Highlights.tsx`**

```tsx
export default function Highlights({
  items,
}: {
  items: { icon: string; label: string }[];
}) {
  return (
    <section className="flex flex-wrap justify-center gap-6 py-10 px-6">
      {items.map((it) => (
        <div key={it.label} className="text-center">
          <div className="text-3xl">{it.icon}</div>
          <div className="mt-1 text-sm">{it.label}</div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Create `web/components/SectionTeaser.tsx`**

```tsx
import Link from 'next/link';

export default function SectionTeaser({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="block flex-1 bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition"
    >
      <h3 className="text-xl text-sea mb-2">{title}</h3>
      <p className="text-ink/80">{text}</p>
    </Link>
  );
}
```

- [ ] **Step 4: Create `web/components/TripCard.tsx`**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import type { TripTip } from '@/lib/content';

export default function TripCard({ trip }: { trip: TripTip }) {
  return (
    <Link
      href={`/tipy-na-vylety/${trip.slug}`}
      className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
    >
      <div className="relative h-40">
        <Image src={trip.image} alt={trip.title} fill className="object-cover" />
      </div>
      <div className="p-4">
        <h3 className="text-lg">{trip.title}</h3>
        <p className="text-sm text-ink/70">{trip.summary}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: Replace `web/app/page.tsx`**

```tsx
import Hero from '@/components/Hero';
import Highlights from '@/components/Highlights';
import SectionTeaser from '@/components/SectionTeaser';
import TripCard from '@/components/TripCard';
import { readPage, getAllTrips } from '@/lib/content';

export default function Home() {
  const { data } = readPage('home.md');
  const highlights = (data.highlights as { icon: string; label: string }[]) ?? [];
  const trips = getAllTrips().slice(0, 3);

  return (
    <main>
      <Hero
        title={data.heroTitle as string}
        subtitle={data.heroSubtitle as string}
        image={data.heroImage as string}
      />
      <Highlights items={highlights} />
      <section className="flex flex-col md:flex-row gap-4 px-6">
        <SectionTeaser href="/okoli" title="Okolí" text="La Mata, solná jezera, Torrevieja" />
        <SectionTeaser href="/apartman" title="Apartmán" text="Prohlédněte si fotky a vybavení" />
      </section>
      <section className="px-6 mt-10">
        <h2 className="text-2xl mb-4">Tipy na výlety</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {trips.map((t) => (
            <TripCard key={t.slug} trip={t} />
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Allow local images in `next.config.mjs`** (none external here; confirm build)

Run: `cd web && npm run build`
Expected: build succeeds; `/` statically generated with the hero, highlights, teasers, and 3 trip cards.

- [ ] **Step 7: Commit**

```bash
git add web/components/Hero.tsx web/components/Highlights.tsx web/components/SectionTeaser.tsx web/components/TripCard.tsx web/app/page.tsx
git commit -m "feat(web): build homepage with hero, highlights and trip previews"
```

---

## Task 15: Apartmán + Okolí pages + Gallery component

**Files:**
- Create: `web/components/Gallery.tsx`, `web/app/apartman/page.tsx`, `web/app/okoli/page.tsx`

- [ ] **Step 1: Create `web/components/Gallery.tsx`**

```tsx
import Image from 'next/image';

export default function Gallery({ images }: { images: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 mt-6">
      {images.map((src) => (
        <div key={src} className="relative h-48 rounded-xl overflow-hidden">
          <Image src={src} alt="" fill className="object-cover" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `web/app/apartman/page.tsx`**

```tsx
import Gallery from '@/components/Gallery';
import { readPage, renderMarkdown } from '@/lib/content';

export default async function Apartman() {
  const { data, body } = readPage('apartman.md');
  const html = await renderMarkdown(body);
  const amenities = (data.amenities as string[]) ?? [];
  const gallery = (data.gallery as string[]) ?? [];

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">{data.title as string}</h1>
      <p className="text-ink/80">{data.intro as string}</p>
      <Gallery images={gallery} />
      <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      <h2 className="text-2xl mt-8 mb-3">Vybavení</h2>
      <ul className="list-disc pl-6 space-y-1">
        {amenities.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Create `web/app/okoli/page.tsx`**

```tsx
import Gallery from '@/components/Gallery';
import { readPage, renderMarkdown } from '@/lib/content';

export default async function Okoli() {
  const { data, body } = readPage('okoli.md');
  const html = await renderMarkdown(body);
  const gallery = (data.gallery as string[]) ?? [];

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">{data.title as string}</h1>
      <p className="text-ink/80">{data.intro as string}</p>
      <Gallery images={gallery} />
      <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd web && npm run build`
Expected: `/apartman` and `/okoli` statically generated.

- [ ] **Step 5: Commit**

```bash
git add web/components/Gallery.tsx web/app/apartman web/app/okoli
git commit -m "feat(web): add apartman and okoli pages with gallery"
```

---

## Task 16: Trip tips list + detail pages

**Files:**
- Create: `web/app/tipy-na-vylety/page.tsx`, `web/app/tipy-na-vylety/[slug]/page.tsx`

- [ ] **Step 1: Create `web/app/tipy-na-vylety/page.tsx`**

```tsx
import TripCard from '@/components/TripCard';
import { getAllTrips } from '@/lib/content';

export default function TripsList() {
  const trips = getAllTrips();
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-6">Tipy na výlety</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {trips.map((t) => (
          <TripCard key={t.slug} trip={t} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `web/app/tipy-na-vylety/[slug]/page.tsx`**

```tsx
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTrip, getTripSlugs, renderMarkdown } from '@/lib/content';

export function generateStaticParams() {
  return getTripSlugs().map((slug) => ({ slug }));
}

export default async function TripDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let trip;
  try {
    trip = getTrip(slug);
  } catch {
    notFound();
  }
  const html = await renderMarkdown(trip!.body);
  const { meta } = trip!;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">{meta.title}</h1>
      <p className="text-ink/70 mb-4">{meta.summary}</p>
      <div className="relative h-64 rounded-xl overflow-hidden mb-6">
        <Image src={meta.image} alt={meta.title} fill className="object-cover" />
      </div>
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
```

- [ ] **Step 3: Verify build generates one page per trip**

Run: `cd web && npm run build`
Expected: build output lists `/tipy-na-vylety` and three `/tipy-na-vylety/[slug]` static pages.

- [ ] **Step 4: Commit**

```bash
git add web/app/tipy-na-vylety
git commit -m "feat(web): add trip tips list and statically generated detail pages"
```

---

## Task 17: Containerize the web app

**Files:**
- Create: `web/Dockerfile`, `web/.dockerignore`
- Modify: `docker-compose.yml` (add `web` service)

- [ ] **Step 1: Create `web/.dockerignore`**

```
node_modules
.next
```

- [ ] **Step 2: Create `web/Dockerfile`** (dev-oriented)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

- [ ] **Step 3: Add the `web` service to `docker-compose.yml`**

```yaml
  web:
    build: ./web
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001/api}
    ports:
      - "${WEB_PORT:-3000}:3000"
    depends_on:
      - api
    volumes:
      - ./web:/app
      - /app/node_modules
      - /app/.next
```

- [ ] **Step 4: Bring up the full stack and verify**

Run:
```bash
docker compose up -d --build
sleep 12
curl -s http://localhost:3001/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```
Expected: health JSON `db: ok`; homepage returns `200`.

- [ ] **Step 5: Commit**

```bash
git add web/Dockerfile web/.dockerignore docker-compose.yml
git commit -m "feat: containerize web app and complete the compose stack"
```

---

## Task 18: Playwright smoke tests

**Files:**
- Create: `web/playwright.config.ts`, `web/e2e/showcase.spec.ts`

- [ ] **Step 1: Create `web/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true },
});
```

- [ ] **Step 2: Create `web/e2e/showcase.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('home renders hero and CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Apartmán');
  await expect(page.getByRole('link', { name: /nejlevnější termíny/i })).toBeVisible();
});

test('nav reaches all showcase pages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Apartmán' }).click();
  await expect(page).toHaveURL(/\/apartman$/);
  await page.getByRole('link', { name: 'Okolí' }).click();
  await expect(page).toHaveURL(/\/okoli$/);
  await page.getByRole('link', { name: 'Tipy na výlety' }).click();
  await expect(page).toHaveURL(/\/tipy-na-vylety$/);
});

test('rezervace is present but disabled', async ({ page }) => {
  await page.goto('/');
  const rezervace = page.getByText('Rezervace', { exact: true });
  await expect(rezervace).toHaveAttribute('aria-disabled', 'true');
});

test('a trip detail page loads from its slug', async ({ page }) => {
  await page.goto('/tipy-na-vylety');
  await page.getByText('Pláž La Mata').click();
  await expect(page).toHaveURL(/\/tipy-na-vylety\/la-mata-plaz$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pláž La Mata');
});
```

- [ ] **Step 3: Install browsers and run the smoke suite**

Run:
```bash
cd web && npx playwright install --with-deps chromium && npm run e2e
```
Expected: 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add web/playwright.config.ts web/e2e
git commit -m "test(web): add playwright smoke tests for showcase"
```

---

## Task 19: README + final acceptance verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# Vinamar Web

Web pro pronájem apartmánu v La Mata, Torrevieja. Monorepo: `api/` (NestJS, onion) + `web/` (Next.js).

## Spuštění

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API health: http://localhost:3001/api/health

## Architektura

- **api/** — onion vrstvy: `domain` (bez frameworku) → `application` (CQRS handlery) → `infrastructure` (raw SQL přes `pg`, migrace `node-pg-migrate`) → `interface` (HTTP). Závislosti míří dovnitř; hlídá ESLint.
- **web/** — Next.js App Router, staticky generované stránky z markdownu v `web/content/`.

### Vzor pro nové funkce (B/C/D)
Kopíruj `health` slice: port v `domain/`, handler v `application/`, raw-SQL adaptér v `infrastructure/`, controller v `interface/`, zapojení v modulu.

## Fotky a obsah
Obsah je v `web/content/*.md`. Fotky jsou v `web/public/images/{home,apartment,surroundings,trips}/`.
Nahraď placeholder soubory vlastními se **stejnými názvy** — žádná změna kódu není potřeba.

## Testy

```bash
cd api && npm test && npm run test:e2e   # potřebuje běžící db
cd web && npm test && npm run e2e
```

## TODO (další sub-projekty)
- [ ] A — Foundation & Showcase
- [ ] B — Availability & Inquiries
- [ ] C — Flight Prices (Travelpayouts)
- [ ] D — Cheapest-Dates Optimizer
````

- [ ] **Step 2: Full acceptance run** (against the spec §8)

Run:
```bash
docker compose down && cp .env.example .env && docker compose up -d --build && sleep 15
curl -s http://localhost:3001/api/health
for p in / /apartman /okoli /tipy-na-vylety /tipy-na-vylety/la-mata-plaz; do
  echo -n "$p -> "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000$p
done
cd api && npm run lint
```
Expected: health `db: ok`; every page returns `200`; lint passes.

- [ ] **Step 3: Mark README TODO A as done**

Change `- [ ] A — Foundation & Showcase` to `- [x] A — Foundation & Showcase`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add readme and mark sub-project A complete"
```

---

## Self-Review Notes

- **Spec coverage:** docker-compose stack (T1/9/17) · onion skeleton + CQRS + problem-detail (T2/4/5/7) · raw SQL + node-pg-migrate (T3/9) · `/health` reference slice (T4–7) · four pages + markdown + placeholders + drop-in convention (T10–16, T12, T19) · Warm Mediterranean theme (T10) · tests across layers (T5/6/7/11/18) · README + conventions (T19) · ESLint dependency rule (T8). All §8 acceptance criteria map to T19 Step 2.
- **No placeholders:** every code step contains complete code; commands include expected output.
- **Type consistency:** `DbHealthChecker.ping()`, `DB_HEALTH_CHECKER` token, `HealthStatus(database, checkedAt)`, `CheckHealthQuery`/`CheckHealthHandler`, `TripTip`, and `readPage/getTrip/getTripSlugs/getAllTrips/renderMarkdown` signatures are used identically across api and web tasks.
```
