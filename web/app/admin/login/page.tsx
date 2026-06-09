'use client';
import { useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function AdminLogin() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    if (!res.ok) return setErr('Neplatné přihlášení');
    const { token } = await res.json();
    localStorage.setItem('vinamar_admin_token', token);
    window.location.href = '/admin';
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <h1 className="text-2xl mb-4">Administrace</h1>
      <form onSubmit={login} className="flex flex-col gap-3">
        <input suppressHydrationWarning placeholder="Uživatel" value={u} onChange={(e) => setU(e.target.value)} className="border p-2 rounded" />
        <input suppressHydrationWarning type="password" placeholder="Heslo" value={p} onChange={(e) => setP(e.target.value)} className="border p-2 rounded" />
        <button className="bg-terracotta text-white py-2 rounded">Přihlásit</button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </main>
  );
}
