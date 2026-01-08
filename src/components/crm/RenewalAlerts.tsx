import { useEffect, useState } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';

interface RenewalAlert {
  client: Client;
  daysUntilRenewal: number;
  urgency: '7days' | '30days';
}

interface RenewalAlertsProps {
  onEditClient: (client: Client) => void;
}

export function RenewalAlerts({ onEditClient }: RenewalAlertsProps) {
  const { clients } = useClients();
  const [alerts, setAlerts] = useState<RenewalAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const today = new Date();
    const newAlerts: RenewalAlert[] = [];

    clients.forEach((client) => {
      if (!client.renewalDate) return;
      if (client.renewed) return; // Already renewed

      const renewalDate = new Date(client.renewalDate);
      const daysUntil = differenceInDays(renewalDate, today);

      if (daysUntil <= 7 && daysUntil >= 0) {
        newAlerts.push({ client, daysUntilRenewal: daysUntil, urgency: '7days' });
      } else if (daysUntil <= 30 && daysUntil > 7) {
        newAlerts.push({ client, daysUntilRenewal: daysUntil, urgency: '30days' });
      }
    });

    // Sort by days until renewal (most urgent first)
    newAlerts.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
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
          className={`flex items-center justify-between gap-4 p-3 rounded-lg border animate-fade-in ${
            alert.urgency === '7days'
              ? 'bg-destructive/10 border-destructive/30'
              : 'bg-warning/10 border-warning/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              alert.urgency === '7days' ? 'bg-destructive/20' : 'bg-warning/20'
            }`}>
              <Bell className={`w-4 h-4 ${
                alert.urgency === '7days' ? 'text-destructive' : 'text-warning'
              }`} />
            </div>
            <div>
              <p className={`font-medium text-sm ${
                alert.urgency === '7days' ? 'text-destructive' : 'text-warning'
              }`}>
                {alert.urgency === '7days' ? '⚠️ Renovação urgente!' : '📅 Renovação próxima'}
              </p>
              <p className="text-sm">
                <span className="font-medium">{alert.client.name}</span>
                {' - '}
                <span className="text-muted-foreground">
                  {alert.client.renewalStatus || 'Renovação'} em {alert.daysUntilRenewal} dia(s)
                </span>
              </p>
              {alert.client.renewalDate && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(alert.client.renewalDate), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
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
