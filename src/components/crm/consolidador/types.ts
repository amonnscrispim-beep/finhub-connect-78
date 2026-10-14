export type ModelKey = 'balanceado' | 'conservador' | 'arrojado' | 'personalizado';

export interface ConsolidatedAsset {
  id: string;
  name: string;
  type: string;
  strategy: string;
  value: number; // reais
  maturity: string | null;
  rate: string | null;
}

export interface Comparative {
  name: string;
  retorno_total: number;
  retorno_anual: number;
  retorno_real: number;
  desvio_padrao: number;
  sharpe: number;
}

export interface BacktestParams {
  location: 'onshore' | 'offshore';
  model: ModelKey;
  returnType: 'nominal' | 'real';
  initial: number;
  monthly: number;
  benchmark: string;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  passiveRate: number; // % ao mês
  manualPortfolio: number | null;
  manualBenchmark: number | null;
}

export interface ConsolidationState {
  assets: ConsolidatedAsset[];
  selectedModel: ModelKey;
  models: Record<ModelKey, Record<string, number>>;
  methodologyName: string;
  methodologyLocation: 'onshore' | 'offshore';
  comparatives: Comparative[];
  backtest: BacktestParams;
  importedFiles: string[];
}

export interface StrategyRow {
  strategy: string;
  value: number;
  pct: number;
}
