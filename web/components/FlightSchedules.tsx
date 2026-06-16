'use client';

import { useEffect, useState } from 'react';
import { fetchFlightSchedules, type AirportSchedule, type ScheduledFlight } from '@/lib/api';
import { formatCzDate } from '@/lib/date';

const CZ_DOW = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const dayOfWeek = (iso: string) => CZ_DOW[new Date(`${iso}T00:00:00Z`).getUTCDay()];

const MS_DAY = 86_400_000;
const WINDOW_DAYS = 3;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const shiftDays = (iso: string, days: number) => isoDate(new Date(Date.parse(iso) + days * MS_DAY));

function FlightList({ flights }: { flights: ScheduledFlight[] }) {
  if (flights.length === 0) {
    return <p className="text-sm text-ink/40">V okolí termínu žádné lety.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {flights.map((f) => (
        <li key={`${f.date}-${f.flightNumber}-${f.departureTime}`} className="flex items-baseline gap-2 text-sm">
          <span className="w-28 shrink-0 text-ink/60">
            {dayOfWeek(f.date)} {formatCzDate(f.date)}
          </span>
          <span className="font-medium text-ink">
            {f.departureTime} <span className="text-ink/30">→</span> {f.arrivalTime}
          </span>
          <span className="text-ink/40">
            {f.carrier}
            {f.flightNumber}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Outbound flights cluster around the arrival day, return flights around departure.
// Two windowed fetches keep the middle of the stay (irrelevant flights) out of the list.
function mergeByOrigin(
  outboundSource: AirportSchedule[],
  returnSource: AirportSchedule[],
): AirportSchedule[] {
  const returnByOrigin = new Map(returnSource.map((a) => [a.origin, a]));
  return outboundSource.map((a) => {
    const ret = returnByOrigin.get(a.origin);
    return {
      ...a,
      directRyanair: a.directRyanair || Boolean(ret?.directRyanair),
      outbound: a.outbound,
      return: ret?.return ?? [],
    };
  });
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
      fetchFlightSchedules(shiftDays(arrival, -WINDOW_DAYS), shiftDays(arrival, WINDOW_DAYS)),
      fetchFlightSchedules(shiftDays(departure, -WINDOW_DAYS), shiftDays(departure, WINDOW_DAYS)),
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

  return (
    <section className="mt-12 border-t border-ink/10 pt-10">
      <header className="mb-6 max-w-2xl">
        <h2 className="text-2xl font-semibold text-ink">Letecké spojení do Alicante</h2>
        <p className="mt-2 text-ink/60">
          Přímé lety Ryanairu z vybraných letišť kolem vašeho termínu — tam ({formatCzDate(arrival)})
          i zpět ({formatCzDate(departure)}), ± {WINDOW_DAYS} dny. Letiště jsou seřazena podle preference.
        </p>
      </header>

      {status === 'loading' && <p className="text-sm text-ink/50">Načítám spojení…</p>}
      {status === 'error' && (
        <p className="text-sm font-medium text-terracotta">Spojení se nepodařilo načíst. Zkuste to prosím znovu.</p>
      )}

      {status === 'success' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {schedules.map((airport) => (
            <article key={airport.origin} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
              <header className="mb-4 flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-ink">
                  {airport.order}. {airport.originName}
                </h3>
                <span className="text-xs font-medium uppercase tracking-wide text-ink/40">{airport.origin}</span>
              </header>

              {!airport.directRyanair ? (
                <p className="text-sm text-ink/55">
                  {airport.note ?? 'Pro toto období zde nejsou zveřejněné přímé lety Ryanairu do Alicante.'}
                </p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sea">Tam (→ Alicante)</p>
                    <FlightList flights={airport.outbound} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-terracotta">Zpět (z Alicante)</p>
                    <FlightList flights={airport.return} />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
