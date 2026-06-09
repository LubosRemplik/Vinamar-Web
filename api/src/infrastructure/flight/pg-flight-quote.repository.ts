import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../persistence/pg-connection';
import { Origin } from '../../domain/flight/origin';
import { Money } from '../../domain/flight/money';
import { FlightQuote } from '../../domain/flight/flight-quote';
import { FlightQuoteRepository } from '../../domain/flight/flight-quote.repository.port';

interface FlightQuoteRow {
  id: string;
  origin: string;
  departure_date: string | Date;
  return_date: string | Date;
  price_amount: string | number;
  price_currency: string;
  airline: string;
  deep_link: string;
  fetched_at: string | Date;
}

@Injectable()
export class PgFlightQuoteRepository implements FlightQuoteRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toQuote(row: FlightQuoteRow): FlightQuote {
    return new FlightQuote(
      Origin.fromCode(row.origin),
      new Date(row.departure_date),
      new Date(row.return_date),
      new Money(Number(row.price_amount), row.price_currency as 'EUR'),
      row.airline,
      row.deep_link,
      new Date(row.fetched_at),
    );
  }

  async replaceForOrigin(origin: Origin, quotes: FlightQuote[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM flight_quotes WHERE origin = $1', [origin.code]);
      for (const q of quotes) {
        await client.query(
          `INSERT INTO flight_quotes
             (origin, departure_date, return_date, price_amount, price_currency, airline, deep_link, fetched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            q.origin.code,
            q.departureDate,
            q.returnDate,
            q.price.amount,
            q.price.currency,
            q.airline,
            q.deepLink,
            q.fetchedAt,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async cheapestPerOrigin(): Promise<FlightQuote[]> {
    const { rows } = await this.pool.query<FlightQuoteRow>(
      `SELECT DISTINCT ON (origin) * FROM flight_quotes ORDER BY origin, price_amount ASC`,
    );
    return rows.map((r) => this.toQuote(r));
  }

  async listForOrigin(origin: Origin): Promise<FlightQuote[]> {
    const { rows } = await this.pool.query<FlightQuoteRow>(
      `SELECT * FROM flight_quotes WHERE origin = $1 ORDER BY departure_date`,
      [origin.code],
    );
    return rows.map((r) => this.toQuote(r));
  }
}
