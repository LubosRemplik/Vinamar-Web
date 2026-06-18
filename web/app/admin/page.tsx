'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchAdminCalendar,
  cancelCalendarEntry,
  type CalendarEntry,
} from '@/lib/api';
import { getAdminToken, adminLogout } from '@/lib/admin';
import { formatCzDate } from '@/lib/date';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface Row {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  arrival: string;
  departure: string;
  status: string;
  message: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Čeká', cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Potvrzeno', cls: 'bg-emerald-100 text-emerald-800' },
  declined: { label: 'Zamítnuto', cls: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Zrušeno', cls: 'bg-ink/10 text-ink/60' },
};

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'pending', label: 'Čeká' },
  { value: 'confirmed', label: 'Potvrzeno' },
  { value: 'declined', label: 'Zamítnuto' },
  { value: 'cancelled', label: 'Zrušeno' },
];

const RESERVATION_FILTERS: { value: string; label: string }[] = [
  { value: 'current', label: 'Aktuální' },
  { value: 'past', label: 'Minulé' },
  { value: 'all', label: 'Vše' },
];

function FilterChips({
  options,
  value,
  counts,
  onSelect,
}: {
  options: { value: string; label: string }[];
  value: string;
  counts: Record<string, number>;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {options.map((f) => {
        const active = value === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onSelect(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              active ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70 hover:bg-ink/10'
            }`}
          >
            {f.label}
            <span className={active ? 'ml-1.5 text-white/70' : 'ml-1.5 text-ink/40'}>
              {counts[f.value] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const BTN_PRIMARY =
  'rounded-lg bg-sea px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sea/90';
const BTN_DANGER =
  'rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50';
const BTN_NEUTRAL =
  'rounded-lg border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5';

const PAGE_SIZE = 10;

function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const btn =
    'rounded-lg border border-ink/20 px-3 py-1 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="mt-3 flex items-center justify-end gap-3 text-sm">
      <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Předchozí
      </button>
      <span className="text-ink/55">
        Strana {page} z {totalPages}
      </span>
      <button className={btn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Další
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: 'bg-ink/10 text-ink/60' };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function term(from: string, to: string) {
  return `${formatCzDate(from)} → ${formatCzDate(to)}`;
}

function Comment({ text }: { text?: string | null }) {
  if (!text) return null;
  return <div className="mt-1 max-w-xs whitespace-pre-wrap italic text-ink/70">„{text}"</div>;
}

export default function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [token, setToken] = useState<string | null>(null);
  // Default to pending so a long history of resolved inquiries doesn't bury the
  // ones that still need a decision.
  const [filter, setFilter] = useState('pending');
  // Reservations default to current/upcoming (ongoing or not yet ended); 'past' lets
  // the owner look back at stays that already finished.
  const [reservationFilter, setReservationFilter] = useState('current');
  const [inquiryPage, setInquiryPage] = useState(1);
  const [reservationPage, setReservationPage] = useState(1);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const t = getAdminToken();
    if (!t) {
      window.location.href = '/admin/login';
      return;
    }
    setToken(t);
  }, []);

  async function loadInquiries(t: string) {
    const res = await fetch(`${BASE}/admin/inquiries`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) return adminLogout();
    setRows(await res.json());
  }

  async function loadCalendar(t: string) {
    try {
      setEntries(await fetchAdminCalendar(t));
    } catch {
      adminLogout();
    }
  }

  function reload(t: string) {
    loadInquiries(t);
    loadCalendar(t);
  }

  useEffect(() => {
    if (token) reload(token);
  }, [token]);

  async function act(id: string, action: 'confirm' | 'decline') {
    if (!token) return;
    const res = await fetch(`${BASE}/admin/inquiries/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return adminLogout();
    reload(token);
  }

  async function cancel(id: string) {
    if (!token) return;
    if (!window.confirm('Opravdu zrušit tuto rezervaci a uvolnit termín?')) return;
    try {
      await cancelCalendarEntry(token, id);
      reload(token);
    } catch {
      adminLogout();
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visibleRows = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  const inquiryTotalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const inquirySafePage = Math.min(inquiryPage, inquiryTotalPages);
  const pagedRows = visibleRows.slice((inquirySafePage - 1) * PAGE_SIZE, inquirySafePage * PAGE_SIZE);

  // A stay is "current" until its departure day passes (covers ongoing and upcoming);
  // once departure is before today it moves to "past".
  const reservationCounts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length, current: 0, past: 0 };
    for (const e of entries) c[e.end < today ? 'past' : 'current'] += 1;
    return c;
  }, [entries, today]);

  const visibleEntries = entries.filter((e) => {
    if (reservationFilter === 'current') return e.end >= today;
    if (reservationFilter === 'past') return e.end < today;
    return true;
  });

  const reservationTotalPages = Math.max(1, Math.ceil(visibleEntries.length / PAGE_SIZE));
  const reservationSafePage = Math.min(reservationPage, reservationTotalPages);
  const pagedEntries = visibleEntries.slice(
    (reservationSafePage - 1) * PAGE_SIZE,
    reservationSafePage * PAGE_SIZE,
  );

  function selectFilter(value: string) {
    setFilter(value);
    setInquiryPage(1);
  }

  function selectReservationFilter(value: string) {
    setReservationFilter(value);
    setReservationPage(1);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Administrace</h1>
        <button onClick={() => adminLogout()} className={BTN_NEUTRAL}>
          Odhlásit
        </button>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-ink">Rezervace</h2>
        <FilterChips
          options={RESERVATION_FILTERS}
          value={reservationFilter}
          counts={reservationCounts}
          onSelect={selectReservationFilter}
        />
        <div className="overflow-x-auto rounded-2xl border border-ink/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.03] text-left text-ink/60">
                <th className="px-4 py-2 font-medium">Termín</th>
                <th className="px-4 py-2 font-medium">Host</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pagedEntries.map((e) => (
                <tr key={e.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3 align-top text-ink/80">{term(e.start, e.end)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-ink">{e.guestName}</div>
                    {e.email && <div className="text-ink/55">{e.email}</div>}
                    {e.phone && <div className="text-ink/55">{e.phone}</div>}
                    <Comment text={e.message} />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <button onClick={() => cancel(e.id)} className={BTN_DANGER}>
                      Zrušit
                    </button>
                  </td>
                </tr>
              ))}
              {visibleEntries.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-ink/50">
                    Žádné rezervace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager
          page={reservationSafePage}
          totalPages={reservationTotalPages}
          onPage={setReservationPage}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-ink">Poptávky</h2>

        <FilterChips options={FILTERS} value={filter} counts={counts} onSelect={selectFilter} />

        <div className="overflow-x-auto rounded-2xl border border-ink/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.03] text-left text-ink/60">
                <th className="px-4 py-2 font-medium">Host</th>
                <th className="px-4 py-2 font-medium">Termín</th>
                <th className="px-4 py-2 font-medium">Stav</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((r) => (
                <tr key={r.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-ink">{r.guestName}</div>
                    <div className="text-ink/55">{r.email}</div>
                    {r.phone && <div className="text-ink/55">{r.phone}</div>}
                    <Comment text={r.message} />
                  </td>
                  <td className="px-4 py-3 align-top text-ink/80">{term(r.arrival, r.departure)}</td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => act(r.id, 'confirm')} className={BTN_PRIMARY}>
                          Potvrdit
                        </button>
                        <button onClick={() => act(r.id, 'decline')} className={BTN_DANGER}>
                          Zamítnout
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-ink/50">
                    Žádné poptávky.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={inquirySafePage} totalPages={inquiryTotalPages} onPage={setInquiryPage} />
      </section>
    </main>
  );
}
