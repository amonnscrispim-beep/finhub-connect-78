-- Add new fields for wealth notes and emergency reserve calculation module
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS current_wealth_notes text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_start_month integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_start_year integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_living_cost numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_coverage_months integer DEFAULT 6,
ADD COLUMN IF NOT EXISTS emergency_contributions_count integer DEFAULT 12;