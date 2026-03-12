CREATE OR REPLACE FUNCTION public.is_master_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id AND email = 'amonncrispimufrj@gmail.com'
  );
$$;