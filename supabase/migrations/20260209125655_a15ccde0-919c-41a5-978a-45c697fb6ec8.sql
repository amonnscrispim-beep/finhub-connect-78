
-- Table 1: Portfolio assets (model portfolio per client)
CREATE TABLE public.client_portfolio_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  asset_class TEXT NOT NULL DEFAULT 'Ações',
  target_weight NUMERIC NOT NULL DEFAULT 0,
  recommendation TEXT NOT NULL DEFAULT 'MANTER',
  recommendation_date DATE DEFAULT CURRENT_DATE,
  fair_price NUMERIC DEFAULT 0,
  current_price NUMERIC,
  upside_pct NUMERIC,
  tir_pct NUMERIC,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portfolio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio assets" ON public.client_portfolio_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolio assets" ON public.client_portfolio_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio assets" ON public.client_portfolio_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio assets" ON public.client_portfolio_assets FOR DELETE USING (auth.uid() = user_id);

-- Table 2: Simulation state (last aporte per client)
CREATE TABLE public.client_portfolio_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  aporte NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_portfolio_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulations" ON public.client_portfolio_simulations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own simulations" ON public.client_portfolio_simulations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own simulations" ON public.client_portfolio_simulations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own simulations" ON public.client_portfolio_simulations FOR DELETE USING (auth.uid() = user_id);

-- Table 3: Previous portfolio values per ticker
CREATE TABLE public.client_portfolio_previous_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  previous_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, ticker)
);

ALTER TABLE public.client_portfolio_previous_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own previous values" ON public.client_portfolio_previous_values FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own previous values" ON public.client_portfolio_previous_values FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own previous values" ON public.client_portfolio_previous_values FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own previous values" ON public.client_portfolio_previous_values FOR DELETE USING (auth.uid() = user_id);

-- Table 4: Performance tracking per month
CREATE TABLE public.client_portfolio_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM format
  initial_value NUMERIC NOT NULL DEFAULT 0,
  final_value NUMERIC NOT NULL DEFAULT 0,
  deposits NUMERIC NOT NULL DEFAULT 0,
  withdrawals NUMERIC NOT NULL DEFAULT 0,
  return_pct NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, month)
);

ALTER TABLE public.client_portfolio_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own performance" ON public.client_portfolio_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance" ON public.client_portfolio_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own performance" ON public.client_portfolio_performance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own performance" ON public.client_portfolio_performance FOR DELETE USING (auth.uid() = user_id);

-- Table 5: Reports
CREATE TABLE public.client_portfolio_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Relatório',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portfolio_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.client_portfolio_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.client_portfolio_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports" ON public.client_portfolio_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON public.client_portfolio_reports FOR DELETE USING (auth.uid() = user_id);
