-- Up Migration
ALTER TABLE inquiries ADD COLUMN arrival_reminder_sent_at timestamptz;

-- Down Migration
ALTER TABLE inquiries DROP COLUMN arrival_reminder_sent_at;
