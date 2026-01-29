-- Add file_name column for custom display name
ALTER TABLE public.study_slides 
ADD COLUMN file_name text DEFAULT NULL;