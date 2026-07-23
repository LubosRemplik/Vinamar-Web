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
// doesn't fly to ALC). The IATA + ISO-date query reliably pre-fills the search;
// "nonstop" restricts it to direct flights only.
function googleFlightsUrl(arrival: string, departure: string): string {
  const q = `Nonstop flights from PRG to ALC on ${arrival} through ${departure}`;
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

  // Only airports usable for the whole trip — a flight there AND back.
  const withFlights = schedules.filter((a) => a.outbound.length > 0 && a.return.length > 0);

  // No Ryanair connection for the chosen term → hide the whole section. The
  // inquiry form is a sibling, so this never blocks sending the inquiry.
  if (status === 'success' && withFlights.length === 0) return null;

  return (
    <div className="mt-4 border-t border-ink/10 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
        Přímé lety Ryanairu (tam {formatCzDate(arrival)} · zpět {formatCzDate(departure)})
      </p>

      {status === 'loading' && <p className="text-sm text-ink/50">Načítám spojení…</p>}
      {status === 'error' && (
        <p className="text-sm text-ink">Spojení se nepodařilo načíst.</p>
      )}
      {status === 'success' && withFlights.length > 0 && (
        <ul className="space-y-3 sm:space-y-1.5">
          {withFlights.map((airport) => (
            <li
              key={airport.origin}
              className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="font-medium text-ink sm:w-32 sm:shrink-0">
                {airport.originName} <span className="text-ink/40">({airport.origin})</span>
              </span>
              <span className="text-ink/70 sm:flex-1">
                <span className="text-ink/60">Tam</span> {times(airport.outbound) ?? '—'}
              </span>
              <span className="text-ink/70 sm:flex-1">
                <span className="text-ink/60">Zpět</span> {times(airport.return) ?? '—'}
              </span>
              <a
                href={ryanairTripUrl(airport.origin, arrival, departure)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-1 border border-ink bg-ink px-3 py-2 text-[11px] uppercase tracking-button text-paper transition-colors hover:bg-ink/85 focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/40 sm:w-auto sm:shrink-0"
              >
                Cena na Ryanair →
              </a>
            </li>
          ))}
        </ul>
      )}

      {status === 'success' && (
        <p className="mt-3 text-xs leading-relaxed text-ink/50">
          Přímé spojení může existovat i z dalších letišť — například z Prahy, kam Ryanair do Alicante
          přímo nelétá (létají odsud Smartwings a Eurowings), nebo v jiné dny z více letišť.
          Kompletní nabídku všech dopravců pro váš termín najdete na{' '}
          <a
            href={googleFlightsUrl(arrival, departure)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline decoration-brass underline-offset-2"
          >
            Google Letenky
          </a>
          .
        </p>
      )}
    </div>
  );
}
