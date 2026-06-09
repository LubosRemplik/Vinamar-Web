const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface Block {
  start: string;
  end: string;
}

export async function fetchAvailability(from: string, to: string): Promise<Block[]> {
  const res = await fetch(`${BASE}/availability?from=${from}&to=${to}`);
  if (!res.ok) throw new Error('availability failed');
  const data = await res.json();
  return data.blocks as Block[];
}

export async function submitInquiry(input: {
  guestName: string;
  email: string;
  arrival: string;
  departure: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.ok) return { ok: true };
  const problem = await res.json().catch(() => ({}));
  return { ok: false, error: problem.detail ?? 'Odeslání se nezdařilo' };
}

export interface CheapestFlight {
  origin: string;
  originName: string;
  price: number;
  currency: string;
  departureDate: string;
  returnDate: string;
  airline: string;
  deepLink: string;
}

export async function fetchCheapestFlights(): Promise<CheapestFlight[]> {
  const res = await fetch(`${BASE}/flights/cheapest`);
  if (!res.ok) throw new Error('flights failed');
  return res.json();
}

export interface CheapestWindow {
  origin: string;
  arrival: string;
  departure: string;
  nights: number;
  indicativePrice: number;
  currency: string;
  flightDeepLink: string;
}

export async function fetchCheapestWindows(
  origin: string,
  nights: number,
): Promise<CheapestWindow[]> {
  const res = await fetch(`${BASE}/optimizer/cheapest-windows?origin=${origin}&nights=${nights}`);
  if (!res.ok) throw new Error('optimizer failed');
  return res.json();
}

export interface CalendarWindow {
  arrival: string;
  departure: string;
  nights: number;
  indicativePrice: number;
  currency: string;
  flightDeepLink: string;
  hasOrphanGap: boolean;
}
export interface CalendarMonth {
  year: number;
  month: number;
  freeRanges: { start: string; end: string }[];
  cheapest: CalendarWindow | null;
}
export interface AvailabilityCalendar {
  origin: string;
  nights: number;
  months: CalendarMonth[];
}
export async function fetchAvailabilityCalendar(
  origin: string,
  nights: number,
): Promise<AvailabilityCalendar> {
  const res = await fetch(`${BASE}/calendar?origin=${origin}&nights=${nights}`);
  if (!res.ok) throw new Error('calendar failed');
  return res.json();
}
