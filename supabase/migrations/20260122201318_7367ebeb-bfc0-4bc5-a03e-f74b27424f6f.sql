-- Add module_notes JSONB column for storing comments per module
ALTER TABLE public.clients 
ADD COLUMN module_notes JSONB DEFAULT '{}'::jsonb;