import { useState, useRef, useEffect, useCallback } from 'react';
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
  ListTodo
} from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { Client, FunnelStage, FUNNEL_STAGES } from '@/types/client';
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

function KanbanCard({ client, onEdit, onDragStart }: KanbanCardProps) {
  const { toggleTask, addTask, deleteClient, deleteTask } = useClients();
  const [newTask, setNewTask] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  
  // State for click vs drag detection
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canDragRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleAddTask = () => {
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

  // Check if an element is interactive (should not trigger card click)
  const isInteractiveElement = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    
    const interactiveTags = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'];
    const interactiveRoles = ['button', 'menuitem', 'checkbox'];
    
    let element: HTMLElement | null = target;
    while (element && element !== cardRef.current) {
      // Check tag name
      if (interactiveTags.includes(element.tagName)) return true;
      // Check role
      if (interactiveRoles.includes(element.getAttribute('role') || '')) return true;
      // Check data attribute for interactive zones
      if (element.dataset.interactive === 'true') return true;
      // Check if part of dropdown
      if (element.closest('[data-radix-collection-item]')) return true;
      element = element.parentElement;
    }
    return false;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore if clicking on interactive elements
    if (isInteractiveElement(e.target)) return;
    
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    canDragRef.current = false;
    setIsDragging(false);
    
    // Start timer to enable dragging after delay
    dragTimerRef.current = setTimeout(() => {
      canDragRef.current = true;
    }, DRAG_DELAY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If moved beyond threshold, mark as dragging
    if (distance > DRAG_THRESHOLD) {
      setIsDragging(true);
      // Clear the timer if movement detected early
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      canDragRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Clear timer
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    
    // Ignore if clicking on interactive elements
    if (isInteractiveElement(e.target)) {
      pointerStartRef.current = null;
      setIsDragging(false);
      return;
    }
    
    // If not dragging, open edit modal
    if (!isDragging && pointerStartRef.current) {
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only trigger click if minimal movement
      if (distance <= DRAG_THRESHOLD) {
        onEdit();
      }
    }
    
    pointerStartRef.current = null;
    setIsDragging(false);
  };

  const handlePointerCancel = () => {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    pointerStartRef.current = null;
    setIsDragging(false);
  };

  // Handle native drag start - only allow if canDrag is true
  const handleDragStart = (e: React.DragEvent) => {
    if (!canDragRef.current && !isDragging) {
      e.preventDefault();
      return;
    }
    onDragStart(e);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      className={`group bg-card rounded-xl p-4 shadow-card border border-border/50 border-l-4 ${borderColor} cursor-pointer active:cursor-grabbing transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${client.pendingSchedule ? 'ring-2 ring-destructive/20' : ''} ${isDragging ? 'opacity-50 cursor-grabbing' : ''}`}
      style={{ touchAction: 'none' }}
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
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-foreground leading-tight">{client.name}</h4>
              {/* Premium Renewed Client Badge */}
              {client.isRenewedClient && (
                <div className="p-0.5 rounded-full bg-amber-500/20" title="Cliente Renovado">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{client.profession}</p>
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
            <span className="text-xs font-medium text-muted-foreground">
              Tarefas pendentes ({pendingTasks.length})
            </span>
            {completedTasksCount > 0 && (
              <span className="text-xs text-success">
                {completedTasksCount} concluída{completedTasksCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {pendingTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center gap-2 group/task p-1.5 rounded-md hover:bg-muted/50 transition-colors">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(client.id, task.id);
                  }}
                  className="flex-shrink-0"
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
            ))}
            {pendingTasks.length > 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTasksModalOpen(true);
                }}
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
            onClick={(e) => {
              e.stopPropagation();
              setTasksModalOpen(true);
            }}
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
          <div className="flex gap-2">
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Nova tarefa..."
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
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
      />
    </div>
  );
}

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

  const getClientsByStage = (stage: FunnelStage) => {
    // Only show active clients (not finalized) in Kanban
    let filtered = clients.filter(client => client.funnelStage === stage && !client.consultingFinished);
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.profession.toLowerCase().includes(query) ||
        client.objective.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const handleDragStart = (e: React.DragEvent, client: Client) => {
    setDraggedClient(client);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: FunnelStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: FunnelStage) => {
    e.preventDefault();
    if (draggedClient && draggedClient.funnelStage !== stage) {
      moveClientToStage(draggedClient.id, stage);
    }
    setDraggedClient(null);
    setDragOverStage(null);
  };

  const getStageColor = (stage: FunnelStage) => {
    if (stage === 'Em atendimento') return 'bg-warning';
    if (stage === 'Conclusão') return 'bg-success';
    return 'bg-primary';
  };

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
            const stageClients = getClientsByStage(stage);
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
