import { AMENITY_ICONS, type AmenityIconName } from './icons';

export interface Amenity {
  icon: AmenityIconName;
  label: string;
  note?: string;
}

export default function Highlights({ items }: { items: Amenity[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => {
        const Icon = AMENITY_ICONS[it.icon];
        return (
          <li key={it.label} className="flex flex-col items-center text-center">
            {Icon && <Icon className="h-8 w-8 text-brass" />}
            <span className="mt-4 text-sm tracking-wide">{it.label}</span>
            {it.note && <span className="mt-1 text-xs leading-relaxed text-sage">{it.note}</span>}
          </li>
        );
      })}
    </ul>
  );
}
