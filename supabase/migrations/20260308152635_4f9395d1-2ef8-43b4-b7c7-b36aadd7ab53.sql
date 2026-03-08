
-- Pillars per client per profile tab
CREATE TABLE public.farol_pillars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  profile_tab TEXT NOT NULL DEFAULT 'Conservador',
  pillar_name TEXT NOT NULL,
  allocation_pct NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.farol_pillars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own farol pillars" ON public.farol_pillars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own farol pillars" ON public.farol_pillars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own farol pillars" ON public.farol_pillars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own farol pillars" ON public.farol_pillars FOR DELETE USING (auth.uid() = user_id);

-- Assets within each pillar
CREATE TABLE public.farol_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_id UUID NOT NULL REFERENCES public.farol_pillars(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  sector TEXT,
  ceiling_price NUMERIC,
  current_price NUMERIC,
  bias TEXT NOT NULL DEFAULT 'AGUARDAR',
  allocation_pct NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.farol_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own farol assets" ON public.farol_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own farol assets" ON public.farol_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own farol assets" ON public.farol_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own farol assets" ON public.farol_assets FOR DELETE USING (auth.uid() = user_id);
