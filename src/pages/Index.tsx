import { useState, useMemo } from 'react';
import { LayoutGrid, Table as TableIcon, BarChart3, TrendingUp } from 'lucide-react';
import { ClientProvider, useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { CRMHeader } from '@/components/crm/CRMHeader';
import { StatsCards } from '@/components/crm/StatsCards';
import { TableView } from '@/components/crm/TableView';
import { KanbanView } from '@/components/crm/KanbanView';
import { ClientModal } from '@/components/crm/ClientModal';
import { PendingScheduleModal } from '@/components/crm/PendingScheduleModal';
import { TotalClientsModal } from '@/components/crm/TotalClientsModal';
import { RenewalsModal } from '@/components/crm/RenewalsModal';
import { RenewalAlerts } from '@/components/crm/RenewalAlerts';
import { MeetingAlerts } from '@/components/crm/MeetingAlerts';
import { InactivityAlerts } from '@/components/crm/InactivityAlerts';
import { BirthdayAlerts } from '@/components/crm/BirthdayAlerts';
import { FinancialAssetsModal } from '@/components/crm/FinancialAssetsModal';
import { DashboardExecutive } from '@/components/crm/DashboardExecutive';
import { DashboardMarket } from '@/components/crm/DashboardMarket';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function CRMDashboard() {
  const { clients } = useClients();
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [dashboardTab, setDashboardTab] = useState<'operacional' | 'executivo' | 'mercado'>('operacional');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [pendingScheduleModalOpen, setPendingScheduleModalOpen] = useState(false);
  const [totalClientsModalOpen, setTotalClientsModalOpen] = useState(false);
  const [renewalsModalOpen, setRenewalsModalOpen] = useState(false);
  const [financialAssetsModalOpen, setFinancialAssetsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.profession.toLowerCase().includes(query) ||
      client.objective.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleNewClient = () => {
    setEditingClient(undefined);
    setModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = [
      'Nome', 'Email', 'Telefone', 'Cidade', 'UF', 'Residência', 'Profissão',
      'Objetivo', 'Perfil Investidor', 'Faturamento Mensal', 'Aporte Mensal',
      'Etapa Funil', 'Status Renovação', 'Data Renovação', 'Renovado', 'Potencial Renovação', 'Início Contrato', 'Fim Contrato'
    ];

    const rows = clients.map(client => [
      client.name,
      client.email,
      client.phone,
      client.city,
      client.state,
      client.residence || '',
      client.profession,
      client.objective,
      client.investorProfile,
      client.monthlyRevenue.toString(),
      client.monthlyContribution.toString(),
      client.funnelStage,
      client.renewalStatus || '',
      client.renewalDate ? new Date(client.renewalDate).toISOString().split('T')[0] : '',
      client.renewed ? 'Sim' : 'Não',
      client.renewalPotential ? 'Sim' : 'Não',
      client.contractStart.toISOString().split('T')[0],
      client.contractEnd.toISOString().split('T')[0],
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Date/Time and Search */}
      <CRMHeader
        onExportCSV={handleExportCSV}
        onNewClient={handleNewClient}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Dashboard Tabs */}
        <Tabs value={dashboardTab} onValueChange={(v) => setDashboardTab(v as typeof dashboardTab)} className="space-y-4">
          <TabsList className="bg-card border border-border shadow-sm">
            <TabsTrigger 
              value="operacional" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Operacional
            </TabsTrigger>
            <TabsTrigger 
              value="executivo"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Executivo
            </TabsTrigger>
            <TabsTrigger 
              value="mercado"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Mercado
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD OPERACIONAL - Existing functionality preserved */}
          <TabsContent value="operacional" className="space-y-6 animate-fade-in">
            {/* Alerts */}
            <BirthdayAlerts onEditClient={handleEditClient} />
            <RenewalAlerts onEditClient={handleEditClient} />
            <MeetingAlerts onEditClient={handleEditClient} />
            <InactivityAlerts onEditClient={handleEditClient} />

            {/* Stats */}
            <StatsCards 
              onPendingScheduleClick={() => setPendingScheduleModalOpen(true)}
              onTotalClientsClick={() => setTotalClientsModalOpen(true)}
              onRenewalsClick={() => setRenewalsModalOpen(true)}
              onFinancialAssetsClick={() => setFinancialAssetsModalOpen(true)}
            />

            {/* Views */}
            <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'kanban')} className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="table" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <TableIcon className="w-4 h-4 mr-2" />
                    Tabela
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Kanban
                  </TabsTrigger>
                </TabsList>
                
                {searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    Mostrando {filteredClients.length} de {clients.length} clientes
                  </p>
                )}
              </div>

              <TabsContent value="table" className="mt-4 animate-fade-in">
                <TableView onEditClient={handleEditClient} searchQuery={searchQuery} />
              </TabsContent>

              <TabsContent value="kanban" className="mt-4 animate-fade-in">
                <div className="crm-card overflow-hidden">
                  <KanbanView onEditClient={handleEditClient} searchQuery={searchQuery} />
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* DASHBOARD EXECUTIVO - New strategic dashboard */}
          <TabsContent value="executivo" className="animate-fade-in">
            <DashboardExecutive onEditClient={handleEditClient} />
          </TabsContent>

          {/* DASHBOARD MERCADO - Market information */}
          <TabsContent value="mercado" className="animate-fade-in">
            <DashboardMarket />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <ClientModal open={modalOpen} onOpenChange={setModalOpen} client={editingClient} />
      <PendingScheduleModal open={pendingScheduleModalOpen} onOpenChange={setPendingScheduleModalOpen} onEditClient={handleEditClient} />
      <TotalClientsModal open={totalClientsModalOpen} onOpenChange={setTotalClientsModalOpen} />
      <RenewalsModal open={renewalsModalOpen} onOpenChange={setRenewalsModalOpen} onEditClient={handleEditClient} />
      <FinancialAssetsModal open={financialAssetsModalOpen} onOpenChange={setFinancialAssetsModalOpen} onEditClient={handleEditClient} />
    </div>
  );
}

export default function Index() {
  return (
    <ClientProvider>
      <CRMDashboard />
    </ClientProvider>
  );
}
