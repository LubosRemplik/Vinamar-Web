'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAvailability, type Block } from '@/lib/api';
import { formatCzDate } from '@/lib/date';
import MonthCard from '@/components/MonthCard';
import BookingForm from '@/components/BookingForm';
import FlightSchedules from '@/components/FlightSchedules';

const MS_DAY = 86_400_000;
const MIN_NIGHTS = 7;
const MAX_TURNOVER_GAP = 2;
const HORIZON_MONTHS = 12;

const iso = (d: Date) => d.toISOString().slice(0, 10);

function buildMonths(today: string): { year: number; month: number }[] {
  const [y, m] = today.split('-').map(Number);
  const out: { year: number; month: number }[] = [];
  for (let i = 0; i < HORIZON_MONTHS; i++) {
    const idx = m - 1 + i;
    out.push({ year: y + Math.floor(idx / 12), month: (idx % 12) + 1 });
  }
  return out;
}

const nightsBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / MS_DAY);

function rangeOverlapsBlock(a: string, b: string, blocks: Block[]): boolean {
  return blocks.some((blk) => a < blk.end && blk.start < b);
}

// A leftover gap of 3..MIN_NIGHTS-1 nights next to an existing booking can never be
// re-booked (too short for the minimum stay) yet is too long for turnover — forbid it.
function createsOrphanGap(a: string, b: string, blocks: Block[]): boolean {
  const arrival = Date.parse(a);
  const departure = Date.parse(b);
  const prevEnds = blocks.map((blk) => Date.parse(blk.end)).filter((t) => t <= arrival);
  if (prevEnds.length) {
    const gap = Math.round((arrival - Math.max(...prevEnds)) / MS_DAY);
    if (gap > MAX_TURNOVER_GAP && gap < MIN_NIGHTS) return true;
  }
  const nextStarts = blocks.map((blk) => Date.parse(blk.start)).filter((t) => t >= departure);
  if (nextStarts.length) {
    const gap = Math.round((Math.min(...nextStarts) - departure) / MS_DAY);
    if (gap > MAX_TURNOVER_GAP && gap < MIN_NIGHTS) return true;
  }
  return false;
}

// Returns a human hint if [arrival, departure) is not a valid stay, otherwise null.
function departureProblem(arrival: string, departure: string, blocks: Block[]): string | null {
  if (nightsBetween(arrival, departure) < MIN_NIGHTS) {
    return `Minimální pobyt je ${MIN_NIGHTS} nocí, vyberte prosím jiný termín.`;
  }
  if (rangeOverlapsBlock(arrival, departure, blocks)) {
    return 'Vybraný úsek zasahuje do obsazeného termínu, vyberte prosím jiný termín.';
  }
  if (createsOrphanGap(arrival, departure, blocks)) {
    return 'Termín by vedle obsazeného období nechal příliš mnoho nevyužitých dní, vyberte prosím jiný termín.';
  }
  return null;
}

