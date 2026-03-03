import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ActivityLogEntry {
  id: string;
  client_id: string | null;
  client_name: string;
  action_type: string;
  description: string;
  created_at: string;
}

export function useActivityLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activity_log', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ActivityLogEntry[];
    },
    enabled: !!user,
  });

  const logActivity = useCallback(async (
    actionType: string,
    description: string,
    clientId?: string,
    clientName?: string,
  ) => {
    if (!user) return;
    await supabase.from('activity_log').insert({
      user_id: user.id,
      client_id: clientId || null,
      client_name: clientName || '',
      action_type: actionType,
      description,
    });
    queryClient.invalidateQueries({ queryKey: ['activity_log', user.id] });
  }, [user, queryClient]);

  return { activities, isLoading, logActivity };
}
