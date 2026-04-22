import { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWeeklyTasks, type WeeklyTask, type WeeklyTaskPriority } from '@/hooks/useWeeklyTasks';

type Priority = WeeklyTaskPriority;

interface WeeklyAlertsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta: { label: 'Alta', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  media: { label: 'Média', className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  baixa: { label: 'Baixa', className: 'bg-green-500/15 text-green-600 border-green-500/30' },
};

function getTodayDayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  return { start, end };
}

function scheduleNotification(task: WeeklyTask) {
  if (!task.time || task.completed) return;
  if (task.dayIndex !== getTodayDayIndex()) return;

  const match = task.time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return;

  const now = new Date();
  const target = new Date();
  target.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);

  const diff = target.getTime() - now.getTime() - 15 * 60 * 1000;
  if (diff <= 0) return;

  return setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('⏰ Tarefa em 15 minutos', { body: task.title });
    }
  }, diff);
}

export function WeeklyAlertsDrawer({ open, onOpenChange }: WeeklyAlertsDrawerProps) {
  const { tasks, isLoading, addTask, toggleTask, deleteTask, isAdding } = useWeeklyTasks();
  const [selectedDay, setSelectedDay] = useState(getTodayDayIndex);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('media');
  const [newTime, setNewTime] = useState('');
  const [newDay, setNewDay] = useState(String(getTodayDayIndex()));
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (open && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [open]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    tasks.forEach((task) => {
      const timer = scheduleNotification(task);
      if (timer) timersRef.current.push(timer);
    });
    return () => timersRef.current.forEach(clearTimeout);
  }, [tasks]);

  const dayTasks = useMemo(() => {
    const filtered = tasks.filter((t) => t.dayIndex === selectedDay);
    const pending = filtered.filter((t) => !t.completed);
    const completed = filtered.filter((t) => t.completed);
    return [...pending, ...completed];
  }, [tasks, selectedDay]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await addTask({
        title: newTitle.trim(),
        priority: newPriority,
        time: newTime || '',
        dayIndex: parseInt(newDay, 10),
        completed: false,
      });
      setNewTitle('');
      setNewPriority('media');
      setNewTime('');
      setNewDay(String(selectedDay));
      setShowForm(false);
    } catch {
      // Toast already shown in hook
    }
  };

  const handleToggle = async (task: WeeklyTask) => {
    try {
      await toggleTask(task.id, !task.completed);
    } catch {
      // Toast already shown in hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
    } catch {
      // Toast already shown in hook
    }
  };

  const { start, end } = getWeekRange();
  const weekLabel = `${format(start, "dd 'de' MMMM", { locale: ptBR })} — ${format(end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  const todayIndex = getTodayDayIndex();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border space-y-3">
          <div>
            <SheetTitle className="text-lg font-bold">Alertas da Semana</SheetTitle>
            <p className="text-sm text-muted-foreground mt-1">{weekLabel}</p>
          </div>

          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setSelectedDay(i)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  selectedDay === i
                    ? 'bg-[#1e2530] text-white'
                    : i === todayIndex
                    ? 'bg-muted text-foreground ring-1 ring-primary/40'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => { setShowForm(true); setNewDay(String(selectedDay)); }} className="w-full bg-[#1e2530] hover:bg-[#2a3340] text-white">
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
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <div className="flex gap-2">
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newDay} onValueChange={setNewDay}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_LABELS.map((label, i) => (
                      <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="time"
                placeholder="Horário"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={isAdding || !newTitle.trim()} className="flex-1">
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              </div>
            </div>
          )}

          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
            </p>
          )}

          {!isLoading && dayTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma tarefa para {DAY_LABELS[selectedDay]}.
            </p>
          )}

          {dayTasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-center gap-3 p-3 rounded-lg border border-border transition-all hover:bg-muted/30 ${
                task.completed ? 'opacity-50' : ''
              }`}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => handleToggle(task)}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityConfig[task.priority].className}`}>
                    {priorityConfig[task.priority].label}
                  </Badge>
                  {task.time && <span className="text-xs text-muted-foreground">{task.time}</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(task.id)}
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

export type { WeeklyTask };
