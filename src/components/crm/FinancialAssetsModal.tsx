import { DollarSign, TrendingUp, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { useState } from 'react';
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
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function FinancialAssetsModal({ open, onOpenChange, onEditClient }: FinancialAssetsModalProps) {
  const { clients, refetch } = useClients();
  const [recalculating, setRecalculating] = useState(false);

  // Use canonical field patrimonioFinanceiroLiquido for ranking
  const getPatrimonio = (c: Client): number => c.patrimonioFinanceiroLiquido ?? 0;

  const sortedClients = [...clients]
    .filter(c => getPatrimonio(c) > 0)
    .sort((a, b) => getPatrimonio(b) - getPatrimonio(a))
    .slice(0, 10);

  const totalFinancialAssets = clients.reduce((sum, c) => sum + getPatrimonio(c), 0);

  const handleOpenClient = (client: Client) => {
    onOpenChange(false);
    onEditClient(client);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      // Recalculate for each client locally and update in DB
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="bg-primary text-primary-foreground p-6 rounded-t-lg">
          <DialogTitle className="text-xl flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Patrimônio Financeiro Total
          </DialogTitle>
          <p className="text-2xl font-bold mt-2">{formatCurrency(totalFinancialAssets)}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="mt-2 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculando...' : 'Recalcular ranking'}
          </Button>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-140px)]">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Ranking por patrimônio financeiro líquido</span>
            </div>
            <div className="flex items-start gap-1.5 mb-4 p-2 rounded bg-muted/40 border border-border/50">
              <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este valor é puxado automaticamente do módulo "Conhecer o Cliente" (Ativos financeiros líquidos). Você pode ajustar manualmente se necessário.
              </p>
            </div>

            {clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cliente cadastrado.</p>
              </div>
            ) : sortedClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cliente com patrimônio financeiro líquido registrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedClients.map((client, index) => (
                  <div
                    key={client.id}
                    className="crm-card p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-yellow-950' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-amber-600 text-amber-50' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{client.name}</h4>
                        <p className="text-sm text-muted-foreground">{client.profession}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-primary whitespace-nowrap">
                        {formatCurrency(getPatrimonio(client))}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenClient(client)}
                        className="shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
