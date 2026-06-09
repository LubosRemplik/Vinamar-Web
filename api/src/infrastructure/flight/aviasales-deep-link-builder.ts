import { Injectable } from '@nestjs/common';
import { Origin, DESTINATION } from '../../domain/flight/origin';
import { FlightDeepLinkBuilder } from '../../domain/flight/flight-deep-link-builder.port';
import { buildDeepLink } from './aviasales-deep-link';

function ddmm(d: Date): string {
  return String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCMonth() + 1).padStart(2, '0');
}

@Injectable()
export class AviasalesDeepLinkBuilder implements FlightDeepLinkBuilder {
  forDates(origin: Origin, arrival: Date, departure: Date): string {
    const marker = process.env.TRAVELPAYOUTS_MARKER ?? '';
    const path = `/search/${origin.code}${ddmm(arrival)}${DESTINATION}${ddmm(departure)}1`;
    return buildDeepLink(path, marker);
  }
}
