import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

interface Props {
  financialAssets: number;
  materialAssets: number;
  businessAssets: number;
  emergencyReserve: number;
  monthlyLivingCost: number | null;
  monthlyRevenue: number;
  monthlyContribution: number;
}

export function DiagnosticoPatrimonial({
  financialAssets,
  materialAssets,
  businessAssets,
  emergencyReserve,
  monthlyLivingCost,
  monthlyRevenue,
  monthlyContribution,
}: Props) {
  const total = financialAssets + materialAssets + businessAssets;

  const pctFin = total > 0 ? (financialAssets / total) * 100 : 0;
  const pctMat = total > 0 ? (materialAssets / total) * 100 : 0;
  const pctBiz = total > 0 ? (businessAssets / total) * 100 : 0;

  // Liquidez
  const livingCost = monthlyLivingCost || 0;
  const liquidity = livingCost > 0 ? emergencyReserve / livingCost : null;

  const liquidityClass = useMemo(() => {
    if (liquidity === null) return { label: 'Sem dados', color: 'text-muted-foreground', bg: 'bg-muted' };
    if (liquidity < 3) return { label: 'Risco Alto', color: 'text-red-500', bg: 'bg-red-500' };
    if (liquidity <= 6) return { label: 'Moderado', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    return { label: 'Saudável', color: 'text-green-500', bg: 'bg-green-500' };
  }, [liquidity]);

  // Taxa de Poupança (aporte_mensal * 12 / faturamento_anual)
  const annualRevenue = monthlyRevenue * 12;
  const annualSavings = monthlyContribution * 12;
  const savingsRate = annualRevenue > 0 ? (annualSavings / annualRevenue) * 100 : null;

  const savingsClass = useMemo(() => {
    if (savingsRate === null) return { label: 'Sem dados', color: 'text-muted-foreground' };
    if (savingsRate < 10) return { label: 'Frágil', color: 'text-red-500' };
    if (savingsRate <= 25) return { label: 'Moderado', color: 'text-yellow-500' };
    return { label: 'Forte', color: 'text-green-500' };
  }, [savingsRate]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-4">
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
              <span>Imobilizado / Material</span>
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
            <span className="text-sm font-bold">
              {liquidity !== null ? `${liquidity.toFixed(1)} meses` : 'Sem dados'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${liquidityClass.color} bg-opacity-10 ${liquidityClass.bg}/10`}>
              {liquidityClass.label}
            </span>
          </div>
        </div>
        {liquidity !== null && (
          <Progress value={Math.min(liquidity / 12 * 100, 100)} className="h-2" />
        )}
      </div>

      {/* Taxa de Poupança */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Taxa de Poupança Anual</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">
              {savingsRate !== null ? `${savingsRate.toFixed(1)}%` : 'Sem dados'}
            </span>
            <span className={`text-xs font-semibold ${savingsClass.color}`}>
              {savingsClass.label}
            </span>
          </div>
        </div>
        {savingsRate !== null && (
          <div className="text-xs text-muted-foreground">
            Aporte anual: {fmt(annualSavings)} | Receita anual: {fmt(annualRevenue)}
          </div>
        )}
      </div>
    </div>
  );
}
