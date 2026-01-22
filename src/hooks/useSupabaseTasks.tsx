import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Task } from '@/types/client';
import type { Tables } from '@/integrations/supabase/types';

type TaskRow = Tables<'tasks'>;

// Convert database row to Task type
function dbToTask(row: TaskRow & { completed_at?: string | null }): Task {
  return {
    id: row.id,
    description: row.description,
    completed: row.completed ?? false,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
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

  // Toggle task mutation with optimistic updates
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, clientId, completed }: { taskId: string; clientId: string; completed: boolean }) => {
      if (!user) throw new Error('User not authenticated');
      
      const newCompleted = !completed;
      const updateData: Record<string, unknown> = {
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update client's last_activity_at in background
      supabase
        .from('clients')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', clientId)
        .eq('user_id', user.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        });
      
      return dbToTask(data);
    },
    // Optimistic update
    onMutate: async ({ taskId, clientId, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['tasks-by-client'] });
      
      // Snapshot previous values
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', clientId, user?.id]);
      const previousTasksByClient = queryClient.getQueryData<Record<string, Task[]>>(['tasks-by-client', user?.id]);
      
      const newCompleted = !completed;
      const now = new Date();
      
      // Optimistically update tasks for specific client
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(['tasks', clientId, user?.id], old =>
          old?.map(task =>
            task.id === taskId
              ? { ...task, completed: newCompleted, completedAt: newCompleted ? now : null }
              : task
          ) ?? []
        );
      }
      
      // Optimistically update tasks-by-client
      if (previousTasksByClient) {
        queryClient.setQueryData<Record<string, Task[]>>(['tasks-by-client', user?.id], old => {
          if (!old) return {};
          const updated = { ...old };
          if (updated[clientId]) {
            updated[clientId] = updated[clientId].map(task =>
              task.id === taskId
                ? { ...task, completed: newCompleted, completedAt: newCompleted ? now : null }
                : task
            );
          }
          return updated;
        });
      }
      
      return { previousTasks, previousTasksByClient, clientId };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', context.clientId, user?.id], context.previousTasks);
      }
      if (context?.previousTasksByClient) {
        queryClient.setQueryData(['tasks-by-client', user?.id], context.previousTasksByClient);
      }
      console.error('Error toggling task:', error);
      toast.error('Erro ao atualizar tarefa. Alteração revertida.');
    },
    onSettled: () => {
      // Sync with server after mutation settles
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-client'] });
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
