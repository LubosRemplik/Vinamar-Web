import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

interface MonthDto {
  year: number;
  month: number;
  freeRanges: { start: string; end: string }[];
  cheapest: { arrival: string; flightDeepLink: string } | null;
}

describe('Calendar (e2e)', () => {
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

  it('returns 12 chronological months with free ranges and at least one priced window', async () => {
    const res = await request(app.getHttpServer()).get('/api/calendar?origin=WRO&nights=7');
    expect(res.status).toBe(200);
    expect(res.body.origin).toBe('WRO');
    const months = res.body.months as MonthDto[];
    expect(months.length).toBe(12);

    const keys = months.map((m) => m.year * 12 + m.month);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));

    const priced = months.filter((m) => m.cheapest !== null);
    expect(priced.length).toBeGreaterThan(0);
    expect(priced[0].cheapest!.flightDeepLink).toContain('aviasales.com/search/WRO');

    const blockedMonth = months.find((m) => m.year === 2026 && m.month === 7)!;
    for (const r of blockedMonth.freeRanges) {
      expect(r.start >= '2026-07-15' || r.end <= '2026-07-01').toBe(true);
    }
  });
});
