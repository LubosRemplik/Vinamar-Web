import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';

describe('Flights (e2e, mock provider)', () => {
  let app: INestApplication;
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    delete process.env.TRAVELPAYOUTS_TOKEN; // force mock provider
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init(); // bootstrap triggers the initial refresh
  });

  afterAll(async () => {
    await pool.query('DELETE FROM flight_quotes');
    await pool.end();
    await app.close();
  });

  it('returns one cheapest quote per origin in EUR', async () => {
    const res = await request(app.getHttpServer()).get('/api/flights/cheapest');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((r: { origin: string }) => r.origin).sort()).toEqual(['PED', 'WRO']);
    expect(res.body[0].currency).toBe('EUR');
  });
});
