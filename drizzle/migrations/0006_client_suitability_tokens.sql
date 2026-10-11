CREATE TABLE public.client_suitability_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  short_code VARCHAR(8) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','expired')),
  submitted_data JSONB,
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  merged_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_suitability_tokens TO authenticated;
GRANT ALL ON public.client_suitability_tokens TO service_role;
ALTER TABLE public.client_suitability_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own suitability tokens select" ON public.client_suitability_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own suitability tokens insert" ON public.client_suitability_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own suitability tokens update" ON public.client_suitability_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own suitability tokens delete" ON public.client_suitability_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_suitability_tokens_client ON public.client_suitability_tokens(client_id);