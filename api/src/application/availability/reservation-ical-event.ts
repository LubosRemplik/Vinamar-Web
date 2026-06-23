import { CalendarEntryView } from '../../domain/availability/availability.repository.port';
import { IcalEvent } from '../../domain/calendar/ical';

// Maps a reservation read-model to an all-day calendar event. Guest name + phone
// + e-mail + note travel in the body so the owner sees who is staying. Shared by
// the calendar feed (and any future per-entry export) so the mapping lives once.
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
    end: entry.end,
    summary: `Vinamar — ${guest}`,
    description: detail.length ? detail.join('\n') : null,
  };
}
