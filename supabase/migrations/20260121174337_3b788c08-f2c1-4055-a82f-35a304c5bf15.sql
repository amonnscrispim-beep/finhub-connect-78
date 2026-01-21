-- Add consulting reason and professional profile fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS consulting_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS professional_profile text DEFAULT NULL;