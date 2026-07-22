import Container from './Container';

export default function Section({
  children,
  className = '',
  bleed = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /** Full-width sections (photo strips) skip the container. */
  bleed?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${className}`}>
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}
