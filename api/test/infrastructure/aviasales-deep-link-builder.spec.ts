import { AviasalesDeepLinkBuilder } from '../../src/infrastructure/flight/aviasales-deep-link-builder';
import { Origin } from '../../src/domain/flight/origin';

describe('AviasalesDeepLinkBuilder', () => {
  it('builds an exact-date search url with the marker', () => {
    process.env.TRAVELPAYOUTS_MARKER = 'm99';
    const builder = new AviasalesDeepLinkBuilder();
    const url = builder.forDates(
      Origin.fromCode('WRO'),
      new Date('2026-05-08'),
      new Date('2026-05-15'),
    );
    expect(url).toContain('/search/WRO0805ALC1505');
    expect(url).toContain('marker=m99');
  });
});
