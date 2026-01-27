-- Create atomic swap function for kanban reorder
CREATE OR REPLACE FUNCTION public.swap_kanban_order(
  p_client_a uuid,
  p_client_b uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_a numeric;
  v_order_b numeric;
  v_stage_a text;
  v_stage_b text;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  -- Get current orders and stages for both clients
  SELECT kanban_order, funnel_stage, user_id INTO v_order_a, v_stage_a, v_user_a
  FROM clients WHERE id = p_client_a;
  
  SELECT kanban_order, funnel_stage, user_id INTO v_order_b, v_stage_b, v_user_b
  FROM clients WHERE id = p_client_b;
  
  -- Validate both clients exist
  IF v_order_a IS NULL OR v_order_b IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client not found');
  END IF;
  
  -- Validate same stage
  IF v_stage_a != v_stage_b THEN
    RETURN jsonb_build_object('success', false, 'error', 'Clients must be in the same stage');
  END IF;
  
  -- Validate same user (RLS check)
  IF v_user_a != v_user_b THEN
    RETURN jsonb_build_object('success', false, 'error', 'Clients must belong to same user');
  END IF;
  
  -- Perform atomic swap using temporary value to avoid constraint conflicts
  UPDATE clients SET kanban_order = -999999 WHERE id = p_client_a;
  UPDATE clients SET kanban_order = v_order_a WHERE id = p_client_b;
  UPDATE clients SET kanban_order = v_order_b WHERE id = p_client_a;
  
  RETURN jsonb_build_object(
    'success', true, 
    'client_a', jsonb_build_object('id', p_client_a, 'new_order', v_order_b),
    'client_b', jsonb_build_object('id', p_client_b, 'new_order', v_order_a)
  );
END;
$$;

-- Create normalize function to fix duplicates and gaps
CREATE OR REPLACE FUNCTION public.normalize_kanban_order(
  p_user_id uuid,
  p_stage text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_new_order integer := 10;
  v_count integer := 0;
BEGIN
  -- Update all clients in the stage with sequential orders (10, 20, 30...)
  FOR v_client IN 
    SELECT id 
    FROM clients 
    WHERE user_id = p_user_id AND funnel_stage = p_stage
    ORDER BY COALESCE(kanban_order, 999999) ASC, id ASC
  LOOP
    UPDATE clients SET kanban_order = v_new_order WHERE id = v_client.id;
    v_new_order := v_new_order + 10;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'normalized_count', v_count, 'stage', p_stage);
END;
$$;

-- Populate kanban_order for existing clients that have NULL
DO $$
DECLARE
  v_stage text;
  v_client record;
  v_order integer;
BEGIN
  -- For each unique stage
  FOR v_stage IN SELECT DISTINCT funnel_stage FROM clients WHERE funnel_stage IS NOT NULL LOOP
    v_order := 10;
    -- For each client in this stage ordered by created_at
    FOR v_client IN 
      SELECT id FROM clients 
      WHERE funnel_stage = v_stage AND kanban_order IS NULL
      ORDER BY created_at ASC, id ASC
    LOOP
      -- Find the max existing order in this stage
      SELECT COALESCE(MAX(kanban_order), 0) + 10 INTO v_order 
      FROM clients 
      WHERE funnel_stage = v_stage AND kanban_order IS NOT NULL;
      
      UPDATE clients SET kanban_order = v_order WHERE id = v_client.id;
      v_order := v_order + 10;
    END LOOP;
  END LOOP;
END $$;

-- Now normalize all stages to ensure no duplicates
DO $$
DECLARE
  v_user_id uuid;
  v_stage text;
BEGIN
  FOR v_user_id, v_stage IN 
    SELECT DISTINCT user_id, funnel_stage FROM clients WHERE funnel_stage IS NOT NULL
  LOOP
    PERFORM normalize_kanban_order(v_user_id, v_stage);
  END LOOP;
END $$;