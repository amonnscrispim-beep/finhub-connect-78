
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS assignee text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS tasks_user_due_idx ON public.tasks (user_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_client_completed_idx ON public.tasks (client_id, completed);
