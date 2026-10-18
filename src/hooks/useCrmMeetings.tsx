import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type CrmMeeting = Tables<'crm_meetings'>;

export function useCrmMeetings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const complete = useMutation({
    mutationFn: async (meetingId: string) => {
      if (!user) throw new Error('Sessão não disponível');
      const { data, error } = await supabase.from('crm_meetings')
        .update({ status: 'completed' })
        .eq('id', meetingId).eq('user_id', user.id)
        .eq('status', 'scheduled').select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (meeting) => {
      queryClient.setQueryData<CrmMeeting[]>(['crm_meetings', user?.id], (old) =>
        old?.map((row) => row.id === meeting.id ? meeting : row));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crm_meetings', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['clients', user?.id] }),
      ]);
    },
  });

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
    completeMeeting: complete.mutateAsync,
    completingMeetingId: complete.isPending ? complete.variables : undefined,
  };
}