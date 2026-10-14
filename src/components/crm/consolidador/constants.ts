import type { ModelKey, Comparative } from './types';

export const ASSET_TYPES = [
  'Ações',
  "ETF's",
  'Fundos Imobiliários',
  'Emissão Bancária (CDB, LCI/LCA)',
  'Título Público',
  'Caixa/Conta Corrente',
] as const;

export const STRATEGIES = [
  'Ações Brasil',
  'Ações Americanas',
  'Fundos Imobiliários',
  'Renda Fixa Pós Fixada',
  'Renda Fixa Pré Fixada',
  'Renda Fixa Inflação',
  'Caixa',
  'Outros',
] as const;

export const STRATEGY_CLASS: Record<string, string> = {
  'Ações Brasil': 'RENDA VARIÁVEL',
  'Ações Americanas': 'RENDA VARIÁVEL',
  'Fundos Imobiliários': 'RENDA VARIÁVEL',
  'Renda Fixa Pós Fixada': 'RENDA FIXA',
  'Renda Fixa Pré Fixada': 'RENDA FIXA',
  'Renda Fixa Inflação': 'RENDA FIXA',
  'Caixa': 'OUTROS',
  'Outros': 'OUTROS',
};

export const STRATEGY_COLORS: Record<string, string> = {
  'Fundos Imobiliários': '#3B82F6',
  'Renda Fixa Pós Fixada': '#D4A053',
  'Ações Brasil': '#1E3A5F',
  'Renda Fixa Inflação': '#8B6914',
  'Renda Fixa Pré Fixada': '#92702A',
  'Caixa': '#06B6D4',
  'Ações Americanas': '#1E40AF',
  'Outros': '#6B7280',
};

export const TIPO_COLORS: Record<string, string> = {
  "ETF's": 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  'Ações': 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  'Emissão Bancária (CDB, LCI/LCA)': 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  'Fundos Imobiliários': 'bg-sky-500/20 text-sky-700 dark:text-sky-400',
  'Título Público': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'Caixa/Conta Corrente': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
};

export const MODEL_LABELS: Record<ModelKey, string> = {
  balanceado: 'Modelo Balanceado',
  conservador: 'Modelo Conservador',
  arrojado: 'Modelo Arrojado',
  personalizado: 'Modelo Personalizado',
};

export const DEFAULT_MODELS: Record<ModelKey, Record<string, number>> = {
  balanceado: {
    'Fundos Imobiliários': 0, 'Renda Fixa Pós Fixada': 13.8, 'Ações Brasil': 22.5,
    'Renda Fixa Inflação': 27.5, 'Renda Fixa Pré Fixada': 13.8, 'Caixa': 0, 'Ações Americanas': 22.5,
  },
  conservador: {
    'Renda Fixa Pós Fixada': 30, 'Renda Fixa Inflação': 30, 'Renda Fixa Pré Fixada': 15,
    'Fundos Imobiliários': 10, 'Ações Brasil': 10, 'Ações Americanas': 5, 'Caixa': 0,
  },
  arrojado: {
    'Ações Brasil': 30, 'Ações Americanas': 30, 'Fundos Imobiliários': 15,
    'Renda Fixa Inflação': 15, 'Renda Fixa Pós Fixada': 5, 'Renda Fixa Pré Fixada': 5, 'Caixa': 0,
  },
  personalizado: {
    'Ações Brasil': 20, 'Ações Americanas': 15, 'Fundos Imobiliários': 10,
    'Renda Fixa Inflação': 25, 'Renda Fixa Pós Fixada': 20, 'Renda Fixa Pré Fixada': 10, 'Caixa': 0,
  },
};

export const BENCHMARK_OPTIONS = [
  'Ações mais baratas da bolsa', 'IBOVESPA', 'CDI', 'IPCA', 'Carteira do Cliente',
  'S&P 500', 'IFIX', 'Selic', 'Dólar', 'Personalizado',
];

export const DEFAULT_COMPARATIVES: Comparative[] = [
  { name: 'Ações mais baratas da bolsa', retorno_total: 4291.31, retorno_anual: 18.68, retorno_real: 12.33, desvio_padrao: 22.61, sharpe: 0.34 },
  { name: 'IBOVESPA', retorno_total: 748.39, retorno_anual: 10.17, retorno_real: 4.27, desvio_padrao: 21.96, sharpe: -0.03 },
  { name: 'CDI', retorno_total: 886.29, retorno_anual: 10.92, retorno_real: 4.99, desvio_padrao: 1.06, sharpe: 0 },
  { name: 'IPCA', retorno_total: 236.67, retorno_anual: 5.65, retorno_real: 0, desvio_padrao: 1.13, sharpe: -4.67 },
];

export type SeriesKey = 'cdi' | 'ibovespa' | 'ipca' | 'ifix' | 'sp500' | 'dolar';

// Retornos anuais aproximados (% a.a.). 2025–2026 são estimativas editáveis no código.
export const RETORNOS_HISTORICOS: Record<SeriesKey, Record<number, number>> = {
  cdi: { 2014: 10.81, 2015: 13.24, 2016: 14.0, 2017: 9.93, 2018: 6.42, 2019: 5.97, 2020: 2.76, 2021: 4.42, 2022: 12.39, 2023: 13.04, 2024: 10.88, 2025: 11.5, 2026: 11.0 },
  ibovespa: { 2014: -2.91, 2015: -13.31, 2016: 38.94, 2017: 26.86, 2018: 15.03, 2019: 31.58, 2020: 2.92, 2021: -11.93, 2022: 4.69, 2023: 22.28, 2024: -10.36, 2025: 5.0, 2026: 8.0 },
  ipca: { 2014: 6.41, 2015: 10.67, 2016: 6.29, 2017: 2.95, 2018: 3.75, 2019: 4.31, 2020: 4.52, 2021: 10.06, 2022: 5.79, 2023: 4.62, 2024: 4.83, 2025: 5.5, 2026: 4.5 },
  ifix: { 2014: -2.78, 2015: 5.46, 2016: 32.3, 2017: 19.42, 2018: 5.62, 2019: 35.98, 2020: -10.24, 2021: -2.28, 2022: 2.22, 2023: 15.5, 2024: -5.89, 2025: 8.0, 2026: 9.0 },
  sp500: { 2014: 26.0, 2015: 48.0, 2016: -9.0, 2017: 23.0, 2018: 13.0, 2019: 35.0, 2020: 47.0, 2021: 38.0, 2022: -24.0, 2023: 15.0, 2024: 58.0, 2025: 5.0, 2026: 8.0 },
  dolar: { 2014: 13.4, 2015: 48.5, 2016: -17.7, 2017: 1.5, 2018: 17.1, 2019: 4.0, 2020: 29.0, 2021: 7.4, 2022: -6.5, 2023: -7.2, 2024: 27.9, 2025: -5.0, 2026: 0 },
};

export const BACKTEST_BENCHMARKS: { label: string; key: SeriesKey }[] = [
  { label: 'CDI', key: 'cdi' },
  { label: 'IBOVESPA', key: 'ibovespa' },
  { label: 'IPCA', key: 'ipca' },
  { label: 'Selic', key: 'cdi' },
  { label: 'IFIX', key: 'ifix' },
  { label: 'S&P 500', key: 'sp500' },
  { label: 'Dólar', key: 'dolar' },
];

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const BACKTEST_YEARS = Object.keys(RETORNOS_HISTORICOS.cdi).map(Number);
