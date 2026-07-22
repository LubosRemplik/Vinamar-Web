import Image from 'next/image';
import Link from 'next/link';
import type { TripTip } from '@/lib/content';

export default function TripCard({ trip }: { trip: TripTip }) {
  return (
    <Link href={`/tipy-na-vylety/${trip.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={trip.image}
          alt={trip.title}
          fill
          sizes="(min-width: 640px) 33vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-5">
        {trip.distanceKm != null && (
          <p className="eyebrow mb-2">
            {trip.distanceKm} km
            {trip.driveMinutes != null && ` · ${trip.driveMinutes} min autem`}
          </p>
        )}
        <h3 className="transition-colors group-hover:text-ink/70">{trip.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{trip.summary}</p>
      </div>
    </Link>
  );
}
