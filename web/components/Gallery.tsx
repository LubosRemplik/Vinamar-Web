import Image from 'next/image';

export default function Gallery({ images }: { images: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 mt-6">
      {images.map((src) => (
        <div key={src} className="relative h-48 rounded-xl overflow-hidden">
          <Image src={src} alt="" fill className="object-cover" />
        </div>
      ))}
    </div>
  );
}
