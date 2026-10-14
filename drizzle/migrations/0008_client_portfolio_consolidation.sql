CREATE TABLE public.client_portfolio_consolidation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assets JSONB NOT NULL DEFAULT '[]',
  selected_model TEXT NOT NULL DEFAULT 'balanceado',
  custom_model JSONB,
  models JSONB,
  methodology_name TEXT NOT NULL DEFAULT 'Metodologia',
  methodology_location TEXT NOT NULL DEFAULT 'onshore',
  comparatives JSONB NOT NULL DEFAULT '[]',
  backtest JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portfolio_consolidation TO authenticated;
GRANT ALL ON public.client_portfolio_consolidation TO service_role;
ALTER TABLE public.client_portfolio_consolidation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own consolidations" ON public.client_portfolio_consolidation FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);