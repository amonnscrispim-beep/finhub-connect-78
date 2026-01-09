import { useEffect, useState } from 'react';
import { Clock, X, ExternalLink } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';

interface InactivityAlert {
  client: Client;
  daysSinceActivity: number;
}

interface InactivityAlertsProps {
  onEditClient: (client: Client) => void;
}

export function InactivityAlerts({ onEditClient }: InactivityAlertsProps) {
  const { clients } = useClients();
  const [alerts, setAlerts] = useState<InactivityAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const today = new Date();
    const newAlerts: InactivityAlert[] = [];

    clients.forEach((client) => {
      const lastActivity = client.lastActivityAt ? new Date(client.lastActivityAt) : client.updatedAt;
      const daysSince = differenceInDays(today, lastActivity);

      if (daysSince >= 30) {
        newAlerts.push({ client, daysSinceActivity: daysSince });
      }
    });

    // Sort by days since activity (most inactive first)
    newAlerts.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
    setAlerts(newAlerts);
  }, [clients]);

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.client.id));

  const handleDismiss = (clientId: string) => {
    setDismissedAlerts(prev => new Set([...prev, clientId]));
  };

  // Only show top 3 alerts
  const displayedAlerts = visibleAlerts.slice(0, 3);

  if (displayedAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {displayedAlerts.map((alert) => (
        <div
          key={alert.client.id}
          className="flex items-center justify-between gap-4 p-3 rounded-lg border animate-fade-in bg-muted/50 border-muted-foreground/30"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted-foreground/20">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground">
                ⏰ Sem acompanhamento há {alert.daysSinceActivity} dias
              </p>
              <p className="text-sm">
                <span className="font-medium">{alert.client.name}</span>
                <span className="text-muted-foreground"> - {alert.client.funnelStage}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEditClient(alert.client)}
              className="h-8"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Abrir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDismiss(alert.client.id)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
