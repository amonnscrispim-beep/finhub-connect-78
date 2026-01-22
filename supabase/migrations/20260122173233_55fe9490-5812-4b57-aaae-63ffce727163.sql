-- Add emergency reserve status and note fields
ALTER TABLE public.clients
ADD COLUMN emergency_reserve_status text DEFAULT NULL,
ADD COLUMN emergency_reserve_note text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.clients.emergency_reserve_status IS 'HAS = has reserve, NONE = building reserve, NOT_PRIORITY = not applicable';
COMMENT ON COLUMN public.clients.emergency_reserve_note IS 'Consultant note when reserve is not priority';