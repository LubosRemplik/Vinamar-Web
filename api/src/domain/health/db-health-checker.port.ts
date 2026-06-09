export const DB_HEALTH_CHECKER = Symbol('DbHealthChecker');

export interface DbHealthChecker {
  ping(): Promise<boolean>;
}
