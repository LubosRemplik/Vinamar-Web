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
