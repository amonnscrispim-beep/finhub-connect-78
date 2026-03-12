
-- Per-client portfolio configuration and asset overrides
CREATE TABLE public.client_portfolio_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  profile text NOT NULL DEFAULT 'Conservador',
  strategy text NOT NULL DEFAULT 'Renda',
  invest_amount numeric NOT NULL DEFAULT 0,
  is_customized boolean NOT NULL DEFAULT false,
  custom_allocations jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_portfolio_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own client portfolio config" ON public.client_portfolio_config
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
