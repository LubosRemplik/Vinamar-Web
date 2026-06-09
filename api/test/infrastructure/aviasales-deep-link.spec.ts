import { buildDeepLink } from '../../src/infrastructure/flight/aviasales-deep-link';

describe('buildDeepLink', () => {
  it('appends the affiliate marker to the aviasales link', () => {
    const url = buildDeepLink('/search/WRO0805ALC15081', 'marker123');
    expect(url).toContain('aviasales.com/search/WRO0805ALC15081');
    expect(url).toContain('marker=marker123');
  });
});
