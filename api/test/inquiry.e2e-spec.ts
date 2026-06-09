import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { ProblemDetailFilter } from '../src/interface/http/problem-detail.filter';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

describe('Inquiries (e2e)', () => {
  let app: INestApplication;
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new ProblemDetailFilter());
    await app.init();
    await pool.query('DELETE FROM calendar_blocks');
    await pool.query('DELETE FROM inquiries');
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it('accepts a valid 7-night inquiry', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({ guestName: 'Jan', email: 'jan@x.cz', arrival: future(30), departure: future(37), message: 'ahoj' });
    expect(res.status).toBe(201);
  });

  it('rejects a stay shorter than 7 nights with 422', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({ guestName: 'Jan', email: 'jan@x.cz', arrival: future(30), departure: future(33), message: '' });
    expect(res.status).toBe(422);
  });
});
