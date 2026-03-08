import { useState, useMemo } from 'react';
import { Calculator, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FarolPillar } from '@/hooks/useCarteiraFarol';

interface Props {
  pillars: FarolPillar[];
  financialAssets: number;
  monthlyContribution: number;
}

type BaseType = 'patrimonio' | 'aporte' | 'personalizado';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function FarolAllocationSimulator({ pillars, financialAssets, monthlyContribution }: Props) {
  const [baseType, setBaseType] = useState<BaseType>('patrimonio');
  const [customValue, setCustomValue] = useState(0);

  const baseValue = useMemo(() => {
    if (baseType === 'patrimonio') return financialAssets;
    if (baseType === 'aporte') return monthlyContribution;
    return customValue;
  }, [baseType, financialAssets, monthlyContribution, customValue]);

  const rows = useMemo(() =>
    pillars.map(p => ({
      name: p.pillar_name,
      pct: p.allocation_pct,
      value: (baseValue * (p.allocation_pct || 0)) / 100,
    })),
    [pillars, baseValue]
  );

  const totalPct = rows.reduce((s, r) => s + r.pct, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  const exportPdf = () => {
    const html = `
      <html><head><style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { font-size: 18px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; }
        .total { font-weight: bold; background: #f9f9f9; }
      </style></head><body>
        <h1>Simulador de Alocação — Carteira Farol</h1>
        <p>Base de cálculo: ${fmt(baseValue)}</p>
        <table>
          <thead><tr><th>Pilar</th><th>% Alocação</th><th>Valor (R$)</th></tr></thead>
          <tbody>
            ${rows.map(r => `<tr><td>${r.name}</td><td>${r.pct.toFixed(1)}%</td><td>${fmt(r.value)}</td></tr>`).join('')}
            <tr class="total"><td>Total</td><td>${totalPct.toFixed(1)}%</td><td>${fmt(totalValue)}</td></tr>
          </tbody>
        </table>
      </body></html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carteira-farol-alocacao.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (pillars.length === 0) return null;

  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm text-foreground">Simulador de Alocação</h4>
      </div>

      {/* Base selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Base de cálculo</Label>
          <Select value={baseType} onValueChange={(v) => setBaseType(v as BaseType)}>
            <SelectTrigger className="w-56 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patrimonio">Patrimônio Financeiro ({fmt(financialAssets)})</SelectItem>
              <SelectItem value="aporte">Aporte Mensal ({fmt(monthlyContribution)})</SelectItem>
              <SelectItem value="personalizado">Valor personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {baseType === 'personalizado' && (
          <div className="space-y-1">
            <Label className="text-xs">Valor</Label>
            <CurrencyInput value={customValue} onChange={(v) => setCustomValue(parseFloat(v) || 0)} className="w-40 h-9 text-xs" />
          </div>
        )}
      </div>

      {/* Allocation table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="text-left py-2 px-2 font-medium">Pilar</th>
              <th className="text-right py-2 px-2 font-medium">% Alocação</th>
              <th className="text-right py-2 px-2 font-medium">Valor em R$</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 px-2 text-foreground">{row.name}</td>
                <td className="py-2 px-2 text-right">{row.pct.toFixed(1)}%</td>
                <td className="py-2 px-2 text-right font-medium">{fmt(row.value)}</td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-semibold">
              <td className="py-2 px-2">Total</td>
              <td className="py-2 px-2 text-right">{totalPct.toFixed(1)}%</td>
              <td className="py-2 px-2 text-right">{fmt(totalValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={exportPdf}>
          <FileDown className="w-3 h-3" /> Exportar como PDF
        </Button>
      </div>
    </div>
  );
}
