-- Add shared column to investor_portfolios and portfolio_assets
ALTER TABLE public.investor_portfolios ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;
ALTER TABLE public.portfolio_assets ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;

-- Update RLS for investor_portfolios: allow viewing shared
DROP POLICY IF EXISTS "Users can manage own investor portfolios" ON public.investor_portfolios;
CREATE POLICY "Users can view own or shared investor portfolios" ON public.investor_portfolios
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR shared = true);
CREATE POLICY "Users can insert own investor portfolios" ON public.investor_portfolios
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investor portfolios" ON public.investor_portfolios
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investor portfolios" ON public.investor_portfolios
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Update RLS for portfolio_assets: allow viewing shared
DROP POLICY IF EXISTS "Users can manage own portfolio assets" ON public.portfolio_assets;
CREATE POLICY "Users can view own or shared portfolio assets" ON public.portfolio_assets
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR shared = true);
CREATE POLICY "Users can insert own portfolio assets" ON public.portfolio_assets
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio assets" ON public.portfolio_assets
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio assets" ON public.portfolio_assets
FOR DELETE TO authenticated
USING (auth.uid() = user_id);