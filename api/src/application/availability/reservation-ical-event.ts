import { CalendarEntryView } from '../../domain/availability/availability.repository.port';
import { IcalEvent } from '../../domain/calendar/ical';

// Maps a reservation read-model to an all-day calendar event. Guest name + phone
// + e-mail + note travel in the body so the owner sees who is staying. Shared by
// the calendar feed (and any future per-entry export) so the mapping lives once.
// DTEND is exclusive for all-day events; the +1 keeps the departure day itself
// visible as occupied in the owner's calendar (the guest leaves that morning).
function dayAfter(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function toReservationEvent(entry: CalendarEntryView): IcalEvent {
  const guest = entry.guestName?.trim() || 'Rezervace';
  const detail = [
    entry.guestName && `Host: ${entry.guestName}`,
    entry.phone && `Telefon: ${entry.phone}`,
    entry.email && `E-mail: ${entry.email}`,
    entry.message && `Poznámka: ${entry.message}`,
  ].filter(Boolean) as string[];

  return {
    uid: `${entry.id}@vinamar`,
    start: entry.start,
    end: dayAfter(entry.end),
    summary: `Vinamar — ${guest}`,
    description: detail.length ? detail.join('\n') : null,
  };
}
