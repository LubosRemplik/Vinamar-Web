import { Clock } from '../../src/domain/shared/clock.port';
import { DateRange } from '../../src/domain/shared/date-range';
import { CalendarBlock, BlockReason } from '../../src/domain/availability/calendar-block';
import { AvailabilityRepository } from '../../src/domain/availability/availability.repository.port';
import { Inquiry, InquiryStatus } from '../../src/domain/inquiry/inquiry';
import { InquiryRepository } from '../../src/domain/inquiry/inquiry.repository.port';
import { OwnerNotifier } from '../../src/domain/inquiry/owner-notifier.port';

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
  async save(range: DateRange, reason: BlockReason): Promise<CalendarBlock> {
    const block = new CalendarBlock(`b${++this.seq}`, range, reason, new Date());
    this.blocks.push(block);
    return block;
  }
  async delete(id: string): Promise<void> {
    this.blocks = this.blocks.filter((b) => b.id !== id);
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
  async inquiryReceived(inquiry: Inquiry): Promise<void> {
    this.received.push(inquiry);
  }
}
