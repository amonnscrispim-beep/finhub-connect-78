
-- 1. Remove the unique constraint blocking multiple reports per client
DROP INDEX IF EXISTS public.idx_performance_reports_client_user;

-- 2. Create dedicated performance_reports table
CREATE TABLE IF NOT EXISTS public.performance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  corretora TEXT,
  tipo_relatorio TEXT,
  nome_arquivo TEXT,
  data_relatorio DATE,
  patrimonio_bruto NUMERIC,
  patrimonio_liquido NUMERIC,
  rent_mes NUMERIC,
  rent_ano NUMERIC,
  rent_12m NUMERIC,
  rent_acumulada NUMERIC,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'extracted', 'failed')),
  extracted_data JSONB DEFAULT '{}'::jsonb,
  manual_overrides JSONB DEFAULT '{}'::jsonb,
  alerts JSONB DEFAULT '[]'::jsonb,
  pdf_url TEXT,
  pdf_filename TEXT,
  consultant_conclusion TEXT DEFAULT '',
  technical_summary TEXT DEFAULT '',
  commercial_summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No unique constraint on client_id — multiple reports per client allowed

-- 3. Create performance_positions table
CREATE TABLE IF NOT EXISTS public.performance_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.performance_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ativo TEXT,
  tipo TEXT,
  indexador TEXT,
  taxa NUMERIC,
  vencimento DATE,
  valor NUMERIC,
  percentual NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS on both tables
ALTER TABLE public.performance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_positions ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for performance_reports
CREATE POLICY "Users can view own performance reports" ON public.performance_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance reports" ON public.performance_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own performance reports" ON public.performance_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own performance reports" ON public.performance_reports FOR DELETE USING (auth.uid() = user_id);

-- 6. RLS policies for performance_positions
CREATE POLICY "Users can view own positions" ON public.performance_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own positions" ON public.performance_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own positions" ON public.performance_positions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own positions" ON public.performance_positions FOR DELETE USING (auth.uid() = user_id);

-- 7. Index for fast lookups
CREATE INDEX idx_performance_reports_client ON public.performance_reports(client_id);
CREATE INDEX idx_performance_positions_report ON public.performance_positions(report_id);

-- 8. Refresh schema cache
NOTIFY pgrst, 'reload schema';
