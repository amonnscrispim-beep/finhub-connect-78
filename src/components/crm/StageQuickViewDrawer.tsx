import { useState, useMemo, useCallback, memo } from 'react';
import { X, Search, ChevronLeft, ChevronRight, ExternalLink, ListTodo, CheckCircle2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Client, FunnelStage, KANBAN_COLUMN_STAGES } from '@/types/client';
import { getStageDisplayLabel } from '@/lib/funnel-utils';
import { useClients } from '@/contexts/ClientContext';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface StageQuickViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stage: FunnelStage | null;
  clientsInStage: Client[];
  onOpenClient: (client: Client) => void;
}

interface ClientCompactCardProps {
  client: Client;
  onOpenClient: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}

const ClientCompactCard = memo(function ClientCompactCard({
  client,
  onOpenClient,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
}: ClientCompactCardProps) {
  const pendingTasks = client.tasks.filter(t => !t.completed).length;
  const completedTasks = client.tasks.filter(t => t.completed).length;

  return (
    <div className="p-4 bg-card rounded-xl border border-border/50 hover:shadow-md transition-all duration-200 group">
      {/* Header with name and open button */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-base leading-tight truncate">
            {client.name}
          </h4>
          {client.profession && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {client.profession}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onOpenClient();
          }}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Abrir
        </Button>
      </div>

      {/* Objective */}
      {client.objective && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {client.objective}
        </p>
      )}

      {/* Task counters and navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-warning">
            <ListTodo className="w-3.5 h-3.5" />
            <span className="font-medium">Pendentes: {pendingTasks}</span>
          </span>
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-medium">Concluídas: {completedTasks}</span>
          </span>
        </div>

        {/* Stage navigation arrows */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canMoveLeft}
            onClick={(e) => {
              e.stopPropagation();
              onMoveLeft?.();
            }}
            title="Mover para etapa anterior"
          >
            <ChevronLeft className={cn(
              "w-4 h-4",
              canMoveLeft ? "text-muted-foreground" : "text-muted-foreground/30"
            )} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canMoveRight}
            onClick={(e) => {
              e.stopPropagation();
              onMoveRight?.();
            }}
            title="Mover para próxima etapa"
          >
            <ChevronRight className={cn(
              "w-4 h-4",
              canMoveRight ? "text-muted-foreground" : "text-muted-foreground/30"
            )} />
          </Button>
        </div>
      </div>
    </div>
  );
});

export function StageQuickViewDrawer({
  isOpen,
  onClose,
  stage,
  clientsInStage,
  onOpenClient,
}: StageQuickViewDrawerProps) {
  const { moveClientToStage } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 150);

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!debouncedSearch.trim()) return clientsInStage;
    
    const query = debouncedSearch.toLowerCase();
    return clientsInStage.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.profession.toLowerCase().includes(query) ||
      client.objective.toLowerCase().includes(query)
    );
  }, [clientsInStage, debouncedSearch]);

  // Get adjacent stages for navigation
  const getAdjacentStages = useCallback((currentStage: FunnelStage) => {
    const currentIndex = FUNNEL_STAGES.indexOf(currentStage);
    return {
      prevStage: currentIndex > 0 ? FUNNEL_STAGES[currentIndex - 1] : null,
      nextStage: currentIndex < FUNNEL_STAGES.length - 1 ? FUNNEL_STAGES[currentIndex + 1] : null,
    };
  }, []);

  // Handle moving client to previous stage (optimistic UI)
  const handleMoveLeft = useCallback((client: Client) => {
    if (!stage) return;
    const { prevStage } = getAdjacentStages(stage);
    if (prevStage) {
      // Move to end of previous stage
      moveClientToStage(client.id, prevStage, Date.now());
    }
  }, [stage, getAdjacentStages, moveClientToStage]);

  // Handle moving client to next stage (optimistic UI)
  const handleMoveRight = useCallback((client: Client) => {
    if (!stage) return;
    const { nextStage } = getAdjacentStages(stage);
    if (nextStage) {
      // Move to end of next stage
      moveClientToStage(client.id, nextStage, Date.now());
    }
  }, [stage, getAdjacentStages, moveClientToStage]);

  // Get navigation availability for current stage
  const stageNavigation = stage ? getAdjacentStages(stage) : { prevStage: null, nextStage: null };

  // Reset search when drawer closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery('');
      onClose();
    }
  };

  if (!stage) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[420px] sm:w-[420px] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle className="text-lg font-semibold">
            Clientes em {getStageDisplayLabel(stage)} ({clientsInStage.length})
          </SheetTitle>
          
          {/* Search field */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, profissão ou objetivo..."
              className="pl-9 h-10"
            />
          </div>
        </SheetHeader>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente nesta etapa'}
            </div>
          ) : (
            filteredClients.map(client => (
              <ClientCompactCard
                key={client.id}
                client={client}
                onOpenClient={() => {
                  onClose();
                  onOpenClient(client);
                }}
                onMoveLeft={() => handleMoveLeft(client)}
                onMoveRight={() => handleMoveRight(client)}
                canMoveLeft={!!stageNavigation.prevStage}
                canMoveRight={!!stageNavigation.nextStage}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
