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
  periodicityDays: number;
  daysOverdue: number;
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
      const period = client.meetingPeriodicityDays ?? 30;
      let latestDate = client.lastMeetingDate
        ? new Date(client.lastMeetingDate)
        : (client.lastActivityAt ? new Date(client.lastActivityAt) : client.updatedAt);

      const completedTasks = client.tasks?.filter(t => t.completed && t.completedAt) || [];
      completedTasks.forEach(t => {
        const taskDate = new Date(t.completedAt!);
        if (taskDate > latestDate) latestDate = taskDate;
      });

      const daysSince = differenceInDays(today, latestDate);

      if (daysSince >= period) {
        newAlerts.push({ client, daysSinceActivity: daysSince, periodicityDays: period, daysOverdue: daysSince - period });
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
    await updateClient(client.id, { lastActivityAt: now, lastMeetingDate: now, updatedAt: now });
    await logActivity('follow_up', `Acompanhamento registrado para ${client.name}`, client.id, client.name);
    setDismissedAlerts(prev => new Set([...prev, client.id]));
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.client.id}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded border bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/50 animate-fade-in"
        >
          <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-900 dark:text-amber-100 whitespace-nowrap">
            <span className="font-semibold">{alert.client.name}</span>
            <span className="mx-1.5 opacity-60">·</span>
            {alert.daysOverdue > 7 ? (
              <span className="font-semibold text-destructive">{alert.daysOverdue}d de atraso</span>
            ) : (
              <span className="font-semibold text-amber-700 dark:text-amber-300">Reunião próxima</span>
            )}
            <span className="ml-1 opacity-70">(ciclo de {alert.periodicityDays}d)</span>
          </span>
          <div className="flex items-center gap-0.5 ml-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCheckFollowUp(alert.client)}
              className="h-6 w-6 p-0 text-amber-800 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/40"
              title="Marcar acompanhamento"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEditClient(alert.client)}
              className="h-6 w-6 p-0 text-amber-800 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/40"
              title="Abrir cliente"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDismiss(alert.client.id)}
              className="h-6 w-6 p-0 text-amber-800 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/40"
              title="Dispensar"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
