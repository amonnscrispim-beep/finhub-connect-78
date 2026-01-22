-- Add completed_at column to tasks table for tracking when tasks were completed
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone DEFAULT NULL;

-- Update existing completed tasks to have a completed_at timestamp (use updated_at as fallback)
UPDATE public.tasks SET completed_at = updated_at WHERE completed = true AND completed_at IS NULL;