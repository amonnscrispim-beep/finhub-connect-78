
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS is_top10 boolean NOT NULL DEFAULT false;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS top10_order numeric DEFAULT NULL;
