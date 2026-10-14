import { RETORNOS_HISTORICOS, BACKTEST_BENCHMARKS, MONTHS, type SeriesKey } from './constants';
import type { BacktestParams, ConsolidatedAsset, StrategyRow } from './types';

export const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const pct2 = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(2).replace('.', ',')}%`;

export function strategyRows(assets: ConsolidatedAsset[]): StrategyRow[] {
  const total = assets.reduce((s, a) => s + (a.value || 0), 0);
  const map: Record<string, number> = {};
  assets.forEach(a => { map[a.strategy] = (map[a.strategy] ?? 0) + (a.value || 0); });
  return Object.entries(map)
    .map(([strategy, value]) => ({ strategy, value, pct: total > 0 ? (value / total) * 100 : 0 }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

export interface Opportunity { estrategia: string; descricao: string; recomendado: number }

export function opportunities(rows: StrategyRow[], model: Record<string, number>): Opportunity[] {
  const current: Record<string, number> = {};
  rows.forEach(r => { current[r.strategy] = r.pct; });
  const keys = new Set([...Object.keys(model), ...Object.keys(current)]);
  const out: Opportunity[] = [];
  keys.forEach(k => {
    const rec = model[k] ?? 0;
    const cur = current[k] ?? 0;
    if (rec > 0 && cur === 0) out.push({ estrategia: k, descricao: 'Ausente na carteira', recomendado: rec });
    else if (Math.abs(cur - rec) > 5) {
      out.push({ estrategia: k, descricao: `${cur < rec ? 'Sub-alocada' : 'Sobre-alocada'} — alocação atual: ${cur.toFixed(1)}%`, recomendado: rec });
    }
  });
  return out;
}

const annualFor = (strategy: string, year: number): number => {
  const r = (k: SeriesKey) => RETORNOS_HISTORICOS[k][year] ?? 0;
  switch (strategy) {
    case 'Ações Brasil': return r('ibovespa');
    case 'Ações Americanas': return r('sp500');
    case 'Fundos Imobiliários': return r('ifix');
    case 'Renda Fixa Pós Fixada': return r('cdi');
    case 'Renda Fixa Pré Fixada': return r('cdi') + 1;
    case 'Renda Fixa Inflação': return ((1 + r('ipca') / 100) * 1.055 - 1) * 100;
    case 'Caixa': return r('cdi') * 0.95;
    default: return r('cdi');
  }
};

const toMonthly = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12) - 1;

export interface BacktestPoint { date: string; portfolio: number; benchmark: number }

export function runBacktest(p: BacktestParams, model: Record<string, number>, feePct = 1) {
  const benchKey = BACKTEST_BENCHMARKS.find(b => b.label === p.benchmark)?.key ?? 'cdi';
  const totalW = Object.values(model).reduce((s, v) => s + (v || 0), 0) || 1;
  let port = p.initial;
  let bench = p.initial;
  let inflIndex = 1;
  const points: BacktestPoint[] = [];
  const startIdx = p.startYear * 12 + p.startMonth;
  const endIdx = p.endYear * 12 + p.endMonth;
  for (let i = startIdx; i <= endIdx; i++) {
    const y = Math.floor(i / 12);
    const m = i % 12;
    const annual = Object.entries(model).reduce((s, [k, w]) => s + annualFor(k, y) * ((w || 0) / totalW), 0);
    const pm = toMonthly(annual) - toMonthly(feePct);
    const bm = toMonthly(RETORNOS_HISTORICOS[benchKey][y] ?? 0);
    port = port * (1 + pm) + p.monthly;
    bench = bench * (1 + bm) + p.monthly;
    inflIndex *= 1 + toMonthly(RETORNOS_HISTORICOS.ipca[y] ?? 0);
    const div = p.returnType === 'real' ? inflIndex : 1;
    points.push({ date: `${MONTHS[m]}/${y}`, portfolio: port / div, benchmark: bench / div });
  }
  const last = points[points.length - 1];
  return { points, finalPortfolio: last?.portfolio ?? p.initial, finalBenchmark: last?.benchmark ?? p.initial };
}

const STRAT_BY_TYPE: Record<string, string> = {
  'Fundos Imobiliários': 'Fundos Imobiliários',
  'Caixa/Conta Corrente': 'Caixa',
  'Ações': 'Ações Brasil',
};

export function guessType(raw: string, name: string): string {
  const t = `${raw} ${name}`.toLowerCase();
  if (t.includes('fii') || /\d11\b/.test(name.toLowerCase()) && t.includes('imob')) return 'Fundos Imobiliários';
  if (t.includes('fii')) return 'Fundos Imobiliários';
  if (t.includes('etf')) return "ETF's";
  if (t.includes('tesouro') || t.includes('ntn') || t.includes('lft') || t.includes('ltn') || t.includes('público')) return 'Título Público';
  if (t.includes('cdb') || t.includes('lci') || t.includes('lca') || t.includes('renda fixa') || t.includes('lc ') || t.includes('cri') || t.includes('cra') || t.includes('debênture')) return 'Emissão Bancária (CDB, LCI/LCA)';
  if (t.includes('caixa') || t.includes('conta') || t.includes('saldo')) return 'Caixa/Conta Corrente';
  if (t.includes('ação') || t.includes('acao') || t.includes('ações')) return 'Ações';
  return 'Ações';
}

export function guessStrategy(type: string, rate: string, indexer = ''): string {
  const t = `${rate} ${indexer}`.toLowerCase();
  if (STRAT_BY_TYPE[type]) return STRAT_BY_TYPE[type];
  if (type === "ETF's") return /ivvb|spx|nasd|usa|s&p/.test(t) ? 'Ações Americanas' : 'Ações Brasil';
  if (t.includes('ipca') || t.includes('ima')) return 'Renda Fixa Inflação';
  if (t.includes('cdi') || t.includes('selic') || t.includes('di')) return 'Renda Fixa Pós Fixada';
  if (t.includes('pré') || t.includes('pre') || /\d+[,.]?\d*\s*%/.test(t)) return 'Renda Fixa Pré Fixada';
  return 'Outros';
}
