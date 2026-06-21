import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { ProblemDetailFilter } from '../src/interface/http/problem-detail.filter';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
// Mirror AdminGuard: any JWT signed with JWT_SECRET passes.
const adminToken = () =>
  new JwtService().sign({ sub: 'owner' }, { secret: process.env.JWT_SECRET ?? 'change-me' });

// Wipes calendar_blocks and inquiries in beforeAll, so it must never run against a
// local dev DB. Skipped unless RUN_DB_INTEGRATION=1 (set in CI's ephemeral DB).
const dbDescribe = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

dbDescribe('Inquiries (e2e)', () => {
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

  it('rejects a message with forbidden characters with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({
        guestName: 'Jan',
        email: 'jan@x.cz',
        arrival: future(60),
        departure: future(67),
        message: 'hi <script>',
      });
    expect(res.status).toBe(400);
  });

  it('rejects a message longer than 500 characters with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({
        guestName: 'Jan',
        email: 'jan@x.cz',
        arrival: future(60),
        departure: future(67),
        message: 'a'.repeat(501),
      });
    expect(res.status).toBe(400);
  });

  it('admin edits guest contact and it is reflected in the stored record', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({ guestName: 'Jan', email: 'jan@x.cz', arrival: future(90), departure: future(97), message: '' });
    expect(create.status).toBe(201);
    const { rows } = await pool.query('SELECT id FROM inquiries ORDER BY created_at DESC LIMIT 1');
    const id = rows[0].id;

    const patch = await request(app.getHttpServer())
      .patch(`/api/admin/inquiries/${id}/contact`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ guestName: 'Jana', email: 'jana@x.cz', phone: '+420222' });
    expect(patch.status).toBe(200);

    const after = await pool.query('SELECT guest_name, email, phone FROM inquiries WHERE id = $1', [id]);
    expect(after.rows[0]).toMatchObject({ guest_name: 'Jana', email: 'jana@x.cz', phone: '+420222' });
  });

  it('rejects an invalid email with 400', async () => {
    const { rows } = await pool.query('SELECT id FROM inquiries LIMIT 1');
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/inquiries/${rows[0].id}/contact`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ guestName: 'X', email: 'not-an-email', phone: '' });
    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated contact edit with 401', async () => {
    const { rows } = await pool.query('SELECT id FROM inquiries LIMIT 1');
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/inquiries/${rows[0].id}/contact`)
      .send({ guestName: 'X', email: 'x@x.cz', phone: '' });
    expect(res.status).toBe(401);
  });
});
