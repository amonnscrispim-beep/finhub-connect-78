import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { Client, Task, FunnelStage, ClientFile, ScheduledMeeting } from '@/types/client';
import { useSupabaseClients } from '@/hooks/useSupabaseClients';
import { useSupabaseTasks } from '@/hooks/useSupabaseTasks';

interface ClientContextType {
  clients: Client[];
  isLoading: boolean;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client | void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client | void>;
  deleteClient: (id: string) => Promise<void>;
  moveClientToStage: (clientId: string, stage: FunnelStage) => Promise<void>;
  addTask: (clientId: string, description: string) => Promise<void>;
  toggleTask: (clientId: string, taskId: string) => Promise<void>;
  deleteTask: (clientId: string, taskId: string) => Promise<void>;
  updateClientFiles: (clientId: string, files: ClientFile[]) => Promise<void>;
  scheduleClientMeeting: (clientId: string, meeting: ScheduledMeeting) => Promise<void>;
  refetch: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  // Use Supabase hooks for data persistence
  const {
    clients: dbClients,
    isLoading: isLoadingClients,
    addClient: addClientToDb,
    updateClient: updateClientInDb,
    deleteClient: deleteClientFromDb,
    refetch: refetchClients,
  } = useSupabaseClients();

  const {
    tasksByClient,
    isLoading: isLoadingTasks,
    addTask: addTaskToDb,
    toggleTask: toggleTaskInDb,
    deleteTask: deleteTaskFromDb,
  } = useSupabaseTasks();

  // Merge tasks from database into clients
  const clients = useMemo(() => {
    return dbClients.map(client => ({
      ...client,
      tasks: tasksByClient[client.id] || [],
    }));
  }, [dbClients, tasksByClient]);

  const isLoading = isLoadingClients || isLoadingTasks;

  const addClient = useCallback(async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await addClientToDb(clientData);
      return result;
    } catch (error) {
      console.error('Error adding client:', error);
    }
  }, [addClientToDb]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    try {
      const result = await updateClientInDb(id, updates);
      return result;
    } catch (error) {
      console.error('Error updating client:', error);
    }
  }, [updateClientInDb]);

  const deleteClient = useCallback(async (id: string) => {
    try {
      await deleteClientFromDb(id);
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  }, [deleteClientFromDb]);

  const moveClientToStage = useCallback(async (clientId: string, stage: FunnelStage) => {
    try {
      await updateClientInDb(clientId, { 
        funnelStage: stage, 
        updatedAt: new Date() 
      });
    } catch (error) {
      console.error('Error moving client to stage:', error);
    }
  }, [updateClientInDb]);

  const addTask = useCallback(async (clientId: string, description: string) => {
    try {
      await addTaskToDb(clientId, description);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }, [addTaskToDb]);

  const toggleTask = useCallback(async (clientId: string, taskId: string) => {
    try {
      // Find the current task to get its completed status
      const clientTasks = tasksByClient[clientId] || [];
      const task = clientTasks.find(t => t.id === taskId);
      if (task) {
        await toggleTaskInDb(taskId, clientId, task.completed);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  }, [toggleTaskInDb, tasksByClient]);

  const deleteTask = useCallback(async (clientId: string, taskId: string) => {
    try {
      await deleteTaskFromDb(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, [deleteTaskFromDb]);

  const updateClientFiles = useCallback(async (clientId: string, files: ClientFile[]) => {
    try {
      await updateClientInDb(clientId, { 
        files, 
        updatedAt: new Date() 
      });
    } catch (error) {
      console.error('Error updating client files:', error);
    }
  }, [updateClientInDb]);

  const scheduleClientMeeting = useCallback(async (clientId: string, meeting: ScheduledMeeting) => {
    try {
      await updateClientInDb(clientId, { 
        scheduledMeeting: meeting, 
        pendingSchedule: false,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      });
    } catch (error) {
      console.error('Error scheduling meeting:', error);
    }
  }, [updateClientInDb]);

  const refetch = useCallback(() => {
    refetchClients();
  }, [refetchClients]);

  return (
    <ClientContext.Provider
      value={{
        clients,
        isLoading,
        addClient,
        updateClient,
        deleteClient,
        moveClientToStage,
        addTask,
        toggleTask,
        deleteTask,
        updateClientFiles,
        scheduleClientMeeting,
        refetch,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClients() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
}
