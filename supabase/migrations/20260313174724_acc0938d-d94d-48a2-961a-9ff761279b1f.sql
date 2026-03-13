
ALTER TABLE public.summary_reports ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
ALTER TABLE public.summary_reports ADD COLUMN IF NOT EXISTS pdf_url text;

ALTER TABLE public.portfolio_assets ADD COLUMN IF NOT EXISTS ceiling_price numeric DEFAULT 0;
ALTER TABLE public.portfolio_assets ADD COLUMN IF NOT EXISTS current_price numeric;

INSERT INTO storage.buckets (id, name, public) VALUES ('summary-report-files', 'summary-report-files', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own summary files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'summary-report-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own summary files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'summary-report-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own summary files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'summary-report-files' AND (storage.foldername(name))[1] = auth.uid()::text);
