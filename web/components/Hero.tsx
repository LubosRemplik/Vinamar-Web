import Image from 'next/image';
import Link from 'next/link';

export default function Hero({
  title,
  subtitle,
  image,
  eyebrow = 'La Mata · Costa Blanca',
  alt = '',
}: {
  title: string;
  subtitle: string;
  image: string;
  eyebrow?: string;
  alt?: string;
}) {
  return (
    // The photo is sized to the block of type it carries, not to the viewport —
    // a full-height hero pushed everything else below the fold.
    <section className="relative flex items-center justify-center">
      {/* On wide screens the crop is a narrow band; centring it would spend half
          the frame on the empty terrace in the foreground. */}
      <Image
        src={image}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-center sm:object-[50%_35%]"
      />
      {/* The pool photo is bright in the middle, exactly where the headline sits —
          the scrim has to carry the type, not just darken the edges. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/55 to-ink/40" />

      <div className="px-6 py-24 text-center text-paper sm:py-28">
        <p className="eyebrow mb-5 text-paper/90">{eyebrow}</p>
        <h1 className="mx-auto max-w-3xl text-paper">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-paper/90 sm:text-lg">{subtitle}</p>
        <Link href="/volne-terminy" className="btn btn-light mt-9">
          Zobrazit volné termíny
        </Link>
      </div>
    </section>
  );
}
