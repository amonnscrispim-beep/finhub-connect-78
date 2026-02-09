import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PortfolioAsset } from '@/hooks/useClientPortfolio';

interface Props {
  assets: PortfolioAsset[];
  aporte: number;
  previousValues: Record<string, number>;
  weightValid: boolean;
  onSaveAporte: (val: number) => void;
  onSavePreviousValue: (ticker: string, value: number) => void;
}

export function PortfolioSimulator({ assets, aporte, previousValues, weightValid, onSaveAporte, onSavePreviousValue }: Props) {
  const totalPrevious = useMemo(() =>
    assets.reduce((sum, a) => sum + (previousValues[a.ticker] || 0), 0),
    [assets, previousValues]
  );

  const totalCurrent = useMemo(() => totalPrevious + aporte, [totalPrevious, aporte]);

  const aportePercentage = useMemo(() =>
    totalCurrent > 0 ? (aporte / totalCurrent) * 100 : 0,
    [aporte, totalCurrent]
  );

  const results = useMemo(() => {
    if (!weightValid || assets.length === 0) return [];
    return assets.map(asset => {
      const prev = previousValues[asset.ticker] || 0;
      const targetValue = totalCurrent * (asset.target_weight / 100);
      const toBuy = Math.max(0, targetValue - prev);
      const hasAporte = aporte > 0;
      return {
        ticker: asset.ticker || '(sem ticker)',
        weight: asset.target_weight,
        operation: !hasAporte ? 'Aguardando aporte' : toBuy > 0 ? `Comprar ${formatCurrency(toBuy)}` : 'Manter posição',
        isAction: hasAporte && toBuy > 0,
      };
    });
  }, [assets, previousValues, totalCurrent, aporte, weightValid]);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-foreground">Simulador de Aporte</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Aporte (R$)</Label>
          <CurrencyInput
            value={aporte.toString()}
            onChange={(val) => onSaveAporte(parseFloat(val) || 0)}
          />
        </div>
        <div className="flex items-end">
          <p className="text-sm text-muted-foreground">
            Porcentagem do aporte: <span className="font-semibold text-foreground">{aportePercentage.toFixed(2)}%</span>
          </p>
        </div>
      </div>

      {assets.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Carteira anterior</Label>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-xs">Ticker</th>
                  <th className="px-3 py-2 text-right font-medium text-xs">Dinheiro anterior (R$)</th>
                  <th className="px-3 py-2 text-right font-medium text-xs">% Carteira anterior</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => {
                  const prev = previousValues[asset.ticker] || 0;
                  const pct = totalPrevious > 0 ? (prev / totalPrevious * 100) : 0;
                  return (
                    <tr key={asset.id} className="border-t border-border">
                      <td className="px-3 py-1.5 font-mono text-xs">{asset.ticker || '—'}</td>
                      <td className="px-3 py-1.5 text-right">
                        <CurrencyInput
                          value={prev.toString()}
                          onChange={(val) => onSavePreviousValue(asset.ticker, parseFloat(val) || 0)}
                          className="h-7 w-32 text-xs text-right ml-auto"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">{pct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Resultados</Label>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-xs">Ticker</th>
                  <th className="px-3 py-2 text-left font-medium text-xs">Operação</th>
                  <th className="px-3 py-2 text-right font-medium text-xs">Peso alvo</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.ticker} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{r.ticker}</td>
                    <td className={`px-3 py-2 text-xs font-semibold ${r.isAction ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {r.operation}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">{r.weight.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}
