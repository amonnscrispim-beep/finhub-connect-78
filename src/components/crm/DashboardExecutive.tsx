import { useState } from 'react';
import { 
  Users, 
  CheckCircle, 
  Globe, 
  Plane, 
  TrendingUp, 
  DollarSign,
  AlertCircle,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { differenceInDays, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DashboardExecutiveProps {
  onEditClient: (client: Client) => void;
}

export function DashboardExecutive({ onEditClient }: DashboardExecutiveProps) {
  const { clients } = useClients();
  const [showPatrimonyModal, setShowPatrimonyModal] = useState(false);
  
  const today = new Date();
  
  // Filter active and finalized clients
  const activeClients = clients.filter(c => !c.consultingFinished);
  const finalizedClients = clients.filter(c => c.consultingFinished);
  
  // Location breakdown
  const clientsInBrazil = activeClients.filter(c => c.residence === 'Mora no Brasil').length;
  const clientsAbroad = activeClients.filter(c => c.residence === 'Mora no exterior').length;
  
  // Portfolio health (based on last activity)
  const healthyClients = activeClients.filter(c => {
    const lastActivity = c.lastActivityAt ? new Date(c.lastActivityAt) : c.updatedAt;
    return differenceInDays(today, lastActivity) < 30;
  }).length;
  
  const warningClients = activeClients.filter(c => {
    const lastActivity = c.lastActivityAt ? new Date(c.lastActivityAt) : c.updatedAt;
    const days = differenceInDays(today, lastActivity);
    return days >= 30 && days < 60;
  }).length;
  
  const criticalClients = activeClients.filter(c => {
    const lastActivity = c.lastActivityAt ? new Date(c.lastActivityAt) : c.updatedAt;
    return differenceInDays(today, lastActivity) >= 60;
  }).length;
  
  // Total patrimony (only active clients)
  const totalPatrimony = activeClients.reduce((sum, c) => sum + c.financialAssets, 0);
  
  // Sorted clients by patrimony for ranking
  const sortedByPatrimony = [...activeClients].sort((a, b) => b.financialAssets - a.financialAssets);
  
  // Generate historical data for charts (last 6 months)
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(today, 5 - i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    // Simulated data based on creation date
    const clientsAtMonth = clients.filter(c => 
      new Date(c.createdAt) <= monthEnd && !c.consultingFinished
    ).length;
    
    const patrimonyAtMonth = clients
      .filter(c => new Date(c.createdAt) <= monthEnd && !c.consultingFinished)
      .reduce((sum, c) => sum + c.financialAssets, 0);
    
    return {
      month: format(monthDate, 'MMM', { locale: ptBR }),
      clients: clientsAtMonth,
      patrimony: patrimonyAtMonth / 1000000, // In millions
    };
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  return (
    <div className="space-y-6">
      {/* Strategic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Clients */}
        <div className="crm-card p-5 border-l-4 border-l-primary">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Clientes Ativos</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{activeClients.length}</p>
        </div>

        {/* Finalized Clients */}
        <div className="crm-card p-5 border-l-4 border-l-muted-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-muted">
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Finalizados</span>
          </div>
          <p className="text-3xl font-bold text-muted-foreground">{finalizedClients.length}</p>
        </div>

        {/* Brazil */}
        <div className="crm-card p-5 border-l-4 border-l-success">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-success/10">
              <Globe className="w-5 h-5 text-success" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">No Brasil</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{clientsInBrazil}</p>
        </div>

        {/* Abroad */}
        <div className="crm-card p-5 border-l-4 border-l-accent">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-accent/10">
              <Plane className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">No Exterior</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{clientsAbroad}</p>
        </div>
      </div>

      {/* Portfolio Health + Total Patrimony */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Portfolio Health */}
        <div className="crm-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Saúde da Carteira
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Healthy */}
            <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
              <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">{healthyClients}</p>
              <p className="text-xs text-muted-foreground">&lt; 30 dias</p>
            </div>
            {/* Warning */}
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 text-center">
              <AlertTriangle className="w-6 h-6 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-warning">{warningClients}</p>
              <p className="text-xs text-muted-foreground">30-60 dias</p>
            </div>
            {/* Critical */}
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
              <p className="text-2xl font-bold text-destructive">{criticalClients}</p>
              <p className="text-xs text-muted-foreground">&gt; 60 dias</p>
            </div>
          </div>
        </div>

        {/* Total Patrimony */}
        <div 
          className="crm-card p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setShowPatrimonyModal(true)}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Patrimônio Total sob Consultoria
          </h3>
          <p className="text-4xl font-bold text-primary mb-2">{formatCurrency(totalPatrimony)}</p>
          <p className="text-sm text-muted-foreground">
            Clique para ver o ranking completo
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clients Evolution */}
        <div className="crm-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Evolução de Clientes Ativos
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="clients" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  name="Clientes"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patrimony Evolution */}
        <div className="crm-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Evolução do Patrimônio (em milhões)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}M`, 'Patrimônio']}
                />
                <Line 
                  type="monotone" 
                  dataKey="patrimony" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))' }}
                  name="Patrimônio"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Engagement Heatmap */}
      <div className="crm-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Heatmap de Engajamento por Cliente
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {activeClients.slice(0, 12).map(client => {
            const lastActivity = client.lastActivityAt ? new Date(client.lastActivityAt) : client.updatedAt;
            const daysSinceActivity = differenceInDays(today, lastActivity);
            const taskCount = client.tasks.length;
            
            let bgColor = 'bg-success/30';
            if (daysSinceActivity >= 60) bgColor = 'bg-destructive/30';
            else if (daysSinceActivity >= 30) bgColor = 'bg-warning/30';
            
            return (
              <div 
                key={client.id}
                onClick={() => onEditClient(client)}
                className={`p-3 rounded-lg ${bgColor} cursor-pointer hover:scale-105 transition-transform`}
              >
                <p className="text-xs font-medium text-foreground truncate">{client.name.split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground">{taskCount} tarefas</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/30" />
            <span>&lt; 30 dias</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning/30" />
            <span>30-60 dias</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/30" />
            <span>&gt; 60 dias</span>
          </div>
        </div>
      </div>

      {/* Patrimony Ranking Modal */}
      <Dialog open={showPatrimonyModal} onOpenChange={setShowPatrimonyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Ranking de Patrimônio
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {sortedByPatrimony.map((client, index) => (
                <div 
                  key={client.id}
                  onClick={() => {
                    onEditClient(client);
                    setShowPatrimonyModal(false);
                  }}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                      index === 1 ? 'bg-gray-300/30 text-gray-600' :
                      index === 2 ? 'bg-orange-500/20 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.profession}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-primary">{formatCurrency(client.financialAssets)}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
