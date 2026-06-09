'use client';

import { useEffect, useState } from 'react';
import { fetchAvailabilityCalendar, type CalendarMonth } from '@/lib/api';
import MonthCard from '@/components/MonthCard';

const ORIGINS = [
  { code: 'WRO', label: 'Vratislav' },
  { code: 'PED', label: 'Pardubice' },
  { code: 'PRG', label: 'Praha' },
];

export default function CalendarWall() {
  const [origin, setOrigin] = useState('WRO');
  const [nights, setNights] = useState(7);
  const [months, setMonths] = useState<CalendarMonth[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchAvailabilityCalendar(origin, Math.max(7, nights))
      .then((data) => {
        if (!active) return;
        setMonths(data.months);
        setStatus('success');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [origin, nights]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/45">Odlet z</span>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
          >
            {ORIGINS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code} — {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/45">Počet nocí</span>
          <input
            type="number"
            min={7}
            value={nights}
            onChange={(e) => setNights(Number(e.target.value))}
            className="w-28 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
          />
        </label>
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-2xl border border-ink/10 bg-white p-5 shadow-card"
            >
              <div className="mb-4 flex justify-between">
                <div className="h-5 w-24 rounded bg-ink/8" />
                <div className="h-6 w-16 rounded-full bg-ink/8" />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((__, j) => (
                  <div key={j} className="aspect-square rounded-lg bg-ink/5" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-6 text-center"
        >
          <p className="font-medium text-terracotta">Dostupnost se nepodařilo načíst.</p>
          <p className="mt-1 text-sm text-ink/55">Zkuste to prosím za chvíli znovu.</p>
        </div>
      )}

      {status === 'success' && months.length === 0 && (
        <div className="rounded-2xl border border-ink/10 bg-white p-10 text-center shadow-card">
          <p className="font-medium text-ink">Žádné volné termíny</p>
          <p className="mt-1 text-sm text-ink/55">Pro zvolené nastavení nejsou k dispozici volné měsíce.</p>
        </div>
      )}

      {status === 'success' && months.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((m) => (
            <MonthCard key={`${m.year}-${m.month}`} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
