import { Globe, MapPin, Users, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClients } from '@/contexts/ClientContext';

interface TotalClientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TotalClientsModal({ open, onOpenChange }: TotalClientsModalProps) {
  const { clients } = useClients();

  // Only count active clients (not finalized)
  const activeClients = clients.filter(c => !c.consultingFinished);
  const finalizedClients = clients.filter(c => c.consultingFinished);

  const totalActiveClients = activeClients.length;
  const clientsInBrazil = activeClients.filter(c => c.residence !== 'Mora no exterior').length;
  const clientsAbroad = activeClients.filter(c => c.residence === 'Mora no exterior').length;

  const brazilClients = activeClients.filter(c => c.residence !== 'Mora no exterior');
  const abroadClients = activeClients.filter(c => c.residence === 'Mora no exterior');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0">
        <DialogHeader className="crm-header p-6 rounded-t-lg">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="w-5 h-5" />
            Total de Clientes
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="crm-card p-4 text-center col-span-2">
                <p className="text-3xl font-bold text-primary">{totalActiveClients}</p>
                <p className="text-sm text-muted-foreground">Total Geral (Ativos)</p>
              </div>
              <div className="crm-card p-4 text-center bg-success/5 border-success/20">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MapPin className="w-4 h-4 text-success" />
                </div>
                <p className="text-3xl font-bold text-success">{clientsInBrazil}</p>
                <p className="text-sm text-muted-foreground">No Brasil</p>
              </div>
              <div className="crm-card p-4 text-center bg-accent/5 border-accent/20">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Globe className="w-4 h-4 text-accent" />
                </div>
                <p className="text-3xl font-bold text-accent">{clientsAbroad}</p>
                <p className="text-sm text-muted-foreground">No Exterior</p>
              </div>
            </div>

            {/* Brazil Clients List */}
            {brazilClients.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-success" />
                  Clientes no Brasil ({brazilClients.length})
                </h3>
                <div className="space-y-2">
                  {brazilClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-3 bg-muted/30 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.city}, {client.state}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                        Brasil
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Abroad Clients List */}
            {abroadClients.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-accent" />
                  Clientes no Exterior ({abroadClients.length})
                </h3>
                <div className="space-y-2">
                  {abroadClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-3 bg-muted/30 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.city}{client.state ? `, ${client.state}` : ''}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
                        Exterior
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finalized Clients List */}
            {finalizedClients.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  Clientes Finalizados ({finalizedClients.length})
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Estes clientes não são contabilizados no total geral
                </p>
                <div className="space-y-2">
                  {finalizedClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-3 bg-muted/30 rounded-lg flex items-center justify-between opacity-70"
                    >
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.city}, {client.state}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                        Finalizado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
