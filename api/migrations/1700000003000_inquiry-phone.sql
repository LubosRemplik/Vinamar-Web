-- Up Migration
ALTER TABLE inquiries ADD COLUMN phone text NOT NULL DEFAULT '';

-- Down Migration
ALTER TABLE inquiries DROP COLUMN phone;
