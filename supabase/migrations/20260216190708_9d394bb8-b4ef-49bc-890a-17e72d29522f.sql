
-- Add liquidity window (D+X days) and maturity date to portfolio assets
ALTER TABLE public.client_portfolio_assets
  ADD COLUMN IF NOT EXISTS liquidity_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS maturity_date date DEFAULT NULL;
