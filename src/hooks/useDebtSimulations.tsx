import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { DebtSimulation, ExtraAmortization } from '@/types/debt-simulation';
import { Json } from '@/integrations/supabase/types';

function dbToSimulation(row: {
  id: string;
  client_id: string;
  user_id: string;
  name: string;
  debt_type: string;
  principal_value: number;
  start_month: number;
  start_year: number;
  amortization_system: string;
  interest_rate: number;
  interest_period: string;
  installments_count: number;
  extra_amortizations: Json;
  created_at: string;
  updated_at: string;
}): DebtSimulation {
  let extraAmortizations: ExtraAmortization[] = [];
  if (Array.isArray(row.extra_amortizations)) {
    extraAmortizations = row.extra_amortizations as unknown as ExtraAmortization[];
  }
  
  return {
    id: row.id,
    clientId: row.client_id,
    userId: row.user_id,
    name: row.name,
    debtType: row.debt_type as DebtSimulation['debtType'],
    principalValue: Number(row.principal_value),
    startMonth: row.start_month,
    startYear: row.start_year,
    amortizationSystem: row.amortization_system as DebtSimulation['amortizationSystem'],
    interestRate: Number(row.interest_rate),
    interestPeriod: row.interest_period as DebtSimulation['interestPeriod'],
    installmentsCount: row.installments_count,
    extraAmortizations,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export function useDebtSimulations(clientId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: simulations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['debt-simulations', clientId, user?.id],
    queryFn: async () => {
      if (!user?.id || !clientId) return [];
      
      const { data, error } = await supabase
        .from('client_debt_simulations')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(dbToSimulation);
    },
    enabled: !!user?.id && !!clientId
  });

  const addSimulationMutation = useMutation({
    mutationFn: async (simulation: Omit<DebtSimulation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('client_debt_simulations')
        .insert({
          client_id: simulation.clientId,
          user_id: user.id,
          name: simulation.name,
          debt_type: simulation.debtType,
          principal_value: simulation.principalValue,
          start_month: simulation.startMonth,
          start_year: simulation.startYear,
          amortization_system: simulation.amortizationSystem,
          interest_rate: simulation.interestRate,
          interest_period: simulation.interestPeriod,
          installments_count: simulation.installmentsCount,
          extra_amortizations: simulation.extraAmortizations as unknown as Json
        })
        .select()
        .single();
      
      if (error) throw error;
      return dbToSimulation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-simulations', clientId] });
      toast.success('Simulação salva com sucesso!');
    },
    onError: (error) => {
      console.error('Error adding simulation:', error);
      toast.error('Erro ao salvar simulação');
    }
  });

  const updateSimulationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DebtSimulation> }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.debtType !== undefined) dbUpdates.debt_type = updates.debtType;
      if (updates.principalValue !== undefined) dbUpdates.principal_value = updates.principalValue;
      if (updates.startMonth !== undefined) dbUpdates.start_month = updates.startMonth;
      if (updates.startYear !== undefined) dbUpdates.start_year = updates.startYear;
      if (updates.amortizationSystem !== undefined) dbUpdates.amortization_system = updates.amortizationSystem;
      if (updates.interestRate !== undefined) dbUpdates.interest_rate = updates.interestRate;
      if (updates.interestPeriod !== undefined) dbUpdates.interest_period = updates.interestPeriod;
      if (updates.installmentsCount !== undefined) dbUpdates.installments_count = updates.installmentsCount;
      if (updates.extraAmortizations !== undefined) dbUpdates.extra_amortizations = updates.extraAmortizations as unknown as Json;
      
      const { data, error } = await supabase
        .from('client_debt_simulations')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return dbToSimulation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-simulations', clientId] });
      toast.success('Simulação atualizada!');
    },
    onError: (error) => {
      console.error('Error updating simulation:', error);
      toast.error('Erro ao atualizar simulação');
    }
  });

  const deleteSimulationMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('client_debt_simulations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-simulations', clientId] });
      toast.success('Simulação excluída!');
    },
    onError: (error) => {
      console.error('Error deleting simulation:', error);
      toast.error('Erro ao excluir simulação');
    }
  });

  return {
    simulations,
    isLoading,
    error,
    refetch,
    addSimulation: addSimulationMutation.mutateAsync,
    updateSimulation: updateSimulationMutation.mutateAsync,
    deleteSimulation: deleteSimulationMutation.mutateAsync,
    isAdding: addSimulationMutation.isPending,
    isUpdating: updateSimulationMutation.isPending,
    isDeleting: deleteSimulationMutation.isPending
  };
}
