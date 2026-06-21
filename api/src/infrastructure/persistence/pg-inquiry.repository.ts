import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './pg-connection';
import { DateRange } from '../../domain/shared/date-range';
import { EmailAddress } from '../../domain/shared/email-address';
import { Inquiry, InquiryStatus } from '../../domain/inquiry/inquiry';
import { InquiryRepository } from '../../domain/inquiry/inquiry.repository.port';

interface InquiryRow {
  id: string;
  guest_name: string;
  email: string;
  phone: string;
  arrival: string | Date;
  departure: string | Date;
  message: string;
  status: string;
  created_at: string | Date;
}

@Injectable()
export class PgInquiryRepository implements InquiryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toInquiry(row: InquiryRow): Inquiry {
    return new Inquiry(
      row.id,
      row.guest_name,
      new EmailAddress(row.email),
      row.phone ?? '',
      new DateRange(new Date(row.arrival), new Date(row.departure)),
      row.message,
      row.status as InquiryStatus,
      new Date(row.created_at),
    );
  }

  async save(inquiry: Inquiry): Promise<void> {
    await this.pool.query(
      `INSERT INTO inquiries (id, guest_name, email, phone, arrival, departure, message, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        inquiry.id,
        inquiry.guestName,
        inquiry.email.value,
        inquiry.phone,
        inquiry.range.arrival,
        inquiry.range.departure,
        inquiry.message,
        inquiry.status,
        inquiry.createdAt,
      ],
    );
  }

  async get(id: string): Promise<Inquiry | null> {
    const { rows } = await this.pool.query(`SELECT * FROM inquiries WHERE id = $1`, [id]);
    return rows[0] ? this.toInquiry(rows[0]) : null;
  }

  async list(): Promise<Inquiry[]> {
    const { rows } = await this.pool.query(`SELECT * FROM inquiries ORDER BY created_at DESC`);
    return rows.map((r) => this.toInquiry(r));
  }

  async updateStatus(id: string, status: InquiryStatus): Promise<void> {
    await this.pool.query(`UPDATE inquiries SET status = $2 WHERE id = $1`, [id, status]);
  }

  async listDueForArrivalReminder(now: Date): Promise<Inquiry[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM inquiries
       WHERE status = 'confirmed'
         AND arrival_reminder_sent_at IS NULL
         AND arrival > $1::date
         AND arrival <= $1::date + 14
       ORDER BY arrival ASC`,
      [now],
    );
    return rows.map((r) => this.toInquiry(r));
  }

  async markArrivalReminderSent(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE inquiries SET arrival_reminder_sent_at = now() WHERE id = $1`,
      [id],
    );
  }
}
