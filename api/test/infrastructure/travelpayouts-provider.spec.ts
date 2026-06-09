import { TravelpayoutsFlightPriceProvider } from '../../src/infrastructure/flight/travelpayouts-flight-price-provider';
import { Origin } from '../../src/domain/flight/origin';

const fixture = {
  success: true,
  data: [
    {
      origin: 'WRO',
      destination: 'ALC',
      price: 58,
      airline: 'FR',
      departure_at: '2026-05-08T06:00:00',
      return_at: '2026-05-15T20:00:00',
      link: '/search/WRO0805ALC15081',
    },
    {
      origin: 'WRO',
      destination: 'ALC',
      price: 71,
      airline: 'FR',
      departure_at: '2026-05-15T06:00:00',
      return_at: '2026-05-22T20:00:00',
      link: '/search/WRO1505ALC22051',
    },
  ],
};

describe('TravelpayoutsFlightPriceProvider', () => {
  it('maps the API payload to flight quotes with affiliate deep links', async () => {
    const fetchStub = async () => ({ ok: true, json: async () => fixture });
    const provider = new TravelpayoutsFlightPriceProvider('token123', 'marker123', fetchStub);
    const quotes = await provider.cheapestForOrigin(Origin.fromCode('WRO'), 1);
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0].price.amount).toBe(58);
    expect(quotes[0].deepLink).toContain('marker=marker123');
    expect(quotes[0].origin.code).toBe('WRO');
  });
});
