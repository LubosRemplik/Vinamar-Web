const MS_PER_NIGHT = 1000 * 60 * 60 * 24;

export class DateRange {
  constructor(
    public readonly arrival: Date,
    public readonly departure: Date,
  ) {
    if (departure.getTime() <= arrival.getTime()) {
      throw new Error('departure must be after arrival');
    }
  }

  nights(): number {
    return Math.round((this.departure.getTime() - this.arrival.getTime()) / MS_PER_NIGHT);
  }

  overlaps(other: DateRange): boolean {
    return this.arrival < other.departure && other.arrival < this.departure;
  }
}
