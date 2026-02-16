ALTER TABLE performance_reports ADD COLUMN IF NOT EXISTS broker text;
NOTIFY pgrst, 'reload schema';