import { Users, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';

interface StatsCardsProps {
  onPendingScheduleClick: () => void;
  onTotalClientsClick: () => void;
  onRenewalsClick: () => void;
}

export function StatsCards({ onPendingScheduleClick, onTotalClientsClick, onRenewalsClick }: StatsCardsProps) {
  const { clients } = useClients();

  const totalClients = clients.length;
  const pendingScheduleCount = clients.filter(c => c.pendingSchedule).length;
  const renewedCount = clients.filter(
    c => c.renewalStatus === 'Renovação' || c.renewed
  ).length;
  const renewalPotential = clients.filter(
    c => (c.renewalStatus === 'Potencial Renovação' || c.renewalPotential) && !c.renewed && c.renewalStatus !== 'Renovação'
  ).length;

  const stats = [
    {
      label: 'Total de Clientes',
      value: totalClients,
      icon: Users,
      color: 'bg-primary/10 text-primary',
      onClick: onTotalClientsClick,
    },
    {
      label: 'Agendamento Pendente',
      value: pendingScheduleCount,
      icon: AlertTriangle,
      color: pendingScheduleCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/10 text-muted-foreground',
      highlight: pendingScheduleCount > 0,
      onClick: onPendingScheduleClick,
    },
    {
      label: 'Renovações',
      value: renewedCount,
      icon: RefreshCw,
      color: 'bg-success/10 text-success',
      onClick: onRenewalsClick,
    },
    {
      label: 'Potencial Renovação',
      value: renewalPotential,
      icon: TrendingUp,
      color: 'bg-accent/10 text-accent',
      onClick: onRenewalsClick,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          onClick={stat.onClick}
          className={`crm-card p-4 flex items-center gap-4 animate-scale-in transition-all ${
            stat.onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md' : ''
          } ${stat.highlight ? 'ring-2 ring-destructive/30 bg-destructive/5' : ''}`}
        >
          <div className={`p-3 rounded-xl ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${stat.highlight ? 'text-destructive' : 'text-foreground'}`}>
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
