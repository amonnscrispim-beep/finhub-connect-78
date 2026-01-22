import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Check, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2,
  RotateCcw,
  Clock
} from 'lucide-react';
import { Client, Task } from '@/types/client';
import { useClients } from '@/contexts/ClientContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  defaultTab?: 'pending' | 'completed';
}

export function TasksModal({ open, onOpenChange, client, defaultTab = 'pending' }: TasksModalProps) {
  const { toggleTask, addTask, deleteTask } = useClients();
  const [newTask, setNewTask] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>(defaultTab);
  const [animatingTasks, setAnimatingTasks] = useState<Set<string>>(new Set());

  // Update activeTab when defaultTab or open changes
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const pendingTasks = client.tasks.filter(t => !t.completed);
  const completedTasks = client.tasks.filter(t => t.completed);

  const handleAddTask = () => {
    if (newTask.trim()) {
      addTask(client.id, newTask.trim());
      setNewTask('');
    }
  };

  const handleToggleTask = (taskId: string) => {
    // Start animation immediately
    setAnimatingTasks(prev => new Set(prev).add(taskId));
    // Toggle task (optimistic update)
    toggleTask(client.id, taskId);
    // Clean up animation state after transition
    setTimeout(() => {
      setAnimatingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 150);
  };

  const formatCompletedAt = (date: Date | null) => {
    if (!date) return '';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tarefas de {client.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'completed')} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pendentes ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-success data-[state=active]:text-success-foreground">
              Realizadas ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {/* Add new task */}
            <div className="flex gap-2 mb-4">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Nova tarefa..."
                className="h-9"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              />
              <Button size="sm" className="h-9 px-3" onClick={handleAddTask} disabled={!newTask.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma tarefa pendente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingTasks.map((task) => {
                    const isAnimating = animatingTasks.has(task.id);
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-all duration-150 group",
                          isAnimating && "opacity-0 scale-95 -translate-x-2"
                        )}
                      >
                        <button 
                          onClick={() => handleToggleTask(task.id)} 
                          className="flex-shrink-0 transition-transform duration-100 hover:scale-110"
                        >
                          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        </button>
                        <span className="text-sm flex-1">{task.description}</span>
                        <button
                          onClick={() => deleteTask(client.id, task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <ScrollArea className="h-[340px] pr-4">
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Circle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma tarefa realizada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {completedTasks.map((task) => {
                    const isAnimating = animatingTasks.has(task.id);
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg bg-success/5 border border-success/20 transition-all duration-150",
                          isAnimating && "opacity-0 scale-95 translate-x-2"
                        )}
                      >
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className="flex-shrink-0 mt-0.5 transition-transform duration-100 hover:scale-110"
                          title="Restaurar tarefa"
                        >
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-through text-muted-foreground">
                            {task.description}
                          </p>
                          {task.completedAt && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>Concluída em {formatCompletedAt(task.completedAt)}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleToggleTask(task.id)}
                          title="Restaurar tarefa"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
