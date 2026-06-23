
-- Add contribution planning fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS planned_monthly_contribution numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_start_date date,
  ADD COLUMN IF NOT EXISTS contribution_periodicity text,
  ADD COLUMN IF NOT EXISTS contribution_notes text;

-- New table for realized contributions per month
CREATE TABLE IF NOT EXISTS public.client_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_amount numeric NOT NULL DEFAULT 0,
  realized_amount numeric NOT NULL DEFAULT 0,
  contribution_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contributions TO authenticated;
GRANT ALL ON public.client_contributions TO service_role;

ALTER TABLE public.client_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own contributions"
ON public.client_contributions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_client_contributions_user_year_month
  ON public.client_contributions(user_id, year, month);

CREATE INDEX IF NOT EXISTS idx_client_contributions_client
  ON public.client_contributions(client_id);

CREATE TRIGGER update_client_contributions_updated_at
BEFORE UPDATE ON public.client_contributions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
