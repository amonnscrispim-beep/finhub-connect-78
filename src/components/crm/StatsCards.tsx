import { Users, UserCheck, RefreshCw, TrendingUp } from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';

export function StatsCards() {
  const { clients } = useClients();

  const totalClients = clients.length;
  const inAttendance = clients.filter(c => c.funnelStage !== 'Novo cliente' && c.funnelStage !== 'Conclusão').length;
  const renewedCount = clients.filter(c => c.renewed).length;
  const renewalPotential = clients.filter(c => c.renewalPotential && !c.renewed).length;

  const stats = [
    {
      label: 'Total de Clientes',
      value: totalClients,
      icon: Users,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Em Atendimento',
      value: inAttendance,
      icon: UserCheck,
      color: 'bg-warning/10 text-warning',
    },
    {
      label: 'Renovações',
      value: renewedCount,
      icon: RefreshCw,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Potencial Renovação',
      value: renewalPotential,
      icon: TrendingUp,
      color: 'bg-accent/10 text-accent',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="crm-card p-4 flex items-center gap-4 animate-scale-in"
        >
          <div className={`p-3 rounded-xl ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
