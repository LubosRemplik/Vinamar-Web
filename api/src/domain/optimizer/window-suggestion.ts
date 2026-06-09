import { DateRange } from '../shared/date-range';
import { Origin } from '../flight/origin';
import { Money } from '../flight/money';

export class WindowSuggestion {
  constructor(
    public readonly range: DateRange,
    public readonly origin: Origin,
    public readonly indicativePrice: Money,
    public readonly orphanPenalty: number,
  ) {}
}
