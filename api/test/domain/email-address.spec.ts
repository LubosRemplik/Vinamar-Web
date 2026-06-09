import { EmailAddress } from '../../src/domain/shared/email-address';

describe('EmailAddress', () => {
  it('accepts a valid address', () => {
    expect(new EmailAddress('a@b.cz').value).toBe('a@b.cz');
  });
  it('rejects an invalid address', () => {
    expect(() => new EmailAddress('nope')).toThrow();
  });
});
