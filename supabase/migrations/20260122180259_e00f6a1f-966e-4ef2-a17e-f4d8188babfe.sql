-- Add partner monthly revenue column to clients table
ALTER TABLE public.clients
ADD COLUMN partner_monthly_revenue numeric DEFAULT NULL;