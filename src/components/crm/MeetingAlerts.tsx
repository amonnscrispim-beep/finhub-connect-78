import { useEffect, useState } from 'react';
import { Calendar, X, ExternalLink } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';

interface MeetingAlert {
  client: Client;
  meetingDate: Date;
}

interface MeetingAlertsProps {
  onEditClient: (client: Client) => void;
}

export function MeetingAlerts({ onEditClient }: MeetingAlertsProps) {
  const { clients } = useClients();
  const [alerts, setAlerts] = useState<MeetingAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const newAlerts: MeetingAlert[] = [];

    clients.forEach((client) => {
      if (!client.scheduledMeeting?.date) return;

      const meetingDate = new Date(client.scheduledMeeting.date);
      const daysUntil = differenceInDays(meetingDate, today);

      // Alert for meetings tomorrow (1 day before)
      if (daysUntil === 1 || (daysUntil === 0 && meetingDate > today)) {
        newAlerts.push({ client, meetingDate });
      }
    });

    setAlerts(newAlerts);
  }, [clients]);

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.client.id));

  const handleDismiss = (clientId: string) => {
    setDismissedAlerts(prev => new Set([...prev, clientId]));
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.client.id}
          className="flex items-center justify-between gap-4 p-3 rounded-lg border animate-fade-in bg-primary/10 border-primary/30"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-primary">
                📅 Reunião agendada para amanhã
              </p>
              <p className="text-sm">
                <span className="font-medium">{alert.client.name}</span>
                {alert.client.scheduledMeeting?.time && (
                  <span className="text-muted-foreground"> às {alert.client.scheduledMeeting.time}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(alert.meetingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
