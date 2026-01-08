import { useState } from 'react';
import { 
  Plus, 
  Download, 
  LayoutGrid, 
  Table as TableIcon,
  Briefcase
} from 'lucide-react';
import { ClientProvider, useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { StatsCards } from '@/components/crm/StatsCards';
import { TableView } from '@/components/crm/TableView';
import { KanbanView } from '@/components/crm/KanbanView';
import { ClientModal } from '@/components/crm/ClientModal';
import { PendingScheduleModal } from '@/components/crm/PendingScheduleModal';
import { TotalClientsModal } from '@/components/crm/TotalClientsModal';
import { RenewalsModal } from '@/components/crm/RenewalsModal';
import { RenewalAlerts } from '@/components/crm/RenewalAlerts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function CRMDashboard() {
  const { clients } = useClients();
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [pendingScheduleModalOpen, setPendingScheduleModalOpen] = useState(false);
  const [totalClientsModalOpen, setTotalClientsModalOpen] = useState(false);
  const [renewalsModalOpen, setRenewalsModalOpen] = useState(false);

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
      {/* Header */}
      <header className="crm-header sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-foreground/10 rounded-xl">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">CRM Financeiro</h1>
                <p className="text-sm text-primary-foreground/70">Gestão de Clientes</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportCSV}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                onClick={handleNewClient}
                className="crm-btn-accent"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Renewal Alerts */}
        <RenewalAlerts onEditClient={handleEditClient} />

        {/* Stats */}
        <StatsCards 
          onPendingScheduleClick={() => setPendingScheduleModalOpen(true)}
          onTotalClientsClick={() => setTotalClientsModalOpen(true)}
          onRenewalsClick={() => setRenewalsModalOpen(true)}
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
          </div>

          <TabsContent value="table" className="mt-4 animate-fade-in">
            <TableView onEditClient={handleEditClient} />
          </TabsContent>

          <TabsContent value="kanban" className="mt-4 animate-fade-in">
            <div className="crm-card overflow-hidden">
              <KanbanView onEditClient={handleEditClient} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Client Modal */}
      <ClientModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        client={editingClient}
      />
      
      {/* Pending Schedule Modal */}
      <PendingScheduleModal
        open={pendingScheduleModalOpen}
        onOpenChange={setPendingScheduleModalOpen}
        onEditClient={handleEditClient}
      />

      {/* Total Clients Modal */}
      <TotalClientsModal
        open={totalClientsModalOpen}
        onOpenChange={setTotalClientsModalOpen}
      />

      {/* Renewals Modal */}
      <RenewalsModal
        open={renewalsModalOpen}
        onOpenChange={setRenewalsModalOpen}
        onEditClient={handleEditClient}
      />
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
