import { DateRange } from '../shared/date-range';
import { CalendarBlock } from '../availability/calendar-block';
import { FlightQuote } from '../flight/flight-quote';
import { WindowSuggestion } from './window-suggestion';

const NIGHT_MS = 1000 * 60 * 60 * 24;

export class CheapestWindowFinder {
  find(
    quotes: FlightQuote[],
    blocks: CalendarBlock[],
    desiredNights: number,
    now: Date,
    minStay = 7,
  ): WindowSuggestion[] {
    const suggestions: WindowSuggestion[] = [];

    for (const quote of quotes) {
      const arrival = quote.departureDate;
      if (arrival.getTime() <= now.getTime()) {
        continue;
      }
      const departure = new Date(arrival.getTime() + desiredNights * NIGHT_MS);
      const window = new DateRange(arrival, departure);
      if (blocks.some((b) => b.range.overlaps(window))) {
        continue;
      }
      const penalty = this.orphanPenalty(window, blocks, minStay);
      suggestions.push(new WindowSuggestion(window, quote.origin, quote.price, penalty));
    }

    return suggestions.sort(
      (a, b) =>
        a.indicativePrice.amount - b.indicativePrice.amount ||
        a.orphanPenalty - b.orphanPenalty ||
        a.range.arrival.getTime() - b.range.arrival.getTime(),
    );
  }

  private orphanPenalty(window: DateRange, blocks: CalendarBlock[], minStay: number): number {
    const prevEnds = blocks
      .map((b) => b.range.departure)
      .filter((d) => d.getTime() <= window.arrival.getTime());
    const beforeGap = prevEnds.length
      ? Math.round(
          (window.arrival.getTime() - Math.max(...prevEnds.map((d) => d.getTime()))) / NIGHT_MS,
        )
      : minStay;

    const nextStarts = blocks
      .map((b) => b.range.arrival)
      .filter((d) => d.getTime() >= window.departure.getTime());
    const afterGap = nextStarts.length
      ? Math.round(
          (Math.min(...nextStarts.map((d) => d.getTime())) - window.departure.getTime()) / NIGHT_MS,
        )
      : minStay;

    return this.sidePenalty(beforeGap, minStay) + this.sidePenalty(afterGap, minStay);
  }

  private sidePenalty(gap: number, minStay: number): number {
    if (gap >= 1 && gap <= minStay - 1) {
      return minStay - gap;
    }
    return 0;
  }
}
