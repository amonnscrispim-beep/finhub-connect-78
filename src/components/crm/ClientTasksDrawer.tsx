import { useState, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Client } from '@/types/client';
import { useClients } from '@/contexts/ClientContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { cn } from '@/lib/utils';
import {
  Check,
  Circle,
  Plus,
  Trash2,
  RotateCcw,
  ListTodo,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

interface ClientTasksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientTasksDrawer({ open, onOpenChange, client }: ClientTasksDrawerProps) {
  const { toggleTask, addTask, deleteTask } = useClients();
  const { logActivity } = useActivityLog();
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState<string>('pending');

  const pendingTasks = useMemo(
    () => (client?.tasks ?? []).filter(t => !t.completed),
    [client?.tasks]
  );

  const completedTasks = useMemo(
    () => (client?.tasks ?? []).filter(t => t.completed),
    [client?.tasks]
  );

  const handleAddTask = useCallback(async () => {
    if (!client || !newTaskText.trim()) return;
    await addTask(client.id, newTaskText.trim());
    await logActivity('tarefa', `Tarefa criada: "${newTaskText.trim()}"`, client.id, client.name);
    setNewTaskText('');
  }, [client, newTaskText, addTask, logActivity]);

  const handleToggleTask = useCallback(async (taskId: string) => {
    if (!client) return;
    const task = (client.tasks ?? []).find(t => t.id === taskId);
    await toggleTask(client.id, taskId);
    if (task && !task.completed) {
      await logActivity('tarefa', `Tarefa concluída: "${task.description}"`, client.id, client.name);
    }
  }, [client, toggleTask, logActivity]);

  const progressPct = client && client.tasks.length > 0
    ? Math.round((completedTasks.length / client.tasks.length) * 100)
    : 0;

  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[420px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle className="text-lg font-semibold truncate">{client.name}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground space-y-0.5">
            {client.profession && <span className="block">{client.profession}</span>}
            {client.objective && <span className="block">{client.objective}</span>}
          </SheetDescription>
          {/* Progress bar */}
          {client.tasks.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progresso</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4">
            <TabsTrigger value="pending" className="flex-1 gap-1.5">
              <ListTodo className="w-3.5 h-3.5" />
              Pendentes ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Concluídas ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending */}
          <TabsContent value="pending" className="flex-1 flex flex-col min-h-0 m-0">
            {/* Add task */}
            <div className="flex gap-2 px-6 py-3 border-b border-border/30">
              <Input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Nova tarefa..."
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask();
                }}
              />
              <Button size="sm" className="h-9 px-3" onClick={handleAddTask} disabled={!newTaskText.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma tarefa pendente
                </div>
              ) : (
                pendingTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="flex-shrink-0 hover:scale-110 transition-transform"
                    >
                      <Circle className="w-4.5 h-4.5 text-muted-foreground hover:text-primary" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{task.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(task.createdAt), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTask(client.id, task.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Completed */}
          <TabsContent value="completed" className="flex-1 flex flex-col min-h-0 m-0">
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
              {completedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma tarefa concluída
                </div>
              ) : (
                completedTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="flex-shrink-0 hover:scale-110 transition-transform"
                      title="Reabrir tarefa"
                    >
                      <RotateCcw className="w-4 h-4 text-success hover:text-warning" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground line-through">{task.description}</p>
                      {task.completedAt && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          Concluída em {format(new Date(task.completedAt), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTask(client.id, task.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
