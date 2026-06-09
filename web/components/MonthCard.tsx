'use client';

import Link from 'next/link';
import type { CalendarMonth } from '@/lib/api';

const MONTH_NAMES = [
  'Leden',
  'Únor',
  'Březen',
  'Duben',
  'Květen',
  'Červen',
  'Červenec',
  'Srpen',
  'Září',
  'Říjen',
  'Listopad',
  'Prosinec',
];

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function formatPrice(price: number, currency: string): string {
  const unit = currency === 'EUR' ? '€' : currency;
  return `od ${price} ${unit}`;
}

function formatDay(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(day)}. ${Number(month)}.`;
}

function freeDaySet(month: CalendarMonth): Set<number> {
  const days = new Set<number>();
  for (const range of month.freeRanges) {
    const start = new Date(range.start + 'T00:00:00Z');
    const end = new Date(range.end + 'T00:00:00Z');
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getUTCFullYear() === month.year && d.getUTCMonth() + 1 === month.month) {
        days.add(d.getUTCDate());
      }
    }
  }
  return days;
}

export default function MonthCard({ m }: { m: CalendarMonth }) {
  const daysInMonth = new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(m.year, m.month - 1, 1)).getUTCDay() + 6) % 7;
  const freeDays = freeDaySet(m);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  return (
    <article className="group flex flex-col rounded-2xl border border-ink/10 bg-white p-5 shadow-card transition-shadow duration-300 hover:shadow-cardHover">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{MONTH_NAMES[m.month - 1]}</h3>
          <p className="text-sm text-ink/50">{m.year}</p>
        </div>
        {m.cheapest ? (
          <span className="inline-flex items-center rounded-full bg-terracotta px-3 py-1 text-sm font-semibold text-white shadow-sm">
            {formatPrice(m.cheapest.indicativePrice, m.cheapest.currency)}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-ink/5 px-3 py-1 text-sm font-medium text-ink/40">
            bez letenky
          </span>
        )}
      </header>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[0.7rem] font-medium uppercase tracking-wide text-ink/35">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} aria-hidden="true" />;
          const isFree = freeDays.has(day);
          return (
            <div
              key={day}
              className={
                isFree
                  ? 'flex aspect-square items-center justify-center rounded-lg bg-sea/12 text-sm font-semibold text-sea'
                  : 'flex aspect-square items-center justify-center rounded-lg text-sm text-ink/35'
              }
            >
              {day}
            </div>
          );
        })}
      </div>

      {m.cheapest ? (
        <div className="mt-5 border-t border-ink/8 pt-4">
          <p className="mb-3 text-sm font-medium text-ink">
            <span className="text-ink/70">{formatDay(m.cheapest.arrival)}</span>
            <span className="mx-1.5 text-ink/30">→</span>
            <span className="text-ink/70">{formatDay(m.cheapest.departure)}</span>
            {m.cheapest.hasOrphanGap && (
              <span className="ml-2 inline-flex items-center rounded-md bg-ochre/15 px-1.5 py-0.5 text-[0.7rem] font-medium text-ochre">
                kratší mezera
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={'/rezervace?arrival=' + m.cheapest.arrival + '&departure=' + m.cheapest.departure}
              className="flex-1 rounded-xl bg-terracotta px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-terracotta/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50 focus-visible:ring-offset-2"
            >
              Rezervovat termín
            </Link>
            <a
              href={m.cheapest.flightDeepLink}
              target="_blank"
              rel="sponsored noopener"
              className="rounded-xl border border-sea/30 px-4 py-2.5 text-sm font-semibold text-sea transition-colors hover:bg-sea/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/40 focus-visible:ring-offset-2"
            >
              Letenka
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-5 border-t border-ink/8 pt-4">
          <p className="text-sm text-ink/40">Pro tento měsíc jsme nenašli levnou letenku.</p>
        </div>
      )}
    </article>
  );
}
