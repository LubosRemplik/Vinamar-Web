import { Origin } from '../../src/domain/flight/origin';
import { Money } from '../../src/domain/flight/money';

describe('Origin', () => {
  it('lists the three supported origins with names', () => {
    expect(Origin.all().map((o) => o.code)).toEqual(['PED', 'WRO', 'PRG']);
    expect(Origin.fromCode('WRO').name).toBe('Vratislav');
  });
  it('rejects an unknown origin', () => {
    expect(() => Origin.fromCode('XXX')).toThrow();
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
