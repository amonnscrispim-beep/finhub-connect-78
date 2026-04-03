
-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  como_chegou TEXT DEFAULT '',
  observacoes_iniciais TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Novo',
  fit_comercial TEXT DEFAULT NULL,
  nota_prontidao NUMERIC DEFAULT NULL,
  relatorio JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads" ON public.leads FOR SELECT USING (auth.uid() = vendedor_id);
CREATE POLICY "Users can insert own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = vendedor_id);
CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE USING (auth.uid() = vendedor_id);
CREATE POLICY "Users can delete own leads" ON public.leads FOR DELETE USING (auth.uid() = vendedor_id);

-- Create qualificacoes table
CREATE TABLE public.qualificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL,
  historico_chat JSONB DEFAULT '[]'::jsonb,
  relatorio JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.qualificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own qualificacoes" ON public.qualificacoes FOR SELECT USING (auth.uid() = vendedor_id);
CREATE POLICY "Users can insert own qualificacoes" ON public.qualificacoes FOR INSERT WITH CHECK (auth.uid() = vendedor_id);
CREATE POLICY "Users can update own qualificacoes" ON public.qualificacoes FOR UPDATE USING (auth.uid() = vendedor_id);
CREATE POLICY "Users can delete own qualificacoes" ON public.qualificacoes FOR DELETE USING (auth.uid() = vendedor_id);

-- Create mensagens_qualificacao table
CREATE TABLE public.mensagens_qualificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qualificacao_id UUID NOT NULL REFERENCES public.qualificacoes(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mensagens_qualificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.mensagens_qualificacao FOR SELECT USING (auth.uid() = vendedor_id);
CREATE POLICY "Users can insert own messages" ON public.mensagens_qualificacao FOR INSERT WITH CHECK (auth.uid() = vendedor_id);
CREATE POLICY "Users can delete own messages" ON public.mensagens_qualificacao FOR DELETE USING (auth.uid() = vendedor_id);

-- Add updated_at triggers
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_qualificacoes_updated_at BEFORE UPDATE ON public.qualificacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
