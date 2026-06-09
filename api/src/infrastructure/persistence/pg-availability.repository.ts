import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './pg-connection';
import { DateRange } from '../../domain/shared/date-range';
import { CalendarBlock, BlockReason } from '../../domain/availability/calendar-block';
import { AvailabilityRepository } from '../../domain/availability/availability.repository.port';

@Injectable()
export class PgAvailabilityRepository implements AvailabilityRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toBlock(row: any): CalendarBlock {
    return new CalendarBlock(
      row.id,
      new DateRange(new Date(row.start_date), new Date(row.end_date)),
      row.reason as BlockReason,
      new Date(row.created_at),
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

  async save(range: DateRange, reason: BlockReason): Promise<CalendarBlock> {
    const { rows } = await this.pool.query(
      `INSERT INTO calendar_blocks (start_date, end_date, reason) VALUES ($1, $2, $3) RETURNING *`,
      [range.arrival, range.departure, reason],
    );
    return this.toBlock(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM calendar_blocks WHERE id = $1`, [id]);
  }
}
