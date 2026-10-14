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
  'Fundo de Ações': 'Ações Brasil',
  'BDR': 'Ações Americanas',
  'Fundo Multimercado': 'Outros',
  'COE': 'Outros',
  'Criptoativos': 'Outros',
  'Outros': 'Outros',
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Classifica o ativo pelo nome + tipo informado. Ordem importa: produtos mais
 * específicos (previdência, FIDC, FII) antes dos genéricos. Usa limites de
 * palavra para evitar falsos positivos (ex.: "di" dentro de "FIDC").
 * Sem evidência, retorna "Outros" — nunca assume Ações.
 */
export function guessType(raw: string, name: string): string {
  const t = ` ${norm(`${raw} ${name}`)} `;
  const has = (re: RegExp) => re.test(t);
  if (has(/\bprev\b|previd|\bvgbl\b|\bpgbl\b/)) return 'Previdência';
  if (has(/\bfidc\b|direitos credit/)) return 'FIDC';
  if (has(/\bfii\b|\bfiagro\b|imobiliari/)) return 'Fundos Imobiliários';
  if (has(/\betf\b/)) return "ETF's";
  if (has(/\bbdr\b/) || /^[a-z]{4}3[2-5]\b/.test(norm(name).trim())) return 'BDR';
  if (has(/\bcoe\b/)) return 'COE';
  if (has(/cripto|bitcoin|\bbtc\b|\beth\b/)) return 'Criptoativos';
  if (has(/tesouro|\bntn|\blft\b|\bltn\b|titulo publico/)) return 'Título Público';
  if (has(/debenture|\bcri\b|\bcra\b|credito privado/) && !has(/\bfundo\b|\bfic?\b|\bfim\b/)) return 'Crédito Privado (Debêntures, CRI/CRA)';
  if (has(/\bcdb\b|\blci\b|\blca\b|\blc\b|\blf\b|\blig\b|\brdb\b|emissao bancaria/)) return 'Emissão Bancária (CDB, LCI/LCA)';
  if (has(/\bfundo\b|\bfic\b|\bfi\b|\bfim\b|\bfia\b|\bfif\b|\bfi[cm]?[- ]/)) {
    if (has(/\bfia\b|\bacoes\b|equity|\bfic fia\b/)) return 'Fundo de Ações';
    if (has(/multimercado|\bmm\b|\bfim\b|macro|long short|multiestrategia/)) return 'Fundo Multimercado';
    if (has(/\brf\b|renda fixa|\bcdi\b|\bdi\b|credito|referenciado|\bsimples\b|soberano|ipca|inflacao/)) return 'Fundo de Renda Fixa';
    return 'Fundo Multimercado';
  }
  if (has(/conta corrente|saldo em conta|saldo disponivel|\bcaixa\b/)) return 'Caixa/Conta Corrente';
  const tk = norm(name).trim();
  if (/^[a-z]{4}11\b/.test(tk) && !/^(taee|sanb|klbn|bpac|alup|engi|sapr|tiet|igta|cple|bbse)11/.test(tk)) return 'Fundos Imobiliários';
  if (has(/\bacao\b|\bacoes\b/) || /^[a-z]{4}(3|4|5|6|11)\b/.test(norm(name).trim())) return 'Ações';
  return 'Outros';
}

export function guessStrategy(type: string, rate: string, indexer = '', name = ''): string {
  if (STRAT_BY_TYPE[type]) return STRAT_BY_TYPE[type];
  if (type === "ETF's") return /ivvb|spx|nasd|usa|s&p|\bacwi\b|\bwrld\b/.test(norm(`${name} ${rate}`)) ? 'Ações Americanas' : 'Ações Brasil';
  const t = ` ${norm(`${rate} ${indexer} ${name}`)} `;
  if (type === 'Previdência' && !/\brf\b|renda fixa|\bcdi\b|\bdi\b|ipca|inflacao|\bpre\b|soberano/.test(t)) return 'Outros';
  if (/ipca|\bima\b|ima-b|inflacao|\bntn-?b\b|\bigpm\b/.test(t)) return 'Renda Fixa Inflação';
  if (/\bcdi\b|\bselic\b|\bdi\b|\blft\b|pos[- ]?fixad|\bpos\b/.test(t)) return 'Renda Fixa Pós Fixada';
  if (/prefixad|\bpre\b|\bltn\b|\bntn-?f\b/.test(t) || /^\s*\d+[,.]?\d*\s*%\s*(a\.?a\.?)?\s*$/.test(norm(rate))) return 'Renda Fixa Pré Fixada';
  // FIDC e fundos de RF sem indexador explícito são quase sempre CDI
  if (type === 'FIDC' || type === 'Fundo de Renda Fixa' || type === 'Previdência') return 'Renda Fixa Pós Fixada';
  return 'Outros';
}
