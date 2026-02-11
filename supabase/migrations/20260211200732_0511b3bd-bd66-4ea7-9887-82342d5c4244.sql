
-- Add new fields for integrated diagnostic module
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS passive_income numeric DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS succession_planning text DEFAULT '';
