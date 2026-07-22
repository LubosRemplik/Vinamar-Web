const SIZES = {
  sm: { word: 'text-2xl', sub: 'text-[8px]' },
  lg: { word: 'text-4xl sm:text-5xl', sub: 'text-[10px]' },
};

// Kaushan Script carries a wide left sidebearing on its capitals, which reads as
// the logo being indented from everything below it. The 0.24em comes from the
// glyph's actualBoundingBoxLeft measured at render size.
const OPTICAL_LEFT = '-ml-[0.24em]';

// The wordmark is set in caps on purpose — the script face reads as a row of
// ornamental initials, which is the look the owner picked.
export default function Logo({
  size = 'sm',
  subtitle = false,
  tone = 'ink',
}: {
  size?: keyof typeof SIZES;
  subtitle?: boolean;
  tone?: 'ink' | 'paper';
}) {
  const s = SIZES[size];
  const colour = tone === 'paper' ? 'text-paper' : 'text-ink';
  const subColour = tone === 'paper' ? 'text-paper/70' : 'text-sage';

  return (
    <span className={`inline-flex flex-col leading-none ${colour}`}>
      <span className={`font-script uppercase ${OPTICAL_LEFT} ${s.word}`}>ViñaMar</span>
      {subtitle && (
        <span className={`mt-1 uppercase tracking-eyebrow ${s.sub} ${subColour}`}>
          La Mata · Torrevieja
        </span>
      )}
    </span>
  );
}
