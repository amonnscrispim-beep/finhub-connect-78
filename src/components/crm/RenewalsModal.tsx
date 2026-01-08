import { RefreshCw, TrendingUp, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';

interface RenewalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClient: (client: Client) => void;
}

export function RenewalsModal({ open, onOpenChange, onEditClient }: RenewalsModalProps) {
  const { clients } = useClients();

  const renewalClients = clients.filter(
    c => c.renewalStatus === 'Renovação' || c.renewalStatus === 'Potencial Renovação' || c.renewed || c.renewalPotential
  );

  const handleOpenClient = (client: Client) => {
    onOpenChange(false);
    onEditClient(client);
  };

  const getStatusLabel = (client: Client) => {
    if (client.renewalStatus === 'Renovação' || client.renewed) {
      return { label: 'Renovação', color: 'bg-success/10 text-success' };
    }
    if (client.renewalStatus === 'Potencial Renovação' || client.renewalPotential) {
      return { label: 'Potencial Renovação', color: 'bg-accent/10 text-accent' };
    }
    return { label: 'N/A', color: 'bg-muted text-muted-foreground' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="bg-success text-success-foreground p-6 rounded-t-lg">
          <DialogTitle className="text-xl flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Renovações ({renewalClients.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="p-6">
            {renewalClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cliente com renovação ou potencial.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {renewalClients.map((client) => {
                  const status = getStatusLabel(client);
                  return (
                    <div
                      key={client.id}
                      className="crm-card p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{client.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {client.funnelStage}
                        </p>
                        {client.renewalDate && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Data prevista: {format(new Date(client.renewalDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenClient(client)}
                        className="shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Abrir
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
