'use client';
import { useEffect, useState } from 'react';
import { fetchCheapestFlights, CheapestFlight } from '@/lib/api';
import FlightCard from '@/components/FlightCard';

export default function Letenky() {
  const [flights, setFlights] = useState<CheapestFlight[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCheapestFlights().then(setFlights).catch(() => setError(true));
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-2">Letenky do Alicante</h1>
      <p className="text-ink/80 mb-6">Orientační nejnižší ceny zpátečních letenek (7 nocí).</p>
      {error && <p>Ceny se nepodařilo načíst.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {flights.map((f) => (
          <FlightCard key={f.origin} flight={f} />
        ))}
      </div>
    </main>
  );
}
