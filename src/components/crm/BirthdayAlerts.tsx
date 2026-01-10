import { Cake, ExternalLink } from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { Button } from '@/components/ui/button';
import { isSameDay, isSameMonth } from 'date-fns';

interface BirthdayAlertsProps {
  onEditClient: (client: Client) => void;
}

export function BirthdayAlerts({ onEditClient }: BirthdayAlertsProps) {
  const { clients } = useClients();
  const today = new Date();

  // Find clients with birthday today (only active clients)
  const birthdayClients = clients.filter(client => {
    if (client.consultingFinished) return false;
    if (!client.birthDate) return false;
    
    const birthDate = new Date(client.birthDate);
    return isSameDay(today, new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()));
  });

  if (birthdayClients.length === 0) return null;

  return (
    <div className="space-y-2">
      {birthdayClients.map((client) => (
        <div
          key={client.id}
          className="flex items-center justify-between p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-pink-500/20">
              <Cake className="w-4 h-4 text-pink-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                🎉 Hoje é aniversário de <strong>{client.name}</strong>!
              </p>
              <p className="text-xs text-muted-foreground">
                Não esqueça de enviar os parabéns
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClient(client)}
            className="text-pink-600 border-pink-500/30 hover:bg-pink-500/10"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Abrir
          </Button>
        </div>
      ))}
    </div>
  );
}
