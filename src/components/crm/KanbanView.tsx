import { useState } from 'react';
import { 
  GripVertical, 
  Check, 
  Plus, 
  RefreshCw, 
  TrendingUp,
  MoreHorizontal,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { Client, FunnelStage, FUNNEL_STAGES } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanViewProps {
  onEditClient: (client: Client) => void;
}

interface KanbanCardProps {
  client: Client;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

function KanbanCard({ client, onEdit, onDragStart }: KanbanCardProps) {
  const { toggleTask, addTask, deleteClient, deleteTask } = useClients();
  const [newTask, setNewTask] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  const handleAddTask = () => {
    if (newTask.trim()) {
      addTask(client.id, newTask.trim());
      setNewTask('');
      setShowAddTask(false);
    }
  };

  const completedTasks = client.tasks.filter(t => t.completed).length;
  const totalTasks = client.tasks.length;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="kanban-card group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <div>
            <h4 className="font-medium text-foreground leading-tight">{client.name}</h4>
            <p className="text-xs text-muted-foreground">{client.profession}</p>
          </div>
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
            <DropdownMenuContent align="end">
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
        <div className="mb-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Objetivo:</span> {client.objective}
          </p>
        </div>
      )}

      {/* Tasks */}
      {client.tasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Tarefas ({completedTasks}/{totalTasks})
            </span>
          </div>
          <div className="space-y-1.5">
            {client.tasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center gap-2 group/task">
                <button
                  onClick={() => toggleTask(client.id, task.id)}
                  className="flex-shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  )}
                </button>
                <span className={`text-xs flex-1 ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.description}
                </span>
                <button
                  onClick={() => deleteTask(client.id, task.id)}
                  className="opacity-0 group-hover/task:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
            {client.tasks.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{client.tasks.length - 3} mais
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Task */}
      {showAddTask ? (
        <div className="flex gap-2">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Nova tarefa..."
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            autoFocus
          />
          <Button size="sm" className="h-7 px-2" onClick={handleAddTask}>
            <Check className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowAddTask(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar tarefa
        </Button>
      )}

      {/* Progress bar for tasks */}
      {totalTasks > 0 && (
        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-success transition-all duration-300"
            style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function KanbanView({ onEditClient }: KanbanViewProps) {
  const { clients, moveClientToStage } = useClients();
  const [draggedClient, setDraggedClient] = useState<Client | null>(null);
  const [dragOverStage, setDragOverStage] = useState<FunnelStage | null>(null);

  const getClientsByStage = (stage: FunnelStage) => {
    return clients.filter(client => client.funnelStage === stage);
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
    if (stage === 'Novo cliente') return 'bg-primary';
    if (stage === 'Em atendimento') return 'bg-warning';
    if (stage === 'Conclusão') return 'bg-success';
    return 'bg-muted-foreground';
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4 min-w-max">
        {FUNNEL_STAGES.map((stage) => {
          const stageClients = getClientsByStage(stage);
          const isOver = dragOverStage === stage;
          
          return (
            <div
              key={stage}
              className={`kanban-column transition-all duration-200 ${
                isOver ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStageColor(stage)}`} />
                  <h3 className="font-medium text-sm text-foreground">{stage}</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
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
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum cliente
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
