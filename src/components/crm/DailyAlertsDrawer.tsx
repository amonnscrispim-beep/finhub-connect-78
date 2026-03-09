import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Priority = 'alta' | 'media' | 'baixa';

interface DailyTask {
  id: string;
  title: string;
  priority: Priority;
  time: string;
  completed: boolean;
}

interface DailyAlertsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: DailyTask[];
  onTasksChange: (tasks: DailyTask[]) => void;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta: { label: 'Alta', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  media: { label: 'Média', className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  baixa: { label: 'Baixa', className: 'bg-green-500/15 text-green-600 border-green-500/30' },
};

export function DailyAlertsDrawer({ open, onOpenChange, tasks, onTasksChange }: DailyAlertsDrawerProps) {
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('media');
  const [newTime, setNewTime] = useState('');

  const sortedTasks = useMemo(() => {
    const pending = tasks.filter(t => !t.completed);
    const completed = tasks.filter(t => t.completed);
    return [...pending, ...completed];
  }, [tasks]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const task: DailyTask = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      priority: newPriority,
      time: newTime || 'Hoje',
      completed: false,
    };
    onTasksChange([...tasks, task]);
    setNewTitle('');
    setNewPriority('media');
    setNewTime('');
    setShowForm(false);
  };

  const toggleComplete = (id: string) => {
    onTasksChange(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    onTasksChange(tasks.filter(t => t.id !== id));
  };

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-bold">Alertas Diários</SheetTitle>
              <p className="text-sm text-muted-foreground capitalize mt-1">{today}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} className="mt-3 w-full">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {showForm && (
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3 mb-4">
              <Input
                placeholder="Título da tarefa"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <div className="flex gap-2">
                <Select value={newPriority} onValueChange={v => setNewPriority(v as Priority)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Horário (ex: 14:00)"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} className="flex-1">Salvar</Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              </div>
            </div>
          )}

          {sortedTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa para hoje.</p>
          )}

          {sortedTasks.map(task => (
            <div
              key={task.id}
              className={`group flex items-center gap-3 p-3 rounded-lg border border-border transition-all hover:bg-muted/30 ${
                task.completed ? 'opacity-50' : ''
              }`}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleComplete(task.id)}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityConfig[task.priority].className}`}>
                    {priorityConfig[task.priority].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{task.time}</span>
                </div>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { DailyTask };
