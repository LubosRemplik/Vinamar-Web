-- Up Migration
CREATE TABLE flight_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  departure_date date NOT NULL,
  return_date date NOT NULL,
  price_amount numeric NOT NULL,
  price_currency text NOT NULL DEFAULT 'EUR',
  airline text NOT NULL DEFAULT '',
  deep_link text NOT NULL DEFAULT '',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origin, departure_date)
);

-- Down Migration
DROP TABLE flight_quotes;
