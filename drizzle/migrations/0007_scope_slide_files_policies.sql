DROP POLICY IF EXISTS "Slide files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload slide files" ON storage.objects;
CREATE POLICY "Users can list their own slide files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'slide-files' AND (select auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own slide files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'slide-files' AND (select auth.uid())::text = (storage.foldername(name))[1]);