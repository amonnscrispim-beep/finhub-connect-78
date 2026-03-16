ALTER TABLE public.performance_positions 
  ADD COLUMN IF NOT EXISTS quantidade numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preco_medio numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preco_atual numeric DEFAULT NULL;