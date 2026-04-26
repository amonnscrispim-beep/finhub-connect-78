/**
 * Cálculos automáticos para o Resumo de Performance.
 * Consolida múltiplos relatórios em um único snapshot rico:
 * - Ganho bruto / líquido / alpha vs CDI
 * - % isenta de IR (R$ e %)
 * - Projeções 1, 3 e 5 anos com/sem aportes mensais
 * - Comparação contra "CDI puro" no mesmo horizonte
 */

export interface MonthlyRow {
  month: string;        // "YYYY-MM"
  portfolioPct: number;
  cdiPct: number | null;
  pctOfCdi: number | null;
  gainBRL: number | null;
}

export interface CompositionRow {
  className: string;
  valueR$: number | null;
  pct: number;
  taxExemptPct: number | null;
}

export interface PerformanceSnapshotRich {
  clientName: string;
  reportPeriodLabel: string;            // ex: "Jan/2024 a Mar/2024" ou "Mar/2024"
  totalGross: number;
  totalNet: number | null;
  netCoverage: { available: number; total: number };
  brokers: { broker: string; totalGross: number }[];

  // Rentabilidades agregadas (média ponderada por patrimônio bruto)
  monthReturnPct: number | null;
  yearReturnPct: number | null;
  cumulativeReturnPct: number | null;
  cdiYearPct: number | null;
  pctOfCdiYear: number | null;          // ex: 112 = 112% do CDI no ano

  // Ganhos em R$
  grossGainBRL: number;                 // ganho bruto consolidado no período (acumulado)
  netGainBRL: number;                   // ganho líquido (descontando IR provisionado)
  irProvisionBRL: number;
  alphaVsCdiBRL: number;                // quanto ganhou a mais que CDI puro

  // Isenção de IR
  taxExemptValueBRL: number;
  taxExemptPct: number;
  taxExemptAssets: { name: string; valueR$: number }[];

  // Mês a mês consolidado
  monthlyHistory: MonthlyRow[];

  // Composição por classe
  composition: CompositionRow[];

  // Projeções
  projections: ProjectionRow[];
  projectionsCdi: ProjectionRow[];      // projeção comparativa "se ficasse no CDI"
  monthlyAporte: number;
  averageMonthlyReturnPct: number | null;

  // Liquidez (mantida para compatibilidade)
  liquidityBands: { label: string; valueR$: number; pct: number }[];
  alerts: string[];
  reportsCount: number;
}

export interface ProjectionRow {
  horizonYears: number;
  withoutAporte: number;
  withAporte: number;
  monthlyRate: number;       // taxa mensal usada
}

interface ReportLike {
  broker: string;
  pdfFilename: string;
  reportDate: string;
  status: string;
  extractedData: any;
  alerts: string[];
}

/**
 * Constrói o snapshot completo a partir dos relatórios extraídos.
 */
