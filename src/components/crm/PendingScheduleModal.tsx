import { X, Calendar, User, ChevronRight } from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PendingScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClient: (client: Client) => void;
}

export function PendingScheduleModal({ open, onOpenChange, onEditClient }: PendingScheduleModalProps) {
  const { clients, updateClient } = useClients();
  
  const pendingClients = clients.filter(c => c.pendingSchedule);

  const handleMarkScheduled = (client: Client) => {
    updateClient(client.id, { pendingSchedule: false });
  };

  const handleOpenClient = (client: Client) => {
    onOpenChange(false);
    onEditClient(client);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Calendar className="w-5 h-5" />
            Agendamentos Pendentes ({pendingClients.length})
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {pendingClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum agendamento pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingClients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-full bg-destructive/10">
                        <User className="w-4 h-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{client.name}</h4>
                        <p className="text-sm text-muted-foreground">{client.funnelStage}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Última atualização: {client.updatedAt.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => handleOpenClient(client)}
                      >
                        Abrir
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs h-8 bg-success hover:bg-success/90"
                        onClick={() => handleMarkScheduled(client)}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Agendar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
