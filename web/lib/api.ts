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
  phone: string;
  arrival: string;
  departure: string;
  message: string;
}, token?: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (res.ok) return { ok: true };
  const problem = await res.json().catch(() => ({}));
  return { ok: false, error: problem.detail ?? 'Odeslání se nezdařilo' };
}

export interface CalendarEntry {
  id: string;
  start: string;
  end: string;
  reason: 'booked';
  note: string | null;
  inquiryId: string | null;
  guestName: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
}

export async function fetchAdminCalendar(token: string): Promise<CalendarEntry[]> {
  const res = await fetch(`${BASE}/admin/calendar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('calendar failed');
  return res.json();
}

export async function cancelCalendarEntry(token: string, id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/admin/calendar/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.ok;
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

export interface ScheduledFlight {
  date: string;
  departureTime: string;
  arrivalTime: string;
  carrier: string;
  flightNumber: string;
}
export interface AirportSchedule {
  origin: string;
  originName: string;
  order: number;
  directRyanair: boolean;
  note: string | null;
  outbound: ScheduledFlight[];
  return: ScheduledFlight[];
}
export async function fetchFlightSchedules(from: string, to: string): Promise<AirportSchedule[]> {
  const res = await fetch(`${BASE}/flights/schedules?from=${from}&to=${to}`);
  if (!res.ok) throw new Error('flight schedules failed');
  return res.json();
}
