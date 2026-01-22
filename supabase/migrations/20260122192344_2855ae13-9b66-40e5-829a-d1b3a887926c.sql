-- Add debts_comments field to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS debts_comments text DEFAULT NULL;