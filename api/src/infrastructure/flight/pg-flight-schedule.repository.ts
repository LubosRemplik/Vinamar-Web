import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../persistence/pg-connection';
import { Origin } from '../../domain/flight/origin';
import { FlightSchedule, FlightDirection } from '../../domain/flight/flight-schedule';
import { FlightScheduleRepository } from '../../domain/flight/flight-schedule.repository.port';

interface FlightScheduleRow {
  origin: string;
  direction: string;
  flight_date: string;
  departure_time: string;
  arrival_time: string;
  carrier: string;
  flight_number: string;
}

@Injectable()
export class PgFlightScheduleRepository implements FlightScheduleRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toSchedule(row: FlightScheduleRow): FlightSchedule {
    return new FlightSchedule(
      Origin.fromCode(row.origin),
      row.direction as FlightDirection,
      row.flight_date,
      row.departure_time,
      row.arrival_time,
      row.carrier,
      row.flight_number,
    );
  }

  async replaceForOrigin(origin: Origin, schedules: FlightSchedule[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM flight_schedules WHERE origin = $1', [origin.code]);
      for (const s of schedules) {
        await client.query(
          `INSERT INTO flight_schedules
             (origin, direction, flight_date, departure_time, arrival_time, carrier, flight_number)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (origin, direction, flight_date, departure_time, flight_number) DO NOTHING`,
          [
            s.origin.code,
            s.direction,
            s.date,
            s.departureTime,
            s.arrivalTime,
            s.carrier,
            s.flightNumber,
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

  async listInRange(from: string, to: string): Promise<FlightSchedule[]> {
    const { rows } = await this.pool.query<FlightScheduleRow>(
      `SELECT origin, direction, to_char(flight_date, 'YYYY-MM-DD') AS flight_date,
              departure_time, arrival_time, carrier, flight_number
         FROM flight_schedules
        WHERE flight_date BETWEEN $1 AND $2
        ORDER BY origin, flight_date, departure_time`,
      [from, to],
    );
    return rows.map((r) => this.toSchedule(r));
  }
}
