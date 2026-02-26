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
  Trophy,
} from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { Client, FunnelStage, FUNNEL_STAGES, Task } from '@/types/client';
import { getStageDisplayLabel } from '@/lib/funnel-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TasksModal } from './TasksModal';
import { StageQuickViewDrawer } from './StageQuickViewDrawer';
import { ClientTasksDrawer } from './ClientTasksDrawer';
import { KanbanDndProvider, useKanbanDnd, TOP10_BUCKET_ID } from './KanbanDndContext';
import { SortableKanbanCard } from './SortableKanbanCard';
import { DroppableColumn } from './DroppableColumn';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Build version globals from vite.config.ts define
declare const __BUILD_TIME__: string;
declare const __BUILD_MODE__: string;

interface KanbanViewProps {
  onEditClient: (client: Client) => void;
  searchQuery?: string;
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
}

// Kanban stages: exclude "Em atendimento" (shown in separate drawer)
const KANBAN_STAGES = FUNNEL_STAGES.filter(s => s !== 'Em atendimento');

// Get card border color based on state
const getCardBorderColor = (client: Client) => {
  if (client.pendingSchedule) return 'border-l-destructive';
  
  const pendingTasks = client.tasks.filter(t => !t.completed);
  const completedTasks = client.tasks.filter(t => t.completed);
  
  if (client.tasks.length > 0 && pendingTasks.length === 0) return 'border-l-success';
  if (pendingTasks.length > 0) return 'border-l-warning';
  
  return 'border-l-primary';
};

// Check if today is client's birthday
const isBirthdayToday = (birthDate: Date | null): boolean => {
  if (!birthDate) return false;
  const today = new Date();
  const birth = new Date(birthDate);
  return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate();
};

