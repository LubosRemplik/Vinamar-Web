const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress {
  constructor(public readonly value: string) {
    if (!EMAIL_RE.test(value)) {
      throw new Error('invalid email address');
    }
  }
}
