ALTER TABLE public.crm_meetings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';
UPDATE public.crm_meetings SET status = 'completed' WHERE start_at < NOW() AND status = 'scheduled';
ALTER TABLE public.crm_meetings ADD CONSTRAINT crm_meetings_status_valid CHECK (status IN ('scheduled', 'completed', 'cancelled'));
CREATE OR REPLACE FUNCTION public.sync_completed_crm_meeting() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.client_id IS NOT NULL THEN
    UPDATE public.clients SET last_meeting_date = NEW.start_at,
      last_activity_at = GREATEST(last_activity_at, NEW.start_at)
    WHERE id = NEW.client_id AND user_id = NEW.user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Linked client cannot be updated'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sync_completed_crm_meeting AFTER UPDATE OF status ON public.crm_meetings FOR EACH ROW EXECUTE FUNCTION public.sync_completed_crm_meeting();