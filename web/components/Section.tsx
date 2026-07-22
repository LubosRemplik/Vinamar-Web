import Container from './Container';

// Vertical rhythm lives here rather than in the caller's className: a responsive
// `sm:py-24` would win over any `pt-0` passed in from outside.
export default function Section({
  children,
  className = '',
  bleed = false,
  id,
  top = true,
  bottom = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Full-width sections (photo strips) skip the container. */
  bleed?: boolean;
  id?: string;
  top?: boolean;
  bottom?: boolean;
}) {
  const padding = [top ? 'pt-16 sm:pt-24' : '', bottom ? 'pb-16 sm:pb-24' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <section id={id} className={`${padding} ${className}`}>
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}
