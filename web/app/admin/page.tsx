'use client';
import { useEffect, useState } from 'react';

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
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('vinamar_admin_token');
    if (!t) {
      window.location.href = '/admin/login';
      return;
    }
    setToken(t);
  }, []);

  async function load(t: string) {
    const res = await fetch(`${BASE}/admin/inquiries`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) return (window.location.href = '/admin/login');
    setRows(await res.json());
  }

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  async function act(id: string, action: 'confirm' | 'decline') {
    if (!token) return;
    await fetch(`${BASE}/admin/inquiries/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    load(token);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl mb-4">Poptávky</h1>
      <table className="w-full text-sm">
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
    </main>
  );
}
