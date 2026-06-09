import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindSchedulesQuery } from './find-schedules.query';
import { Origin, OriginCode } from '../../domain/flight/origin';
import { FlightSchedule } from '../../domain/flight/flight-schedule';
import {
  FLIGHT_SCHEDULE_REPOSITORY,
  FlightScheduleRepository,
} from '../../domain/flight/flight-schedule.repository.port';

export interface ScheduledFlightDto {
  date: string;
  departureTime: string;
  arrivalTime: string;
  carrier: string;
  flightNumber: string;
}

export interface AirportScheduleDto {
  origin: OriginCode;
  originName: string;
  order: number;
  directRyanair: boolean;
  note: string | null;
  outbound: ScheduledFlightDto[];
  return: ScheduledFlightDto[];
}

// Airports Ryanair does not serve to/from ALC get an explanatory note instead of flights.
const ROUTE_NOTES: Partial<Record<OriginCode, string>> = {
  PRG: 'Ryanair sem přímo nelétá — přímé spojení do Alicante nabízí Smartwings a Eurowings.',
};

function toDto(schedule: FlightSchedule): ScheduledFlightDto {
  return {
    date: schedule.date,
    departureTime: schedule.departureTime,
    arrivalTime: schedule.arrivalTime,
    carrier: schedule.carrier,
    flightNumber: schedule.flightNumber,
  };
}

@QueryHandler(FindSchedulesQuery)
export class FindSchedulesHandler implements IQueryHandler<FindSchedulesQuery> {
  constructor(
    @Inject(FLIGHT_SCHEDULE_REPOSITORY) private readonly repo: FlightScheduleRepository,
  ) {}

  async execute(query: FindSchedulesQuery): Promise<AirportScheduleDto[]> {
    const schedules = await this.repo.listInRange(query.from, query.to);
    const byOrigin = new Map<string, FlightSchedule[]>();
    for (const schedule of schedules) {
      const list = byOrigin.get(schedule.origin.code) ?? [];
      list.push(schedule);
      byOrigin.set(schedule.origin.code, list);
    }

    return Origin.allByPreference().map((origin) => {
      const flights = byOrigin.get(origin.code) ?? [];
      return {
        origin: origin.code,
        originName: origin.name,
        order: origin.order,
        directRyanair: flights.length > 0,
        note: ROUTE_NOTES[origin.code] ?? null,
        outbound: flights.filter((f) => f.direction === 'outbound').map(toDto),
        return: flights.filter((f) => f.direction === 'return').map(toDto),
      };
    });
  }
}
