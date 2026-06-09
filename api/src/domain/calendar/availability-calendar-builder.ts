import { DateRange } from '../shared/date-range';
import { CalendarBlock } from '../availability/calendar-block';
import { WindowSuggestion } from '../optimizer/window-suggestion';
import { MonthAvailability } from './month-availability';
import { AvailabilityCalendar } from './availability-calendar';

export class AvailabilityCalendarBuilder {
  build(
    blocks: CalendarBlock[],
    windows: WindowSuggestion[],
    now: Date,
    horizonEnd: Date,
  ): AvailabilityCalendar {
    const freeRanges = this.freeRanges(blocks, now, horizonEnd);
    const months: MonthAvailability[] = [];

    let cursor = this.monthStart(now);
    while (cursor.getTime() < horizonEnd.getTime()) {
      const next = this.addMonth(cursor);
      const monthRange = new DateRange(cursor, next);
      months.push(
        new MonthAvailability(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth() + 1,
          this.clip(freeRanges, monthRange),
          this.cheapestIn(windows, cursor, next),
        ),
      );
      cursor = next;
    }

    return new AvailabilityCalendar(months);
  }

  private freeRanges(blocks: CalendarBlock[], now: Date, horizonEnd: Date): DateRange[] {
    const merged = this.merge(
      blocks
        .map((b) => b.range)
        .filter((r) => r.departure.getTime() > now.getTime() && r.arrival.getTime() < horizonEnd.getTime()),
    );

    const free: DateRange[] = [];
    let cursor = now.getTime();
    for (const r of merged) {
      const start = Math.max(r.arrival.getTime(), now.getTime());
      if (start > cursor) {
        free.push(new DateRange(new Date(cursor), new Date(start)));
      }
      cursor = Math.max(cursor, Math.min(r.departure.getTime(), horizonEnd.getTime()));
    }
    if (cursor < horizonEnd.getTime()) {
      free.push(new DateRange(new Date(cursor), new Date(horizonEnd.getTime())));
    }
    return free;
  }

  private merge(ranges: DateRange[]): DateRange[] {
    const sorted = [...ranges].sort((a, b) => a.arrival.getTime() - b.arrival.getTime());
    const out: DateRange[] = [];
    for (const r of sorted) {
      const last = out[out.length - 1];
      if (last && r.arrival.getTime() <= last.departure.getTime()) {
        if (r.departure.getTime() > last.departure.getTime()) {
          out[out.length - 1] = new DateRange(last.arrival, r.departure);
        }
      } else {
        out.push(r);
      }
    }
    return out;
  }

  private clip(freeRanges: DateRange[], month: DateRange): DateRange[] {
    const out: DateRange[] = [];
    for (const r of freeRanges) {
      const start = Math.max(r.arrival.getTime(), month.arrival.getTime());
      const end = Math.min(r.departure.getTime(), month.departure.getTime());
      if (end > start) {
        out.push(new DateRange(new Date(start), new Date(end)));
      }
    }
    return out;
  }

  private cheapestIn(windows: WindowSuggestion[], monthStart: Date, monthEnd: Date): WindowSuggestion | null {
    let best: WindowSuggestion | null = null;
    for (const w of windows) {
      const a = w.range.arrival.getTime();
      if (a < monthStart.getTime() || a >= monthEnd.getTime()) {
        continue;
      }
      if (!best || w.indicativePrice.amount < best.indicativePrice.amount) {
        best = w;
      }
    }
    return best;
  }

  private monthStart(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private addMonth(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
}