export default function CalendarWall() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [today, setToday] = useState('');
  const [arrival, setArrival] = useState<string | null>(null);
  const [departure, setDeparture] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const now = new Date();
    const from = iso(now);
    const end = new Date(now);
    end.setMonth(end.getMonth() + HORIZON_MONTHS);
    setToday(from);
    setStatus('loading');
    fetchAvailability(from, iso(end))
      .then((b) => {
        if (!active) return;
        setBlocks(b);
        setStatus('success');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const months = useMemo(() => (today ? buildMonths(today) : []), [today]);
  const nights = arrival && departure ? nightsBetween(arrival, departure) : 0;

  function chooseDeparture(arr: string, date: string) {
    if (date <= arr) {
      setHint('Den odjezdu musí být po dni příjezdu.');
      return;
    }
    const problem = departureProblem(arr, date, blocks);
    if (problem) {
      setHint(problem);
      return;
    }
    setDeparture(date);
  }

  function pick(date: string, kind: 'free' | 'checkout') {
    setHint(null);
    // A term's check-in day is occupied from the afternoon, so it can only be a check-out.
    if (kind === 'checkout') {
      if (!arrival) {
        setHint(
          'Tento den je obsazený příjezdem dalšího hosta — vyberte nejdřív den příjezdu; tohle může být jen den odjezdu.',
        );
        return;
      }
      chooseDeparture(arrival, date);
      return;
    }
    if (!arrival || departure) {
      setArrival(date);
      setDeparture(null);
      return;
    }
    if (date <= arrival) {
      setArrival(date);
      setDeparture(null);
      return;
    }
    chooseDeparture(arrival, date);
  }

  function reset() {
    setArrival(null);
    setDeparture(null);
    setHint(null);
  }

  const ready = Boolean(arrival && departure);

  // The mobile booking sheet is a fullscreen overlay — lock the page behind it so
  // there's a single scroll, not the sheet's scroll fighting the page's.
  useEffect(() => {
    if (!ready || !window.matchMedia('(max-width: 639px)').matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [ready]);

  return (
    <div>
      <p className="mb-5 text-sm text-ink/60">
        Klikněte na den příjezdu a poté na den odjezdu. Volné dny jsou modré, obsazené přeškrtnuté.
        Dny na hraně termínu jsou poloviční (střídání) — lze na ně přijet odpoledne, nebo odjet
        dopoledne. Minimální pobyt je {MIN_NIGHTS} nocí. Přímé lety Ryanairu do Alicante sledujeme
        z Pardubic, Vratislavi, Lince, Bratislavy, Vídně a Katovic — konkrétní spojení tam i zpět
        pro váš pobyt se zobrazí po zvolení termínu.
      </p>

      {status === 'error' && (
        <div role="alert" className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-6 text-center">
          <p className="font-medium text-terracotta">Dostupnost se nepodařilo načíst.</p>
          <p className="mt-1 text-sm text-ink/55">Zkuste to prosím za chvíli znovu.</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-ink/10 bg-white p-5 shadow-card" />
          ))}
        </div>
      )}

      {status === 'success' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((mm) => (
            <MonthCard
              key={`${mm.year}-${mm.month}`}
              year={mm.year}
              month={mm.month}
              blocks={blocks}
              today={today}
              arrival={arrival}
              departure={departure}
              onPick={pick}
            />
          ))}
        </div>
      )}

      {/* Booking + flights: fullscreen sheet on mobile (single scroll), centered
          sticky card on desktop. */}
      {ready && arrival && departure && (
        <div className="fixed inset-0 z-50 sm:sticky sm:inset-auto sm:bottom-4 sm:z-10 sm:mt-6">
          <div className="h-full overflow-y-auto overscroll-contain bg-white p-4 sm:mx-auto sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-ink/10 sm:shadow-cardHover">
            <div className="sticky top-0 -mx-4 -mt-4 mb-4 border-b border-ink/10 bg-white px-4 py-3 sm:hidden">
              <h2 className="text-lg font-semibold text-ink">Nezávazná poptávka</h2>
            </div>
            <BookingForm arrival={arrival} departure={departure} nights={nights} onReset={reset} />
            <FlightSchedules arrival={arrival} departure={departure} />
          </div>
        </div>
      )}

      {!ready && (arrival || hint) && (
        <div className="sticky bottom-4 z-10 mt-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-ink/10 bg-white p-4 shadow-cardHover">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                {arrival && (
                  <span className="text-ink/70">
                    Příjezd <span className="font-medium text-ink">{formatCzDate(arrival)}</span> — vyberte den
                    odjezdu
                  </span>
                )}
                {hint && (
                  <span className={arrival ? 'ml-2 font-medium text-red-600' : 'font-medium text-red-600'}>
                    {hint}
                  </span>
                )}
              </div>
              {arrival && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-ink/15 bg-ink/5 px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/10"
                >
                  Zrušit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
