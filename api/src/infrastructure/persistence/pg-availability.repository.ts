import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './pg-connection';
import { DateRange } from '../../domain/shared/date-range';
import { CalendarBlock, BlockReason } from '../../domain/availability/calendar-block';
import {
  AvailabilityRepository,
  CalendarEntryView,
  SaveOptions,
} from '../../domain/availability/availability.repository.port';

interface BlockRow {
  id: string;
  start_date: string | Date;
  end_date: string | Date;
  reason: string;
  note: string | null;
  inquiry_id: string | null;
  created_at: string | Date;
}

interface EntryRow {
  id: string;
  start_date: string | Date;
  end_date: string | Date;
  reason: string;
  note: string | null;
  inquiry_id: string | null;
  guest_name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
}

const isoDate = (value: string | Date): string =>
  (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);

@Injectable()
export class PgAvailabilityRepository implements AvailabilityRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toBlock(row: BlockRow): CalendarBlock {
    return new CalendarBlock(
      row.id,
      new DateRange(new Date(row.start_date), new Date(row.end_date)),
      row.reason as BlockReason,
      new Date(row.created_at),
      row.note ?? null,
      row.inquiry_id ?? null,
    );
  }

  async listBetween(from: Date, to: Date): Promise<CalendarBlock[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM calendar_blocks WHERE start_date < $2 AND end_date > $1 ORDER BY start_date`,
      [from, to],
    );
    return rows.map((r) => this.toBlock(r));
  }

  async findOverlapping(range: DateRange): Promise<CalendarBlock | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM calendar_blocks WHERE start_date < $2 AND end_date > $1 LIMIT 1`,
      [range.arrival, range.departure],
    );
    return rows[0] ? this.toBlock(rows[0]) : null;
  }

  async save(range: DateRange, reason: BlockReason, opts: SaveOptions = {}): Promise<CalendarBlock> {
    const { rows } = await this.pool.query(
      `INSERT INTO calendar_blocks (start_date, end_date, reason, note, inquiry_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [range.arrival, range.departure, reason, opts.note ?? null, opts.inquiryId ?? null],
    );
    return this.toBlock(rows[0]);
  }

  async delete(id: string): Promise<{ inquiryId: string | null }> {
    const { rows } = await this.pool.query(
      `DELETE FROM calendar_blocks WHERE id = $1 RETURNING inquiry_id`,
      [id],
    );
    return { inquiryId: rows[0]?.inquiry_id ?? null };
  }

  async listEntries(): Promise<CalendarEntryView[]> {
    const { rows } = await this.pool.query<EntryRow>(
      `SELECT cb.id, cb.start_date, cb.end_date, cb.reason, cb.note, cb.inquiry_id,
              i.guest_name, i.email, i.phone, i.message
       FROM calendar_blocks cb
       LEFT JOIN inquiries i ON i.id = cb.inquiry_id
       ORDER BY cb.start_date`,
    );
    return rows.map((r) => ({
      id: r.id,
      start: isoDate(r.start_date),
      end: isoDate(r.end_date),
      reason: r.reason as BlockReason,
      note: r.note ?? null,
      inquiryId: r.inquiry_id ?? null,
      guestName: r.guest_name ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      message: r.message ?? null,
    }));
  }
}
