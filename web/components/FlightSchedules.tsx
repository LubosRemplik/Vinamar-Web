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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
