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

function isBlocked(date: string, blocks: Block[]): boolean {
  return blocks.some((b) => date >= b.start && date < b.end);
}

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
  onPick: (date: string) => void;
}) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

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
          const past = date < today;
          const blocked = isBlocked(date, blocks);
          const selected =
            !!arrival && (date === arrival || (!!departure && date >= arrival && date < departure));

          const base = 'flex aspect-square items-center justify-center rounded-lg text-sm';
          if (blocked) {
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
          if (past) {
            return (
              <div key={day} data-date={date} data-state="past" aria-disabled="true" className={`${base} text-ink/20`}>
                {day}
              </div>
            );
          }
          return (
            <button
              key={day}
              type="button"
              data-date={date}
              data-state={selected ? 'selected' : 'free'}
              onClick={() => onPick(date)}
              aria-pressed={selected}
              className={`${base} focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/40 ${
                selected
                  ? 'bg-terracotta font-semibold text-white'
                  : 'cursor-pointer bg-sea/10 font-medium text-sea hover:bg-sea/20'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </article>
  );
}
