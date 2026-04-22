CREATE TABLE public.weekly_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'media',
  time TEXT,
  day_index INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly tasks" ON public.weekly_tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly tasks" ON public.weekly_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly tasks" ON public.weekly_tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly tasks" ON public.weekly_tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_weekly_tasks_updated_at
  BEFORE UPDATE ON public.weekly_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();