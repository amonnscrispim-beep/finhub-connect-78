import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type CrmMeeting = Tables<'crm_meetings'>;

export function useCrmMeetings() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['crm_meetings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('crm_meetings')
        .select('*')
        .eq('user_id', user.id)
        .order('start_at', { ascending: true });

      if (error) {
        console.error('[Agenda] Erro ao carregar reuniões:', error);
        throw error;
      }

      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  return {
    meetings: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}