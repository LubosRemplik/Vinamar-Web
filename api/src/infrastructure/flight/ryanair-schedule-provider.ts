import { Injectable } from '@nestjs/common';
import { Origin, DESTINATION } from '../../domain/flight/origin';
import { FlightSchedule, FlightDirection } from '../../domain/flight/flight-schedule';
import { FlightScheduleProvider } from '../../domain/flight/flight-schedule-provider.port';

interface RyanairFlight {
  carrierCode: string;
  number: string;
  departureTime: string;
  arrivalTime: string;
}
interface RyanairDay {
  day: number;
  flights?: RyanairFlight[];
}
interface RyanairTimetable {
  month: number;
  days?: RyanairDay[];
}

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<RyanairTimetable> }>;

const pad = (n: number) => String(n).padStart(2, '0');

function monthsInRange(from: string, to: string): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  let year = fromYear;
  let month = fromMonth;
  while (year < toYear || (year === toYear && month <= toMonth)) {
    out.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

@Injectable()
export class RyanairScheduleProvider implements FlightScheduleProvider {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async schedulesForOrigin(origin: Origin, from: string, to: string): Promise<FlightSchedule[]> {
    const outbound = await this.fetchDirected(origin, origin.code, DESTINATION, 'outbound', from, to);
    const inbound = await this.fetchDirected(origin, DESTINATION, origin.code, 'return', from, to);
    return [...outbound, ...inbound];
  }

  private async fetchDirected(
    origin: Origin,
    fromAirport: string,
    toAirport: string,
    direction: FlightDirection,
    from: string,
    to: string,
  ): Promise<FlightSchedule[]> {
    const schedules: FlightSchedule[] = [];
    for (const { year, month } of monthsInRange(from, to)) {
      const url =
        `https://www.ryanair.com/api/timtbl/3/schedules/${fromAirport}/${toAirport}` +
        `/years/${year}/months/${month}`;
      let payload: RyanairTimetable;
      try {
        const res = await this.fetchImpl(url);
        if (!res.ok) continue; // route not operated that month
        payload = await res.json();
      } catch {
        continue;
      }
      for (const day of payload.days ?? []) {
        const date = `${year}-${pad(month)}-${pad(day.day)}`;
        if (date < from || date > to) continue;
        for (const flight of day.flights ?? []) {
          schedules.push(
            new FlightSchedule(
              origin,
              direction,
              date,
              flight.departureTime,
              flight.arrivalTime,
              flight.carrierCode,
              flight.number,
            ),
          );
        }
      }
    }
    return schedules;
  }
}
