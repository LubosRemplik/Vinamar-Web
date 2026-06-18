'use client';

import type { Block } from '@/lib/api';

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

const pad = (n: number) => String(n).padStart(2, '0');

const OCCUPIED = 'rgba(61,58,53,0.10)'; // matches the fully-booked days (bg-ink/10)
const FREE = 'rgba(44,122,158,0.10)'; // matches the available days (bg-sea/10)
const SELECTED = '#d9743f';
// Diagonal half-fills: morning is the upper-left triangle, afternoon the lower-right.
const afternoon = (color: string) => `linear-gradient(to bottom right, transparent 49.5%, ${color} 50.5%)`;
const morning = (color: string) => `linear-gradient(to bottom right, ${color} 49.5%, transparent 50.5%)`;

export default function MonthCard({
  year,
  month,
  blocks,
  today,
  arrival,
  departure,
  onPick,
}: {
  year: number;
  month: number;
  blocks: Block[];
  today: string;
  arrival: string | null;
  departure: string | null;
  onPick: (date: string, kind: 'free' | 'checkout') => void;
}) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const base = 'flex aspect-square items-center justify-center rounded-lg text-sm select-none';

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-ink">{MONTH_NAMES[month - 1]}</h3>
        <p className="text-sm text-ink/50">{year}</p>
      </header>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[0.7rem] font-medium uppercase tracking-wide text-ink/35">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} aria-hidden="true" />;
          const date = `${year}-${pad(month)}-${pad(day)}`;

          if (date < today) {
            return (
              <div key={day} data-date={date} data-state="past" aria-disabled="true" className={`${base} text-ink/20`}>
                {day}
              </div>
            );
          }

          const nightBlocked = blocks.some((b) => date >= b.start && date < b.end);
          const isTermStart = blocks.some((b) => b.start === date);
          const isTermEnd = blocks.some((b) => b.end === date);

          // Turnover: one term ends and another begins the same day, so the morning
          // (departure) and the afternoon (arrival) are both taken — the day is fully
          // occupied and cannot be a check-in or check-out for anyone else.
          const isTurnover = isTermStart && isTermEnd;

          // A fully booked night that is not a term boundary, or a full turnover day —
          // not selectable.
          if ((nightBlocked && !isTermStart) || isTurnover) {
            return (
              <div
                key={day}
                data-date={date}
                data-state="blocked"
                aria-disabled="true"
                className={`${base} bg-ink/10 font-medium text-ink/30 line-through`}
              >
                {day}
              </div>
            );
          }

          // Turnover days: a term's check-in day has its afternoon booked (morning free →
          // usable as YOUR check-out); a term's check-out day has its morning booked
          // (afternoon free → usable as YOUR check-in).
          const isCheckout = nightBlocked && isTermStart; // departure-only
          const isCheckin = !nightBlocked && isTermEnd; // free, but morning is taken

          const isArrival = date === arrival;
          const isDeparture = date === departure;
          const isMiddle = !!arrival && !!departure && date > arrival && date < departure;
          const selected = isArrival || isDeparture || isMiddle;

          // Turnover days read as available (free half in the same blue + dark-blue text as
          // free days) with the booked half in the same grey as fully-booked days.
          const layers: string[] = [];
          let tone: string;
          if (isMiddle) {
            tone = 'bg-terracotta font-semibold text-white';
          } else if (isCheckout) {
            layers.push(morning(isDeparture ? SELECTED : FREE));
            layers.push(afternoon(OCCUPIED));
            tone = isDeparture ? 'font-semibold text-ink' : 'font-medium text-sea';
          } else if (isCheckin) {
            layers.push(afternoon(isArrival ? SELECTED : FREE));
            layers.push(morning(OCCUPIED));
            tone = isArrival ? 'font-semibold text-ink' : 'font-medium text-sea';
          } else if (isArrival) {
            layers.push(afternoon(SELECTED));
            tone = 'bg-sea/10 font-semibold text-ink';
          } else if (isDeparture) {
            layers.push(morning(SELECTED));
            tone = 'bg-sea/10 font-semibold text-ink';
          } else {
            tone = 'bg-sea/10 font-medium text-sea hover:bg-sea/20';
          }

          return (
            <button
              key={day}
              type="button"
              data-date={date}
              data-state={isCheckout ? 'checkout' : isCheckin ? 'checkin' : selected ? 'selected' : 'free'}
              onClick={() => onPick(date, isCheckout ? 'checkout' : 'free')}
              aria-pressed={selected}
              title={isCheckout ? 'Obsazeno od odpoledne — lze zvolit jako den odjezdu' : undefined}
              style={layers.length ? { backgroundImage: layers.join(', ') } : undefined}
              className={`${base} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/40 ${tone}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </article>
  );
}
