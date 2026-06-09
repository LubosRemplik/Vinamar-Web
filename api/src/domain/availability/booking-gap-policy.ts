import { DateRange } from '../shared/date-range';
import { CalendarBlock } from './calendar-block';

const MS_PER_NIGHT = 1000 * 60 * 60 * 24;

// A gap up to this many nights next to an existing booking is tolerated (turnover).
// A larger gap that is still shorter than the minimum stay can never be re-booked,
// so it must not be created.
export const MAX_TURNOVER_GAP_NIGHTS = 2;

export class BookingGapPolicy {
  wouldCreateOrphanGap(
    range: DateRange,
    blocks: CalendarBlock[],
    minNights: number,
    maxTurnoverGap = MAX_TURNOVER_GAP_NIGHTS,
  ): boolean {
    const arrival = range.arrival.getTime();
    const departure = range.departure.getTime();

    const previousEnds = blocks
      .map((b) => b.range.departure.getTime())
      .filter((end) => end <= arrival);
    if (previousEnds.length) {
      const gapBefore = Math.round((arrival - Math.max(...previousEnds)) / MS_PER_NIGHT);
      if (this.isOrphan(gapBefore, minNights, maxTurnoverGap)) return true;
    }

    const nextStarts = blocks
      .map((b) => b.range.arrival.getTime())
      .filter((start) => start >= departure);
    if (nextStarts.length) {
      const gapAfter = Math.round((Math.min(...nextStarts) - departure) / MS_PER_NIGHT);
      if (this.isOrphan(gapAfter, minNights, maxTurnoverGap)) return true;
    }

    return false;
  }

  private isOrphan(gap: number, minNights: number, maxTurnoverGap: number): boolean {
    return gap > maxTurnoverGap && gap < minNights;
  }
}
