import Image from 'next/image';
import type { Photo } from './Gallery';

// Full-bleed band of photos with hairline gaps — the recurring rhythm element
// between text sections. Capped at 1920px so it doesn't stretch on wide monitors.
export default function PhotoStrip({ photos }: { photos: Photo[] }) {
  return (
    <div className="mx-auto grid max-w-[1920px] gap-px bg-line sm:grid-cols-3">
      {photos.map((photo) => (
        <div key={photo.src} className="relative aspect-[4/3] sm:aspect-[3/4] lg:aspect-[4/3]">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(min-width: 640px) 33vw, 100vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
