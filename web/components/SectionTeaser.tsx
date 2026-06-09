import Link from 'next/link';

export default function SectionTeaser({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="block flex-1 bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition"
    >
      <h3 className="text-xl text-sea mb-2">{title}</h3>
      <p className="text-ink/80">{text}</p>
    </Link>
  );
}
