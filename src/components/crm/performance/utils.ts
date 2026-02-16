import { PositionWithOrigin, LiquidityBand, STANDARD_LIQUIDITY_BANDS, BrokerSummary, ConsolidatedSummary } from './types';

const fmt = (v: number | null | undefined) => {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
};

export { fmt, fmtPct };

/**
 * Compute standardized liquidity bands from positions based on maturity dates.
 * Positions without maturity date go into D+1 (assumed liquid).
 * Positions with maturity dates are bucketed by days to maturity.
 */
export function computeLiquidityBands(
  positions: PositionWithOrigin[],
  totalGross: number,
): LiquidityBand[] {
  const now = new Date();
  const buckets: Record<string, number> = {};
  STANDARD_LIQUIDITY_BANDS.forEach(b => { buckets[b.key] = 0; });

  positions.forEach(p => {
    const value = p.grossBalance ?? 0;
    if (!p.maturityDate) {
      // No maturity = assume liquid (D+1)
      buckets['dPlus1'] += value;
      return;
    }
    const matDate = new Date(p.maturityDate);
    const diffDays = Math.ceil((matDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      // Already matured - treat as liquid
      buckets['dPlus1'] += value;
    } else if (diffDays <= 1) {
      buckets['dPlus1'] += value;
    } else if (diffDays <= 35) {
      buckets['upTo35'] += value;
    } else if (diffDays <= 90) {
      buckets['35to90'] += value;
    } else if (diffDays <= 1825) {
      buckets['1to5years'] += value;
    } else {
      buckets['above5years'] += value;
    }
  });

  return STANDARD_LIQUIDITY_BANDS.filter(b => b.key !== 'noLiquidity').map(b => ({
    label: b.label,
    key: b.key,
    valueR$: buckets[b.key],
    pct: totalGross > 0 ? (buckets[b.key] / totalGross) * 100 : 0,
  }));
}

interface ReportRecord {
  broker: string;
  pdfFilename: string;
  reportDate: string;
  status: string;
  extractedData: any;
  alerts: string[];
}

export function buildConsolidatedSummary(reports: ReportRecord[]): ConsolidatedSummary {
  const extracted = reports.filter(r => r.status === 'extracted');
  let totalGross = 0;
  let totalNet = 0;
  const allPositions: PositionWithOrigin[] = [];
  const brokerMap: Record<string, { reports: ReportRecord[]; positions: PositionWithOrigin[] }> = {};

  extracted.forEach(r => {
    const gd = r.extractedData?.generalData ?? {};
    const gross = gd.grossPatrimony ?? 0;
    const net = gd.netPatrimony ?? 0;
    totalGross += gross;
    totalNet += net;

    const positions = Array.isArray(r.extractedData?.positions) ? r.extractedData.positions : [];
    const mapped = positions.map((p: any) => ({
      ...p,
      broker: r.broker,
      pdfFilename: r.pdfFilename,
    }));
    allPositions.push(...mapped);

    const bk = r.broker || 'Sem corretora';
    if (!brokerMap[bk]) brokerMap[bk] = { reports: [], positions: [] };
    brokerMap[bk].reports.push(r);
    brokerMap[bk].positions.push(...mapped);
  });

  const liquidityBands = computeLiquidityBands(allPositions, totalGross);

  // Per-broker summaries
  const brokers: BrokerSummary[] = Object.entries(brokerMap)
    .map(([broker, data]) => {
      const bGross = data.reports.reduce((s, r) => s + (r.extractedData?.generalData?.grossPatrimony ?? 0), 0);
      const bNet = data.reports.reduce((s, r) => s + (r.extractedData?.generalData?.netPatrimony ?? 0), 0);
      return {
        broker,
        totalGross: bGross,
        totalNet: bNet,
        positions: data.positions,
        liquidityBands: computeLiquidityBands(data.positions, bGross),
        reports: data.reports.map(r => ({ pdfFilename: r.pdfFilename, reportDate: r.reportDate, status: r.status })),
      };
    })
    .sort((a, b) => b.totalGross - a.totalGross);

  // Consolidated alerts
  const allAlerts: string[] = [];
  // Immediate liquidity < 5%
  const immediatePct = liquidityBands.find(b => b.key === 'dPlus1')?.pct ?? 0;
  if (immediatePct < 5 && totalGross > 0) {
    allAlerts.push(`🔴 Liquidez imediata consolidada: ${immediatePct.toFixed(1)}% (< 5%)`);
  }
  // Per-broker immediate liquidity
  brokers.forEach(bs => {
    const bImmPct = bs.liquidityBands.find(b => b.key === 'dPlus1')?.pct ?? 0;
    if (bImmPct < 5 && bs.totalGross > 0) {
      allAlerts.push(`🔴 Liquidez imediata ${bs.broker}: ${bImmPct.toFixed(1)}% (< 5%)`);
    }
  });
  // Maturity concentration by year
  const now = new Date();
  const matPositions = allPositions.filter(p => p.maturityDate && new Date(p.maturityDate) >= now);
  const byYear: Record<string, number> = {};
  matPositions.forEach(p => {
    const yr = new Date(p.maturityDate!).getFullYear().toString();
    byYear[yr] = (byYear[yr] ?? 0) + (p.grossBalance ?? 0);
  });
  Object.entries(byYear).forEach(([year, val]) => {
    const pct = totalGross > 0 ? (val / totalGross) * 100 : 0;
    if (pct > 30) {
      allAlerts.push(`⚠️ Concentração de vencimentos em ${year}: ${pct.toFixed(1)}% do patrimônio`);
    }
  });
  // Assets maturing in 6 months
  const in6m = new Date(now); in6m.setMonth(in6m.getMonth() + 6);
  const maturing6m = matPositions.filter(p => new Date(p.maturityDate!) <= in6m);
  if (maturing6m.length > 0) {
    const totalMat = maturing6m.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
    allAlerts.push(`📅 ${maturing6m.length} ativo(s) vencendo em até 6 meses — Total: R$ ${fmt(totalMat)}`);
    maturing6m.slice(0, 5).forEach(p => {
      allAlerts.push(`   • ${p.name} | ${new Date(p.maturityDate!).toLocaleDateString('pt-BR')} | R$ ${fmt(p.grossBalance)} | ${p.broker}`);
    });
    if (maturing6m.length > 5) allAlerts.push(`   ...e mais ${maturing6m.length - 5}`);
  }
  // Include original report alerts
  extracted.forEach(r => {
    r.alerts.forEach(a => allAlerts.push(`[${r.broker}] ${a}`));
  });

  return { totalGross, totalNet, positions: allPositions, liquidityBands, brokers, alerts: allAlerts };
}