const KanbanCardComponent = memo(function KanbanCard({ 
  client, 
  onEdit, 
  onCardClick,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  dragHandleProps,
  isDragging,
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

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleBodyClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't open drawer if clicking on buttons, inputs, drag handle, or dropdown
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[data-drag-handle]') ||
      target.closest('[role="menu"]') ||
      target.closest('[data-radix-collection-item]')
    ) return;
    onCardClick();
  };

  const openTasksModal = (e: React.MouseEvent, tab: 'pending' | 'completed') => {
    e.stopPropagation();
    e.preventDefault();
    setTasksModalTab(tab);
    setTasksModalOpen(true);
  };

  return (
    <div
      className={cn(
        "group bg-card rounded-xl p-4 shadow-card border border-border/50 border-l-4 transition-all duration-200 hover:shadow-lg cursor-pointer",
        borderColor,
        client.pendingSchedule && "ring-2 ring-destructive/20",
        isDragging && "shadow-2xl scale-105 rotate-1 cursor-grabbing"
      )}
      onClick={handleBodyClick}
    >
      {/* Birthday Alert */}
      {hasBirthday && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-pink-500/10 rounded-md border border-pink-500/20">
          <Cake className="w-3.5 h-3.5 text-pink-500" />
          <span className="text-xs font-medium text-pink-600">🎉 Aniversário hoje!</span>
        </div>
      )}

      {/* Pending Schedule Alert */}
      {client.pendingSchedule && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-destructive/10 rounded-md border border-destructive/20">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">Agendamento Pendente</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        {/* Drag handle - ONLY this initiates drag */}
        <div 
          {...(dragHandleProps || {})}
          data-drag-handle="true"
          className={cn(
            "flex items-center mr-2 flex-shrink-0 transition-opacity cursor-grab active:cursor-grabbing select-none",
            "opacity-40 group-hover:opacity-100",
            isDragging && "cursor-grabbing"
          )}
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        
        {/* Name area + reorder arrows */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <h4 
              className="font-semibold text-foreground leading-tight truncate cursor-pointer hover:text-primary transition-colors flex-1 min-w-0"
              onClick={handleHeaderClick}
            >
              {client.name}
            </h4>
            
            {/* Reorder arrows ↑↓ */}
            <div className="flex items-center gap-0 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
                disabled={!canMoveUp}
                className={cn(
                  "p-0.5 rounded hover:bg-muted transition-colors",
                  canMoveUp ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-default"
                )}
                title="Mover para cima"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
                disabled={!canMoveDown}
                className={cn(
                  "p-0.5 rounded hover:bg-muted transition-colors",
                  canMoveDown ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-default"
                )}
                title="Mover para baixo"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Premium Renewed Client Badge */}
            {client.isRenewedClient && (
              <div className="p-0.5 rounded-full bg-amber-500/20 flex-shrink-0" title="Cliente Renovado">
                <Award className="w-3.5 h-3.5 text-amber-500" />
              </div>
            )}
          </div>
          <p 
            className="text-xs text-muted-foreground truncate cursor-pointer hover:text-muted-foreground/80"
            onClick={handleHeaderClick}
          >
            {client.profession}
          </p>
        </div>
        
        <div className="flex items-center gap-1">
          {client.renewed && (
            <div className="p-1 rounded-full bg-success/10" title="Renovado">
              <RefreshCw className="w-3 h-3 text-success" />
            </div>
          )}
          {client.renewalPotential && !client.renewed && (
            <div className="p-1 rounded-full bg-warning/10" title="Potencial de renovação">
              <TrendingUp className="w-3 h-3 text-warning" />
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => deleteClient(client.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Objective */}
      {client.objective && (
        <div className="mb-3 p-2 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Objetivo:</span> {client.objective}
          </p>
        </div>
      )}

      {/* Tasks - Only show pending tasks */}
      {pendingTasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={(e) => openTasksModal(e, 'pending')}
              className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline transition-colors"
            >
              Tarefas pendentes ({pendingTasks.length})
            </button>
            {completedTasksCount > 0 && (
              <button
                onClick={(e) => openTasksModal(e, 'completed')}
                className="text-xs text-success hover:text-success/80 hover:underline transition-colors"
              >
                {completedTasksCount} concluída{completedTasksCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {pendingTasks.slice(0, 3).map((task) => {
              const isAnimating = animatingTasks.has(task.id);
              return (
                <div 
                  key={task.id} 
                  className={cn(
                    "flex items-center gap-2 group/task p-1.5 rounded-md hover:bg-muted/50 transition-all duration-150",
                    isAnimating && "opacity-0 scale-95 -translate-x-2"
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnimatingTasks(prev => new Set(prev).add(task.id));
                      toggleTask(client.id, task.id);
                      setTimeout(() => {
                        setAnimatingTasks(prev => {
                          const next = new Set(prev);
                          next.delete(task.id);
                          return next;
                        });
                      }, 150);
                    }}
                    className="flex-shrink-0 transition-transform duration-100 hover:scale-110"
                  >
                    <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </button>
                  <span className="text-xs flex-1 text-foreground">
                    {task.description}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(client.id, task.id);
                    }}
                    className="opacity-0 group-hover/task:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              );
            })}
            {pendingTasks.length > 3 && (
              <button
                onClick={(e) => openTasksModal(e, 'pending')}
                className="w-full text-left px-1.5 py-1 text-xs text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
              >
                <ListTodo className="w-3 h-3" />
                +{pendingTasks.length - 3} mais tarefas
              </button>
            )}
          </div>
        </div>
      )}

      {/* Show completed count when no pending tasks */}
      {pendingTasks.length === 0 && completedTasksCount > 0 && (
        <div className="mb-3">
          <button
            onClick={(e) => openTasksModal(e, 'completed')}
            className="w-full text-left px-2 py-1.5 text-xs text-success bg-success/10 rounded-md hover:bg-success/20 transition-colors flex items-center gap-1.5"
          >
            <ListTodo className="w-3.5 h-3.5" />
            {completedTasksCount} tarefa{completedTasksCount > 1 ? 's' : ''} concluída{completedTasksCount > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Add Task */}
      <div>
        {showAddTask ? (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Nova tarefa..."
              className="h-8 text-xs"
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleAddTask(e as unknown as React.MouseEvent);
              }}
              autoFocus
            />
            <Button size="sm" className="h-8 px-2" onClick={handleAddTask}>
              <Check className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddTask(true);
            }}
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar tarefa
          </Button>
        )}
      </div>

      {/* Progress bar for tasks */}
      {totalTasks > 0 && (
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-success transition-all duration-300 rounded-full"
            style={{ width: `${(completedTasksCount / totalTasks) * 100}%` }}
          />
        </div>
      )}

      {/* Tasks Modal */}
      <TasksModal
        open={tasksModalOpen}
        onOpenChange={setTasksModalOpen}
        client={client}
        defaultTab={tasksModalTab}
      />
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
    JSON.stringify(prevProps.client.tasks.map(t => ({ id: t.id, completed: t.completed }))) ===
    JSON.stringify(nextProps.client.tasks.map(t => ({ id: t.id, completed: t.completed })))
  );
});

