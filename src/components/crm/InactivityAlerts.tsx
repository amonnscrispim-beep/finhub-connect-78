import { useEffect, useState } from 'react';
import { Clock, X, ExternalLink, CheckCircle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useClients } from '@/contexts/ClientContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Client } from '@/types/client';

interface InactivityAlert {
  client: Client;
  daysSinceActivity: number;
}

interface InactivityAlertsProps {
  onEditClient: (client: Client) => void;
}

export function InactivityAlerts({ onEditClient }: InactivityAlertsProps) {
  const { clients, updateClient } = useClients();
  const { logActivity } = useActivityLog();
  const [alerts, setAlerts] = useState<InactivityAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const today = new Date();
    const newAlerts: InactivityAlert[] = [];

    clients.forEach((client) => {
      // Use max of lastActivityAt and latest completed task date
      let latestDate = client.lastActivityAt ? new Date(client.lastActivityAt) : client.updatedAt;

      const completedTasks = client.tasks?.filter(t => t.completed && t.completedAt) || [];
      completedTasks.forEach(t => {
        const taskDate = new Date(t.completedAt!);
        if (taskDate > latestDate) latestDate = taskDate;
      });

      const daysSince = differenceInDays(today, latestDate);

      if (daysSince >= 20) {
        newAlerts.push({ client, daysSinceActivity: daysSince });
      }
    });

    newAlerts.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
    setAlerts(newAlerts);
  }, [clients]);

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.client.id));

  const handleDismiss = (clientId: string) => {
    setDismissedAlerts(prev => new Set([...prev, clientId]));
  };

  const handleCheckFollowUp = async (client: Client) => {
    const now = new Date();
    await updateClient(client.id, { lastActivityAt: now, updatedAt: now });
    await logActivity('follow_up', `Acompanhamento registrado para ${client.name}`, client.id, client.name);
    // Remove from visible alerts immediately
    setDismissedAlerts(prev => new Set([...prev, client.id]));
  };

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
              onClick={() => handleCheckFollowUp(alert.client)}
              className="h-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
              title="Marcar acompanhamento"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
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
