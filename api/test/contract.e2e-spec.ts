import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { ProblemDetailFilter } from '../src/interface/http/problem-detail.filter';

const url = process.env.DATABASE_URL ?? 'postgres://vinamar:vinamar@localhost:5432/vinamar';
const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// Wipes contracts/inquiries/calendar_blocks, so it must never run against a local
// dev DB. Skipped unless RUN_DB_INTEGRATION=1 (set in CI's ephemeral DB).
const dbDescribe = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

dbDescribe('Contracts (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.JWT_SECRET = 'test-secret';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new ProblemDetailFilter());
    await app.init();
    await pool.query('DELETE FROM contracts');
    await pool.query('DELETE FROM calendar_blocks');
    await pool.query('DELETE FROM inquiries');
    const login = await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ username: 'owner', password: 'secret' });
    token = login.body.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM contracts');
    await pool.end();
    await app.close();
  });

  it('generates a contract for a confirmed reservation and serves the PDF', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({ guestName: 'Jan', email: 'jan@x.cz', arrival: future(30), departure: future(37), message: '' });
    expect(created.status).toBe(201);
    const inquiryId = created.body.id;

    await request(app.getHttpServer())
      .post(`/api/admin/inquiries/${inquiryId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const gen = await request(app.getHttpServer())
      .post(`/api/admin/reservations/${inquiryId}/contract`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        variant: 'with-deposit',
        guestAddress: 'Praha 1',
        guestIdNumber: 'OP123456',
        totalPrice: 1000,
        depositAmount: 200,
        depositDueDate: future(20),
      });
    expect(gen.status).toBe(201);
    const contractId = gen.body.id;
    expect(contractId).toBeTruthy();

    const pdf = await request(app.getHttpServer())
      .get(`/api/admin/contracts/${contractId}/pdf`)
      .set('Authorization', `Bearer ${token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rejects a second contract for the same reservation with 409', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/inquiries')
      .send({ guestName: 'Eva', email: 'eva@x.cz', arrival: future(90), departure: future(97), message: '' });
    const inquiryId = created.body.id;
    await request(app.getHttpServer())
      .post(`/api/admin/inquiries/${inquiryId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    const body = {
      variant: 'without-deposit',
      guestAddress: 'Brno',
      guestIdNumber: 'OP999',
      totalPrice: 800,
    };
    await request(app.getHttpServer())
      .post(`/api/admin/reservations/${inquiryId}/contract`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/api/admin/reservations/${inquiryId}/contract`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(second.status).toBe(409);
  });
});
