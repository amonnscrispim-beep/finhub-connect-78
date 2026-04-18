import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import React from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { 
  GripVertical, 
  Check, 
  Plus, 
  RefreshCw, 
  TrendingUp,
  MoreHorizontal,
  Edit2,
  Trash2,
  Circle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Award,
  Cake,
  ListTodo,
  CheckCircle2,
  X,
  Calendar,
} from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { Client, FunnelStage, KANBAN_COLUMN_STAGES, PATRIMONY_COLUMNS, Task } from '@/types/client';
import { getStageDisplayLabel, isLegacyStage } from '@/lib/funnel-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TasksModal } from './TasksModal';
import { StageQuickViewDrawer } from './StageQuickViewDrawer';
import { ClientTasksDrawer } from './ClientTasksDrawer';
import { KanbanDndProvider, useKanbanDnd } from './KanbanDndContext';
import { SortableKanbanCard } from './SortableKanbanCard';
import { DroppableColumn } from './DroppableColumn';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { UrgentPendency } from '@/hooks/useUrgentPendencies';

declare const __BUILD_TIME__: string;
declare const __BUILD_MODE__: string;

interface KanbanViewProps {
  onEditClient: (client: Client) => void;
  searchQuery?: string;
  clientIdsWithPendencies?: Set<string>;
  pendencies?: UrgentPendency[];
  pendenciesLoading?: boolean;
  onAddPendency?: (data: { client_id: string; description: string; deadline: string; priority: string }) => Promise<void>;
  onCompletePendency?: (id: string) => Promise<void>;
  onRemovePendency?: (id: string) => Promise<void>;
}

interface KanbanCardProps {
  client: Client;
  onEdit: () => void;
  onCardClick: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  dragHandleProps?: any;
  isDragging?: boolean;
  showPatrimonio?: boolean;
  hasPendency?: boolean;
}

const getCardBorderColor = (client: Client) => {
  if (client.pendingSchedule) return 'border-l-destructive';
  const pendingTasks = client.tasks.filter(t => !t.completed);
  if (client.tasks.length > 0 && pendingTasks.length === 0) return 'border-l-success';
  if (pendingTasks.length > 0) return 'border-l-warning';
  return 'border-l-primary';
};

const isBirthdayToday = (birthDate: Date | null): boolean => {
  if (!birthDate) return false;
  const today = new Date();
  const birth = new Date(birthDate);
  return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate();
};

