import { useMemo, useState, useCallback } from 'react';
import { Trophy, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Top10PatrimonioColumnProps {
  onEditClient: (client: Client) => void;
}

function parseBRL(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const cleaned = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function getPatrimonio(c: Client): number {
  if (c.patrimonioFinanceiroLiquido != null && c.patrimonioFinanceiroLiquido > 0) {
    return c.patrimonioFinanceiroLiquido;
  }
  const diag = c.strategicDiagnostic?.estruturaPatrimonial;
  const fromDiag = parseBRL(diag?.liquidFinancialAssets);
  if (fromDiag > 0) return fromDiag;
  if (c.financialAssets > 0) return c.financialAssets;
  return 0;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export function Top10PatrimonioColumn({ onEditClient }: Top10PatrimonioColumnProps) {
  const { clients, refetch } = useClients();
  const [recalculating, setRecalculating] = useState(false);

  const top10 = useMemo(() => {
    return clients
      .filter(c => !c.consultingFinished)
      .map(c => ({ client: c, value: getPatrimonio(c) }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [clients]);

  const handleRecalculate = useCallback(async () => {
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
      toast.success('Top 10 recalculado!');
    } catch {
      toast.error('Erro ao recalcular');
    } finally {
      setRecalculating(false);
    }
  }, [clients, refetch]);

  return (
    <div className="bg-gradient-to-b from-amber-500/5 to-transparent rounded-2xl p-4 min-h-[500px] w-80 flex-shrink-0 border border-amber-500/20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-sm text-foreground">Top 10 Patrimônio</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRecalculate}
          disabled={recalculating}
          title="Recalcular ranking"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", recalculating && "animate-spin")} />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {top10.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum patrimônio registrado
          </div>
        ) : (
          top10.map(({ client, value }, index) => (
            <div
              key={client.id}
              className="group bg-card rounded-lg p-3 border border-border/50 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-2.5">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                  index === 0 ? 'bg-yellow-500 text-yellow-950' :
                  index === 1 ? 'bg-gray-300 text-gray-700' :
                  index === 2 ? 'bg-amber-600 text-amber-50' :
                  'bg-muted text-muted-foreground'
                )}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate leading-tight">{client.name}</h4>
                  {client.profession && (
                    <p className="text-xs text-muted-foreground truncate">{client.profession}</p>
                  )}
                  <p className="text-xs font-semibold text-primary mt-1">
                    {formatCurrency(value)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => onEditClient(client)}
                  title="Abrir cliente"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
