'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export interface Photo {
  src: string;
  alt: string;
  /** When set, the tile is a video: `src` is the poster, `video` the file. */
  video?: string;
}

function PlayBadge() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/55 ring-1 ring-paper/70 transition-transform duration-300 group-hover:scale-110">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 text-paper" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </span>
  );
}

export default function Gallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    const last = openIndex;
    setOpenIndex(null);
    if (last !== null) tiles.current[last]?.focus();
  }, [openIndex]);

  const step = useCallback(
    (delta: number) => setOpenIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex, close, step]);

  const current = openIndex === null ? null : photos[openIndex];

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <li key={photo.src}>
            <button
              type="button"
              ref={(el) => {
                tiles.current[i] = el;
              }}
              onClick={() => setOpenIndex(i)}
              className="group relative block aspect-[4/3] w-full overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-ink"
              aria-label={photo.video ? `Přehrát video: ${photo.alt}` : `Zvětšit fotku: ${photo.alt}`}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              {photo.video && <PlayBadge />}
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Zavřít"
            className="absolute right-5 top-5 p-2 text-paper/80 hover:text-paper"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Předchozí fotka"
            className="absolute left-3 p-3 text-paper/70 hover:text-paper sm:left-8"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>

          <figure className="relative max-h-full w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {current.video ? (
              <video
                key={current.video}
                src={current.video}
                poster={current.src}
                controls
                autoPlay
                playsInline
                className="mx-auto max-h-[80vh] w-full bg-black object-contain"
              />
            ) : (
              <div className="relative aspect-[4/3] w-full">
                <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
              </div>
            )}
            <figcaption className="mt-4 text-center text-xs uppercase tracking-[0.18em] text-paper/70">
              {current.alt}
            </figcaption>
          </figure>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Další fotka"
            className="absolute right-3 p-3 text-paper/70 hover:text-paper sm:right-8"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
