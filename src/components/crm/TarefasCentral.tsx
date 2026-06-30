import { useMemo, useState, useEffect } from 'react';
import { useClients } from '@/contexts/ClientContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Calendar, Clock, CheckCircle2, UserX, History, Plus, Search, Filter, Sparkles } from 'lucide-react';
import type { Client, Task, TaskInput } from '@/types/client';
import { NewTaskModal } from './NewTaskModal';
import { ClientTaskDrawer } from './ClientTaskDrawer';

type FilterKey = 'attention' | 'overdue' | 'today' | 'next7' | 'completedToday' | 'noTasks' | 'noContact30' | 'all';

interface TarefasCentralProps {
  onEditClient: (client: Client) => void;
}

type ClientStatus = 'urgent' | 'today' | 'scheduled' | 'untracked' | 'done';

interface Row {
  client: Client;
  nextTask: Task | null;
  status: ClientStatus;
  daysSinceContact: number;
}

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function startOfDay(d: Date | string | number) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function daysBetween(a: Date | null | undefined, b: Date) {
  if (!a) return Infinity;
  return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_META: Record<ClientStatus, { label: string; dot: string; badge: string }> = {
  urgent: { label: 'Urgente', dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/30' },
  today: { label: 'Hoje', dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  scheduled: { label: 'Programado', dot: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  untracked: { label: 'Sem acompanhamento', dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' },
  done: { label: 'Em dia', dot: 'bg-success', badge: 'bg-success/10 text-success border-success/30' },
};

export function TarefasCentral({ onEditClient }: TarefasCentralProps) {
  const { clients } = useClients();
  const { user } = useAuth();
  const me = (user?.email?.split('@')[0] ?? '').toLowerCase();

  const [filter, setFilter] = useState<FilterKey>('attention');
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyMine, setOnlyMine] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalClient, setTaskModalClient] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<{ clientId: string; taskId: string; initial: TaskInput } | null>(null);

  const [drawerClientId, setDrawerClientId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const now = new Date();

  // Build rows
  const rows: Row[] = useMemo(() => {
    return clients.map(c => {
      const pending = (c.tasks || []).filter(t => !t.completed);
      // Sort pending: overdue first, then due date asc
      const sortedPending = [...pending].sort((a, b) => {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aDate - bDate;
      });
      const next = sortedPending[0] || null;
      const daysSince = daysBetween(c.lastActivityAt, now);

      let status: ClientStatus = 'done';
      const totalTasks = (c.tasks || []).length;
      if (totalTasks === 0) {
        status = 'untracked';
      } else if (pending.length === 0) {
        status = 'done';
      } else if (next?.dueDate && new Date(next.dueDate) < startOfDay(now)) {
        status = 'urgent';
      } else if (next?.dueDate && isSameDay(new Date(next.dueDate), now)) {
        status = 'today';
      } else if (next) {
        status = 'scheduled';
      }
      // Promote to untracked if no contact > 30 days and no pending tasks
      if (daysSince > 30 && pending.length === 0) status = 'untracked';

      return { client: c, nextTask: next, status, daysSinceContact: daysSince };
    });
  }, [clients, now]);

  // Counters
  const counters = useMemo(() => {
    const overdue = rows.filter(r => r.nextTask?.dueDate && new Date(r.nextTask.dueDate) < startOfDay(now)).length;
    const today = rows.filter(r => r.nextTask?.dueDate && isSameDay(new Date(r.nextTask.dueDate), now)).length;
    const next7 = rows.filter(r => {
      if (!r.nextTask?.dueDate) return false;
      const d = new Date(r.nextTask.dueDate);
      const diff = daysBetween(now, d) * -1;
      return diff > 0 && diff <= 7;
    }).length;
    const completedToday = clients.reduce((acc, c) => acc + (c.tasks || []).filter(t => t.completed && t.completedAt && isSameDay(new Date(t.completedAt), now)).length, 0);
    const noTasks = rows.filter(r => (r.client.tasks || []).length === 0).length;
    const noContact30 = rows.filter(r => r.daysSinceContact > 30).length;
    return { overdue, today, next7, completedToday, noTasks, noContact30 };
  }, [rows, clients, now]);

  // Distinct option lists
  const assignees = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => (c.tasks || []).forEach(t => { if (t.assignee) set.add(t.assignee); }));
    return Array.from(set).sort();
  }, [clients]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => (c.tasks || []).forEach(t => { if (t.category) set.add(t.category); }));
    return Array.from(set).sort();
  }, [clients]);

  // Apply filters
  const filteredRows = useMemo(() => {
    let list = [...rows];

    // Quick filter buttons
    if (filter === 'attention') {
      list = list.filter(r =>
        (r.nextTask?.dueDate && new Date(r.nextTask.dueDate) < startOfDay(now)) ||
        (r.nextTask?.dueDate && isSameDay(new Date(r.nextTask.dueDate), now)) ||
        (r.client.tasks || []).length === 0 ||
        r.daysSinceContact > 30
      );
    } else if (filter === 'overdue') {
      list = list.filter(r => r.nextTask?.dueDate && new Date(r.nextTask.dueDate) < startOfDay(now));
    } else if (filter === 'today') {
      list = list.filter(r => r.nextTask?.dueDate && isSameDay(new Date(r.nextTask.dueDate), now));
    } else if (filter === 'next7') {
      list = list.filter(r => {
        if (!r.nextTask?.dueDate) return false;
        const diff = daysBetween(now, new Date(r.nextTask.dueDate)) * -1;
        return diff > 0 && diff <= 7;
      });
    } else if (filter === 'completedToday') {
      list = list.filter(r => (r.client.tasks || []).some(t => t.completed && t.completedAt && isSameDay(new Date(t.completedAt), now)));
    } else if (filter === 'noTasks') {
      list = list.filter(r => (r.client.tasks || []).length === 0);
    } else if (filter === 'noContact30') {
      list = list.filter(r => r.daysSinceContact > 30);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.client.name.toLowerCase().includes(q) ||
        r.nextTask?.description?.toLowerCase().includes(q) ||
        r.nextTask?.title?.toLowerCase().includes(q)
      );
    }
    if (assigneeFilter !== 'all') list = list.filter(r => r.nextTask?.assignee === assigneeFilter);
    if (priorityFilter !== 'all') list = list.filter(r => r.nextTask?.priority === priorityFilter);
    if (categoryFilter !== 'all') list = list.filter(r => r.nextTask?.category === categoryFilter);
    if (onlyMine && me) list = list.filter(r => (r.nextTask?.assignee || '').toLowerCase() === me);

    // Final ordering: overdue > today > untracked > scheduled > done
    const rank = (s: ClientStatus) => ({ urgent: 0, today: 1, untracked: 2, scheduled: 3, done: 4 }[s]);
    list.sort((a, b) => {
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
      const ad = a.nextTask?.dueDate ? new Date(a.nextTask.dueDate).getTime() : Infinity;
      const bd = b.nextTask?.dueDate ? new Date(b.nextTask.dueDate).getTime() : Infinity;
      return ad - bd;
    });
    return list;
  }, [rows, filter, search, assigneeFilter, priorityFilter, categoryFilter, onlyMine, me, now]);

  const handleOpenDrawer = (clientId: string) => {
    setDrawerClientId(clientId);
    setDrawerOpen(true);
  };

  const handleCreateTask = (clientId: string) => {
    setEditingTask(null);
    setTaskModalClient(clientId);
    setTaskModalOpen(true);
  };

  const handleEditTask = (clientId: string, t: Task) => {
    setEditingTask({
      clientId,
      taskId: t.id,
      initial: {
        description: t.description,
        title: t.title ?? null,
        dueDate: t.dueDate ?? null,
        priority: t.priority ?? null,
        category: t.category ?? null,
        assignee: t.assignee ?? null,
        notes: t.notes ?? null,
      },
    });
    setTaskModalClient(clientId);
    setTaskModalOpen(true);
  };

  const handleCompleteAndNext = (currentClientId: string) => {
    const idx = filteredRows.findIndex(r => r.client.id === currentClientId);
    const next = filteredRows[idx + 1] || filteredRows[0];
    if (next && next.client.id !== currentClientId) {
      setDrawerClientId(next.client.id);
    } else {
      setDrawerOpen(false);
    }
  };

  const cards: { key: FilterKey; label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
    { key: 'overdue', label: 'Tarefas Atrasadas', value: counters.overdue, icon: AlertCircle, tone: 'text-destructive' },
    { key: 'today', label: 'Tarefas para Hoje', value: counters.today, icon: Clock, tone: 'text-yellow-600' },
    { key: 'next7', label: 'Próximos 7 Dias', value: counters.next7, icon: Calendar, tone: 'text-blue-600' },
    { key: 'completedToday', label: 'Concluídas Hoje', value: counters.completedToday, icon: CheckCircle2, tone: 'text-success' },
    { key: 'noTasks', label: 'Clientes sem Tarefas', value: counters.noTasks, icon: UserX, tone: 'text-muted-foreground' },
    { key: 'noContact30', label: 'Sem Contato > 30d', value: counters.noContact30, icon: History, tone: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Central de Tarefas</h2>
          <p className="text-sm text-muted-foreground">Caixa de entrada operacional: foque no que precisa de atenção hoje.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={filter === 'attention' ? 'default' : 'outline'} onClick={() => setFilter('attention')} className="gap-1">
            <Sparkles className="w-4 h-4" /> Precisa da Minha Atenção
          </Button>
          <Button onClick={() => handleCreateTask('')} className="gap-1"><Plus className="w-4 h-4" /> Nova Tarefa</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`text-left rounded-lg border ${active ? 'border-primary ring-2 ring-primary/20' : 'border-border'} bg-card hover:bg-muted/30 transition-colors p-4`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                <Icon className={`w-4 h-4 ${c.tone}`} />
              </div>
              <div className={`text-2xl font-bold mt-2 ${c.tone}`}>{c.value}</div>
            </button>
          );
        })}
      </div>

      {/* Filters bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar cliente ou tarefa..." className="pl-9" />
            </div>

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos responsáveis</SelectItem>
                {assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                {['Urgente', 'Alta', 'Média', 'Baixa'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 ml-auto">
              <Button size="sm" variant={onlyMine ? 'default' : 'outline'} onClick={() => setOnlyMine(true)}>Minha Fila</Button>
              <Button size="sm" variant={!onlyMine ? 'default' : 'outline'} onClick={() => setOnlyMine(false)}>Todos os Clientes</Button>
              <Button size="sm" variant="ghost" onClick={() => { setFilter('all'); setSearch(''); setAssigneeFilter('all'); setPriorityFilter('all'); setCategoryFilter('all'); setOnlyMine(false); }} className="gap-1">
                <Filter className="w-3.5 h-3.5" /> Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Próxima ação</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3 text-right">Patrimônio</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Nenhum cliente encontrado para os filtros atuais.</td></tr>
              )}
              {filteredRows.map(r => {
                const meta = STATUS_META[r.status];
                const due = r.nextTask?.dueDate ? new Date(r.nextTask.dueDate) : null;
                const isOverdue = due && due < startOfDay(now);
                const isToday = due && isSameDay(due, now);
                const dueLabel = !r.nextTask
                  ? `Último contato ${r.daysSinceContact === Infinity ? '—' : `há ${r.daysSinceContact} dias`}`
                  : due
                    ? (isToday ? 'Hoje' : isOverdue ? `Atrasada (${Math.abs(daysBetween(now, due))}d)` : due.toLocaleDateString('pt-BR'))
                    : 'Sem data';
                const highlight = r.status === 'untracked' || r.status === 'urgent';
                return (
                  <tr
                    key={r.client.id}
                    onClick={() => handleOpenDrawer(r.client.id)}
                    className={`border-b border-border cursor-pointer hover:bg-muted/30 transition-colors ${highlight ? 'bg-muted/10' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${meta.dot}`} />
                        <span className="truncate">{r.client.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/90 max-w-[280px]">
                      {r.nextTask ? (
                        <div className="truncate">
                          {r.nextTask.title || r.nextTask.description}
                          {r.nextTask.priority && (
                            <Badge variant="outline" className="ml-2 text-[10px] align-middle">{r.nextTask.priority}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic flex items-center gap-2">
                          Nenhuma tarefa cadastrada
                          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleCreateTask(r.client.id); }}>
                            <Plus className="w-3 h-3 mr-1" /> Criar tarefa
                          </Button>
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-destructive font-medium' : isToday ? 'text-yellow-700 font-medium' : 'text-muted-foreground'}`}>
                      {dueLabel}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatBRL(Number(r.client.financialAssets) || 0)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.nextTask?.assignee || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${meta.badge}`}>{meta.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <NewTaskModal
        open={taskModalOpen}
        onOpenChange={(v) => { setTaskModalOpen(v); if (!v) setEditingTask(null); }}
        defaultClientId={taskModalClient}
        editing={editingTask}
      />

      <ClientTaskDrawer
        clientId={drawerClientId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreateTask={handleCreateTask}
        onEditTask={handleEditTask}
        onOpenClient={(id) => {
          const c = clients.find(cc => cc.id === id);
          if (c) { setDrawerOpen(false); onEditClient(c); }
        }}
        onCompleteAndNext={handleCompleteAndNext}
      />
    </div>
  );
}
