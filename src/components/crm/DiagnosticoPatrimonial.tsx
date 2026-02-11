import { useMemo } from 'react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface Props {
  financialAssets: string;
  materialAssets: string;
  businessAssets: string;
  emergencyReserve: string;
  monthlyLivingCost: string;
  monthlyRevenue: string;
  onChange: (field: string, value: string) => void;
}

export function DiagnosticoPatrimonial({
  financialAssets,
  materialAssets,
  businessAssets,
  emergencyReserve,
  monthlyLivingCost,
  monthlyRevenue,
  onChange,
}: Props) {
  const fin = parseFloat(financialAssets) || 0;
  const mat = parseFloat(materialAssets) || 0;
  const biz = parseFloat(businessAssets) || 0;
  const total = fin + mat + biz;

  const pctFin = total > 0 ? (fin / total) * 100 : 0;
  const pctMat = total > 0 ? (mat / total) * 100 : 0;
  const pctBiz = total > 0 ? (biz / total) * 100 : 0;

  // Liquidez
  const reserve = parseFloat(emergencyReserve) || 0;
  const livingCost = parseFloat(monthlyLivingCost) || 0;
  const liquidity = livingCost > 0 ? reserve / livingCost : 0;

  const liquidityClass = useMemo(() => {
    if (livingCost === 0) return { label: 'Sem dados', color: 'text-muted-foreground', bg: 'bg-muted' };
    if (liquidity < 3) return { label: 'Risco Alto', color: 'text-red-500', bg: 'bg-red-500' };
    if (liquidity <= 6) return { label: 'Moderado', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    return { label: 'Saudável', color: 'text-green-500', bg: 'bg-green-500' };
  }, [liquidity, livingCost]);

  // Taxa de Poupança
  const revenue = parseFloat(monthlyRevenue) || 0;
  const annualRevenue = revenue * 12;
  const annualExpense = livingCost * 12;
  const savingsRate = annualRevenue > 0 ? ((annualRevenue - annualExpense) / annualRevenue) * 100 : 0;

  const savingsClass = useMemo(() => {
    if (annualRevenue === 0) return { label: 'Sem dados', color: 'text-muted-foreground' };
    if (savingsRate < 10) return { label: 'Frágil', color: 'text-red-500' };
    if (savingsRate <= 25) return { label: 'Moderado', color: 'text-yellow-500' };
    return { label: 'Forte', color: 'text-green-500' };
  }, [savingsRate, annualRevenue]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      {/* Patrimônio */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Patrimônio Financeiro</Label>
          <CurrencyInput value={financialAssets} onChange={(v) => onChange('financialAssets', v)} />
        </div>
        <div className="space-y-2">
          <Label>Patrimônio Imobilizado</Label>
          <CurrencyInput value={materialAssets} onChange={(v) => onChange('materialAssets', v)} />
        </div>
        <div className="space-y-2">
          <Label>Patrimônio Empresarial</Label>
          <CurrencyInput value={businessAssets} onChange={(v) => onChange('businessAssets', v)} />
        </div>
      </div>

      {/* Patrimônio Total */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Patrimônio Total</span>
          <span className="text-lg font-bold text-primary">{fmt(total)}</span>
        </div>

        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Financeiro</span>
              <span className="font-medium">{pctFin.toFixed(1)}%</span>
            </div>
            <Progress value={pctFin} className="h-2" />

            <div className="flex items-center justify-between text-xs">
              <span>Imobilizado</span>
              <span className="font-medium">{pctMat.toFixed(1)}%</span>
            </div>
            <Progress value={pctMat} className="h-2" />

            <div className="flex items-center justify-between text-xs">
              <span>Empresarial</span>
              <span className="font-medium">{pctBiz.toFixed(1)}%</span>
            </div>
            <Progress value={pctBiz} className="h-2" />
          </div>
        )}
      </div>

      {/* Liquidez */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Liquidez (Reserva / Custo Mensal)</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{liquidity.toFixed(1)} meses</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${liquidityClass.color} bg-opacity-10 ${liquidityClass.bg}/10`}>
              {liquidityClass.label}
            </span>
          </div>
        </div>
        <Progress value={Math.min(liquidity / 12 * 100, 100)} className="h-2" />
      </div>

      {/* Taxa de Poupança */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Taxa de Poupança Anual</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{savingsRate.toFixed(1)}%</span>
            <span className={`text-xs font-semibold ${savingsClass.color}`}>
              {savingsClass.label}
            </span>
          </div>
        </div>
        {annualRevenue > 0 && (
          <div className="text-xs text-muted-foreground">
            Receita anual: {fmt(annualRevenue)} | Despesa anual: {fmt(annualExpense)} | Poupança: {fmt(annualRevenue - annualExpense)}
          </div>
        )}
      </div>
    </div>
  );
}
