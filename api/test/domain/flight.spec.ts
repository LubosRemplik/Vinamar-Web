import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';

describe('Origin', () => {
  it('lists the priced origins with names', () => {
    expect(Origin.all().map((o) => o.code)).toEqual(['PED', 'WRO']);
    expect(Origin.fromCode('WRO').name).toBe('Wrocław');
  });
  it('rejects an unknown origin', () => {
    expect(() => Origin.fromCode('XXX')).toThrow();
  });

  it('lists all schedule origins in preference order', () => {
    expect(Origin.allByPreference().map((o) => o.code)).toEqual([
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
    expect(Origin.fromCode('VIE').name).toBe('Vídeň');
    expect(Origin.fromCode('PED').order).toBe(1);
  });
});

describe('Money', () => {
  it('holds a non-negative EUR amount', () => {
    expect(new Money(58).currency).toBe('EUR');
  });
  it('rejects negative amounts', () => {
    expect(() => new Money(-1)).toThrow();
  });
});