const getPatrimonioValue = (c: Client) => {
  if (c.patrimonioFinanceiroLiquido != null && c.patrimonioFinanceiroLiquido > 0) return c.patrimonioFinanceiroLiquido;
  const diag = (c.strategicDiagnostic as any)?.estruturaPatrimonial;
  if (diag?.liquidFinancialAssets) {
    const val = typeof diag.liquidFinancialAssets === 'number' ? diag.liquidFinancialAssets 
      : parseFloat(String(diag.liquidFinancialAssets).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  if (c.financialAssets > 0) return c.financialAssets;
  return 0;
};

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
};

const formatCurrencyFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const KanbanCardComponent = memo(function KanbanCard({ 
  client, onEdit, onCardClick, onMoveUp, onMoveDown, canMoveUp = false, canMoveDown = false, dragHandleProps, isDragging, showPatrimonio = false, hasPendency = false,
}: KanbanCardProps) {
  const { toggleTask, addTask, deleteClient, deleteTask } = useClients();
  const [newTask, setNewTask] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const [tasksModalTab, setTasksModalTab] = useState<'pending' | 'completed'>('pending');
  const [animatingTasks, setAnimatingTasks] = useState<Set<string>>(new Set());

  const handleAddTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newTask.trim()) {
      addTask(client.id, newTask.trim());
      setNewTask('');
      setShowAddTask(false);
    }
  };

  const pendingTasks = client.tasks.filter(t => !t.completed);
  const completedTasksCount = client.tasks.filter(t => t.completed).length;
  const totalTasks = client.tasks.length;
  const borderColor = getCardBorderColor(client);
  const hasBirthday = isBirthdayToday(client.birthDate);

  const handleHeaderClick = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(); };
  const handleBodyClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('[data-drag-handle]') || target.closest('[role="menu"]') || target.closest('[data-radix-collection-item]')) return;
    onCardClick();
  };

  const openTasksModal = (e: React.MouseEvent, tab: 'pending' | 'completed') => {
    e.stopPropagation(); e.preventDefault();
    setTasksModalTab(tab); setTasksModalOpen(true);
  };

  const patrimonio = showPatrimonio ? getPatrimonioValue(client) : 0;

  return (
    <div
      className={cn(
        "group bg-card rounded-md p-4 shadow-sm border border-slate-200 dark:border-slate-800 border-l-2 transition-all duration-200 hover:shadow-md cursor-pointer",
        borderColor,
        client.pendingSchedule && "ring-1 ring-red-900/30",
        isDragging && "shadow-xl scale-[1.02] cursor-grabbing"
      )}
      onClick={handleBodyClick}
    >
      {hasBirthday && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-pink-500/10 rounded-md border border-pink-500/20">
          <Cake className="w-3.5 h-3.5 text-pink-500" />
          <span className="text-xs font-medium text-pink-600">🎉 Aniversário hoje!</span>
        </div>
      )}
      {client.pendingSchedule && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-destructive/10 rounded-md border border-destructive/20">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">Agendamento Pendente</span>
        </div>
      )}
      {hasPendency && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-orange-500/10 rounded-md border border-orange-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          <span className="text-xs font-medium text-orange-700">⚠️ Pendência Urgente</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div 
          {...(dragHandleProps || {})}
          data-drag-handle="true"
          className={cn("flex items-center mr-2 flex-shrink-0 transition-opacity cursor-grab active:cursor-grabbing select-none", "opacity-40 group-hover:opacity-100", isDragging && "cursor-grabbing")}
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <h4 className="font-semibold text-foreground leading-tight truncate cursor-pointer hover:text-primary transition-colors flex-1 min-w-0" onClick={handleHeaderClick}>
              {client.name}
            </h4>
            <div className="flex items-center gap-0 flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }} disabled={!canMoveUp} className={cn("p-0.5 rounded hover:bg-muted transition-colors", canMoveUp ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-default")} title="Mover para cima">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }} disabled={!canMoveDown} className={cn("p-0.5 rounded hover:bg-muted transition-colors", canMoveDown ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-default")} title="Mover para baixo">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            {client.isRenewedClient && (
              <div className="p-0.5 rounded-full bg-amber-500/20 flex-shrink-0" title="Cliente Renovado">
                <Award className="w-3.5 h-3.5 text-amber-500" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate cursor-pointer hover:text-muted-foreground/80" onClick={handleHeaderClick}>
            {client.profession}
          </p>
        </div>
        
        <div className="flex items-center gap-1">
          {client.renewed && <div className="p-1 rounded-full bg-success/10" title="Renovado"><RefreshCw className="w-3 h-3 text-success" /></div>}
          {client.renewalPotential && !client.renewed && <div className="p-1 rounded-full bg-warning/10" title="Potencial de renovação"><TrendingUp className="w-3 h-3 text-warning" /></div>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={onEdit}><Edit2 className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteClient(client.id)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Patrimônio badge */}
      {showPatrimonio && patrimonio > 0 && (
        <div className="mb-2 text-xs font-semibold text-blue-900 dark:text-blue-200 bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded inline-block">
          {formatCurrencyFull(patrimonio)}
        </div>
      )}

      {client.objective && (
        <div className="mb-3 p-2 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Objetivo:</span> {client.objective}</p>
        </div>
      )}

      {pendingTasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={(e) => openTasksModal(e, 'pending')} className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline transition-colors">
              Tarefas pendentes ({pendingTasks.length})
            </button>
            {completedTasksCount > 0 && (
              <button onClick={(e) => openTasksModal(e, 'completed')} className="text-xs text-success hover:text-success/80 hover:underline transition-colors">
                {completedTasksCount} concluída{completedTasksCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {pendingTasks.slice(0, 3).map((task) => {
              const isAnimating = animatingTasks.has(task.id);
              return (
                <div key={task.id} className={cn("flex items-center gap-2 group/task p-1.5 rounded-md hover:bg-muted/50 transition-all duration-150", isAnimating && "opacity-0 scale-95 -translate-x-2")}>
                  <button onClick={(e) => { e.stopPropagation(); setAnimatingTasks(prev => new Set(prev).add(task.id)); toggleTask(client.id, task.id); setTimeout(() => { setAnimatingTasks(prev => { const next = new Set(prev); next.delete(task.id); return next; }); }, 150); }} className="flex-shrink-0 transition-transform duration-100 hover:scale-110">
                    <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </button>
                  <span className="text-xs flex-1 text-foreground">{task.description}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(client.id, task.id); }} className="opacity-0 group-hover/task:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              );
            })}
            {pendingTasks.length > 3 && (
              <button onClick={(e) => openTasksModal(e, 'pending')} className="w-full text-left px-1.5 py-1 text-xs text-primary hover:text-primary/80 hover:underline flex items-center gap-1">
                <ListTodo className="w-3 h-3" />+{pendingTasks.length - 3} mais tarefas
              </button>
            )}
          </div>
        </div>
      )}

      {pendingTasks.length === 0 && completedTasksCount > 0 && (
        <div className="mb-3">
          <button onClick={(e) => openTasksModal(e, 'completed')} className="w-full text-left px-2 py-1.5 text-xs text-success bg-success/10 rounded-md hover:bg-success/20 transition-colors flex items-center gap-1.5">
            <ListTodo className="w-3.5 h-3.5" />{completedTasksCount} tarefa{completedTasksCount > 1 ? 's' : ''} concluída{completedTasksCount > 1 ? 's' : ''}
          </button>
        </div>
      )}

      <div>
        {showAddTask ? (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nova tarefa..." className="h-8 text-xs" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handleAddTask(e as unknown as React.MouseEvent); }} autoFocus />
            <Button size="sm" className="h-8 px-2" onClick={handleAddTask}><Check className="w-3 h-3" /></Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={(e) => { e.stopPropagation(); setShowAddTask(true); }}>
            <Plus className="w-3 h-3 mr-1" />Adicionar tarefa
          </Button>
        )}
      </div>

      {totalTasks > 0 && (
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-success transition-all duration-300 rounded-full" style={{ width: `${(completedTasksCount / totalTasks) * 100}%` }} />
        </div>
      )}

      <TasksModal open={tasksModalOpen} onOpenChange={setTasksModalOpen} client={client} defaultTab={tasksModalTab} />
    </div>
  );
});

