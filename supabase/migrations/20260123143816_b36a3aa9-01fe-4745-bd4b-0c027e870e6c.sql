-- Add kanban_order field for manual sorting within funnel stages
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS kanban_order numeric DEFAULT NULL;

-- Backfill existing clients with kanban_order based on created_at within each funnel_stage
WITH ordered_clients AS (
  SELECT 
    id,
    funnel_stage,
    ROW_NUMBER() OVER (PARTITION BY funnel_stage, user_id ORDER BY created_at ASC) * 1000 as new_order
  FROM public.clients
  WHERE kanban_order IS NULL
)
UPDATE public.clients c
SET kanban_order = oc.new_order
FROM ordered_clients oc
WHERE c.id = oc.id;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_clients_kanban_order ON public.clients(user_id, funnel_stage, kanban_order);