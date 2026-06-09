'use client';
import { useState } from 'react';
import Link from 'next/link';
import { fetchCheapestWindows, CheapestWindow } from '@/lib/api';

const ORIGINS = [
  { code: 'PED', name: 'Pardubice' },
  { code: 'WRO', name: 'Vratislav' },
  { code: 'PRG', name: 'Praha' },
];

export default function WindowFinder() {
  const [origin, setOrigin] = useState('WRO');
  const [nights, setNights] = useState(7);
  const [windows, setWindows] = useState<CheapestWindow[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      setWindows(await fetchCheapestWindows(origin, Math.max(7, nights)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex flex-wrap gap-3 items-end mb-6">
        <label className="text-sm">
          Odkud
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="border p-2 rounded block"
          >
            {ORIGINS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Počet nocí
          <input
            type="number"
            min={7}
            value={nights}
            onChange={(e) => setNights(Number(e.target.value))}
            className="border p-2 rounded block w-24"
          />
        </label>
        <button className="bg-terracotta text-white py-2 px-4 rounded">Najít termíny</button>
      </form>

      {loading && <p>Hledám…</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {windows.map((w) => (
          <div key={w.arrival} className="bg-white rounded-xl p-4 shadow-sm">
            <p className="font-display text-lg">
              {w.arrival} → {w.departure}
            </p>
            <p className="text-terracotta">orientační letenka od {w.indicativePrice} €</p>
            <div className="flex gap-4 mt-2 text-sm">
              <Link
                href={`/rezervace?arrival=${w.arrival}&departure=${w.departure}`}
                className="text-sea underline"
              >
                Vybrat termín
              </Link>
              <a
                href={w.flightDeepLink}
                target="_blank"
                rel="sponsored noopener"
                className="text-sea underline"
              >
                Rezervovat letenku
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
