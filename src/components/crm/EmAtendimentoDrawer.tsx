import { useState, useMemo, memo } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Client } from '@/types/client';
import { useClients } from '@/contexts/ClientContext';
import { useDebounce } from '@/hooks/useDebounce';

interface EmAtendimentoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClient: (client: Client) => void;
}

const ClientCard = memo(function ClientCard({
  client,
  onOpen,
}: {
  client: Client;
  onOpen: () => void;
}) {
  const pendingTasks = client.tasks.filter(t => !t.completed).length;

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
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Abrir
        </Button>
      </div>
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
  const { clients } = useClients();
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
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
