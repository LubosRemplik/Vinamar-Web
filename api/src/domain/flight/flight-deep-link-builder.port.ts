import { Origin } from './origin';

export const FLIGHT_DEEP_LINK_BUILDER = Symbol('FlightDeepLinkBuilder');

export interface FlightDeepLinkBuilder {
  forDates(origin: Origin, arrival: Date, departure: Date): string;
}
