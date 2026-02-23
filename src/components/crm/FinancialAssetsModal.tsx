import { DollarSign, TrendingUp, ExternalLink, RefreshCw, Info, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FinancialAssetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClient: (client: Client) => void;
}

// Parse BRL currency string to number
function parseBRL(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  // Remove R$, spaces, dots (thousands), then replace comma with dot (decimal)
  const cleaned = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function getPatrimonioFromClient(c: Client): number {
  // Priority A: canonical field (already consolidated)
  if (c.patrimonioFinanceiroLiquido != null && c.patrimonioFinanceiroLiquido > 0) {
    return c.patrimonioFinanceiroLiquido;
  }
  // Priority B: from strategic diagnostic
  const diag = c.strategicDiagnostic?.estruturaPatrimonial;
  const fromDiag = parseBRL(diag?.liquidFinancialAssets);
  if (fromDiag > 0) return fromDiag;
  // Priority C: legacy financialAssets
  if (c.financialAssets > 0) return c.financialAssets;
  return 0;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function FinancialAssetsModal({ open, onOpenChange, onEditClient }: FinancialAssetsModalProps) {
  const { clients, refetch } = useClients();
  const [recalculating, setRecalculating] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  // All clients with computed patrimonio, sorted desc
  const allSorted = useMemo(() => {
    return [...clients]
      .map(c => ({ client: c, value: getPatrimonioFromClient(c) }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [clients]);

  // Filtered by search
  const filtered = useMemo(() => {
    if (!search.trim()) return allSorted;
    const q = search.toLowerCase();
    return allSorted.filter(x =>
      x.client.name.toLowerCase().includes(q) ||
      (x.client.profession && x.client.profession.toLowerCase().includes(q))
    );
  }, [allSorted, search]);

  // Total uses same data source
  const totalFinancialAssets = useMemo(() => filtered.reduce((sum, x) => sum + x.value, 0), [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // Reset page on search/pageSize change
  const handleSearchChange = (v: string) => { setSearch(v); setPage(0); };
  const handlePageSizeChange = (v: string) => { setPageSize(Number(v)); setPage(0); };

  const handleOpenClient = (client: Client) => {
    onOpenChange(false);
    onEditClient(client);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      for (const client of clients) {
        const diag = client.strategicDiagnostic?.estruturaPatrimonial;
        const liquidFromConhecer = parseBRL(diag?.liquidFinancialAssets);
        const liquidFromLegacy = client.financialAssets || 0;
        const newValue = liquidFromConhecer > 0 ? liquidFromConhecer : (liquidFromLegacy > 0 ? liquidFromLegacy : null);

        if (newValue !== client.patrimonioFinanceiroLiquido) {
          await supabase
            .from('clients')
            .update({ patrimonio_financeiro_liquido: newValue } as any)
            .eq('id', client.id);
        }
      }
      refetch();
      toast.success('Ranking recalculado com sucesso!');
    } catch (error) {
      toast.error('Erro ao recalcular ranking');
    } finally {
      setRecalculating(false);
    }
  };

  // Global rank index for medal display
  const getRankIndex = (clientId: string) => allSorted.findIndex(x => x.client.id === clientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="bg-primary text-primary-foreground p-6 rounded-t-lg shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Patrimônio Financeiro Total
          </DialogTitle>
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalFinancialAssets)}</p>
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculando...' : 'Recalcular ranking'}
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 pb-0 shrink-0 space-y-3">
          <div className="flex items-start gap-1.5 p-2 rounded bg-muted/40 border border-border/50">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este valor é puxado automaticamente do módulo "Conhecer o Cliente" (Ativos financeiros líquidos). Você pode ajustar manualmente se necessário.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou profissão..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[90px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)}>{n} / pág</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Mostrando {paged.length} de {filtered.length} clientes</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 pt-2">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente com patrimônio financeiro líquido registrado.'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paged.map(({ client, value }) => {
                  const rank = getRankIndex(client.id);
                  return (
                    <div
                      key={client.id}
                      className="crm-card p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          rank === 0 ? 'bg-yellow-500 text-yellow-950' :
                          rank === 1 ? 'bg-gray-300 text-gray-700' :
                          rank === 2 ? 'bg-amber-600 text-amber-50' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {rank + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate text-sm">{client.name}</h4>
                          {client.profession && <p className="text-xs text-muted-foreground truncate">{client.profession}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-primary whitespace-nowrap">
                          {formatCurrency(value)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenClient(client)}
                          className="h-7 w-7 p-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(p => p - 1)}
              className="text-xs h-7"
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="text-xs h-7"
            >
              Próximo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
