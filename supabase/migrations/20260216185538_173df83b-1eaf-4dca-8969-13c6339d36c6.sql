
-- Add broker and report_type columns to support multiple PDFs per client
ALTER TABLE public.client_performance_reports 
ADD COLUMN IF NOT EXISTS broker text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS report_type text DEFAULT NULL;

-- Drop unique constraint if exists (allow multiple reports per client)
-- The table doesn't have an explicit unique constraint, but let's ensure the edge function can insert multiple rows
