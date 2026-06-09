import TripCard from '@/components/TripCard';
import { getAllTrips } from '@/lib/content';

export default function TripsList() {
  const trips = getAllTrips();
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl mb-6">Tipy na výlety</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {trips.map((t) => (
          <TripCard key={t.slug} trip={t} />
        ))}
      </div>
    </main>
  );
}
