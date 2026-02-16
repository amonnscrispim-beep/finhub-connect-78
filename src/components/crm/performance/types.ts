export interface Position {
  name: string;
  type: string;
  indexer: string;
  rate: string;
  maturityDate: string | null;
  grossBalance: number;
  portfolioPct: number;
}

export interface PositionWithOrigin extends Position {
  broker: string;
  pdfFilename: string;
}

export interface LiquidityBand {
  label: string;
  key: string;
  valueR$: number;
  pct: number;
}

export const STANDARD_LIQUIDITY_BANDS = [
  { key: 'dPlus1', label: '0 a 1 dia (D+1)', maxDays: 1 },
  { key: 'upTo35', label: 'Até 35 dias', maxDays: 35 },
  { key: '35to90', label: '35 a 90 dias', maxDays: 90 },
  { key: '1to5years', label: '1 a 5 anos', maxDays: 1825 },
  { key: 'above5years', label: 'Acima de 5 anos', maxDays: Infinity },
  { key: 'noLiquidity', label: 'Liquidez não informada', maxDays: -1 },
] as const;

export type BrokerSummary = {
  broker: string;
  totalGross: number;
  totalNet: number;
  hasNet: boolean;          // true only if the report explicitly provided net patrimony
  positions: PositionWithOrigin[];
  liquidityBands: LiquidityBand[];
  reports: { pdfFilename: string; reportDate: string; status: string }[];
};

export type ConsolidatedSummary = {
  totalGross: number;
  totalNet: number;
  netCoverage: { available: number; total: number };  // X of Y reports have net
  grossAudit: { sum: number; consolidated: number; diff: number; missingBrokers: string[] };
  positions: PositionWithOrigin[];
  liquidityBands: LiquidityBand[];
  brokers: BrokerSummary[];
  alerts: string[];
};
