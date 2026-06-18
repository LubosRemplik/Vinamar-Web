-- Up Migration
ALTER TABLE calendar_blocks ADD COLUMN note text;
ALTER TABLE calendar_blocks ADD COLUMN inquiry_id uuid REFERENCES inquiries(id);

-- Down Migration
ALTER TABLE calendar_blocks DROP COLUMN inquiry_id;
ALTER TABLE calendar_blocks DROP COLUMN note;
