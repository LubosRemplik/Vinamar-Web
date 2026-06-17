'use client';

import { useEffect, useState } from 'react';
import { fetchFlightSchedules, type AirportSchedule, type ScheduledFlight } from '@/lib/api';
import { formatCzDate } from '@/lib/date';

// Outbound flights on the arrival day, return flights on the departure day —
// only the flights that actually match the chosen stay, nothing around it.
function mergeByOrigin(
  outboundSource: AirportSchedule[],
  returnSource: AirportSchedule[],
): AirportSchedule[] {
  const returnByOrigin = new Map(returnSource.map((a) => [a.origin, a]));
  return outboundSource.map((a) => ({
    ...a,
    return: returnByOrigin.get(a.origin)?.return ?? [],
  }));
}

const times = (flights: ScheduledFlight[]) =>
  flights.length === 0
    ? null
    : flights
        .map((f) => `${f.departureTime}–${f.arrivalTime} ${f.carrier}${f.flightNumber}`)
        .join(', ');

// Round-trip link to Ryanair's fare-select page: lands the guest on origin↔ALC
// with both dates pre-filled, so Ryanair prices the exact trip.
function ryanairTripUrl(origin: string, arrival: string, departure: string): string {
  const params = new URLSearchParams({
    adults: '1',
    teens: '0',
    children: '0',
    infants: '0',
    isConnectedFlight: 'false',
    isReturn: 'true',
    discount: '0',
    originIata: origin,
    destinationIata: 'ALC',
    dateOut: arrival,
    dateIn: departure,
  });
  return `https://www.ryanair.com/cz/cs/trip/flights/select?${params}`;
}

// Google Flights covers every carrier and airport (incl. Prague, where Ryanair
// doesn't fly to ALC). The IATA + ISO-date query reliably pre-fills the search.
function googleFlightsUrl(arrival: string, departure: string): string {
  const q = `Flights from PRG to ALC on ${arrival} through ${departure}`;
  return `https://www.google.com/travel/flights?hl=cs&curr=EUR&q=${encodeURIComponent(q)}`;
}

export default function FlightSchedules({
  arrival,
  departure,
}: {
  arrival: string;
  departure: string;
}) {
  const [schedules, setSchedules] = useState<AirportSchedule[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([
      fetchFlightSchedules(arrival, arrival),
      fetchFlightSchedules(departure, departure),
    ])
      .then(([out, back]) => {
        if (!active) return;
        setSchedules(mergeByOrigin(out, back));
        setStatus('success');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [arrival, departure]);

  const withFlights = schedules.filter((a) => a.outbound.length > 0 || a.return.length > 0);

  return (
    <div className="mt-4 border-t border-ink/10 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
        Přímé lety Ryanairu (tam {formatCzDate(arrival)} · zpět {formatCzDate(departure)})
      </p>

      {status === 'loading' && <p className="text-sm text-ink/50">Načítám spojení…</p>}
      {status === 'error' && (
        <p className="text-sm text-terracotta">Spojení se nepodařilo načíst.</p>
      )}
      {status === 'success' && withFlights.length === 0 && (
        <p className="text-sm text-ink/50">V těchto dnech nelétá z preferovaných letišť přímý Ryanair do Alicante.</p>
      )}

      {status === 'success' && withFlights.length > 0 && (
        <ul className="space-y-1.5">
          {withFlights.map((airport) => (
            <li key={airport.origin} className="flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="w-24 shrink-0 font-medium text-ink">{airport.originName}</span>
              <span className="text-ink/70">
                <span className="text-sea">Tam</span> {times(airport.outbound) ?? '—'}
              </span>
              <span className="text-ink/70">
                <span className="text-terracotta">Zpět</span> {times(airport.return) ?? '—'}
              </span>
              <a
                href={ryanairTripUrl(airport.origin, arrival, departure)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg bg-sea px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sea/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/40"
              >
                Cena na Ryanair →
              </a>
            </li>
          ))}
        </ul>
      )}

      {status === 'success' && (
        <p className="mt-3 text-xs leading-relaxed text-ink/50">
          Spojení může existovat i z dalších letišť — například z Prahy, kam Ryanair do Alicante
          přímo nelétá (létají odsud Smartwings a Eurowings), nebo v jiné dny z více letišť.
          Kompletní nabídku všech dopravců pro váš termín najdete na{' '}
          <a
            href={googleFlightsUrl(arrival, departure)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sea underline decoration-sea/30 underline-offset-2 hover:decoration-sea"
          >
            Google Letenky
          </a>
          .
        </p>
      )}
    </div>
  );
}
