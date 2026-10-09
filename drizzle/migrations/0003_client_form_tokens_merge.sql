ALTER TABLE public.client_form_tokens ADD COLUMN IF NOT EXISTS merged_at timestamptz;
ALTER TABLE public.client_form_tokens ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');