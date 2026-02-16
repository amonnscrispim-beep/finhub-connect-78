
-- Create storage bucket for performance report PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('performance-reports', 'performance-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own performance reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'performance-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own performance reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'performance-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own performance reports"
ON storage.objects FOR UPDATE
USING (bucket_id = 'performance-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own performance reports"
ON storage.objects FOR DELETE
USING (bucket_id = 'performance-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for performance reports
CREATE TABLE public.client_performance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  pdf_url TEXT,
  pdf_filename TEXT,
  report_date DATE,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  manual_overrides JSONB DEFAULT '{}'::jsonb,
  consultant_conclusion TEXT DEFAULT '',
  alerts JSONB DEFAULT '[]'::jsonb,
  technical_summary TEXT DEFAULT '',
  commercial_summary TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_performance_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own performance reports"
ON public.client_performance_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own performance reports"
ON public.client_performance_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance reports"
ON public.client_performance_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own performance reports"
ON public.client_performance_reports FOR DELETE
USING (auth.uid() = user_id);

-- Unique constraint: one report per client per user
CREATE UNIQUE INDEX idx_performance_reports_client_user ON public.client_performance_reports(client_id, user_id);
