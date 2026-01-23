import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import React from 'react';
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
  Award,
  Cake,
  ListTodo,
  CheckCircle2
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
import { cn } from '@/lib/utils';

interface KanbanViewProps {
  onEditClient: (client: Client) => void;
  searchQuery?: string;
}

interface KanbanCardProps {
  client: Client;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

// Threshold for detecting drag movement (in pixels)
const DRAG_THRESHOLD = 6;
// Delay before allowing drag (in ms)
const DRAG_DELAY = 150;

// All funnel stages are valid for Kanban (Novo cliente was removed from the type)
const KANBAN_STAGES = FUNNEL_STAGES;

// Get card border color based on state (only pending tasks count)
const getCardBorderColor = (client: Client) => {
  if (client.pendingSchedule) return 'border-l-destructive';
  
  const pendingTasks = client.tasks.filter(t => !t.completed);
  const completedTasks = client.tasks.filter(t => t.completed);
  
  // All tasks completed
  if (client.tasks.length > 0 && pendingTasks.length === 0) return 'border-l-success';
  // Has pending tasks
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

const KanbanCardComponent = memo(function KanbanCard({ client, onEdit, onDragStart }: KanbanCardProps) {
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

  // Only show pending tasks in the card
  const pendingTasks = client.tasks.filter(t => !t.completed);
  const completedTasksCount = client.tasks.filter(t => t.completed).length;
  const totalTasks = client.tasks.length;
  const borderColor = getCardBorderColor(client);
  const hasBirthday = isBirthdayToday(client.birthDate);

  // Handle header click to open client modal
  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  // Open tasks modal with specific tab
  const openTasksModal = (e: React.MouseEvent, tab: 'pending' | 'completed') => {
    e.stopPropagation();
    e.preventDefault();
    setTasksModalTab(tab);
    setTasksModalOpen(true);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`group bg-card rounded-xl p-4 shadow-card border border-border/50 border-l-4 ${borderColor} transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${client.pendingSchedule ? 'ring-2 ring-destructive/20' : ''}`}
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
      
      {/* Header - Clickable area to open client modal */}
      <div className="flex items-start justify-between mb-3">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
          onClick={handleHeaderClick}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-foreground leading-tight truncate">{client.name}</h4>
              {/* Premium Renewed Client Badge */}
              {client.isRenewedClient && (
                <div className="p-0.5 rounded-full bg-amber-500/20 flex-shrink-0" title="Cliente Renovado">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{client.profession}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1" data-interactive="true">
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
        <div className="mb-3" data-interactive="true">
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
                      // Start animation immediately
                      setAnimatingTasks(prev => new Set(prev).add(task.id));
                      // Toggle task (optimistic update handles the rest)
                      toggleTask(client.id, task.id);
                      // Clean up animation state after transition
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
        <div className="mb-3" data-interactive="true">
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
      <div data-interactive="true">
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

// Memoized card with stable comparison
const KanbanCard = memo(KanbanCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific things change
  return (
    prevProps.client.id === nextProps.client.id &&
    prevProps.client.funnelStage === nextProps.client.funnelStage &&
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
    // Check if task IDs and completion status are the same
    JSON.stringify(prevProps.client.tasks.map(t => ({ id: t.id, completed: t.completed }))) ===
    JSON.stringify(nextProps.client.tasks.map(t => ({ id: t.id, completed: t.completed })))
  );
});

export function KanbanView({ onEditClient, searchQuery = '' }: KanbanViewProps) {
  const { clients, moveClientToStage } = useClients();
  const [draggedClient, setDraggedClient] = useState<Client | null>(null);
  const [dragOverStage, setDragOverStage] = useState<FunnelStage | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // Keyboard navigation (left/right arrows)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't scroll if focus is on an input, textarea, or select
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

  // Memoize clients grouped by stage for performance
  const clientsByStage = useMemo(() => {
    const grouped: Record<FunnelStage, Client[]> = {} as Record<FunnelStage, Client[]>;
    const query = searchQuery.trim().toLowerCase();
    
    KANBAN_STAGES.forEach(stage => {
      grouped[stage] = [];
    });
    
    clients.forEach(client => {
      // Only show active clients (not finalized) in Kanban
      if (client.consultingFinished) return;
      
      // Apply search filter
      if (query) {
        const matches = 
          client.name.toLowerCase().includes(query) ||
          client.profession.toLowerCase().includes(query) ||
          client.objective.toLowerCase().includes(query);
        if (!matches) return;
      }
      
      if (grouped[client.funnelStage]) {
        grouped[client.funnelStage].push(client);
      }
    });
    
    return grouped;
  }, [clients, searchQuery]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleDragStart = useCallback((e: React.DragEvent, client: Client) => {
    setDraggedClient(client);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: FunnelStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, stage: FunnelStage) => {
    e.preventDefault();
    if (draggedClient && draggedClient.funnelStage !== stage) {
      // Optimistic update happens in the hook - no await needed
      moveClientToStage(draggedClient.id, stage);
    }
    setDraggedClient(null);
    setDragOverStage(null);
  }, [draggedClient, moveClientToStage]);

  const getStageColor = useCallback((stage: FunnelStage) => {
    if (stage === 'Em atendimento') return 'bg-warning';
    if (stage === 'Conclusão') return 'bg-success';
    return 'bg-primary';
  }, []);

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
          {KANBAN_STAGES.map((stage) => {
            const stageClients = clientsByStage[stage] || [];
            const isOver = dragOverStage === stage;
            
            return (
              <div
                key={stage}
                className={`bg-muted/30 rounded-2xl p-4 min-h-[500px] w-80 flex-shrink-0 border border-border/50 transition-all duration-200 ${
                  isOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStageColor(stage)} shadow-sm`} />
                    <h3 className="font-semibold text-sm text-foreground">{getStageDisplayLabel(stage)}</h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {stageClients.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {stageClients.map((client) => (
                    <KanbanCard
                      key={client.id}
                      client={client}
                      onEdit={() => onEditClient(client)}
                      onDragStart={(e) => handleDragStart(e, client)}
                    />
                  ))}
                  
                  {stageClients.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-xl">
                      Nenhum cliente
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
