-- Fix 1: Restrict client_form_tokens RLS to authenticated users only
DROP POLICY IF EXISTS "Users can delete own form tokens" ON public.client_form_tokens;
DROP POLICY IF EXISTS "Users can insert own form tokens" ON public.client_form_tokens;
DROP POLICY IF EXISTS "Users can update own form tokens" ON public.client_form_tokens;
DROP POLICY IF EXISTS "Users can view own form tokens" ON public.client_form_tokens;

CREATE POLICY "Users can delete own form tokens" ON public.client_form_tokens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own form tokens" ON public.client_form_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own form tokens" ON public.client_form_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own form tokens" ON public.client_form_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix 2: Prevent non-master users from setting shared=true (server-side enforcement)
-- summary_reports
DROP POLICY IF EXISTS "Users can update own summary reports" ON public.summary_reports;
CREATE POLICY "Users can update own summary reports" ON public.summary_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own summary reports" ON public.summary_reports;
CREATE POLICY "Users can insert own summary reports" ON public.summary_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

-- study_modules
DROP POLICY IF EXISTS "Users can update own modules" ON public.study_modules;
CREATE POLICY "Users can update own modules" ON public.study_modules
  FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own modules" ON public.study_modules;
CREATE POLICY "Users can insert own modules" ON public.study_modules
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

-- study_submodules
DROP POLICY IF EXISTS "Users can update own submodules" ON public.study_submodules;
CREATE POLICY "Users can update own submodules" ON public.study_submodules
  FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own submodules" ON public.study_submodules;
CREATE POLICY "Users can insert own submodules" ON public.study_submodules
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

-- study_slides
DROP POLICY IF EXISTS "Users can update own slides" ON public.study_slides;
CREATE POLICY "Users can update own slides" ON public.study_slides
  FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own slides" ON public.study_slides;
CREATE POLICY "Users can insert own slides" ON public.study_slides
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

-- recommended_portfolios
DROP POLICY IF EXISTS "Users can update own recommended portfolios" ON public.recommended_portfolios;
CREATE POLICY "Users can update own recommended portfolios" ON public.recommended_portfolios
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own recommended portfolios" ON public.recommended_portfolios;
CREATE POLICY "Users can insert own recommended portfolios" ON public.recommended_portfolios
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

-- recommended_portfolio_assets
DROP POLICY IF EXISTS "Users can update own recommended portfolio assets" ON public.recommended_portfolio_assets;
CREATE POLICY "Users can update own recommended portfolio assets" ON public.recommended_portfolio_assets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own recommended portfolio assets" ON public.recommended_portfolio_assets;
CREATE POLICY "Users can insert own recommended portfolio assets" ON public.recommended_portfolio_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

-- investor_portfolios
DROP POLICY IF EXISTS "Users can update own investor portfolios" ON public.investor_portfolios;
CREATE POLICY "Users can update own investor portfolios" ON public.investor_portfolios
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own investor portfolios" ON public.investor_portfolios;
CREATE POLICY "Users can insert own investor portfolios" ON public.investor_portfolios
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

-- portfolio_assets
DROP POLICY IF EXISTS "Users can update own portfolio assets" ON public.portfolio_assets;
CREATE POLICY "Users can update own portfolio assets" ON public.portfolio_assets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own portfolio assets" ON public.portfolio_assets;
CREATE POLICY "Users can insert own portfolio assets" ON public.portfolio_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      shared = false OR public.is_master_user(auth.uid())
    )
  );