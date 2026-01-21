-- Create table for storing Google OAuth tokens per user
CREATE TABLE public.user_google_oauth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  google_email TEXT,
  refresh_token TEXT NOT NULL,
  scope TEXT,
  token_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_google_oauth ENABLE ROW LEVEL SECURITY;

-- Users can only see their own OAuth tokens
CREATE POLICY "Users can view their own oauth tokens"
ON public.user_google_oauth
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own oauth tokens
CREATE POLICY "Users can insert their own oauth tokens"
ON public.user_google_oauth
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own oauth tokens
CREATE POLICY "Users can update their own oauth tokens"
ON public.user_google_oauth
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own oauth tokens
CREATE POLICY "Users can delete their own oauth tokens"
ON public.user_google_oauth
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_google_oauth_updated_at
BEFORE UPDATE ON public.user_google_oauth
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for CRM meetings
CREATE TABLE public.crm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  google_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_meetings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own meetings
CREATE POLICY "Users can view their own meetings"
ON public.crm_meetings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own meetings
CREATE POLICY "Users can insert their own meetings"
ON public.crm_meetings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own meetings
CREATE POLICY "Users can update their own meetings"
ON public.crm_meetings
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own meetings
CREATE POLICY "Users can delete their own meetings"
ON public.crm_meetings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_crm_meetings_updated_at
BEFORE UPDATE ON public.crm_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();