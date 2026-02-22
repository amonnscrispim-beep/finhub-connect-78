
-- Table to store form tokens for client intake forms
CREATE TABLE public.client_form_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'not_sent',
  responses JSONB DEFAULT '{}'::jsonb,
  client_name TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('not_sent', 'sent', 'in_progress', 'completed', 'updated'))
);

-- Enable RLS
ALTER TABLE public.client_form_tokens ENABLE ROW LEVEL SECURITY;

-- Consultants can manage their own tokens
CREATE POLICY "Users can view own form tokens"
  ON public.client_form_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own form tokens"
  ON public.client_form_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own form tokens"
  ON public.client_form_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own form tokens"
  ON public.client_form_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast token lookups (public form access)
CREATE INDEX idx_client_form_tokens_token ON public.client_form_tokens(token);

-- Trigger for updated_at
CREATE TRIGGER update_client_form_tokens_updated_at
  BEFORE UPDATE ON public.client_form_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
