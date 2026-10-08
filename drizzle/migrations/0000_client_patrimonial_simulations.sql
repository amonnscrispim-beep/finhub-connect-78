CREATE TABLE public.client_patrimonial_simulations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 user_id uuid NOT NULL DEFAULT auth.uid(),
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (client_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_patrimonial_simulations TO authenticated;
GRANT ALL ON public.client_patrimonial_simulations TO service_role;
ALTER TABLE public.client_patrimonial_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own client simulations" ON public.client_patrimonial_simulations FOR SELECT TO authenticated USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
CREATE POLICY "Create own client simulations" ON public.client_patrimonial_simulations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
CREATE POLICY "Update own client simulations" ON public.client_patrimonial_simulations FOR UPDATE TO authenticated USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid())) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
CREATE POLICY "Delete own client simulations" ON public.client_patrimonial_simulations FOR DELETE TO authenticated USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));