const KanbanCard = memo(KanbanCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.client.id === nextProps.client.id &&
    prevProps.client.funnelStage === nextProps.client.funnelStage &&
    prevProps.client.kanbanOrder === nextProps.client.kanbanOrder &&
    prevProps.client.name === nextProps.client.name &&
    prevProps.client.profession === nextProps.client.profession &&
    prevProps.client.objective === nextProps.client.objective &&
    prevProps.client.pendingSchedule === nextProps.client.pendingSchedule &&
    prevProps.client.renewed === nextProps.client.renewed &&
    prevProps.client.renewalPotential === nextProps.client.renewalPotential &&
    prevProps.client.isRenewedClient === nextProps.client.isRenewedClient &&
    prevProps.client.birthDate?.getTime() === nextProps.client.birthDate?.getTime() &&
    prevProps.client.tasks.length === nextProps.client.tasks.length &&
    prevProps.client.tasks.filter(t => t.completed).length === nextProps.client.tasks.filter(t => t.completed).length &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.canMoveUp === nextProps.canMoveUp &&
    prevProps.canMoveDown === nextProps.canMoveDown &&
    prevProps.showPatrimonio === nextProps.showPatrimonio &&
    prevProps.hasPendency === nextProps.hasPendency &&
    JSON.stringify(prevProps.client.tasks.map(t => ({ id: t.id, completed: t.completed }))) ===
    JSON.stringify(nextProps.client.tasks.map(t => ({ id: t.id, completed: t.completed })))
  );
});

function DragOverlayCard({ client }: { client: Client }) {
  const borderColor = getCardBorderColor(client);
  return (
    <div className={cn("bg-card rounded-xl p-4 shadow-2xl border border-border/50 border-l-4 w-80 rotate-2 cursor-grabbing", borderColor)}>
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground leading-tight truncate">{client.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{client.profession}</p>
        </div>
      </div>
    </div>
  );
}

// Column color mapping — BTG / Wealth Management institutional palette
// Solid header colors (used as a colored chip/bar at the top of each column header)
const COLUMN_HEADER: Record<string, string> = {
  'PRIVATE': 'bg-slate-900 text-amber-400 dark:bg-slate-950 dark:text-amber-300',
  'SELECT':  'bg-blue-900 text-white dark:bg-blue-950 dark:text-blue-100',
  'GROWTH':  'bg-slate-600 text-white dark:bg-slate-700 dark:text-slate-100',
  'START':   'bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-100',
};

