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

// Authenticated fetch of a single reservation as an .ics file (text/calendar).
// The caller turns the Blob into a download — no token ever lands in a URL.
export async function fetchReservationIcs(token: string, id: string): Promise<Blob> {
  const res = await fetch(`${BASE}/admin/calendar/${id}/ics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('ics failed');
  return res.blob();
}

// One-click "add to Google Calendar" link, built entirely from data we already
// hold. dates use the all-day form START/END where END is exclusive (checkout),
// matching the .ics export.
export function googleCalendarUrl(entry: CalendarEntry): string {
  const day = (iso: string) => iso.replace(/-/g, '');
  const guest = entry.guestName?.trim() || 'Rezervace';
  const details = [
    entry.guestName && `Host: ${entry.guestName}`,
    entry.phone && `Telefon: ${entry.phone}`,
    entry.email && `E-mail: ${entry.email}`,
    entry.message && `Poznámka: ${entry.message}`,
  ]
    .filter(Boolean)
    .join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Vinamar — ${guest}`,
    dates: `${day(entry.start)}/${day(entry.end)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function cancelCalendarEntry(token: string, id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/admin/calendar/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('unauthorized');
  return res.ok;
}

export async function updateInquiryContact(
  token: string,
  id: string,
  data: { guestName: string; email: string; phone: string },
): Promise<boolean> {
  const res = await fetch(`${BASE}/admin/inquiries/${id}/contact`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('update failed');
  return true;
}

export interface ContractInput {
  variant: 'with-deposit' | 'without-deposit';
  guestAddress: string;
  guestIdNumber: string;
  guestBirthDate: string | null;
  totalPrice: number;
  currency: string;
  depositAmount: number | null;
  depositDueDate: string | null;
}

export async function generateContract(
  token: string,
  inquiryId: string,
  input: ContractInput,
): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/admin/reservations/${inquiryId}/contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    throw new Error(problem?.detail ?? problem?.title ?? 'Smlouvu se nepodařilo vytvořit.');
  }
  return res.json();
}

// The PDF endpoint needs the Bearer header, so a plain link won't do — fetch it
// as a blob and open the object URL in a new tab.
export async function openContractPdf(token: string, inquiryId: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/reservations/${inquiryId}/contract/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('Smlouvu se nepodařilo načíst.');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
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
