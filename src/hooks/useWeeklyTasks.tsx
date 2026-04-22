import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type WeeklyTaskPriority = 'alta' | 'media' | 'baixa';

export interface WeeklyTask {
  id: string;
  title: string;
  priority: WeeklyTaskPriority;
  time: string;
  dayIndex: number;
  completed: boolean;
}

interface DbRow {
  id: string;
  title: string;
  priority: string;
  time: string | null;
  day_index: number;
  completed: boolean;
}

const rowToTask = (row: DbRow): WeeklyTask => ({
  id: row.id,
  title: row.title,
  priority: (row.priority as WeeklyTaskPriority) ?? 'media',
  time: row.time ?? '',
  dayIndex: row.day_index ?? 0,
  completed: row.completed ?? false,
});

export function useWeeklyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['weekly-tasks', user?.id];

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('weekly_tasks' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data as unknown) as DbRow[]).map(rowToTask);
    },
    staleTime: 1000 * 30,
  });

  const addTask = useMutation({
    mutationFn: async (input: Omit<WeeklyTask, 'id'>) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('weekly_tasks' as any)
        .insert({
          user_id: user.id,
          title: input.title,
          priority: input.priority,
          time: input.time || null,
          day_index: input.dayIndex,
          completed: input.completed,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToTask((data as unknown) as DbRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Tarefa adicionada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao adicionar tarefa: ${err?.message ?? 'tente novamente'}`);
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('weekly_tasks' as any)
        .update({ completed })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WeeklyTask[]>(queryKey);
      queryClient.setQueryData<WeeklyTask[]>(queryKey, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, completed } : t))
      );
      return { previous };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error(`Erro ao atualizar tarefa: ${err?.message ?? 'tente novamente'}`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('weekly_tasks' as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WeeklyTask[]>(queryKey);
      queryClient.setQueryData<WeeklyTask[]>(queryKey, (old) =>
        (old ?? []).filter((t) => t.id !== id)
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success('Tarefa removida.');
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error(`Erro ao remover tarefa: ${err?.message ?? 'tente novamente'}`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    tasks,
    isLoading,
    refetch,
    addTask: (t: Omit<WeeklyTask, 'id'>) => addTask.mutateAsync(t),
    toggleTask: (id: string, completed: boolean) => toggleTask.mutateAsync({ id, completed }),
    deleteTask: (id: string) => deleteTask.mutateAsync(id),
    isAdding: addTask.isPending,
  };
}
