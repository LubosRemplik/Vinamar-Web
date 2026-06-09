import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

interface WindowDto {
  arrival: string;
  departure: string;
  indicativePrice: number;
}

describe('Optimizer (e2e)', () => {
  let app: INestApplication;
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    delete process.env.TRAVELPAYOUTS_TOKEN;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    await pool.query('DELETE FROM calendar_blocks');
    await pool.query(
      `INSERT INTO calendar_blocks (start_date, end_date, reason) VALUES ('2026-07-01','2026-07-15','booked')`,
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM calendar_blocks');
    await pool.query('DELETE FROM flight_quotes');
    await pool.end();
    await app.close();
  });

  it('returns windows cheapest-first that skip blocked dates', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/optimizer/cheapest-windows?origin=WRO&nights=7',
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const prices = (res.body as WindowDto[]).map((w) => w.indicativePrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    for (const w of res.body as WindowDto[]) {
      expect(w.arrival >= '2026-07-15' || w.departure <= '2026-07-01').toBe(true);
    }
  });

  it('returns results for non-7-night stays with an exact-date booking link', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/optimizer/cheapest-windows?origin=WRO&nights=10',
    );
    expect(res.status).toBe(200);
    expect((res.body as WindowDto[]).length).toBeGreaterThan(0);
    const first = res.body[0];
    expect(first.nights).toBe(10);
    expect(first.flightDeepLink).toContain('aviasales.com/search/WRO');
  });
});
