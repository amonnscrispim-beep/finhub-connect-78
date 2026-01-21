import { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useClients } from '@/contexts/ClientContext';
import { Client, FUNNEL_STAGES, BRAZILIAN_STATES } from '@/types/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TableViewProps {
  onEditClient: (client: Client) => void;
  searchQuery?: string;
}

type SortField = 'createdAt' | 'contractEnd' | 'monthlyRevenue' | 'name';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function TableView({ onEditClient, searchQuery = '' }: TableViewProps) {
  const { clients, deleteClient } = useClients();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Combine global search with local search
  const combinedSearchTerm = searchQuery || searchTerm;
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterRenewed, setFilterRenewed] = useState<string>('all');
  const [filterPendingSchedule, setFilterPendingSchedule] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filteredAndSortedClients = useMemo(() => {
    // Filter out finalized clients
    const activeClients = clients.filter(c => !c.consultingFinished);
    
    return activeClients
      .filter((client) => {
        const matchesSearch = 
          client.name.toLowerCase().includes(combinedSearchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(combinedSearchTerm.toLowerCase()) ||
          client.profession.toLowerCase().includes(combinedSearchTerm.toLowerCase()) ||
          client.objective.toLowerCase().includes(combinedSearchTerm.toLowerCase()) ||
          client.city.toLowerCase().includes(combinedSearchTerm.toLowerCase());
        
        const matchesStage = filterStage === 'all' || client.funnelStage === filterStage;
        const matchesState = filterState === 'all' || client.state === filterState;
        const matchesRenewed = 
          filterRenewed === 'all' || 
          (filterRenewed === 'renewed' && client.renewed) ||
          (filterRenewed === 'potential' && client.renewalPotential && !client.renewed) ||
          (filterRenewed === 'none' && !client.renewed && !client.renewalPotential);
        
        const matchesPendingSchedule = 
          filterPendingSchedule === 'all' || 
          (filterPendingSchedule === 'pending' && client.pendingSchedule) ||
          (filterPendingSchedule === 'ok' && !client.pendingSchedule);

        return matchesSearch && matchesStage && matchesState && matchesRenewed && matchesPendingSchedule;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'createdAt':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'contractEnd':
            comparison = a.contractEnd.getTime() - b.contractEnd.getTime();
            break;
          case 'monthlyRevenue':
            comparison = a.monthlyRevenue - b.monthlyRevenue;
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [clients, combinedSearchTerm, filterStage, filterState, filterRenewed, filterPendingSchedule, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      deleteClient(clientToDelete.id);
    }
    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  const getStageBadgeClass = (stage: string) => {
    if (stage === 'Em atendimento') return 'bg-warning/10 text-warning border-warning/20';
    if (stage === 'Conclusão') return 'bg-success/10 text-success border-success/20';
    return 'bg-secondary text-secondary-foreground border-secondary';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="crm-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, profissão ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 crm-input"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-[180px] crm-input">
                <SelectValue placeholder="Etapa do Funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Etapas</SelectItem>
                {FUNNEL_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[100px] crm-input">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {BRAZILIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRenewed} onValueChange={setFilterRenewed}>
              <SelectTrigger className="w-[160px] crm-input">
                <SelectValue placeholder="Status Renovação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="renewed">Renovados</SelectItem>
                <SelectItem value="potential">Potencial</SelectItem>
                <SelectItem value="none">Sem potencial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPendingSchedule} onValueChange={setFilterPendingSchedule}>
              <SelectTrigger className={`w-[180px] crm-input ${filterPendingSchedule === 'pending' ? 'border-destructive' : ''}`}>
                <SelectValue placeholder="Agendamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">⚠️ Pendentes</SelectItem>
                <SelectItem value="ok">Em dia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="crm-card overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[1400px]">
            <Table>
              <TableHeader>
                <TableRow className="crm-table-header hover:bg-muted/50">
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Nome
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Profissão</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('monthlyRevenue')}
                  >
                    <div className="flex items-center gap-2">
                      Faturamento
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead>Aporte</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('contractEnd')}
                  >
                    <div className="flex items-center gap-2">
                      Fim Contrato
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedClients.map((client) => (
                    <TableRow 
                      key={client.id} 
                      className="hover:bg-muted/30 transition-colors animate-fade-in"
                    >
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {client.pendingSchedule && (
                            <div className="p-1 rounded-full bg-destructive/10" title="Agendamento Pendente">
                              <AlertTriangle className="w-3 h-3 text-destructive" />
                            </div>
                          )}
                          {client.renewed && (
                            <div className="p-1 rounded-full bg-success/10" title="Renovado">
                              <RefreshCw className="w-3 h-3 text-success" />
                            </div>
                          )}
                          {client.renewalPotential && !client.renewed && (
                            <div className="p-1 rounded-full bg-warning/10" title="Potencial de renovação">
                              <TrendingUp className="w-3 h-3 text-warning" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.age} anos</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStageBadgeClass(client.funnelStage)}>
                          {client.funnelStage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{client.email}</p>
                          <p className="text-muted-foreground">{client.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{client.city}/{client.state}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{client.profession}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {formatCurrency(client.monthlyRevenue)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatCurrency(client.monthlyContribution)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {client.investorProfile}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(client.contractEnd, 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditClient(client)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(client)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {clientToDelete?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
