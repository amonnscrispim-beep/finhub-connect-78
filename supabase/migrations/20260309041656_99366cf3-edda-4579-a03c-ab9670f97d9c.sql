ALTER TABLE public.summary_reports 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'analise_ativo',
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_saved boolean DEFAULT false;