CREATE OR REPLACE FUNCTION public.is_master_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id 
    AND email IN ('amonncrispimufrj@gmail.com', 'amonnscrispim@gmail.com')
  );
$function$;