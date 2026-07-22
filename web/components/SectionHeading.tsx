export default function SectionHeading({
  eyebrow,
  title,
  align = 'center',
  rule = true,
}: {
  eyebrow?: string;
  title: string;
  align?: 'center' | 'left';
  rule?: boolean;
}) {
  const centred = align === 'center';
  return (
    <header className={centred ? 'text-center' : ''}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2>{title}</h2>
      {rule && <hr className={`rule mt-6 ${centred ? 'mx-auto' : ''}`} />}
    </header>
  );
}
