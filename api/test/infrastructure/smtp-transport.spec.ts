import { createSmtpTransport } from '../../src/infrastructure/notify/smtp-transport';

describe('createSmtpTransport', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  afterAll(() => {
    process.env = env;
  });

  it('creates an unauthenticated transport by default (mailpit)', () => {
    const options = createSmtpTransport().options as Record<string, unknown>;
    expect(options.host).toBe('mailpit');
    expect(options.auth).toBeUndefined();
    expect(options.requireTLS).toBeUndefined();
  });

  it('adds auth and requires STARTTLS when SMTP_USER and SMTP_PASS are set', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'ses-user';
    process.env.SMTP_PASS = 'ses-pass';
    const options = createSmtpTransport().options as Record<string, unknown>;
    expect(options.host).toBe('smtp.example.com');
    expect(options.port).toBe(587);
    expect(options.auth).toEqual({ user: 'ses-user', pass: 'ses-pass' });
    expect(options.requireTLS).toBe(true);
  });
});
