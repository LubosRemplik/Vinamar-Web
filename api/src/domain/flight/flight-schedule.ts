import { Origin } from './origin';

// outbound: origin -> ALC, return: ALC -> origin
export type FlightDirection = 'outbound' | 'return';

export class FlightSchedule {
  constructor(
    public readonly origin: Origin,
    public readonly direction: FlightDirection,
    public readonly date: string, // 'YYYY-MM-DD'
    public readonly departureTime: string, // 'HH:MM'
    public readonly arrivalTime: string, // 'HH:MM'
    public readonly carrier: string,
    public readonly flightNumber: string,
  ) {}
}
