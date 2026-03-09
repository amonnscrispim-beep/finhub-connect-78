
-- Table for recommended portfolios
CREATE TABLE public.recommended_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recommended_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommended portfolios" ON public.recommended_portfolios FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommended portfolios" ON public.recommended_portfolios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommended portfolios" ON public.recommended_portfolios FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommended portfolios" ON public.recommended_portfolios FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Table for assets within recommended portfolios
CREATE TABLE public.recommended_portfolio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.recommended_portfolios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ticker text NOT NULL,
  company_name text NOT NULL DEFAULT '',
  sector text DEFAULT '',
  entry_price numeric NOT NULL DEFAULT 0,
  entry_date date DEFAULT CURRENT_DATE,
  ceiling_price numeric NOT NULL DEFAULT 0,
  allocation_pct numeric NOT NULL DEFAULT 0,
  current_price numeric DEFAULT NULL,
  manual_bias text DEFAULT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_international boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recommended_portfolio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommended portfolio assets" ON public.recommended_portfolio_assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommended portfolio assets" ON public.recommended_portfolio_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommended portfolio assets" ON public.recommended_portfolio_assets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommended portfolio assets" ON public.recommended_portfolio_assets FOR DELETE TO authenticated USING (auth.uid() = user_id);
