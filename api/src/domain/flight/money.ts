export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: 'EUR' = 'EUR',
  ) {
    if (amount < 0) {
      throw new Error('amount must be non-negative');
    }
  }
}
