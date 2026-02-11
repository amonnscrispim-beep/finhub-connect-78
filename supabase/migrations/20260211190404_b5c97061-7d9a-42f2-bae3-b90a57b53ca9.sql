-- Add business_assets column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS business_assets numeric DEFAULT 0;