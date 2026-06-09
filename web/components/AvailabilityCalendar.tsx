'use client';
import { Block } from '@/lib/api';

function isBlocked(date: string, blocks: Block[]): boolean {
  return blocks.some((b) => date >= b.start && date < b.end);
}

export default function AvailabilityCalendar({
  blocks,
  monthStart,
}: {
  blocks: Block[];
  monthStart: string;
}) {
  const start = new Date(monthStart);
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => (
        <div
          key={d}
          className={`text-center text-xs py-2 rounded ${
            isBlocked(d, blocks) ? 'bg-ink/20 text-ink/50 line-through' : 'bg-white'
          }`}
        >
          {d.slice(8)}
        </div>
      ))}
    </div>
  );
}
