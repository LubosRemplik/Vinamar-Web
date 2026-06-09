export type DbState = 'ok' | 'down';

export class HealthStatus {
  constructor(
    public readonly database: DbState,
    public readonly checkedAt: Date,
  ) {}

  get isHealthy(): boolean {
    return this.database === 'ok';
  }
}
