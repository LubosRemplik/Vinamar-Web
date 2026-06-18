'use client';
import { useEffect, useState } from 'react';
import {
  fetchAdminCalendar,
  cancelCalendarEntry,
  type CalendarEntry,
} from '@/lib/api';
import { getAdminToken, adminLogout } from '@/lib/admin';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface Row {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  arrival: string;
  departure: string;
  status: string;
}

export default function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [token, setToken] = useState<string | null>(null);

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
    if (!window.confirm('Opravdu zrušit tuto položku kalendáře a uvolnit termín?')) return;
    try {
      await cancelCalendarEntry(token, id);
      reload(token);
    } catch {
      adminLogout();
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">Administrace</h1>
        <button onClick={() => adminLogout()} className="text-sm text-ink/60 underline hover:text-ink">
          Odhlásit
        </button>
      </div>

      <h2 className="text-xl mb-3">Poptávky</h2>
      <table className="w-full text-sm mb-10">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Host</th><th>Termín</th><th>Stav</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2">
                {r.guestName}
                <br />
                <span className="text-ink/60">{r.email}</span>
                {r.phone && <><br /><span className="text-ink/60">{r.phone}</span></>}
              </td>
              <td>{r.arrival} → {r.departure}</td>
              <td>{r.status}</td>
              <td className="text-right">
                {r.status === 'pending' && (
                  <>
                    <button onClick={() => act(r.id, 'confirm')} className="text-sea mr-3">Potvrdit</button>
                    <button onClick={() => act(r.id, 'decline')} className="text-red-600">Zamítnout</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl mb-3">Kalendář — rezervace a bloky</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Termín</th><th>Typ</th><th>Host / poznámka</th><th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="py-2">{e.start} → {e.end}</td>
              <td>{e.reason === 'booked' ? 'Rezervace' : 'Blok'}</td>
              <td>
                {e.reason === 'booked' ? (
                  <>
                    {e.guestName}
                    {e.email && <><br /><span className="text-ink/60">{e.email}</span></>}
                    {e.phone && <><br /><span className="text-ink/60">{e.phone}</span></>}
                  </>
                ) : (
                  <span className="text-ink/60">{e.note ?? '—'}</span>
                )}
              </td>
              <td className="text-right">
                <button onClick={() => cancel(e.id)} className="text-red-600">Zrušit</button>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr><td colSpan={4} className="py-3 text-ink/50">Žádné rezervace ani bloky.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
