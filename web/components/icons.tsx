type IconProps = { className?: string };

// Thin line icons, drawn on a 24×24 grid, inheriting colour from the parent.
// Kept local rather than pulled from a package — there are only seven of them.
function Svg({ children, className = 'h-7 w-7' }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function BeachIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 18c1.6-1 3.4-1 5 0s3.4 1 5 0 3.4-1 5 0 2 .6 3 0" />
      <path d="M12 18V8" />
      <path d="M5 8c1.4-3.2 4-5 7-5s5.6 1.8 7 5z" />
    </Svg>
  );
}

export function PoolIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 18c1.6-1 3.4-1 5 0s3.4 1 5 0 3.4-1 5 0 2 .6 3 0" />
      <path d="M2 13c1.6-1 3.4-1 5 0s3.4 1 5 0 3.4-1 5 0 2 .6 3 0" />
      <path d="M8 13V5a2 2 0 0 1 4 0" />
      <path d="M16 13V5a2 2 0 0 1 4 0" />
      <path d="M8 9h8" />
    </Svg>
  );
}

export function BedIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 18v-8" />
      <path d="M22 18v-6a2 2 0 0 0-2-2H2" />
      <path d="M2 15h20" />
      <path d="M6.5 10V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
    </Svg>
  );
}

export function AirConIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="5" width="19" height="7" rx="1.5" />
      <path d="M5.5 9h13" />
      <path d="M7 15c0 1.5 1 1.5 1 3" />
      <path d="M12 15c0 1.5 1 1.5 1 3" />
      <path d="M17 15c0 1.5 1 1.5 1 3" />
    </Svg>
  );
}

export function KitchenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3v7a2 2 0 0 0 4 0V3" />
      <path d="M8 10v11" />
      <path d="M17 3c-1.4 1-2 2.6-2 4.5S15.6 11 17 12v9" />
    </Svg>
  );
}

export function WifiIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 9a14 14 0 0 1 19 0" />
      <path d="M5.5 12.5a10 10 0 0 1 13 0" />
      <path d="M8.5 16a6 6 0 0 1 7 0" />
      <path d="M12 19.2h.01" />
    </Svg>
  );
}

export function CarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 16v-3.2L5 8h14l2 4.8V16" />
      <path d="M3 16h18" />
      <circle cx="7" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
    </Svg>
  );
}

export const AMENITY_ICONS = {
  beach: BeachIcon,
  pool: PoolIcon,
  bed: BedIcon,
  aircon: AirConIcon,
  kitchen: KitchenIcon,
  wifi: WifiIcon,
  car: CarIcon,
} as const;

export type AmenityIconName = keyof typeof AMENITY_ICONS;
