import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Task } from '@/types/client';
import type { Tables } from '@/integrations/supabase/types';

type TaskRow = Tables<'tasks'>;

// Convert database row to Task type
function dbToTask(row: TaskRow): Task {
  return {
    id: row.id,
    description: row.description,
    completed: row.completed ?? false,
    createdAt: new Date(row.created_at),
  };
}

export function useSupabaseTasks(clientId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch tasks for a specific client or all tasks
  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', clientId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
      
      return data.map(dbToTask);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch all tasks grouped by client
  const { data: tasksByClient = {} } = useQuery({
    queryKey: ['tasks-by-client', user?.id],
    queryFn: async () => {
      if (!user) return {};
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching all tasks:', error);
        throw error;
      }
      
      // Group tasks by client_id
      const grouped: Record<string, Task[]> = {};
      data.forEach(row => {
        if (!grouped[row.client_id]) {
          grouped[row.client_id] = [];
        }
        grouped[row.client_id].push(dbToTask(row));
      });
      
      return grouped;
    },
    enabled: !!user && !clientId, // Only run when not filtering by clientId
    staleTime: 1000 * 60 * 2,
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async ({ clientId, description }: { clientId: string; description: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          client_id: clientId,
          description,
          completed: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Also update client's last_activity_at
      await supabase
        .from('clients')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', clientId)
        .eq('user_id', user.id);
      
      return dbToTask(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-client'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error('Error adding task:', error);
      toast.error('Erro ao adicionar tarefa');
    },
  });

  // Toggle task mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, clientId, completed }: { taskId: string; clientId: string; completed: boolean }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed: !completed })
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update client's last_activity_at
      await supabase
        .from('clients')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', clientId)
        .eq('user_id', user.id);
      
      return dbToTask(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-client'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error('Error toggling task:', error);
      toast.error('Erro ao atualizar tarefa');
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-client'] });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Erro ao remover tarefa');
    },
  });

  return {
    tasks,
    tasksByClient,
    isLoading,
    error,
    refetch,
    addTask: (clientId: string, description: string) => addTaskMutation.mutateAsync({ clientId, description }),
    toggleTask: (taskId: string, clientId: string, completed: boolean) => toggleTaskMutation.mutateAsync({ taskId, clientId, completed }),
    deleteTask: (taskId: string) => deleteTaskMutation.mutateAsync({ taskId }),
    isAdding: addTaskMutation.isPending,
    isToggling: toggleTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}
