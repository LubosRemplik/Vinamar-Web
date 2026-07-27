import { CommandBus } from '@nestjs/cqrs';
import { FlightPriceCron } from '../../src/infrastructure/flight/flight-price.cron';
import { FlightScheduleCron } from '../../src/infrastructure/flight/flight-schedule.cron';

describe('flight cron bootstrap', () => {
  it('price cron does not block application start on a hanging refresh', () => {
    const hangingBus = { execute: () => new Promise(() => undefined) } as unknown as CommandBus;
    const cron = new FlightPriceCron(hangingBus);
    // Must return synchronously — an awaited refresh would keep app.listen()
    // from ever running when the external API hangs.
    expect(cron.onApplicationBootstrap()).toBeUndefined();
  });

  it('schedule cron does not block application start on a hanging refresh', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const hangingBus = { execute: () => new Promise(() => undefined) } as unknown as CommandBus;
      const cron = new FlightScheduleCron(hangingBus);
      expect(cron.onApplicationBootstrap()).toBeUndefined();
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('price cron logs a failed initial refresh instead of crashing', async () => {
    const failingBus = {
      execute: () => Promise.reject(new Error('travelpayouts down')),
    } as unknown as CommandBus;
    const cron = new FlightPriceCron(failingBus);
    cron.onApplicationBootstrap();
    // Let the rejected promise settle; an unhandled rejection would fail the test.
    await new Promise((resolve) => setImmediate(resolve));
  });
});
