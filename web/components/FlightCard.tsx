import { CheapestFlight } from '@/lib/api';

export default function FlightCard({ flight }: { flight: CheapestFlight }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-lg text-sea">{flight.originName} → Alicante</h3>
      <p className="text-2xl font-display text-terracotta mt-1">od {flight.price} €</p>
      <p className="text-sm text-ink/70">
        {flight.departureDate} → {flight.returnDate} · {flight.airline}
      </p>
      <a
        href={flight.deepLink}
        target="_blank"
        rel="sponsored noopener"
        className="inline-block mt-3 text-sea underline"
      >
        Zkontrolovat a rezervovat →
      </a>
    </div>
  );
}
