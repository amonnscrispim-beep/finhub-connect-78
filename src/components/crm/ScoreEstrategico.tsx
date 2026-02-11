import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import type { Client } from '@/types/client';
import type { PortfolioAsset } from '@/hooks/useClientPortfolio';

interface Props {
  client: Partial<Client> & {
    financialAssets: number;
    materialAssets: number;
    businessAssets: number;
    emergencyReserve: number;
    monthlyLivingCost: number | null;
    monthlyRevenue: number;
    retirementGoal: { desiredAge?: number | null; desiredMonthlyIncome?: number | null } | null;
    age: number;
    married: boolean;
    hasChildren: boolean;
    children: { age: number | null }[];
  };
  assets?: PortfolioAsset[];
}

function clamp(v: number, min = 0, max = 10) {
  return Math.max(min, Math.min(max, v));
}

function scoreColor(score: number) {
  if (score >= 7) return 'text-green-500';
  if (score >= 4) return 'text-yellow-500';
  return 'text-red-500';
}

function progressColor(score: number) {
  if (score >= 7) return '[&>div]:bg-green-500';
  if (score >= 4) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-red-500';
}

export function ScoreEstrategico({ client, assets = [] }: Props) {
  const scores = useMemo(() => {
    const fin = client.financialAssets || 0;
    const mat = client.materialAssets || 0;
    const biz = client.businessAssets || 0;
    const total = fin + mat + biz;

    // 1. Estrutura Patrimonial
    let estrutura = 5;
    if (total > 0) {
      const pctFin = fin / total;
      const pctMat = mat / total;
      if (pctFin > 0.4) estrutura = 8;
      else if (pctFin > 0.25) estrutura = 6;
      else estrutura = 4;
      if (pctMat > 0.7) estrutura = Math.max(estrutura - 3, 1);
    }

    // 2. Liquidez
    const livingCost = client.monthlyLivingCost || 0;
    const reserve = client.emergencyReserve || 0;
    let liquidez = 5;
    if (livingCost > 0) {
      const months = reserve / livingCost;
      if (months >= 12) liquidez = 10;
      else if (months >= 6) liquidez = 8;
      else if (months >= 3) liquidez = 5;
      else liquidez = 2;
    }

    // 3. Diversificação (based on portfolio assets)
    let diversificacao = 5;
    if (assets.length > 0) {
      const maxWeight = Math.max(...assets.map(a => a.target_weight || 0));
      const classMap = new Map<string, number>();
      assets.forEach(a => {
        classMap.set(a.asset_class, (classMap.get(a.asset_class) || 0) + (a.target_weight || 0));
      });
      const maxClassWeight = Math.max(...Array.from(classMap.values()));

      diversificacao = 7;
      if (maxWeight > 25) diversificacao -= 2;
      if (maxClassWeight > 40) diversificacao -= 2;
      if (assets.length >= 8) diversificacao += 1;
      if (classMap.size >= 4) diversificacao += 1;
    }

    // 4. Independência Financeira
    let independencia = 3;
    const monthlyRevenue = client.monthlyRevenue || 0;
    if (livingCost > 0 && total > 0) {
      // Assume 0.5% monthly passive income from financial assets
      const passiveIncome = fin * 0.005;
      const ratio = passiveIncome / livingCost;
      if (ratio >= 1) independencia = 10;
      else if (ratio >= 0.5) independencia = 7;
      else if (ratio >= 0.25) independencia = 5;
      else independencia = 3;
    }

    // 5. Planejamento Sucessório
    let sucessao = 5;
    const highPatrimony = total > 1_000_000;
    const hasMinorChildren = (client.children || []).some(c => (c.age || 0) < 18);
    if (highPatrimony) {
      sucessao = 3; // High patrimony without structure = low score
    }
    if (hasMinorChildren && highPatrimony) {
      sucessao = 2;
    }
    if (!highPatrimony && !hasMinorChildren) {
      sucessao = 7;
    }

    return {
      estrutura: clamp(Math.round(estrutura)),
      liquidez: clamp(Math.round(liquidez)),
      diversificacao: clamp(Math.round(diversificacao)),
      independencia: clamp(Math.round(independencia)),
      sucessao: clamp(Math.round(sucessao)),
    };
  }, [client, assets]);

  const finalScore = useMemo(() => {
    const weights = { estrutura: 0.2, liquidez: 0.2, diversificacao: 0.2, independencia: 0.25, sucessao: 0.15 };
    const weighted =
      scores.estrutura * weights.estrutura +
      scores.liquidez * weights.liquidez +
      scores.diversificacao * weights.diversificacao +
      scores.independencia * weights.independencia +
      scores.sucessao * weights.sucessao;
    return Math.round(weighted * 10) / 10;
  }, [scores]);

  const pillars = [
    { key: 'estrutura', label: 'Estrutura Patrimonial', score: scores.estrutura },
    { key: 'liquidez', label: 'Liquidez', score: scores.liquidez },
    { key: 'diversificacao', label: 'Diversificação', score: scores.diversificacao },
    { key: 'independencia', label: 'Independência Financeira', score: scores.independencia },
    { key: 'sucessao', label: 'Planejamento Sucessório', score: scores.sucessao },
  ];

  return (
    <div className="space-y-4">
      {/* Score Final */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
        <span className="text-sm font-medium">Score Estratégico Final</span>
        <div className="flex items-center gap-3">
          <Progress value={finalScore * 10} className={`w-32 h-3 ${progressColor(finalScore)}`} />
          <span className={`text-2xl font-bold ${scoreColor(finalScore)}`}>
            {finalScore.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">/10</span>
        </div>
      </div>

      {/* Pilares */}
      <div className="space-y-3">
        {pillars.map(p => (
          <div key={p.key} className="flex items-center justify-between gap-4">
            <span className="text-sm flex-shrink-0 w-48">{p.label}</span>
            <Progress value={p.score * 10} className={`flex-1 h-2 ${progressColor(p.score)}`} />
            <span className={`text-sm font-bold w-8 text-right ${scoreColor(p.score)}`}>
              {p.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
