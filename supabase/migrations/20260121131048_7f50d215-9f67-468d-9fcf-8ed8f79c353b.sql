-- Add country column to clients table for international clients
-- This is a non-destructive migration that adds a new nullable column

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country text DEFAULT '' NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.country IS 'Country for clients living abroad (residence = Mora no exterior)';