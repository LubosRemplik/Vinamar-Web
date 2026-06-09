import { RyanairScheduleProvider } from '../../src/infrastructure/flight/ryanair-schedule-provider';
import { Origin } from '../../src/domain/flight/origin';

const outboundJuly = {
  month: 7,
  days: [
    { day: 8, flights: [{ carrierCode: 'FR', number: '1495', departureTime: '12:00', arrivalTime: '15:00' }] },
    { day: 30, flights: [{ carrierCode: 'FR', number: '1495', departureTime: '12:00', arrivalTime: '15:00' }] },
  ],
};
const returnJuly = {
  month: 7,
  days: [
    { day: 8, flights: [{ carrierCode: 'FR', number: '1494', departureTime: '08:45', arrivalTime: '11:35' }] },
  ],
};

describe('RyanairScheduleProvider', () => {
  it('maps both directions within the date range and drops out-of-range days', async () => {
    const fetchStub = async (url: string) => ({
      ok: true,
      json: async () => (url.includes('/PED/ALC/') ? outboundJuly : returnJuly),
    });
    const provider = new RyanairScheduleProvider(fetchStub);

    const schedules = await provider.schedulesForOrigin(
      Origin.fromCode('PED'),
      '2026-07-01',
      '2026-07-13',
    );

    const outbound = schedules.filter((s) => s.direction === 'outbound');
    const inbound = schedules.filter((s) => s.direction === 'return');

    expect(outbound).toHaveLength(1); // day 30 is outside [07-01, 07-13]
    expect(outbound[0].date).toBe('2026-07-08');
    expect(outbound[0].departureTime).toBe('12:00');
    expect(outbound[0].flightNumber).toBe('1495');

    expect(inbound).toHaveLength(1);
    expect(inbound[0].date).toBe('2026-07-08');
    expect(inbound[0].arrivalTime).toBe('11:35');
  });

  it('skips months the route is not operated (non-ok response)', async () => {
    const fetchStub = async () => ({ ok: false, json: async () => ({ month: 7, days: [] }) });
    const provider = new RyanairScheduleProvider(fetchStub);
    const schedules = await provider.schedulesForOrigin(
      Origin.fromCode('PRG'),
      '2026-07-01',
      '2026-07-31',
    );
    expect(schedules).toHaveLength(0);
  });
});