export function buildRichSnapshot(
  reports: ReportLike[],
  clientName: string,
  monthlyAporte: number = 0,
): PerformanceSnapshotRich {
  const ext = reports.filter(r => r.status === 'extracted');

  // ── Patrimônio ──
  let totalGross = 0;
  let totalNet = 0;
  let reportsWithNet = 0;
  let irProvisionBRL = 0;

  // Rentabilidades ponderadas
  let wMonth = 0, wMonthSum = 0;
  let wYear = 0, wYearSum = 0;
  let wCum = 0, wCumSum = 0;
  let wCdiYear = 0, wCdiYearSum = 0;

  // Ganhos em R$ (somados se informados, senão estimados via %)
  let grossGainExplicit = 0;
  let grossGainEstimated = 0;
  let cdiGainEstimated = 0;

  const allPositions: any[] = [];
  const brokerMap: Record<string, number> = {};
  const monthlyMap: Record<string, { pSum: number; pW: number; cSum: number; cW: number; gain: number }> = {};
  const compMap: Record<string, { value: number; exemptValue: number }> = {};

  ext.forEach(r => {
    const ed = r.extractedData ?? {};
    const gd = ed.generalData ?? {};
    const gross = Number(gd.grossPatrimony) || 0;
    const net = gd.netPatrimony != null ? Number(gd.netPatrimony) : null;

    totalGross += gross;
    if (net != null && net !== 0) { totalNet += net; reportsWithNet++; }
    irProvisionBRL += Number(gd.irProvision) || 0;

    if (gd.monthReturn != null && gross > 0) { wMonthSum += gd.monthReturn * gross; wMonth += gross; }
    if (gd.yearReturn != null && gross > 0)  { wYearSum  += gd.yearReturn  * gross; wYear  += gross; }
    if (gd.cumulativeReturn != null && gross > 0) { wCumSum += gd.cumulativeReturn * gross; wCum += gross; }
    if (gd.cdiYear != null && gross > 0)     { wCdiYearSum += gd.cdiYear * gross; wCdiYear += gross; }

    // Ganhos explícitos vs estimados a partir do retorno acumulado
    if (gd.cumulativeReturnBRL != null) grossGainExplicit += Number(gd.cumulativeReturnBRL);
    else if (gd.yearReturnBRL != null) grossGainExplicit += Number(gd.yearReturnBRL);
    else if (gd.cumulativeReturn != null && gross > 0) {
      // capital_inicial * ret = ganho. Estimamos: gross_atual - gross_atual/(1+ret)
      const ret = Number(gd.cumulativeReturn) / 100;
      grossGainEstimated += gross - gross / (1 + ret);
    } else if (gd.yearReturn != null && gross > 0) {
      const ret = Number(gd.yearReturn) / 100;
      grossGainEstimated += gross - gross / (1 + ret);
    }

    if (gd.cdiYear != null && gross > 0) {
      const cdi = Number(gd.cdiYear) / 100;
      cdiGainEstimated += gross - gross / (1 + cdi);
    } else if (gd.cdiCumulative != null && gross > 0) {
      const cdi = Number(gd.cdiCumulative) / 100;
      cdiGainEstimated += gross - gross / (1 + cdi);
    }

    const bk = r.broker || 'Sem corretora';
    brokerMap[bk] = (brokerMap[bk] ?? 0) + gross;

    const positions = Array.isArray(ed.positions) ? ed.positions : [];
    positions.forEach((p: any) => allPositions.push({ ...p, broker: r.broker }));

    // Mês a mês
    const mh = Array.isArray(ed.monthlyHistory) ? ed.monthlyHistory : [];
    mh.forEach((m: any) => {
      if (!m?.month) return;
      const key = String(m.month);
      if (!monthlyMap[key]) monthlyMap[key] = { pSum: 0, pW: 0, cSum: 0, cW: 0, gain: 0 };
      if (m.portfolioPct != null && gross > 0) { monthlyMap[key].pSum += m.portfolioPct * gross; monthlyMap[key].pW += gross; }
      if (m.cdiPct != null && gross > 0)       { monthlyMap[key].cSum += m.cdiPct * gross;       monthlyMap[key].cW += gross; }
      if (m.gainBRL != null) monthlyMap[key].gain += Number(m.gainBRL);
    });

    // Composição
    const comp = Array.isArray(ed.composition) ? ed.composition : [];
    comp.forEach((c: any) => {
      if (!c?.className) return;
      const cls = String(c.className);
      const value = Number(c.valueR$) || (gross * (Number(c.pct) || 0) / 100);
      const exemptPct = Number(c.taxExemptPct) || 0;
      if (!compMap[cls]) compMap[cls] = { value: 0, exemptValue: 0 };
      compMap[cls].value += value;
      compMap[cls].exemptValue += value * (exemptPct / 100);
    });
  });

  // ── Médias ponderadas ──
  const monthReturnPct      = wMonth > 0 ? wMonthSum / wMonth : null;
  const yearReturnPct       = wYear  > 0 ? wYearSum  / wYear  : null;
  const cumulativeReturnPct = wCum   > 0 ? wCumSum   / wCum   : null;
  const cdiYearPct          = wCdiYear > 0 ? wCdiYearSum / wCdiYear : null;
  const pctOfCdiYear =
    yearReturnPct != null && cdiYearPct != null && cdiYearPct > 0
      ? (yearReturnPct / cdiYearPct) * 100
      : null;

  // ── Ganhos em R$ ──
  const grossGainBRL = grossGainExplicit > 0 ? grossGainExplicit : grossGainEstimated;
  const netGainBRL = Math.max(0, grossGainBRL - irProvisionBRL);
  const alphaVsCdiBRL = grossGainBRL - cdiGainEstimated;

  // ── Isenção de IR (a partir das posições) ──
  let taxExemptValueBRL = 0;
  const taxExemptAssets: { name: string; valueR$: number }[] = [];
  allPositions.forEach((p: any) => {
    if (p?.taxExempt === true) {
      const v = Number(p.grossBalance) || 0;
      taxExemptValueBRL += v;
      if (v > 0) taxExemptAssets.push({ name: p.name || p.ticker || 'Ativo', valueR$: v });
    }
  });
  // Se composição traz exemptValue, soma como fallback (descontando duplicidade simples: usa o maior)
  const compExempt = Object.values(compMap).reduce((s, c) => s + (c.exemptValue || 0), 0);
  if (compExempt > taxExemptValueBRL) taxExemptValueBRL = compExempt;
  const taxExemptPct = totalGross > 0 ? (taxExemptValueBRL / totalGross) * 100 : 0;

  // ── Mês a mês consolidado ──
  const monthlyHistory: MonthlyRow[] = Object.entries(monthlyMap)
    .map(([month, v]) => {
      const portfolioPct = v.pW > 0 ? v.pSum / v.pW : 0;
      const cdiPct = v.cW > 0 ? v.cSum / v.cW : null;
      const pctOfCdi = cdiPct != null && cdiPct > 0 ? (portfolioPct / cdiPct) * 100 : null;
      return { month, portfolioPct, cdiPct, pctOfCdi, gainBRL: v.gain || null };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // ── Composição ──
  const composition: CompositionRow[] = Object.entries(compMap)
    .map(([className, v]) => ({
      className,
      valueR$: v.value,
      pct: totalGross > 0 ? (v.value / totalGross) * 100 : 0,
      taxExemptPct: v.value > 0 ? (v.exemptValue / v.value) * 100 : null,
    }))
    .sort((a, b) => b.pct - a.pct);

  // ── Projeções ──
  // Taxa mensal: priorizar média do monthlyHistory; senão derivar do yearReturnPct.
  let averageMonthlyReturnPct: number | null = null;
  if (monthlyHistory.length > 0) {
    const sum = monthlyHistory.reduce((s, m) => s + m.portfolioPct, 0);
    averageMonthlyReturnPct = sum / monthlyHistory.length;
  } else if (yearReturnPct != null) {
    averageMonthlyReturnPct = (Math.pow(1 + yearReturnPct / 100, 1 / 12) - 1) * 100;
  } else if (monthReturnPct != null) {
    averageMonthlyReturnPct = monthReturnPct;
  }

  const monthlyRate = (averageMonthlyReturnPct ?? 0) / 100;
  const cdiMonthlyRate = cdiYearPct != null ? Math.pow(1 + cdiYearPct / 100, 1 / 12) - 1 : 0;

  const horizons = [1, 3, 5];
  const projections: ProjectionRow[] = horizons.map(yrs => ({
    horizonYears: yrs,
    withoutAporte: futureValue(totalGross, monthlyRate, yrs * 12, 0),
    withAporte: futureValue(totalGross, monthlyRate, yrs * 12, monthlyAporte),
    monthlyRate,
  }));
  const projectionsCdi: ProjectionRow[] = horizons.map(yrs => ({
    horizonYears: yrs,
    withoutAporte: futureValue(totalGross, cdiMonthlyRate, yrs * 12, 0),
    withAporte: futureValue(totalGross, cdiMonthlyRate, yrs * 12, monthlyAporte),
    monthlyRate: cdiMonthlyRate,
  }));

  // ── Período ──
  const dates = ext.map(r => r.reportDate).filter(Boolean).sort();
  const reportPeriodLabel = formatPeriodLabel(dates);

  // ── Liquidez ──
  const liquidityBands = computeSimpleLiquidity(allPositions, totalGross);

  // ── Alertas (passa adiante) ──
  const alerts = ext.flatMap(r => (Array.isArray(r.alerts) ? r.alerts : []));

  return {
    clientName,
    reportPeriodLabel,
    totalGross,
    totalNet: reportsWithNet > 0 ? totalNet : null,
    netCoverage: { available: reportsWithNet, total: ext.length },
    brokers: Object.entries(brokerMap)
      .map(([broker, totalGross]) => ({ broker, totalGross }))
      .sort((a, b) => b.totalGross - a.totalGross),
    monthReturnPct,
    yearReturnPct,
    cumulativeReturnPct,
    cdiYearPct,
    pctOfCdiYear,
    grossGainBRL,
    netGainBRL,
    irProvisionBRL,
    alphaVsCdiBRL,
    taxExemptValueBRL,
    taxExemptPct,
    taxExemptAssets: taxExemptAssets.sort((a, b) => b.valueR$ - a.valueR$).slice(0, 10),
    monthlyHistory,
    composition,
    projections,
    projectionsCdi,
    monthlyAporte,
    averageMonthlyReturnPct,
    liquidityBands,
    alerts,
    reportsCount: ext.length,
  };
}

/** FV = PV*(1+i)^n + PMT*((1+i)^n - 1)/i */
function futureValue(pv: number, monthlyRate: number, months: number, pmt: number): number {
  if (monthlyRate === 0) return pv + pmt * months;
  const factor = Math.pow(1 + monthlyRate, months);
  return pv * factor + pmt * (factor - 1) / monthlyRate;
}

function computeSimpleLiquidity(positions: any[], totalGross: number) {
  const buckets = { dPlus1: 0, upTo35: 0, '35to90': 0, '1to5years': 0, above5years: 0, noLiquidity: 0 };
  const now = new Date();
  positions.forEach(p => {
    const v = Number(p.grossBalance) || 0;
    if (v <= 0) return;
    const liqDays = p.liquidityDays;
    const mat = p.maturityDate ? new Date(p.maturityDate) : null;
    const t = String(p.type || '').toLowerCase();
    if (t.includes('previd')) { buckets.noLiquidity += v; return; }
    if (liqDays != null) {
      if (liqDays <= 1) buckets.dPlus1 += v;
      else if (liqDays <= 35) buckets.upTo35 += v;
      else if (liqDays <= 90) buckets['35to90'] += v;
      else if (liqDays <= 1825) buckets['1to5years'] += v;
      else buckets.above5years += v;
    } else if (mat && mat >= now) {
      const d = Math.ceil((mat.getTime() - now.getTime()) / 86400000);
      if (d <= 1) buckets.dPlus1 += v;
      else if (d <= 35) buckets.upTo35 += v;
      else if (d <= 90) buckets['35to90'] += v;
      else if (d <= 1825) buckets['1to5years'] += v;
      else buckets.above5years += v;
    } else if (t === 'ação' || t === 'acao' || t === 'fii' || t === 'etf') {
      buckets.dPlus1 += v;
    } else {
      buckets.noLiquidity += v;
    }
  });
  const labels: Record<string, string> = {
    dPlus1: '0 a 1 dia (D+1)',
    upTo35: 'Até 35 dias',
    '35to90': '35 a 90 dias',
    '1to5years': '1 a 5 anos',
    above5years: 'Acima de 5 anos',
    noLiquidity: 'Liquidez não informada',
  };
  return Object.entries(buckets).map(([k, v]) => ({
    label: labels[k],
    valueR$: v,
    pct: totalGross > 0 ? (v / totalGross) * 100 : 0,
  }));
}

function formatPeriodLabel(sortedDates: string[]): string {
  if (sortedDates.length === 0) return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
  };
  if (first === last) return fmt(last);
  return `${fmt(first)} a ${fmt(last)}`;
}

/** Helpers de formatação compartilhados. */
export const fmtBRL = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));

export const fmtPct = (v: number | null | undefined, digits = 2) =>
  v == null ? '—' : `${Number(v).toFixed(digits)}%`;

export const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  if (!y || !mo) return m;
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
};
