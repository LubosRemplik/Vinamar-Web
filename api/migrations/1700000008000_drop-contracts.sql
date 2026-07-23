-- Up Migration
-- Contracts feature removed. Any inquiry parked in 'contract_sent' was already
-- past the confirmed gate, so it folds back to 'confirmed' before the type drops
-- that value — otherwise the admin list would render an unknown status.
UPDATE inquiries SET status = 'confirmed' WHERE status = 'contract_sent';

DROP TABLE IF EXISTS contracts;

-- Down Migration
CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES inquiries(id),
  variant text NOT NULL,
  guest_name text NOT NULL,
  guest_address text NOT NULL,
  guest_id_number text NOT NULL,
  guest_birth_date date,
  arrival date NOT NULL,
  departure date NOT NULL,
  total_price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  deposit_amount numeric(10,2),
  deposit_due_date date,
  pdf bytea NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX contracts_inquiry_id_idx ON contracts (inquiry_id);
