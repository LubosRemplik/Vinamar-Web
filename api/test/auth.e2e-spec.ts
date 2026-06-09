import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.JWT_SECRET = 'test-secret';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects admin endpoints without a token', async () => {
    const res = await request(app.getHttpServer()).get('/api/admin/inquiries');
    expect(res.status).toBe(401);
  });

  it('issues a token for valid credentials and accepts it', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ username: 'owner', password: 'secret' });
    expect(login.status).toBe(201);
    const res = await request(app.getHttpServer())
      .get('/api/admin/inquiries')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });
});
