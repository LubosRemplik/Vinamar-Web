import { Clock } from '../../src/domain/shared/clock.port';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock, BlockReason } from '../../src/domain/availability/calendar-block';
import { AvailabilityRepository } from '../../src/domain/availability/availability.repository.port';
import { Inquiry, InquiryStatus } from '../../src/domain/inquiry/inquiry';
import { InquiryRepository } from '../../src/domain/inquiry/inquiry.repository.port';
import { OwnerNotifier } from '../../src/domain/inquiry/owner-notifier.port';
import { GuestNotifier } from '../../src/domain/inquiry/guest-notifier.port';

export class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

export class InMemoryAvailability implements AvailabilityRepository {
  blocks: CalendarBlock[] = [];
  private seq = 0;
  async listBetween(): Promise<CalendarBlock[]> {
    return this.blocks;
  }
  async findOverlapping(range: DateRange): Promise<CalendarBlock | null> {
    return this.blocks.find((b) => b.range.overlaps(range)) ?? null;
  }
  async save(
    range: DateRange,
    reason: BlockReason,
    opts?: { inquiryId?: string; note?: string },
  ): Promise<CalendarBlock> {
    const block = new CalendarBlock(
      `b${++this.seq}`,
      range,
      reason,
      new Date(),
      opts?.note ?? null,
      opts?.inquiryId ?? null,
    );
    this.blocks.push(block);
    return block;
  }
  async delete(id: string): Promise<{ inquiryId: string | null }> {
    const found = this.blocks.find((b) => b.id === id) ?? null;
    this.blocks = this.blocks.filter((b) => b.id !== id);
    return { inquiryId: found?.inquiryId ?? null };
  }
  async listEntries() {
    return this.blocks.map((b) => ({
      id: b.id,
      start: b.range.arrival.toISOString().slice(0, 10),
      end: b.range.departure.toISOString().slice(0, 10),
      reason: b.reason,
      note: b.note,
      inquiryId: b.inquiryId,
      guestName: null,
      email: null,
      phone: null,
      message: null,
    }));
  }
}

export class InMemoryInquiries implements InquiryRepository {
  items: Inquiry[] = [];
  async save(inquiry: Inquiry): Promise<void> {
    this.items.push(inquiry);
  }
  async get(id: string): Promise<Inquiry | null> {
    return this.items.find((i) => i.id === id) ?? null;
  }
  async list(): Promise<Inquiry[]> {
    return this.items;
  }
  async updateStatus(id: string, status: InquiryStatus): Promise<void> {
    this.items = this.items.map((i) =>
      i.id === id
        ? new Inquiry(i.id, i.guestName, i.email, i.phone, i.range, i.message, status, i.createdAt)
        : i,
    );
  }
}

export class SpyNotifier implements OwnerNotifier {
  received: Inquiry[] = [];
  cancelled: Inquiry[] = [];
  async inquiryReceived(inquiry: Inquiry): Promise<void> { this.received.push(inquiry); }
  async bookingCancelled(inquiry: Inquiry): Promise<void> { this.cancelled.push(inquiry); }
}

export class SpyGuestNotifier implements GuestNotifier {
  received: { method: string; id: string }[] = [];
  async inquiryReceived(i: Inquiry): Promise<void> { this.received.push({ method: 'inquiryReceived', id: i.id }); }
  async bookingConfirmed(i: Inquiry): Promise<void> { this.received.push({ method: 'bookingConfirmed', id: i.id }); }
  async inquiryDeclined(i: Inquiry): Promise<void> { this.received.push({ method: 'inquiryDeclined', id: i.id }); }
  async bookingCancelled(i: Inquiry): Promise<void> { this.received.push({ method: 'bookingCancelled', id: i.id }); }
  async arrivalReminder(i: Inquiry): Promise<void> { this.received.push({ method: 'arrivalReminder', id: i.id }); }
}
