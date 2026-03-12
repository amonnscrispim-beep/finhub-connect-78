
-- Add shared column to all content tables
ALTER TABLE public.study_modules ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;
ALTER TABLE public.study_submodules ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;
ALTER TABLE public.study_slides ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;
ALTER TABLE public.summary_reports ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;
ALTER TABLE public.recommended_portfolios ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;
ALTER TABLE public.recommended_portfolio_assets ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;

-- Create a security definer function to check if a user is the master
CREATE OR REPLACE FUNCTION public.is_master_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id AND email = 'amoncrispimufrj@gmail.com'
  );
$$;

-- Update RLS SELECT policies to allow viewing shared content
-- study_modules
DROP POLICY IF EXISTS "Users can view own modules" ON public.study_modules;
CREATE POLICY "Users can view own or shared modules" ON public.study_modules
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR shared = true);

-- study_submodules
DROP POLICY IF EXISTS "Users can view own submodules" ON public.study_submodules;
CREATE POLICY "Users can view own or shared submodules" ON public.study_submodules
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR shared = true);

-- study_slides
DROP POLICY IF EXISTS "Users can view own slides" ON public.study_slides;
CREATE POLICY "Users can view own or shared slides" ON public.study_slides
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR shared = true);

-- summary_reports
DROP POLICY IF EXISTS "Users can manage own summary reports" ON public.summary_reports;
CREATE POLICY "Users can view own or shared summary reports" ON public.summary_reports
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR shared = true);
CREATE POLICY "Users can insert own summary reports" ON public.summary_reports
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summary reports" ON public.summary_reports
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own summary reports" ON public.summary_reports
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- recommended_portfolios
DROP POLICY IF EXISTS "Users can view own recommended portfolios" ON public.recommended_portfolios;
CREATE POLICY "Users can view own or shared recommended portfolios" ON public.recommended_portfolios
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR shared = true);

-- recommended_portfolio_assets
DROP POLICY IF EXISTS "Users can view own recommended portfolio assets" ON public.recommended_portfolio_assets;
CREATE POLICY "Users can view own or shared recommended portfolio assets" ON public.recommended_portfolio_assets
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR shared = true);
