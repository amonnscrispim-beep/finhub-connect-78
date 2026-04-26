import { useState, useMemo, Component, ReactNode, ErrorInfo } from 'react';
import { LayoutGrid, Table as TableIcon, BarChart3, TrendingUp, LogOut, Loader2, CalendarPlus, GraduationCap, Users, History, Briefcase, FileText } from 'lucide-react';
import { ClientProvider, useClients } from '@/contexts/ClientContext';
import { useAuth } from '@/hooks/useAuth';
import { useUrgentPendencies } from '@/hooks/useUrgentPendencies';
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
import { GoogleCalendarConnect } from '@/components/crm/GoogleCalendarConnect';
import { ScheduleMeetingModal } from '@/components/crm/ScheduleMeetingModal';
import { StudiesArea } from '@/components/studies/StudiesArea';
import { CarteirasRecomendadas } from '@/components/crm/carteiras/CarteirasRecomendadas';
import { GeradorResumos } from '@/components/crm/relatorios/GeradorResumos';

import { EmAtendimentoDrawer } from '@/components/crm/EmAtendimentoDrawer';
import { RecentActivityDropdown } from '@/components/crm/RecentActivityDropdown';
import { FerramentasDropdown, type FerramentaId } from '@/components/ferramentas/FerramentasDropdown';
import { JurosCompostos } from '@/components/ferramentas/JurosCompostos';
import { CalculadoraMilhao } from '@/components/ferramentas/CalculadoraMilhao';
import { PatrimonioIdade } from '@/components/ferramentas/PatrimonioIdade';
import { AlugarOuFinanciar } from '@/components/ferramentas/AlugarOuFinanciar';
import { VistaOuParcelada } from '@/components/ferramentas/VistaOuParcelada';
import { IOFCaixinha } from '@/components/ferramentas/IOFCaixinha';
import { SimuladorCDB } from '@/components/ferramentas/SimuladorCDB';
import { SimuladorLCILCA } from '@/components/ferramentas/SimuladorLCILCA';
import { SimuladorTesouroPre } from '@/components/ferramentas/SimuladorTesouroPre';
import { SimuladorTesouroSelic } from '@/components/ferramentas/SimuladorTesouroSelic';
import { ViverDeDividendos } from '@/components/ferramentas/ViverDeDividendos';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Safe date formatter — returns '' for null/undefined or invalid dates
function safeDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// Error boundary to prevent a single tab/module crash from breaking the whole app
interface ErrorBoundaryProps {
  children: ReactNode;
  label?: string;
}
interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}]`, error, info);
  }
  handleReset = () => this.setState({ hasError: false, errorMessage: '' });
  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-6 text-center space-y-3">
          <p className="text-sm font-medium text-destructive">
            Ocorreu um erro em {this.props.label ?? 'este módulo'}.
          </p>
          {this.state.errorMessage && (
            <p className="text-xs text-muted-foreground font-mono break-all">
              {this.state.errorMessage}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CRMDashboard() {
  const { clients, isLoading } = useClients();
  const { user, signOut } = useAuth();
  const { pendencies, isLoading: pendenciesLoading, addPendency, completePendency, removePendency, clientIdsWithPendencies } = useUrgentPendencies();
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [dashboardTab, setDashboardTab] = useState<'operacional' | 'executivo' | 'estudos' | 'ferramentas' | 'carteiras' | 'gerador'>('operacional');
  const [ferramentaAtiva, setFerramentaAtiva] = useState<FerramentaId>('juros-compostos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [pendingScheduleModalOpen, setPendingScheduleModalOpen] = useState(false);
  const [totalClientsModalOpen, setTotalClientsModalOpen] = useState(false);
  const [renewalsModalOpen, setRenewalsModalOpen] = useState(false);
  const [financialAssetsModalOpen, setFinancialAssetsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleMeetingModalOpen, setScheduleMeetingModalOpen] = useState(false);
  const [emAtendimentoDrawerOpen, setEmAtendimentoDrawerOpen] = useState(false);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.profession.toLowerCase().includes(query) ||
      client.objective.toLowerCase().includes(query) ||
      client.city?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query)
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

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sessão encerrada');
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
      safeDate(client.renewalDate),
      client.renewed ? 'Sim' : 'Não',
      client.renewalPotential ? 'Sim' : 'Não',
      safeDate(client.contractStart),
      safeDate(client.contractEnd),
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Date/Time and Search */}
      <CRMHeader
        onExportCSV={handleExportCSV}
        onNewClient={handleNewClient}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* User bar with logout */}
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Logado como: <span className="font-medium text-foreground">{user?.email}</span>
          </span>
          <div className="flex items-center gap-3">
            <GoogleCalendarConnect compact />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setScheduleMeetingModalOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Agendar Reunião</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

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
              value="estudos"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Estudos
            </TabsTrigger>
            <FerramentasDropdown 
              active={dashboardTab === 'ferramentas'} 
              onSelect={(id) => { setFerramentaAtiva(id); setDashboardTab('ferramentas'); }} 
            />
            <TabsTrigger 
              value="carteiras"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Carteiras Recomendadas
            </TabsTrigger>
            <TabsTrigger 
              value="gerador"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerador de Resumos
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
              onTotalClientsClick={() => setTotalClientsModalOpen(true)}
              onRenewalsClick={() => setRenewalsModalOpen(true)}
              onFinancialAssetsClick={() => setFinancialAssetsModalOpen(true)}
            />

            {/* Views */}
            <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'kanban')} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmAtendimentoDrawerOpen(true)}
                    className="text-warning border-warning/30 hover:bg-warning/10"
                  >
                    <Users className="w-4 h-4 mr-1.5" />
                    Em atendimento ({clients.filter(c => c.funnelStage === 'Em atendimento' && !c.consultingFinished).length})
                  </Button>
                  <RecentActivityDropdown />
                </div>
                
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
                  <KanbanView
                    onEditClient={handleEditClient}
                    searchQuery={searchQuery}
                    clientIdsWithPendencies={clientIdsWithPendencies}
                    pendencies={pendencies}
                    pendenciesLoading={pendenciesLoading}
                    onAddPendency={addPendency}
                    onCompletePendency={completePendency}
                    onRemovePendency={removePendency}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* DASHBOARD EXECUTIVO - New strategic dashboard */}
          <TabsContent value="executivo" className="animate-fade-in">
            <DashboardExecutive onEditClient={handleEditClient} />
          </TabsContent>

          {/* ÁREA DE ESTUDOS - Educational content */}
          <TabsContent value="estudos" className="animate-fade-in">
            <StudiesArea />
          </TabsContent>

          {/* FERRAMENTAS */}
          <TabsContent value="ferramentas" className="animate-fade-in">
            {ferramentaAtiva === 'juros-compostos' && <JurosCompostos />}
            {ferramentaAtiva === 'milhao' && <CalculadoraMilhao />}
            {ferramentaAtiva === 'patrimonio-idade' && <PatrimonioIdade />}
            {ferramentaAtiva === 'alugar-financiar' && <AlugarOuFinanciar />}
            {ferramentaAtiva === 'vista-parcelada' && <VistaOuParcelada />}
            {ferramentaAtiva === 'iof-caixinha' && <IOFCaixinha />}
            {ferramentaAtiva === 'cdb' && <SimuladorCDB />}
            {ferramentaAtiva === 'lci-lca' && <SimuladorLCILCA />}
            {ferramentaAtiva === 'tesouro-pre' && <SimuladorTesouroPre />}
            {ferramentaAtiva === 'tesouro-selic' && <SimuladorTesouroSelic />}
            {ferramentaAtiva === 'dividendos' && <ViverDeDividendos />}
          </TabsContent>

          {/* CARTEIRAS RECOMENDADAS */}
          <TabsContent value="carteiras" className="animate-fade-in">
            <CarteirasRecomendadas />
          </TabsContent>

          {/* GERADOR DE RESUMOS */}
          <TabsContent value="gerador" className="animate-fade-in">
            <GeradorResumos />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <ClientModal open={modalOpen} onOpenChange={setModalOpen} client={editingClient} />
      <PendingScheduleModal open={pendingScheduleModalOpen} onOpenChange={setPendingScheduleModalOpen} onEditClient={handleEditClient} />
      <TotalClientsModal open={totalClientsModalOpen} onOpenChange={setTotalClientsModalOpen} />
      <RenewalsModal open={renewalsModalOpen} onOpenChange={setRenewalsModalOpen} onEditClient={handleEditClient} />
      <FinancialAssetsModal open={financialAssetsModalOpen} onOpenChange={setFinancialAssetsModalOpen} onEditClient={handleEditClient} />
      <ScheduleMeetingModal open={scheduleMeetingModalOpen} onOpenChange={setScheduleMeetingModalOpen} />
      <EmAtendimentoDrawer
        isOpen={emAtendimentoDrawerOpen}
        onClose={() => setEmAtendimentoDrawerOpen(false)}
        onOpenClient={handleEditClient}
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