// Soft column container (neutral, sober)
const COLUMN_BG: Record<string, string> = {
  'PRIVATE': 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
  'SELECT':  'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
  'GROWTH':  'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
  'START':   'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
};

const PRIORITY_CONFIG: Record<string, { label: string; emoji: string; className: string }> = {
  alta: { label: 'Alta', emoji: '🔴', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  media: { label: 'Média', emoji: '🟡', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  baixa: { label: 'Baixa', emoji: '🟢', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
};

function formatRelativeDeadline(deadline: string): string {
  const date = new Date(deadline + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Vencida há ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? 's' : ''}`;
  if (diff === 0) return 'Vence hoje';
  if (diff === 1) return 'Vence amanhã';
  return `Vence em ${diff} dias`;
}

function isDeadlineOverdue(deadline: string): boolean {
  const d = new Date(deadline + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function PendenciasUrgentesColumn({ pendencies, pendenciesLoading, animatingPendencyId, onOpenModal, onComplete, onRemove }: {
  pendencies: UrgentPendency[];
  pendenciesLoading: boolean;
  animatingPendencyId: string | null;
  onOpenModal: () => void;
  onComplete: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-lg min-h-[500px] w-80 flex-shrink-0 border border-red-900/30 dark:border-red-900/50 bg-slate-50 dark:bg-slate-900/40 shadow-sm overflow-hidden flex flex-col">
      {/* Header — bordô institucional */}
      <div className="bg-red-900 dark:bg-red-950 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white" />
          <h3 className="font-semibold text-sm text-white tracking-wider uppercase">
            PENDÊNCIAS URGENTES ({pendencies.length})
          </h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-white hover:bg-white/15"
          onClick={onOpenModal}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova
        </Button>
      </div>

      <div className="p-3 space-y-3">
        {pendenciesLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : pendencies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-xl">
            Nenhuma pendência ativa
          </div>
        ) : (
          pendencies.map(p => {
            const overdue = isDeadlineOverdue(p.deadline);
            const priorityCfg = PRIORITY_CONFIG[p.priority] || PRIORITY_CONFIG.media;
            return (
              <div
                key={p.id}
                className={cn(
                  "bg-card rounded-xl p-3 border shadow-sm transition-all duration-300",
                  overdue && "bg-destructive/5 border-destructive/30",
                  animatingPendencyId === p.id && "opacity-0 scale-95 -translate-x-4"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">{p.client_name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{p.client_profession}</p>
                  </div>
                  <Badge className={cn("text-[10px] px-1.5 py-0 border", priorityCfg.className)}>
                    {priorityCfg.emoji} {priorityCfg.label}
                  </Badge>
                </div>
                <p className="text-xs text-foreground mb-2 line-clamp-2">{p.description}</p>
                <div className="flex items-center justify-between">
                  <span className={cn("text-[11px] font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
                    {formatRelativeDeadline(p.deadline)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onComplete(p.id)} className="p-1 rounded hover:bg-success/20 transition-colors" title="Concluir">
                      <Check className="w-4 h-4 text-success" />
                    </button>
                    <button onClick={() => onRemove(p.id)} className="p-1 rounded hover:bg-destructive/20 transition-colors" title="Remover">
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PendencyAddModal({ open, onOpenChange, clients, clientId, setClientId, clientSearch, setClientSearch, description, setDescription, deadline, setDeadline, priority, setPriority, isSaving, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: Client[];
  clientId: string;
  setClientId: (v: string) => void;
  clientSearch: string;
  setClientSearch: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  deadline: Date | undefined;
  setDeadline: (v: Date | undefined) => void;
  priority: string;
  setPriority: (v: string) => void;
  isSaving: boolean;
  onSave: () => void;
}) {
  const activeClients = clients.filter(c => !c.consultingFinished);
  const filteredClients = clientSearch
    ? activeClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : activeClients;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Pendência Urgente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input placeholder="Buscar cliente..." value={clientSearch} onChange={e => { setClientSearch(e.target.value); setClientId(''); }} />
            {clientSearch && !clientId && (
              <div className="max-h-32 overflow-y-auto border rounded-md bg-popover">
                {filteredClients.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                ) : (
                  filteredClients.slice(0, 8).map(c => (
                    <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors" onClick={() => { setClientId(c.id); setClientSearch(c.name); }}>
                      {c.name} <span className="text-muted-foreground">— {c.profession}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Pendência</Label>
            <Textarea placeholder="Ex: Investir 20 mil na liquidez diária" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Data limite</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={deadline} onSelect={setDeadline} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">🔴 Alta</SelectItem>
                <SelectItem value="media">🟡 Média</SelectItem>
                <SelectItem value="baixa">🟢 Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={onSave} disabled={!clientId || !description.trim() || !deadline || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Pendência'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KanbanContent({ onEditClient, searchQuery = '', clientIdsWithPendencies = new Set(), pendencies = [], pendenciesLoading = false, onAddPendency, onCompletePendency, onRemovePendency }: KanbanViewProps) {
  const { clients, moveClientToStage, swapClientOrder, setReorderingFlag, updateClient, refetch } = useClients();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [pendencyModalOpen, setPendencyModalOpen] = useState(false);
  const [animatingPendencyId, setAnimatingPendencyId] = useState<string | null>(null);
  const [pendencyClientId, setPendencyClientId] = useState('');
  const [pendencyDescription, setPendencyDescription] = useState('');
  const [pendencyDeadline, setPendencyDeadline] = useState<Date | undefined>(undefined);
  const [pendencyPriority, setPendencyPriority] = useState('media');
  const [pendencyClientSearch, setPendencyClientSearch] = useState('');
  const [isSavingPendency, setIsSavingPendency] = useState(false);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStage, setDrawerStage] = useState<FunnelStage | null>(null);
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [tasksDrawerClient, setTasksDrawerClient] = useState<Client | null>(null);
  
  const { activeClient } = useKanbanDnd();

  // Auto-distribute clients into PRIVATE/SELECT/GROWTH/START by exact slice rules
  const handleAutoDistribute = useCallback(async () => {
    setIsAutoFilling(true);
    try {
      const activeClients = clients.filter(c => !c.consultingFinished);

      // Rank by patrimônio descending
      const withPatrimonio = activeClients
        .map(c => ({ id: c.id, value: getPatrimonioValue(c) }))
        .filter(x => x.value > 0)
        .sort((a, b) => b.value - a.value);

      const withoutPatrimonio = activeClients
        .filter(c => getPatrimonioValue(c) <= 0 && c.funnelStage !== 'Em atendimento');

      // Exact slice rules:
      // PRIVATE: slice(0, 10)  -> Top 10
      // SELECT:  slice(10, 20) -> 11º a 20º
      // GROWTH:  slice(20, 40) -> 21º a 40º
      // START:   slice(40)     -> 41º em diante + clientes sem patrimônio
      const privateSlice = withPatrimonio.slice(0, 10);
      const selectSlice = withPatrimonio.slice(10, 20);
      const growthSlice = withPatrimonio.slice(20, 40);
      const startFromPatrimony = withPatrimonio.slice(40);

      const updates: { id: string; stage: FunnelStage; order: number }[] = [];

      privateSlice.forEach((c, i) => updates.push({ id: c.id, stage: 'PRIVATE', order: (i + 1) * 1000 }));
      selectSlice.forEach((c, i) => updates.push({ id: c.id, stage: 'SELECT', order: (i + 1) * 1000 }));
      growthSlice.forEach((c, i) => updates.push({ id: c.id, stage: 'GROWTH', order: (i + 1) * 1000 }));

      // START = restante por patrimônio (mantém ordem decrescente) + clientes sem patrimônio depois
      let startIdx = 0;
      startFromPatrimony.forEach((c) => {
        updates.push({ id: c.id, stage: 'START', order: (++startIdx) * 1000 });
      });
      withoutPatrimonio.forEach((c) => {
        updates.push({ id: c.id, stage: 'START', order: (++startIdx) * 1000 });
      });

      // Save previous_funnel_stage and update
      for (const u of updates) {
        const client = activeClients.find(c => c.id === u.id);
        const prevStage = client?.funnelStage || null;
        await supabase.from('clients').update({
          previous_funnel_stage: prevStage,
          funnel_stage: u.stage,
          kanban_order: u.order,
        } as any).eq('id', u.id);
      }

      setTimeout(() => refetch(), 200);
      toast.success(`Clientes redistribuídos! PRIVATE: ${privateSlice.length} | SELECT: ${selectSlice.length} | GROWTH: ${growthSlice.length} | START: ${startFromPatrimony.length + withoutPatrimonio.length}.`);
    } catch (err) {
      toast.error('Erro ao redistribuir clientes');
      console.error(err);
    } finally {
      setIsAutoFilling(false);
    }
  }, [clients, refetch]);
  
  const handleColumnHeaderClick = useCallback((stage: FunnelStage) => {
    setDrawerStage(stage);
    setDrawerOpen(true);
  }, []);

  const handleCardClick = useCallback((client: Client) => {
    setTasksDrawerClient(client);
    setTasksDrawerOpen(true);
  }, []);

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT' || activeElement.getAttribute('contenteditable') === 'true');
    if (isInputFocused) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); container.scrollBy({ left: 400, behavior: 'smooth' }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); container.scrollBy({ left: -400, behavior: 'smooth' }); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const scrollLeft = () => scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  // Group clients by new columns
  const clientsByStage = useMemo(() => {
    const grouped: Record<string, Client[]> = {};
    const query = searchQuery.trim().toLowerCase();
    
    KANBAN_COLUMN_STAGES.forEach(stage => { grouped[stage] = []; });
    
    clients.forEach(client => {
      if (client.consultingFinished) return;
      if (client.funnelStage === 'Em atendimento') return; // Shown in separate drawer
      
      if (query) {
        const matches = client.name.toLowerCase().includes(query) || client.profession.toLowerCase().includes(query) || client.objective.toLowerCase().includes(query);
        if (!matches) return;
      }
      
      // Map client to column: if funnelStage is one of the new 6, use it directly
      // If it's a legacy stage, put in START (they haven't been redistributed yet)
      const stage = client.funnelStage as string;
      if (grouped[stage] !== undefined) {
        grouped[stage].push(client);
      } else {
        // Legacy stage → START
        grouped['START'].push(client);
      }
    });

    // Sort by kanbanOrder
    KANBAN_COLUMN_STAGES.forEach(stage => {
      grouped[stage].sort((a, b) => {
        const orderA = a.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });
    });
    
    return grouped;
  }, [clients, searchQuery]);

  const currentDrawerClient = useMemo(() => {
    if (!tasksDrawerClient) return null;
    return clients.find(c => c.id === tasksDrawerClient.id) ?? tasksDrawerClient;
  }, [clients, tasksDrawerClient]);

  // Handle arrow move up/down within same column
  const handleMoveUp = useCallback((clientId: string, stage: string) => {
    const stageClients = clientsByStage[stage];
    const idx = stageClients.findIndex(c => c.id === clientId);
    if (idx <= 0) return;
    setReorderingFlag(true);
    swapClientOrder(clientId, stageClients[idx - 1].id);
  }, [clientsByStage, swapClientOrder, setReorderingFlag]);

  const handleMoveDown = useCallback((clientId: string, stage: string) => {
    const stageClients = clientsByStage[stage];
    const idx = stageClients.findIndex(c => c.id === clientId);
    if (idx < 0 || idx >= stageClients.length - 1) return;
    setReorderingFlag(true);
    swapClientOrder(clientId, stageClients[idx + 1].id);
  }, [clientsByStage, swapClientOrder, setReorderingFlag]);

  // Calculate patrimônio sum per column
  const columnPatrimonioSums = useMemo(() => {
    const sums: Record<string, number> = {};
    PATRIMONY_COLUMNS.forEach(col => {
      sums[col] = (clientsByStage[col] || []).reduce((sum, c) => sum + getPatrimonioValue(c), 0);
    });
    return sums;
  }, [clientsByStage]);

  const isPatrimonyColumn = (stage: string) => PATRIMONY_COLUMNS.includes(stage as FunnelStage);

  return (
    <div className="relative">
      {canScrollLeft && (
        <button onClick={scrollLeft} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-card/95 backdrop-blur-sm border rounded-full shadow-lg hover:bg-muted transition-all hover:scale-110">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button onClick={scrollRight} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-card/95 backdrop-blur-sm border rounded-full shadow-lg hover:bg-muted transition-all hover:scale-110">
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Auto-distribute button */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleAutoDistribute}
          disabled={isAutoFilling}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAutoFilling ? 'animate-spin' : ''}`} />
          {isAutoFilling ? 'Redistribuindo...' : 'Resetar para automático'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Distribui por patrimônio: PRIVATE (Top 10) → SELECT (11-20) → GROWTH (21-40) → START (Demais)
        </span>
      </div>

      <div ref={scrollContainerRef} onScroll={checkScrollability} className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <div className="flex gap-4 p-4 min-w-max">
          {KANBAN_COLUMN_STAGES.map((stage, stageIndex) => {
            const stageClients = clientsByStage[stage] || [];
            const clientIds = stageClients.map(c => c.id);
            const isPatrimony = isPatrimonyColumn(stage);
            const patrimonioSum = columnPatrimonioSums[stage] || 0;
            const columnBg = COLUMN_BG[stage] || 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800';
            const headerColor = COLUMN_HEADER[stage] || 'bg-slate-700 text-white';

            // Insert Pendências Urgentes column after GROWTH (index of GROWTH in the array)
            const growthIndex = KANBAN_COLUMN_STAGES.indexOf('GROWTH' as FunnelStage);
            const renderPendenciasAfter = stageIndex === growthIndex;
            
            return (
              <React.Fragment key={stage}>
                <div className={cn("rounded-lg min-h-[500px] w-80 flex-shrink-0 border shadow-sm overflow-hidden flex flex-col", columnBg)}>
                  {/* Column Header — solid institutional bar */}
                  <button
                    onClick={() => handleColumnHeaderClick(stage)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 hover:opacity-90 transition-opacity cursor-pointer",
                      headerColor
                    )}
                  >
                    <h3 className="font-semibold text-sm tracking-wider uppercase">{getStageDisplayLabel(stage)}</h3>
                    <div className="flex items-center gap-2">
                      {isPatrimony && patrimonioSum > 0 && (
                        <span className="text-xs font-medium opacity-90">
                          {formatCurrency(patrimonioSum)}
                        </span>
                      )}
                      <span className="text-xs font-semibold bg-white/15 px-2 py-0.5 rounded">
                        {stageClients.length}
                      </span>
                    </div>
                  </button>

                  <div className="p-3 flex-1">

                  <DroppableColumn stage={stage} clientIds={clientIds}>
                    {stageClients.map((client, index) => (
                      <SortableKanbanCard key={client.id} client={client}>
                        <KanbanCard
                          client={client}
                          onEdit={() => onEditClient(client)}
                          onCardClick={() => handleCardClick(client)}
                          onMoveUp={() => handleMoveUp(client.id, stage)}
                          onMoveDown={() => handleMoveDown(client.id, stage)}
                          canMoveUp={index > 0}
                          canMoveDown={index < stageClients.length - 1}
                          showPatrimonio={isPatrimony}
                          hasPendency={clientIdsWithPendencies.has(client.id)}
                        />
                      </SortableKanbanCard>
                    ))}

                    {stageClients.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-xl">
                        Nenhum cliente
                      </div>
                    )}
                  </DroppableColumn>
                  </div>
                </div>

                {renderPendenciasAfter && (
                  <PendenciasUrgentesColumn
                    pendencies={pendencies}
                    pendenciesLoading={pendenciesLoading}
                    animatingPendencyId={animatingPendencyId}
                    onOpenModal={() => setPendencyModalOpen(true)}
                    onComplete={(id) => {
                      setAnimatingPendencyId(id);
                      setTimeout(async () => {
                        await onCompletePendency?.(id);
                        setAnimatingPendencyId(null);
                      }, 300);
                    }}
                    onRemove={(id) => onRemovePendency?.(id)}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Pendency Add Modal */}
      <PendencyAddModal
        open={pendencyModalOpen}
        onOpenChange={setPendencyModalOpen}
        clients={clients}
        clientId={pendencyClientId}
        setClientId={setPendencyClientId}
        clientSearch={pendencyClientSearch}
        setClientSearch={setPendencyClientSearch}
        description={pendencyDescription}
        setDescription={setPendencyDescription}
        deadline={pendencyDeadline}
        setDeadline={setPendencyDeadline}
        priority={pendencyPriority}
        setPriority={setPendencyPriority}
        isSaving={isSavingPendency}
        onSave={async () => {
          if (!pendencyClientId || !pendencyDescription.trim() || !pendencyDeadline || !onAddPendency) return;
          setIsSavingPendency(true);
          await onAddPendency({
            client_id: pendencyClientId,
            description: pendencyDescription.trim(),
            deadline: format(pendencyDeadline, 'yyyy-MM-dd'),
            priority: pendencyPriority,
          });
          setIsSavingPendency(false);
          setPendencyModalOpen(false);
          setPendencyClientId('');
          setPendencyDescription('');
          setPendencyDeadline(undefined);
          setPendencyPriority('media');
          setPendencyClientSearch('');
        }}
      />
      
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeClient ? <DragOverlayCard client={activeClient} /> : null}
      </DragOverlay>
      
      <StageQuickViewDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        stage={drawerStage}
        clientsInStage={drawerStage ? (clientsByStage[drawerStage] || []) : []}
        onOpenClient={onEditClient}
      />

      <ClientTasksDrawer
        open={tasksDrawerOpen}
        onOpenChange={setTasksDrawerOpen}
        client={currentDrawerClient}
      />

      <div className="fixed bottom-2 right-2 z-50 text-[10px] text-muted-foreground/50 bg-background/80 backdrop-blur-sm px-2 py-1 rounded border border-border/30 select-none pointer-events-none">
        {typeof __BUILD_MODE__ !== 'undefined' ? __BUILD_MODE__ : 'dev'} | {typeof __BUILD_TIME__ !== 'undefined' ? new Date(__BUILD_TIME__).toLocaleString('pt-BR') : 'dev'}
      </div>
    </div>
  );
}

export function KanbanView({ onEditClient, searchQuery = '', clientIdsWithPendencies, pendencies, pendenciesLoading, onAddPendency, onCompletePendency, onRemovePendency }: KanbanViewProps) {
  const { clients, moveClientToStage, swapClientOrder, setReorderingFlag, updateClient } = useClients();

  const clientsByStage = useMemo(() => {
    const grouped: Record<string, Client[]> = {};
    const query = searchQuery.trim().toLowerCase();
    
    KANBAN_COLUMN_STAGES.forEach(stage => { grouped[stage] = []; });
    
    clients.forEach(client => {
      if (client.consultingFinished) return;
      if (client.funnelStage === 'Em atendimento') return;
      
      if (query) {
        const matches = client.name.toLowerCase().includes(query) || client.profession.toLowerCase().includes(query) || client.objective.toLowerCase().includes(query);
        if (!matches) return;
      }
      
      const stage = client.funnelStage as string;
      if (grouped[stage] !== undefined) {
        grouped[stage].push(client);
      } else {
        grouped['START'].push(client);
      }
    });

    KANBAN_COLUMN_STAGES.forEach(stage => {
      grouped[stage].sort((a, b) => {
        const orderA = a.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });
    });
    
    return grouped;
  }, [clients, searchQuery]);

  const handleReorder = useCallback((clientId: string, targetClientId: string | null, stage: string, insertBefore: boolean) => {
    if (!targetClientId) return;
    setReorderingFlag(true);
    swapClientOrder(clientId, targetClientId);
  }, [swapClientOrder, setReorderingFlag]);

  const handleMoveToStage = useCallback((clientId: string, stage: string, position?: number) => {
    setReorderingFlag(true);
    
    const stageClients = clientsByStage[stage] || [];
    let newOrder: number;
    
    if (position !== undefined && position < stageClients.length) {
      const targetClient = stageClients[position];
      if (position === 0) {
        newOrder = (targetClient.kanbanOrder ?? 10) - 1000;
      } else {
        const prevClient = stageClients[position - 1];
        newOrder = ((prevClient.kanbanOrder ?? 0) + (targetClient.kanbanOrder ?? 10)) / 2;
      }
    } else {
      const lastOrder = stageClients.length > 0 ? Math.max(...stageClients.map(c => c.kanbanOrder ?? 0)) : 0;
      newOrder = lastOrder + 1000;
    }
    
    moveClientToStage(clientId, stage as FunnelStage, newOrder);
  }, [clientsByStage, moveClientToStage, setReorderingFlag]);

  return (
    <KanbanDndProvider
      clientsByStage={clientsByStage}
      onReorder={handleReorder}
      onMoveToStage={handleMoveToStage}
    >
      <KanbanContent onEditClient={onEditClient} searchQuery={searchQuery} clientIdsWithPendencies={clientIdsWithPendencies} pendencies={pendencies} pendenciesLoading={pendenciesLoading} onAddPendency={onAddPendency} onCompletePendency={onCompletePendency} onRemovePendency={onRemovePendency} />
    </KanbanDndProvider>
  );
}
