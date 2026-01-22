-- Add investment history fields to clients table
ALTER TABLE public.clients
ADD COLUMN already_invests boolean DEFAULT false,
ADD COLUMN investing_origin text DEFAULT NULL;