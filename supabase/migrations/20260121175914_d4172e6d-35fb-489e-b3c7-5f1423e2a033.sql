-- Add strategic annotation fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS financial_institutions text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS short_term_goals text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS medium_term_goals text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS long_term_goals text DEFAULT NULL;