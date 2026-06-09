export default function Highlights({
  items,
}: {
  items: { icon: string; label: string }[];
}) {
  return (
    <section className="flex flex-wrap justify-center gap-6 py-10 px-6">
      {items.map((it) => (
        <div key={it.label} className="text-center">
          <div className="text-3xl">{it.icon}</div>
          <div className="mt-1 text-sm">{it.label}</div>
        </div>
      ))}
    </section>
  );
}
