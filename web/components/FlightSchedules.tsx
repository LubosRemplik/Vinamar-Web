'use client';

import { useEffect, useState } from 'react';
import { fetchFlightSchedules, type AirportSchedule, type ScheduledFlight } from '@/lib/api';
import { formatCzDate } from '@/lib/date';

const CZ_DOW = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const dayOfWeek = (iso: string) => CZ_DOW[new Date(`${iso}T00:00:00Z`).getUTCDay()];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function FlightList({ flights }: { flights: ScheduledFlight[] }) {
  if (flights.length === 0) {
    return <p className="text-sm text-ink/40">V tomto období žádné lety.</p>;
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

export default function FlightSchedules() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [schedules, setSchedules] = useState<AirportSchedule[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function load(rangeFrom: string, rangeTo: string) {
    setStatus('loading');
    try {
      const data = await fetchFlightSchedules(rangeFrom, rangeTo);
      setSchedules(data);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    const f = isoDate(today);
    const t = isoDate(end);
    setFrom(f);
    setTo(t);
    load(f, t);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (from && to && from <= to) load(from, to);
  }

  return (
    <section className="mt-16 border-t border-ink/10 pt-12">
      <header className="mb-6 max-w-2xl">
        <h2 className="text-2xl font-semibold text-ink">Letecké spojení do Alicante</h2>
        <p className="mt-2 text-ink/60">
          Přímé lety (Ryanair) z vybraných letišť. Zadejte období a uvidíte, ve které dny a v kolik
          hodin se letí — tam i zpět. Letiště jsou seřazena podle preference.
        </p>
      </header>

      <form onSubmit={submit} className="mb-8 flex flex-wrap items-end gap-3">
        <label className="text-sm text-ink/70">
          <span className="mb-1 block">Od</span>
          <input
            suppressHydrationWarning
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
          />
        </label>
        <label className="text-sm text-ink/70">
          <span className="mb-1 block">Do</span>
          <input
            suppressHydrationWarning
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-sea px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sea/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/40"
        >
          Zobrazit spojení
        </button>
      </form>

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
                  {airport.note ?? 'V zadaném období zde nejsou přímé lety Ryanairu do Alicante.'}
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