// Drag overlay card (simplified version for performance)
function DragOverlayCard({ client }: { client: Client }) {
  const borderColor = getCardBorderColor(client);
  
  return (
    <div
      className={cn(
        "bg-card rounded-xl p-4 shadow-2xl border border-border/50 border-l-4 w-80 rotate-2 cursor-grabbing",
        borderColor
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground leading-tight truncate">
            {client.name}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {client.profession}
          </p>
        </div>
      </div>
    </div>
  );
}

function KanbanContent({ onEditClient, searchQuery = '' }: KanbanViewProps) {
  const { clients, moveClientToStage, swapClientOrder, setReorderingFlag, updateClient, refetch } = useClients();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  
  // Stage Quick View Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStage, setDrawerStage] = useState<FunnelStage | null>(null);
  
  // Client Tasks Drawer state
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [tasksDrawerClient, setTasksDrawerClient] = useState<Client | null>(null);
  
  const { activeClient } = useKanbanDnd();

  // Helper to get patrimônio for ranking
  const getPatrimonioValue = useCallback((c: Client) => {
    if (c.patrimonioFinanceiroLiquido != null && c.patrimonioFinanceiroLiquido > 0) return c.patrimonioFinanceiroLiquido;
    const diag = c.strategicDiagnostic?.estruturaPatrimonial;
    if (diag?.liquidFinancialAssets) {
      const val = typeof diag.liquidFinancialAssets === 'number' ? diag.liquidFinancialAssets 
        : parseFloat(String(diag.liquidFinancialAssets).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.'));
      if (!isNaN(val) && val > 0) return val;
    }
    if (c.financialAssets > 0) return c.financialAssets;
    return 0;
  }, []);

  // Auto-fill Top 10 from patrimônio ranking
  const handleAutoFillTop10 = useCallback(async () => {
    setIsAutoFilling(true);
    try {
      // First, clear all current top10 flags
      const currentTop10 = clients.filter(c => c.isTop10);
      for (const c of currentTop10) {
        await supabase.from('clients').update({ is_top10: false, top10_order: null } as any).eq('id', c.id);
      }

      // Get top 10 by patrimônio
      const ranked = [...clients]
        .filter(c => !c.consultingFinished)
        .map(c => ({ id: c.id, value: getPatrimonioValue(c) }))
        .filter(x => x.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);

      // Set top10 flags
      for (let i = 0; i < ranked.length; i++) {
        await supabase.from('clients').update({ is_top10: true, top10_order: (i + 1) * 1000 } as any).eq('id', ranked[i].id);
      }

      // Refetch data
      setTimeout(() => refetch(), 200);
      
      toast.success(`Top 15 preenchido automaticamente com ${ranked.length} clientes!`);
    } catch (err) {
      toast.error('Erro ao preencher Top 10');
      console.error(err);
    } finally {
      setIsAutoFilling(false);
    }
  }, [clients, getPatrimonioValue, refetch]);
  
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
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    if (isInputFocused) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      container.scrollBy({ left: 400, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      container.scrollBy({ left: -400, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Memoize clients grouped by stage + top10
  const clientsByStage = useMemo(() => {
    const grouped: Record<string, Client[]> = {};
    const query = searchQuery.trim().toLowerCase();
    
    KANBAN_STAGES.forEach(stage => { grouped[stage] = []; });
    grouped[TOP10_BUCKET_ID] = [];
    
    clients.forEach(client => {
      if (client.consultingFinished) return;
      
      if (query) {
        const matches = 
          client.name.toLowerCase().includes(query) ||
          client.profession.toLowerCase().includes(query) ||
          client.objective.toLowerCase().includes(query);
        if (!matches) return;
      }
      
      if (client.isTop10) {
        grouped[TOP10_BUCKET_ID].push(client);
      }
      
      if (grouped[client.funnelStage]) {
        grouped[client.funnelStage].push(client);
      }
    });

    KANBAN_STAGES.forEach(stage => {
      grouped[stage].sort((a, b) => {
        const orderA = a.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });
    });

    grouped[TOP10_BUCKET_ID].sort((a, b) => {
      const orderA = a.top10Order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.top10Order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.id.localeCompare(b.id);
    });
    
    return grouped;
  }, [clients, searchQuery]);

  // Keep tasks drawer client in sync with latest data
  const currentDrawerClient = useMemo(() => {
    if (!tasksDrawerClient) return null;
    return clients.find(c => c.id === tasksDrawerClient.id) ?? tasksDrawerClient;
  }, [clients, tasksDrawerClient]);

  const getStageColor = useCallback((stage: FunnelStage) => {
    if (stage === 'Em atendimento') return 'bg-warning';
    if (stage === 'Pendências Urgentes') return 'bg-destructive';
    if (stage === 'Conclusão') return 'bg-success';
    if (stage === 'Diagnóstico Iniciado') return 'bg-blue-500';
    if (stage === 'Diagnóstico Concluído') return 'bg-cyan-500';
    if (stage === 'Estratégia Apresentada') return 'bg-violet-500';
    if (stage === 'Implementação') return 'bg-orange-500';
    if (stage === 'Acompanhamento') return 'bg-teal-500';
    if (stage === 'Cliente Patrimonial') return 'bg-emerald-600';
    return 'bg-primary';
  }, []);

  // Handle arrow move up/down within same column
  const handleMoveUp = useCallback((clientId: string, stage: FunnelStage) => {
    const stageClients = clientsByStage[stage];
    const idx = stageClients.findIndex(c => c.id === clientId);
    if (idx <= 0) return;
    const aboveClient = stageClients[idx - 1];
    setReorderingFlag(true);
    swapClientOrder(clientId, aboveClient.id);
  }, [clientsByStage, swapClientOrder, setReorderingFlag]);

  const handleMoveDown = useCallback((clientId: string, stage: FunnelStage) => {
    const stageClients = clientsByStage[stage];
    const idx = stageClients.findIndex(c => c.id === clientId);
    if (idx < 0 || idx >= stageClients.length - 1) return;
    const belowClient = stageClients[idx + 1];
    setReorderingFlag(true);
    swapClientOrder(clientId, belowClient.id);
  }, [clientsByStage, swapClientOrder, setReorderingFlag]);

  // Handle Top 10 reorder via arrows
  const handleTop10MoveUp = useCallback((clientId: string) => {
    const top10Clients = clientsByStage[TOP10_BUCKET_ID] || [];
    const idx = top10Clients.findIndex(c => c.id === clientId);
    if (idx <= 0) return;
    const aboveClient = top10Clients[idx - 1];
    // Swap top10_order values
    const orderA = top10Clients[idx].top10Order ?? idx * 1000;
    const orderB = aboveClient.top10Order ?? (idx - 1) * 1000;
    setReorderingFlag(true);
    updateClient(clientId, { top10Order: orderB } as any);
    updateClient(aboveClient.id, { top10Order: orderA } as any);
  }, [clientsByStage, setReorderingFlag, updateClient]);

  const handleTop10MoveDown = useCallback((clientId: string) => {
    const top10Clients = clientsByStage[TOP10_BUCKET_ID] || [];
    const idx = top10Clients.findIndex(c => c.id === clientId);
    if (idx < 0 || idx >= top10Clients.length - 1) return;
    const belowClient = top10Clients[idx + 1];
    const orderA = top10Clients[idx].top10Order ?? idx * 1000;
    const orderB = belowClient.top10Order ?? (idx + 1) * 1000;
    setReorderingFlag(true);
    updateClient(clientId, { top10Order: orderB } as any);
    updateClient(belowClient.id, { top10Order: orderA } as any);
  }, [clientsByStage, setReorderingFlag, updateClient]);

  return (
    <div className="relative">
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-card/95 backdrop-blur-sm border rounded-full shadow-lg hover:bg-muted transition-all hover:scale-110"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      
      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-card/95 backdrop-blur-sm border rounded-full shadow-lg hover:bg-muted transition-all hover:scale-110"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollability}
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        <div className="flex gap-4 p-4 min-w-max">
          {/* Top 10 Patrimônio bucket column */}
          {(() => {
            const top10Clients = clientsByStage[TOP10_BUCKET_ID] || [];
            const top10Ids = top10Clients.map(c => c.id);
            
            // Helper to get patrimônio value for display
            const getPatrimonio = (c: Client) => {
              if (c.patrimonioFinanceiroLiquido != null && c.patrimonioFinanceiroLiquido > 0) return c.patrimonioFinanceiroLiquido;
              const diag = c.strategicDiagnostic?.estruturaPatrimonial;
              if (diag?.liquidFinancialAssets) {
                const val = typeof diag.liquidFinancialAssets === 'number' ? diag.liquidFinancialAssets 
                  : parseFloat(String(diag.liquidFinancialAssets).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.'));
                if (!isNaN(val) && val > 0) return val;
              }
              if (c.financialAssets > 0) return c.financialAssets;
              return 0;
            };

            const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

            return (
              <div
                key={TOP10_BUCKET_ID}
                className="bg-amber-500/5 rounded-2xl p-4 min-h-[500px] w-80 flex-shrink-0 border border-amber-500/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2 pb-3 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-sm text-foreground">Top 15 Patrimônio</h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {top10Clients.length}/15
                  </span>
                </div>
                <div className="mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                    onClick={handleAutoFillTop10}
                    disabled={isAutoFilling}
                  >
                    <RefreshCw className={`w-3 h-3 ${isAutoFilling ? 'animate-spin' : ''}`} />
                    {isAutoFilling ? 'Calculando...' : (top10Clients.length > 0 ? 'Resetar para automático' : 'Preencher automático')}
                  </Button>
                </div>

                {/* Patrimônio value on each card */}
                <DroppableColumn stage={TOP10_BUCKET_ID as any} clientIds={top10Ids}>
                  {top10Clients.map((client, index) => {
                    const patrimonio = getPatrimonio(client);
                    return (
                      <div key={client.id}>
                        <SortableKanbanCard client={client}>
                          <KanbanCard
                            client={client}
                            onEdit={() => onEditClient(client)}
                            onCardClick={() => handleCardClick(client)}
                            onMoveUp={() => handleTop10MoveUp(client.id)}
                            onMoveDown={() => handleTop10MoveDown(client.id)}
                            canMoveUp={index > 0}
                            canMoveDown={index < top10Clients.length - 1}
                          />
                        </SortableKanbanCard>
                        {patrimonio > 0 && (
                          <div className="text-xs text-amber-600 font-medium px-4 -mt-2 mb-1">
                            {formatCurrency(patrimonio)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {top10Clients.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-amber-500/20 rounded-xl">
                      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Arraste clientes aqui</p>
                      <p className="text-xs mt-1">ou use "Preencher automático"</p>
                    </div>
                  )}
                </DroppableColumn>
              </div>
            );
          })()}

          {KANBAN_STAGES.map((stage) => {
            const stageClients = clientsByStage[stage] || [];
            const clientIds = stageClients.map(c => c.id);
            
            return (
              <div
                key={stage}
                className="bg-muted/30 rounded-2xl p-4 min-h-[500px] w-80 flex-shrink-0 border border-border/50 transition-all duration-200"
              >
                {/* Column Header */}
                <button
                  onClick={() => handleColumnHeaderClick(stage)}
                  className="w-full flex items-center justify-between mb-4 pb-3 border-b border-border/50 hover:bg-muted/50 -mx-4 px-4 pt-1 -mt-1 rounded-t-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStageColor(stage)} shadow-sm`} />
                    <h3 className="font-semibold text-sm text-foreground">{getStageDisplayLabel(stage)}</h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                    {stageClients.length}
                  </span>
                </button>

                {/* Cards with @dnd-kit */}
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
            );
          })}
        </div>
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeClient ? <DragOverlayCard client={activeClient} /> : null}
      </DragOverlay>
      
      {/* Stage Quick View Drawer */}
      <StageQuickViewDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        stage={drawerStage}
        clientsInStage={drawerStage ? (clientsByStage[drawerStage] || []) : []}
        onOpenClient={onEditClient}
      />

      {/* Client Tasks Drawer */}
      <ClientTasksDrawer
        open={tasksDrawerOpen}
        onOpenChange={setTasksDrawerOpen}
        client={currentDrawerClient}
      />

      {/* Build Version Indicator */}
      <div className="fixed bottom-2 right-2 z-50 text-[10px] text-muted-foreground/50 bg-background/80 backdrop-blur-sm px-2 py-1 rounded border border-border/30 select-none pointer-events-none">
        {typeof __BUILD_MODE__ !== 'undefined' ? __BUILD_MODE__ : 'dev'} | {typeof __BUILD_TIME__ !== 'undefined' ? new Date(__BUILD_TIME__).toLocaleString('pt-BR') : 'dev'}
      </div>
    </div>
  );
}

export function KanbanView({ onEditClient, searchQuery = '' }: KanbanViewProps) {
  const { clients, moveClientToStage, swapClientOrder, setReorderingFlag, updateClient } = useClients();
  
  const TOP10_LIMIT = 15;

  // Memoize clients grouped by stage + Top10 bucket
  const clientsByStage = useMemo(() => {
    const grouped: Record<string, Client[]> = {};
    const query = searchQuery.trim().toLowerCase();
    
    // Init all kanban stages + top10
    KANBAN_STAGES.forEach(stage => { grouped[stage] = []; });
    grouped[TOP10_BUCKET_ID] = [];
    
    clients.forEach(client => {
      if (client.consultingFinished) return;
      
      if (query) {
        const matches = 
          client.name.toLowerCase().includes(query) ||
          client.profession.toLowerCase().includes(query) ||
          client.objective.toLowerCase().includes(query);
        if (!matches) return;
      }
      
      // Add to Top10 bucket if flagged
      if (client.isTop10) {
        grouped[TOP10_BUCKET_ID].push(client);
      }
      
      // Always add to funnel stage column (client can be in both)
      if (grouped[client.funnelStage]) {
        grouped[client.funnelStage].push(client);
      }
    });

    // Sort funnel stages by kanbanOrder
    KANBAN_STAGES.forEach(stage => {
      grouped[stage].sort((a, b) => {
        const orderA = a.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });
    });

    // Sort Top10 by top10Order
    grouped[TOP10_BUCKET_ID].sort((a, b) => {
      const orderA = a.top10Order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.top10Order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.id.localeCompare(b.id);
    });
    
    return grouped;
  }, [clients, searchQuery]);

  // Handle reorder within same column
  const handleReorder = useCallback((clientId: string, targetClientId: string | null, stage: string, insertBefore: boolean) => {
    if (!targetClientId) return;
    setReorderingFlag(true);
    swapClientOrder(clientId, targetClientId);
  }, [swapClientOrder, setReorderingFlag]);

  // Handle move to different stage
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
        const prevOrder = prevClient.kanbanOrder ?? 0;
        const targetOrder = targetClient.kanbanOrder ?? 10;
        newOrder = (prevOrder + targetOrder) / 2;
      }
    } else {
      const lastOrder = stageClients.length > 0 
        ? Math.max(...stageClients.map(c => c.kanbanOrder ?? 0)) 
        : 0;
      newOrder = lastOrder + 1000;
    }
    
    moveClientToStage(clientId, stage as FunnelStage, newOrder);
  }, [clientsByStage, moveClientToStage, setReorderingFlag]);

  // Handle move TO Top 10
  const handleMoveToTop10 = useCallback((clientId: string, position?: number) => {
    const top10Clients = clientsByStage[TOP10_BUCKET_ID] || [];
    
    // Check limit
    const alreadyInTop10 = top10Clients.some(c => c.id === clientId);
    if (!alreadyInTop10 && top10Clients.length >= TOP10_LIMIT) {
      toast.warning(`Top 15 já está cheio (${TOP10_LIMIT} clientes). Remova um cliente primeiro.`);
      return;
    }

    let newOrder: number;
    if (position !== undefined && position < top10Clients.length) {
      const targetClient = top10Clients[position];
      if (position === 0) {
        newOrder = (targetClient.top10Order ?? 10) - 1000;
      } else {
        const prevClient = top10Clients[position - 1];
        newOrder = ((prevClient.top10Order ?? 0) + (targetClient.top10Order ?? 10)) / 2;
      }
    } else {
      const lastOrder = top10Clients.length > 0
        ? Math.max(...top10Clients.map(c => c.top10Order ?? 0))
        : 0;
      newOrder = lastOrder + 1000;
    }

    setReorderingFlag(true);
    updateClient(clientId, { isTop10: true, top10Order: newOrder } as any);
  }, [clientsByStage, setReorderingFlag, updateClient, TOP10_LIMIT]);

  // Handle remove FROM Top 10
  const handleRemoveFromTop10 = useCallback((clientId: string) => {
    setReorderingFlag(true);
    updateClient(clientId, { isTop10: false, top10Order: null } as any);
  }, [setReorderingFlag, updateClient]);

  // Handle reorder within Top 10
  const handleReorderTop10 = useCallback((clientId: string, targetClientId: string) => {
    const top10Clients = clientsByStage[TOP10_BUCKET_ID] || [];
    const activeIdx = top10Clients.findIndex(c => c.id === clientId);
    const targetIdx = top10Clients.findIndex(c => c.id === targetClientId);
    if (activeIdx < 0 || targetIdx < 0) return;

    // Swap orders
    const orderA = top10Clients[activeIdx].top10Order ?? activeIdx * 1000;
    const orderB = top10Clients[targetIdx].top10Order ?? targetIdx * 1000;
    setReorderingFlag(true);
    updateClient(clientId, { top10Order: orderB } as any);
    updateClient(targetClientId, { top10Order: orderA } as any);
  }, [clientsByStage, setReorderingFlag, updateClient]);

  return (
    <KanbanDndProvider
      clientsByStage={clientsByStage}
      onReorder={handleReorder}
      onMoveToStage={handleMoveToStage}
      onMoveToTop10={handleMoveToTop10}
      onRemoveFromTop10={handleRemoveFromTop10}
      onReorderTop10={handleReorderTop10}
    >
      <KanbanContent onEditClient={onEditClient} searchQuery={searchQuery} />
    </KanbanDndProvider>
  );
}
