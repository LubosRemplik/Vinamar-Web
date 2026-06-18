-- Up Migration
CREATE TABLE flight_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  direction text NOT NULL,
  flight_date date NOT NULL,
  departure_time text NOT NULL,
  arrival_time text NOT NULL,
  carrier text NOT NULL DEFAULT '',
  flight_number text NOT NULL DEFAULT '',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origin, direction, flight_date, departure_time, flight_number)
);

CREATE INDEX flight_schedules_date_idx ON flight_schedules (flight_date);

-- Down Migration
DROP TABLE flight_schedules;
