-- Add file_type column to study_slides to distinguish between pdf and image
ALTER TABLE public.study_slides 
ADD COLUMN file_type text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.study_slides.file_type IS 'Type of file: pdf or image';

-- Create storage bucket for slide files
INSERT INTO storage.buckets (id, name, public)
VALUES ('slide-files', 'slide-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view slide files (public bucket)
CREATE POLICY "Slide files are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'slide-files');

-- Policy: Authenticated users can upload their own slide files
CREATE POLICY "Users can upload slide files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'slide-files' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can update their own slide files
CREATE POLICY "Users can update their own slide files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'slide-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own slide files
CREATE POLICY "Users can delete their own slide files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'slide-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);