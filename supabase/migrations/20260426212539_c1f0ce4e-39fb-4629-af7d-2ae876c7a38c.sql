-- Tabela de snapshots do extrato do cliente
CREATE TABLE public.client_extract_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_patrimony NUMERIC NOT NULL DEFAULT 0,
  broker TEXT,
  pdf_filename TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_extract_snapshots_client ON public.client_extract_snapshots(client_id, snapshot_date DESC);

ALTER TABLE public.client_extract_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own extract snapshots" ON public.client_extract_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own extract snapshots" ON public.client_extract_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own extract snapshots" ON public.client_extract_snapshots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own extract snapshots" ON public.client_extract_snapshots
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_client_extract_snapshots_updated_at
  BEFORE UPDATE ON public.client_extract_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de ativos do snapshot
CREATE TABLE public.client_extract_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.client_extract_snapshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  asset_type TEXT NOT NULL DEFAULT '',
  asset_name TEXT NOT NULL DEFAULT '',
  issuer TEXT,
  rate TEXT,
  maturity_date DATE,
  gross_value NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  asset_class TEXT NOT NULL DEFAULT 'Renda Fixa',
  is_tax_exempt BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_extract_assets_snapshot ON public.client_extract_assets(snapshot_id);

ALTER TABLE public.client_extract_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own extract assets" ON public.client_extract_assets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own extract assets" ON public.client_extract_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own extract assets" ON public.client_extract_assets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own extract assets" ON public.client_extract_assets
  FOR DELETE USING (auth.uid() = user_id);

-- Bucket para armazenar PDFs do extrato
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-extracts', 'client-extracts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view own extract files" ON storage.objects
  FOR SELECT USING (bucket_id = 'client-extracts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own extract files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'client-extracts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own extract files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'client-extracts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own extract files" ON storage.objects
  FOR DELETE USING (bucket_id = 'client-extracts' AND auth.uid()::text = (storage.foldername(name))[1]);