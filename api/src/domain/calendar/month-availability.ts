import { DateRange } from '../shared/date-range';
import { WindowSuggestion } from '../optimizer/window-suggestion';

export class MonthAvailability {
  constructor(
    public readonly year: number,
    public readonly month: number, // 1–12
    public readonly freeRanges: DateRange[],
    public readonly cheapestWindow: WindowSuggestion | null,
  ) {}
}
