import { Origin } from './origin';
import { FlightSchedule } from './flight-schedule';

export const FLIGHT_SCHEDULE_PROVIDER = Symbol('FlightScheduleProvider');

export interface FlightScheduleProvider {
  // Both directions (origin <-> ALC) within the inclusive [from, to] date range.
  schedulesForOrigin(origin: Origin, from: string, to: string): Promise<FlightSchedule[]>;
}
