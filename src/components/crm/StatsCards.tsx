import { useState } from 'react';
import { Users, RefreshCw, DollarSign, Bell, Clock } from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WeeklyAlertsDrawer, type WeeklyTask } from './DailyAlertsDrawer';

interface StatsCardsProps {
  onTotalClientsClick: () => void;
  onRenewalsClick: () => void;
  onFinancialAssetsClick: () => void;
  onPendingScheduleClick?: () => void;
}

export function StatsCards({ onTotalClientsClick, onRenewalsClick, onFinancialAssetsClick }: StatsCardsProps) {
  const { clients } = useClients();
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeClients = clients.filter(c => !c.consultingFinished);
  const totalClients = activeClients.length;
  const pendingCount = weeklyTasks.filter(t => !t.completed).length;

  const renewedCount = activeClients.filter(
    c => c.renewalStatus === 'Renovação' || c.renewed
  ).length;
  const renewalPotentialCount = activeClients.filter(
    c => (c.renewalStatus === 'Potencial Renovação' || c.renewalPotential) && !c.renewed && c.renewalStatus !== 'Renovação'
  ).length;
  const totalRenewals = renewedCount + renewalPotentialCount;

  const totalFinancialAssets = activeClients.reduce((sum, client) => sum + (client.patrimonioFinanceiroLiquido ?? 0), 0);
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
    return `R$ ${value}`;
  };

  const today = new Date();
  const inactiveCount = activeClients.filter(client => {
    const lastActivity = client.lastActivityAt ? new Date(client.lastActivityAt) : client.updatedAt;
    return differenceInDays(today, lastActivity) >= 30;
  }).length;

  const stats = [
    {
      label: 'Total de Clientes',
      value: totalClients,
      icon: Users,
      color: 'bg-primary/10 text-primary',
      onClick: onTotalClientsClick,
    },
    {
      label: 'Renovações',
      value: totalRenewals,
      subtitle: `${renewedCount} confirmadas · ${renewalPotentialCount} potencial`,
      icon: RefreshCw,
      color: 'bg-success/10 text-success',
      onClick: onRenewalsClick,
    },
    {
      label: 'Patrimônio Total',
      value: formatCurrency(totalFinancialAssets),
      icon: DollarSign,
      color: 'bg-primary/10 text-primary',
      onClick: onFinancialAssetsClick,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Trigger Alertas da Semana */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          className="gap-2"
        >
          <Bell className="w-4 h-4" />
          Alertas da Semana
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            className={`crm-card p-4 flex items-center gap-4 animate-scale-in transition-all ${
              stat.onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md' : ''
            }`}
          >
            <div className={`p-3 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {inactiveCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-muted-foreground/20">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            <strong>{inactiveCount}</strong> cliente{inactiveCount > 1 ? 's' : ''} sem acompanhamento há 30+ dias
          </span>
        </div>
      )}

      <WeeklyAlertsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tasks={weeklyTasks}
        onTasksChange={setWeeklyTasks}
      />
    </div>
  );
}
