import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UrgentPendency {
  id: string;
  client_id: string;
  client_name?: string;
  client_profession?: string;
  description: string;
  deadline: string;
  priority: 'alta' | 'media' | 'baixa';
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export function useUrgentPendencies() {
  const { user } = useAuth();
  const [pendencies, setPendencies] = useState<UrgentPendency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendencies = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('urgent_pendencies')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('deadline', { ascending: true });

    if (error) {
      console.error('Error fetching pendencies:', error);
      return;
    }

    // Fetch client names
    const clientIds = [...new Set((data || []).map(p => p.client_id))];
    let clientMap: Record<string, { name: string; profession: string }> = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, profession')
        .in('id', clientIds);
      if (clients) {
        clients.forEach(c => {
          clientMap[c.id] = { name: c.name, profession: c.profession || '' };
        });
      }
    }

    setPendencies((data || []).map(p => ({
      ...p,
      priority: p.priority as 'alta' | 'media' | 'baixa',
      client_name: clientMap[p.client_id]?.name || 'Cliente',
      client_profession: clientMap[p.client_id]?.profession || '',
    })));
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchPendencies(); }, [fetchPendencies]);

  const addPendency = async (data: { client_id: string; description: string; deadline: string; priority: string }) => {
    if (!user) return;
    const { error } = await supabase.from('urgent_pendencies').insert({
      user_id: user.id,
      client_id: data.client_id,
      description: data.description,
      deadline: data.deadline,
      priority: data.priority,
    });
    if (error) { toast.error('Erro ao criar pendência'); return; }
    toast.success('Pendência adicionada');
    fetchPendencies();
  };

  const completePendency = async (id: string) => {
    const { error } = await supabase.from('urgent_pendencies').update({
      completed: true,
      completed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast.error('Erro ao concluir pendência'); return; }
    setPendencies(prev => prev.filter(p => p.id !== id));
    toast.success('Pendência concluída');
  };

  const removePendency = async (id: string) => {
    const { error } = await supabase.from('urgent_pendencies').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover pendência'); return; }
    setPendencies(prev => prev.filter(p => p.id !== id));
    toast.success('Pendência removida');
  };

  // Get client IDs that have active pendencies
  const clientIdsWithPendencies = new Set(pendencies.map(p => p.client_id));

  return { pendencies, isLoading, addPendency, completePendency, removePendency, clientIdsWithPendencies, refetch: fetchPendencies };
}
