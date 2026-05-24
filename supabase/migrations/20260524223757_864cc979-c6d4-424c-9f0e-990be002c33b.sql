DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_meetings_updated_at ON public.crm_meetings;
CREATE TRIGGER update_crm_meetings_updated_at
BEFORE UPDATE ON public.crm_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();