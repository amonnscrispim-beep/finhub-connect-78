
-- Portfolio profiles: one per profile+strategy combo per user
CREATE TABLE public.investor_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile text NOT NULL DEFAULT 'Conservador',
  strategy text NOT NULL DEFAULT 'Renda',
  acoes_pct numeric NOT NULL DEFAULT 0,
  fiis_pct numeric NOT NULL DEFAULT 0,
  internacional_pct numeric NOT NULL DEFAULT 0,
  renda_fixa_pct numeric NOT NULL DEFAULT 0,
  rf_pos_pct numeric NOT NULL DEFAULT 0,
  rf_pre_pct numeric NOT NULL DEFAULT 0,
  rf_ipca_pct numeric NOT NULL DEFAULT 0,
  invest_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile, strategy)
);

ALTER TABLE public.investor_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investor portfolios" ON public.investor_portfolios
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Portfolio assets: individual assets within a class
CREATE TABLE public.portfolio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.investor_portfolios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  asset_class text NOT NULL DEFAULT 'acoes_brasileiras',
  ticker text DEFAULT '',
  name text DEFAULT '',
  allocation_pct numeric NOT NULL DEFAULT 0,
  source_asset_id uuid REFERENCES public.recommended_portfolio_assets(id) ON DELETE SET NULL,
  rf_type text DEFAULT NULL,
  indexador text DEFAULT NULL,
  vencimento date DEFAULT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolio assets" ON public.portfolio_assets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
