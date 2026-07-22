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
    <section className="relative flex min-h-[520px] items-end justify-center sm:h-[78vh]">
      <Image src={image} alt={alt} fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/75 via-ink/30 to-ink/20" />

      <div className="px-6 pb-16 text-center text-paper sm:pb-24">
        <p className="eyebrow mb-5 text-paper/80">{eyebrow}</p>
        <h1 className="mx-auto max-w-3xl text-paper">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-paper/85 sm:text-lg">{subtitle}</p>
        <Link href="/volne-terminy" className="btn btn-light mt-9">
          Zobrazit volné termíny
        </Link>
      </div>
    </section>
  );
}
