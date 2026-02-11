import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import type { PortfolioAsset } from '@/hooks/useClientPortfolio';

interface Props {
  financialAssets: number;
  materialAssets: number;
  businessAssets: number;
  emergencyReserve: number;
  monthlyLivingCost: number | null;
  monthlyRevenue: number;
  monthlyContribution: number;
  retirementGoal: { desiredAge?: number | null; desiredMonthlyIncome?: number | null } | null;
  age: number;
  married: boolean;
  hasChildren: boolean;
  children: { age: number | null }[];
  financialInstitutions: string | null;
  investorProfile: string;
  allocationExists: boolean;
  passiveIncome: number;
  successionPlanning: string;
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

export function ScoreEstrategico(props: Props) {
  const { financialAssets, materialAssets, businessAssets, emergencyReserve, monthlyLivingCost, monthlyRevenue, monthlyContribution, retirementGoal, financialInstitutions, investorProfile, allocationExists, passiveIncome, successionPlanning, assets = [] } = props;

  const scores = useMemo(() => {
    const total = financialAssets + materialAssets + businessAssets;

    // 1. Estrutura Patrimonial
    let estrutura: number | null = null;
    if (total > 0) {
      const empresarialPct = businessAssets / total;
      const financeiroPct = financialAssets / total;
      estrutura = 10;
      if (empresarialPct > 0.7) estrutura -= 3;
      if (financeiroPct < 0.1) estrutura -= 2;
      estrutura = clamp(Math.round(estrutura));
    }

    // 2. Liquidez
    let liquidez: number | null = null;
    const livingCost = monthlyLivingCost || 0;
    if (livingCost > 0 && emergencyReserve > 0) {
      const months = emergencyReserve / livingCost;
      if (months >= 12) liquidez = 10;
      else if (months >= 6) liquidez = 8;
      else if (months >= 3) liquidez = 5;
      else if (months >= 1) liquidez = 3;
      else liquidez = 1;
    }

    // 3. Diversificação (proxy-based)
    let diversificacao: number | null = 4;
    // Count institutions from comma-separated text
    const institutions = (financialInstitutions || '').split(/[,;]/).filter(s => s.trim().length > 0);
    if (institutions.length >= 2) diversificacao += 2;
    if (investorProfile && investorProfile !== '') diversificacao += 1;
    if (allocationExists) diversificacao += 2;
    // If portfolio assets exist, use them for more precision
    if (assets.length > 0) {
      const maxWeight = Math.max(...assets.map(a => a.target_weight || 0));
      if (maxWeight > 25) diversificacao -= 1;
      const classMap = new Map<string, number>();
      assets.forEach(a => classMap.set(a.asset_class, (classMap.get(a.asset_class) || 0) + (a.target_weight || 0)));
      if (classMap.size >= 4) diversificacao += 1;
    }
    diversificacao = clamp(Math.round(diversificacao));

    // 4. Independência Financeira
    let independencia: number | null = null;
    const desiredIncome = retirementGoal?.desiredMonthlyIncome || 0;
    if (desiredIncome > 0 && passiveIncome > 0) {
      const ratio = passiveIncome / desiredIncome;
      if (ratio >= 1) independencia = 10;
      else if (ratio >= 0.5) independencia = 7;
      else if (ratio >= 0.25) independencia = 5;
      else independencia = 3;
    } else if (desiredIncome > 0 || passiveIncome > 0) {
      // Partial data
      independencia = 3;
    }

    // 5. Planejamento Sucessório
    let sucessao: number | null = null;
    const sp = (successionPlanning || '').toLowerCase().trim();
    if (sp === 'sim') sucessao = 10;
    else if (sp === 'parcial') sucessao = 6;
    else if (sp === 'não' || sp === 'nao') sucessao = 2;
    // else null

    return { estrutura, liquidez, diversificacao, independencia, sucessao };
  }, [financialAssets, materialAssets, businessAssets, emergencyReserve, monthlyLivingCost, financialInstitutions, investorProfile, allocationExists, passiveIncome, retirementGoal, successionPlanning, assets]);

  const finalScore = useMemo(() => {
    const entries: { score: number; weight: number }[] = [];
    const weights = { estrutura: 0.2, liquidez: 0.2, diversificacao: 0.2, independencia: 0.25, sucessao: 0.15 };
    
    if (scores.estrutura !== null) entries.push({ score: scores.estrutura, weight: weights.estrutura });
    if (scores.liquidez !== null) entries.push({ score: scores.liquidez, weight: weights.liquidez });
    if (scores.diversificacao !== null) entries.push({ score: scores.diversificacao, weight: weights.diversificacao });
    if (scores.independencia !== null) entries.push({ score: scores.independencia, weight: weights.independencia });
    if (scores.sucessao !== null) entries.push({ score: scores.sucessao, weight: weights.sucessao });

    if (entries.length === 0) return null;

    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    const weighted = entries.reduce((sum, e) => sum + e.score * (e.weight / totalWeight), 0);
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
        {finalScore !== null ? (
          <div className="flex items-center gap-3">
            <Progress value={finalScore * 10} className={`w-32 h-3 ${progressColor(finalScore)}`} />
            <span className={`text-2xl font-bold ${scoreColor(finalScore)}`}>
              {finalScore.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">/10</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sem dados suficientes</span>
        )}
      </div>

      {/* Pilares */}
      <div className="space-y-3">
        {pillars.map(p => (
          <div key={p.key} className="flex items-center justify-between gap-4">
            <span className="text-sm flex-shrink-0 w-48">{p.label}</span>
            {p.score !== null ? (
              <>
                <Progress value={p.score * 10} className={`flex-1 h-2 ${progressColor(p.score)}`} />
                <span className={`text-sm font-bold w-8 text-right ${scoreColor(p.score)}`}>
                  {p.score}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground flex-1 text-right">Sem dados</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
