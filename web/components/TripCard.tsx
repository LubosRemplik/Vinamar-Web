import Image from 'next/image';
import Link from 'next/link';
import type { TripTip } from '@/lib/content';

export default function TripCard({ trip }: { trip: TripTip }) {
  return (
    <Link
      href={`/tipy-na-vylety/${trip.slug}`}
      className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
    >
      <div className="relative h-40">
        <Image src={trip.image} alt={trip.title} fill className="object-cover" />
      </div>
      <div className="p-4">
        <h3 className="text-lg">{trip.title}</h3>
        <p className="text-sm text-ink/70">{trip.summary}</p>
      </div>
    </Link>
  );
}
