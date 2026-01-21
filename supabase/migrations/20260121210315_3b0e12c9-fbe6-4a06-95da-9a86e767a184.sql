-- Create table for debt simulations
CREATE TABLE public.client_debt_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Nova Simulação',
  debt_type TEXT NOT NULL DEFAULT 'Financiamento',
  principal_value NUMERIC NOT NULL DEFAULT 0,
  start_month INTEGER NOT NULL,
  start_year INTEGER NOT NULL,
  amortization_system TEXT NOT NULL DEFAULT 'PRICE',
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  interest_period TEXT NOT NULL DEFAULT 'a.a.',
  installments_count INTEGER NOT NULL DEFAULT 12,
  extra_amortizations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_debt_simulations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own simulations"
ON public.client_debt_simulations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations"
ON public.client_debt_simulations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulations"
ON public.client_debt_simulations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations"
ON public.client_debt_simulations
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_client_debt_simulations_updated_at
BEFORE UPDATE ON public.client_debt_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();