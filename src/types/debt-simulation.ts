export type DebtType = 'Empréstimo' | 'Financiamento';
export type AmortizationSystem = 'SAC' | 'PRICE';
export type InterestPeriod = 'a.m.' | 'a.a.';
export type AmortizationType = 'prazo' | 'parcela';

export interface ExtraAmortization {
  id: string;
  afterInstallments: number[]; // Array of installment numbers after which to amortize
  amount: number;
  type: AmortizationType;
}

export interface DebtSimulation {
  id: string;
  clientId: string;
  userId: string;
  name: string;
  debtType: DebtType;
  principalValue: number;
  startMonth: number;
  startYear: number;
  amortizationSystem: AmortizationSystem;
  interestRate: number;
  interestPeriod: InterestPeriod;
  installmentsCount: number;
  extraAmortizations: ExtraAmortization[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InstallmentRow {
  number: number;
  date: string;
  initialBalance: number;
  payment: number;
  interest: number;
  amortization: number;
  finalBalance: number;
  extraAmortization?: number;
}

export interface SimulationSummary {
  principalValue: number;
  totalPayment: number;
  totalInterest: number;
  totalFees: number;
  totalCorrection: number;
  interestRate: number;
  interestPeriod: InterestPeriod;
  installmentsCount: number;
  firstInstallmentValue: number;
  lastInstallmentValue: number;
  lastInstallmentDate: string;
  system: AmortizationSystem;
}

export interface SimulationFormData {
  name: string;
  debtType: DebtType;
  principalValue: number;
  startMonth: number;
  startYear: number;
  amortizationSystem: AmortizationSystem;
  interestRate: number;
  interestPeriod: InterestPeriod;
  installmentsCount: number;
}

export const DEBT_TYPES: DebtType[] = ['Empréstimo', 'Financiamento'];
export const AMORTIZATION_SYSTEMS: AmortizationSystem[] = ['SAC', 'PRICE'];
export const INTEREST_PERIODS: InterestPeriod[] = ['a.m.', 'a.a.'];
