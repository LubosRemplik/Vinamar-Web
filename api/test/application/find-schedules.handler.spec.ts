import { FindSchedulesHandler } from '../../src/application/flight/find-schedules.handler';
import { FindSchedulesQuery } from '../../src/application/flight/find-schedules.query';
import { Origin } from '../../src/domain/flight/origin';
import { FlightSchedule } from '../../src/domain/flight/flight-schedule';
import { InMemoryFlightSchedules } from '../fakes/flight';

describe('FindSchedules', () => {
  it('groups flights per origin in preference order, split by direction', async () => {
    const repo = new InMemoryFlightSchedules();
    await repo.replaceForOrigin(Origin.fromCode('VIE'), [
      new FlightSchedule(Origin.fromCode('VIE'), 'outbound', '2026-07-08', '13:55', '16:50', 'FR', '1567'),
      new FlightSchedule(Origin.fromCode('VIE'), 'return', '2026-07-15', '20:00', '22:45', 'FR', '1568'),
    ]);

    const result = await new FindSchedulesHandler(repo).execute(
      new FindSchedulesQuery('2026-07-01', '2026-07-31'),
    );

    expect(result.map((r) => r.origin)).toEqual([
      'PED',
      'BTS',
      'VIE',
      'LNZ',
      'WRO',
      'KTW',
      'NUE',
      'KRK',
      'BER',
    ]);
    const vie = result.find((r) => r.origin === 'VIE')!;
    expect(vie.directRyanair).toBe(true);
    expect(vie.outbound).toHaveLength(1);
    expect(vie.outbound[0].flightNumber).toBe('1567');
    expect(vie.return).toHaveLength(1);
    expect(vie.return[0].flightNumber).toBe('1568');
  });

  it('reports an origin with no flights as not directly served', async () => {
    const repo = new InMemoryFlightSchedules();
    const result = await new FindSchedulesHandler(repo).execute(
      new FindSchedulesQuery('2026-07-01', '2026-07-31'),
    );
    const ber = result.find((r) => r.origin === 'BER')!;
    expect(ber.directRyanair).toBe(false);
    expect(ber.outbound).toHaveLength(0);
    expect(ber.note).toBeNull();
  });

  it('excludes flights outside the requested range', async () => {
    const repo = new InMemoryFlightSchedules();
    await repo.replaceForOrigin(Origin.fromCode('WRO'), [
      new FlightSchedule(Origin.fromCode('WRO'), 'outbound', '2026-08-05', '06:10', '09:25', 'FR', '9882'),
    ]);
    const result = await new FindSchedulesHandler(repo).execute(
      new FindSchedulesQuery('2026-07-01', '2026-07-31'),
    );
    expect(result.find((r) => r.origin === 'WRO')!.directRyanair).toBe(false);
  });
});
