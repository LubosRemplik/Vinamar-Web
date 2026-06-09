export class FindAvailabilityCalendarQuery {
  constructor(
    public readonly origin: string,
    public readonly nights: number = 7,
    public readonly months: number = 12,
  ) {}
}
