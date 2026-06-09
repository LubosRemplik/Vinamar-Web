import Image from 'next/image';
import Link from 'next/link';

export default function Hero({
  title,
  subtitle,
  image,
}: {
  title: string;
  subtitle: string;
  image: string;
}) {
  return (
    <section className="relative h-[60vh] min-h-[360px] flex items-center justify-center text-center">
      <Image src={image} alt="" fill priority className="object-cover -z-10 brightness-75" />
      <div className="text-white px-6">
        <h1 className="text-4xl md:text-5xl mb-3">{title}</h1>
        <p className="text-lg mb-6">{subtitle}</p>
        <Link
          href="/najit-terminy"
          className="inline-block bg-terracotta px-6 py-3 rounded-full font-semibold"
        >
          Zjistit nejlevnější termíny →
        </Link>
      </div>
    </section>
  );
}
