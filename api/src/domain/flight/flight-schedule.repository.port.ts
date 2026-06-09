import { Origin } from './origin';
import { FlightSchedule } from './flight-schedule';

export const FLIGHT_SCHEDULE_REPOSITORY = Symbol('FlightScheduleRepository');

export interface FlightScheduleRepository {
  replaceForOrigin(origin: Origin, schedules: FlightSchedule[]): Promise<void>;
  listInRange(from: string, to: string): Promise<FlightSchedule[]>;
}
