import Image from 'next/image';
import Link from 'next/link';
import type { TripTip } from '@/lib/content';

export default function TripCard({ trip }: { trip: TripTip }) {
  return (
    <Link href={`/tipy-na-vylety/${trip.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden">
        {trip.image ? (
          <Image
            src={trip.image}
            alt={trip.title}
            fill
            sizes="(min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          // No freely licensed photo exists for this place — a monogram tile keeps
          // the grid intact instead of borrowing someone else's picture.
          <div className="flex h-full items-center justify-center border border-line bg-[#F5F1E8]">
            <span className="font-script text-5xl uppercase text-brass/70">V</span>
          </div>
        )}
      </div>
      <div className="mt-5">
        <h3 className="transition-colors group-hover:text-ink/70">{trip.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/90">{trip.summary}</p>
      </div>
    </Link>
  );
}
