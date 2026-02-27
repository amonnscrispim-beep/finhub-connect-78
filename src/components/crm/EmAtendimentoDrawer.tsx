import { useState, useMemo, memo, useCallback } from 'react';
import { Search, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Client, FunnelStage, KANBAN_COLUMN_STAGES } from '@/types/client';
import { useClients } from '@/contexts/ClientContext';
import { useDebounce } from '@/hooks/useDebounce';
import { getStageDisplayLabel } from '@/lib/funnel-utils';
import { toast } from 'sonner';

interface EmAtendimentoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClient: (client: Client) => void;
}

// Stages you can move TO (exclude "Em atendimento" itself)
const MOVABLE_STAGES = FUNNEL_STAGES.filter(s => s !== 'Em atendimento');

const ClientCard = memo(function ClientCard({
  client,
  onOpen,
  onMoveStage,
}: {
  client: Client;
  onOpen: () => void;
  onMoveStage: (stage: FunnelStage) => void;
}) {
  const pendingTasks = client.tasks.filter(t => !t.completed).length;
  const [showMoveSelector, setShowMoveSelector] = useState(false);

  return (
    <div className="p-4 bg-card rounded-xl border border-border/50 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-1">
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
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveSelector(!showMoveSelector);
            }}
            title="Mover etapa"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Abrir
          </Button>
        </div>
      </div>

      {/* Move stage selector */}
      {showMoveSelector && (
        <div className="mt-2 p-2 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Mover para:</p>
          <Select onValueChange={(value) => {
            onMoveStage(value as FunnelStage);
            setShowMoveSelector(false);
          }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecionar etapa..." />
            </SelectTrigger>
            <SelectContent>
              {MOVABLE_STAGES.map(stage => (
                <SelectItem key={stage} value={stage} className="text-xs">
                  {getStageDisplayLabel(stage)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {client.objective && (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {client.objective}
        </p>
      )}
      {pendingTasks > 0 && (
        <p className="text-xs text-warning mt-2 font-medium">
          {pendingTasks} tarefa{pendingTasks > 1 ? 's' : ''} pendente{pendingTasks > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
});

export function EmAtendimentoDrawer({ isOpen, onClose, onOpenClient }: EmAtendimentoDrawerProps) {
  const { clients, moveClientToStage } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 150);

  const emAtendimentoClients = useMemo(() => {
    return clients.filter(c => c.funnelStage === 'Em atendimento' && !c.consultingFinished);
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!debouncedSearch.trim()) return emAtendimentoClients;
    const q = debouncedSearch.toLowerCase();
    return emAtendimentoClients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.profession.toLowerCase().includes(q) ||
      c.objective.toLowerCase().includes(q)
    );
  }, [emAtendimentoClients, debouncedSearch]);

  const handleMoveStage = useCallback((clientId: string, stage: FunnelStage) => {
    moveClientToStage(clientId, stage);
    toast.success(`Cliente movido para "${getStageDisplayLabel(stage)}"`);
  }, [moveClientToStage]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="left" className="w-[400px] sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle className="text-lg font-semibold">
            Em atendimento ({emAtendimentoClients.length})
          </SheetTitle>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente em atendimento'}
            </div>
          ) : (
            filteredClients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                onOpen={() => {
                  onClose();
                  onOpenClient(client);
                }}
                onMoveStage={(stage) => handleMoveStage(client.id, stage)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
