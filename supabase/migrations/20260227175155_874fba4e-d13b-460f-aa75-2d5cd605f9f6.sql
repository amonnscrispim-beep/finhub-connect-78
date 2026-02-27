
-- Add previous_funnel_stage to track old stage before migration (additive, no data loss)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS previous_funnel_stage text DEFAULT NULL;
