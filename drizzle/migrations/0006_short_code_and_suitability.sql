ALTER TABLE public.client_form_tokens ADD COLUMN IF NOT EXISTS short_code text;
ALTER TABLE public.client_form_tokens ADD COLUMN IF NOT EXISTS form_title text DEFAULT 'Formulário de Planejamento Patrimonial';
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_tokens_short_code ON public.client_form_tokens(short_code) WHERE short_code IS NOT NULL;

CREATE TABLE public.client_suitability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  person_type text NOT NULL CHECK (person_type IN ('PF','PJ')),
  investor_profile text NOT NULL CHECK (investor_profile IN ('conservador','moderado','arrojado','agressivo')),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  form_data jsonb NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_suitability TO authenticated;
GRANT ALL ON public.client_suitability TO service_role;
ALTER TABLE public.client_suitability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own suitability select" ON public.client_suitability FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own suitability insert" ON public.client_suitability FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
CREATE POLICY "own suitability update" ON public.client_suitability FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own suitability delete" ON public.client_suitability FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_suitability_client ON public.client_suitability(client_id);
CREATE TRIGGER update_client_suitability_updated_at BEFORE UPDATE ON public.client_suitability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();