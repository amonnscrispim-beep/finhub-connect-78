import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ContributionRow {
  id: string;
  client_id: string;
  year: number;
  month: number;
  planned_amount: number;
  realized_amount: number;
  contribution_date: string | null;
  notes: string | null;
  updated_at: string;
}

export interface ContributionPlan {
  planned_monthly_contribution: number;
  contribution_start_date: string | null;
  contribution_periodicity: string | null;
  contribution_notes: string | null;
}

export function useContributions() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('client_contributions')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (error) {
      console.error('[contributions] fetch error', error);
      toast.error('Erro ao carregar aportes');
    } else {
      setRows((data ?? []) as ContributionRow[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const upsertContribution = useCallback(async (input: {
    client_id: string;
    year: number;
    month: number;
    planned_amount?: number;
    realized_amount?: number;
    contribution_date?: string | null;
    notes?: string | null;
  }) => {
    if (!user) return null;
    const payload = {
      user_id: user.id,
      client_id: input.client_id,
      year: input.year,
      month: input.month,
      planned_amount: input.planned_amount ?? 0,
      realized_amount: input.realized_amount ?? 0,
      contribution_date: input.contribution_date ?? null,
      notes: input.notes ?? null,
    };
    const { data, error } = await supabase
      .from('client_contributions')
      .upsert(payload, { onConflict: 'client_id,year,month' })
      .select()
      .single();
    if (error) {
      console.error('[contributions] upsert error', error);
      toast.error('Erro ao salvar aporte');
      return null;
    }
    setRows(prev => {
      const filtered = prev.filter(r => !(r.client_id === input.client_id && r.year === input.year && r.month === input.month));
      return [data as ContributionRow, ...filtered];
    });
    return data as ContributionRow;
  }, [user]);

  return { rows, isLoading, refresh: fetchAll, upsertContribution };
}

export async function fetchContributionPlan(clientId: string): Promise<ContributionPlan | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('planned_monthly_contribution, contribution_start_date, contribution_periodicity, contribution_notes')
    .eq('id', clientId)
    .maybeSingle();
  if (error) {
    console.error('[contributions] fetch plan error', error);
    return null;
  }
  return data as ContributionPlan | null;
}

export async function saveContributionPlan(clientId: string, plan: Partial<ContributionPlan>): Promise<boolean> {
  const { error } = await supabase
    .from('clients')
    .update(plan)
    .eq('id', clientId);
  if (error) {
    console.error('[contributions] save plan error', error);
    toast.error('Erro ao salvar planejamento');
    return false;
  }
  return true;
}
