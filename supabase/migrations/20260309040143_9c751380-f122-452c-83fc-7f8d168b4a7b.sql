
CREATE TABLE public.summary_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  report_type TEXT NOT NULL DEFAULT 'analise_ativo',
  ticker TEXT,
  client_name TEXT,
  ref_date DATE DEFAULT CURRENT_DATE,
  raw_input TEXT,
  markdown_content TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.summary_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own summary reports"
ON public.summary_reports
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
