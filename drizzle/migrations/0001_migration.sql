CREATE POLICY "Users manage their own client files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'client-files' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'client-files' AND (storage.foldername(name))[1] = auth.uid()::text);