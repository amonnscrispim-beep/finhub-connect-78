import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/contexts/ClientContext';
import { meetingStatusOf, type KanbanFilters } from './KanbanView';

export const formatCompactBRL = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}K`;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const clientPatrimony = (c: { patrimonioFinanceiroLiquido?: number | null; financialAssets?: number }) =>
  c.patrimonioFinanceiroLiquido ?? c.financialAssets ?? 0;

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filters: KanbanFilters;
  onFiltersChange: (f: KanbanFilters) => void;
}

export function KanbanToolbar({ search, onSearchChange, filters, onFiltersChange }: Props) {
  const { clients } = useClients();
  const active = clients.filter((c) => !c.consultingFinished);
  const overdue = active.filter((c) => meetingStatusOf(c) === 'overdue').length;
  const total = active.reduce((s, c) => s + clientPatrimony(c), 0);
  const hasFilters = !!search || filters.segmentation !== 'all' || filters.meetingStatus !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9 w-64 h-9 text-sm" />
        </div>
        <Select value={filters.segmentation} onValueChange={(v) => onFiltersChange({ ...filters, segmentation: v })}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Segmentação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas segmentações</SelectItem>
            <SelectItem value="Varejo">Varejo</SelectItem>
            <SelectItem value="Alta Renda">Alta Renda</SelectItem>
            <SelectItem value="Private">Private</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.meetingStatus} onValueChange={(v) => onFiltersChange({ ...filters, meetingStatus: v })}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Status Reunião" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="overdue">Com atraso</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="ok">Em dia</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { onSearchChange(''); onFiltersChange({ segmentation: 'all', meetingStatus: 'all' }); }}>
            Limpar filtros
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="crm-card p-4">
          <p className="text-xs text-muted-foreground">Clientes Ativos</p>
          <p className="text-xl font-bold text-foreground">{active.length}</p>
          <p className="text-[10px] text-muted-foreground">Total: {clients.length}</p>
        </div>
        <div className="crm-card p-4">
          <p className="text-xs text-muted-foreground">Patrimônio Total</p>
          <p className="text-xl font-bold text-primary">{formatCompactBRL(total)}</p>
        </div>
        <div className="crm-card p-4 border-red-100">
          <p className="text-xs text-muted-foreground">Em Atraso</p>
          <p className="text-xl font-bold text-red-600">{overdue}</p>
        </div>
        <div className="crm-card p-4 border-green-100">
          <p className="text-xs text-muted-foreground">Em Dia</p>
          <p className="text-xl font-bold text-green-600">{active.length - overdue}</p>
        </div>
      </div>
    </div>
  );
}
