-- Administration: migrate clients (and their linked records) between consultant accounts.
-- Master-only: guarded by public.is_master_user(auth.uid()).

CREATE OR REPLACE FUNCTION public.admin_migrate_clients(p_from_user uuid, p_to_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  t record;
  v_client_ids uuid[];
  v_moved_clients integer := 0;
  v_rows integer;
  v_details jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.is_master_user(auth.uid()) THEN
    RAISE EXCEPTION 'Somente o usuário mestre pode migrar clientes';
  END IF;

  IF p_from_user IS NULL OR p_to_user IS NULL OR p_from_user = p_to_user THEN
    RAISE EXCEPTION 'Contas de origem e destino devem ser diferentes';
  END IF;

  SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO v_client_ids
  FROM public.clients WHERE user_id = p_from_user;

  UPDATE public.clients SET user_id = p_to_user WHERE user_id = p_from_user;
  GET DIAGNOSTICS v_moved_clients = ROW_COUNT;

  -- Every public table that links a client to a user follows the migration.
  FOR t IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'client_id'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns u
        WHERE u.table_schema = 'public'
          AND u.table_name = c.table_name
          AND u.column_name = 'user_id'
      )
  LOOP
    -- Avoid unique(client_id, user_id) conflicts when the destination already has the record.
    EXECUTE format('DELETE FROM public.%I WHERE user_id = $1 AND client_id = ANY($2)', t.table_name)
      USING p_to_user, v_client_ids;

    EXECUTE format('UPDATE public.%I SET user_id = $1 WHERE user_id = $2 AND client_id = ANY($3)', t.table_name)
      USING p_to_user, p_from_user, v_client_ids;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      v_details := jsonb_set(v_details, ARRAY[t.table_name], to_jsonb(v_rows), true);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'clients_moved', v_moved_clients,
    'related_moved', v_details
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_consultants()
RETURNS TABLE(user_id uuid, email text, full_name text, client_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT u.id,
         u.email,
         COALESCE(p.full_name, '') AS full_name,
         (SELECT count(*) FROM public.clients c WHERE c.user_id = u.id) AS client_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY 4 DESC, 2 ASC;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_migrate_clients(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_consultants() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_migrate_clients(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_consultants() TO authenticated;
