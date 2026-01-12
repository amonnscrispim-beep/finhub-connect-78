export type GoalType =
  | 'Reserva de Emergência'
  | 'Viagem'
  | 'Aposentadoria'
  | 'Compra / Entrada de Imóvel'
  | 'Troca de Carro'
  | 'Educação'
  | 'Independência Financeira'
  | 'Renda Passiva Mensal'
  | 'Outros';

export const GOAL_TYPE_OPTIONS: GoalType[] = [
  'Reserva de Emergência',
  'Viagem',
  'Aposentadoria',
  'Compra / Entrada de Imóvel',
  'Troca de Carro',
  'Educação',
  'Independência Financeira',
  'Renda Passiva Mensal',
  'Outros',
];

export interface FinancialGoal {
  id: string;
  client_id: string;
  user_id: string;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  annual_interest_rate: number;
  deadline_months: number;
  created_at: string;
  updated_at: string;
}

// Compound interest calculation: FV = P * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
export const calculateFutureValue = (
  currentAmount: number,
  monthlyContribution: number,
  annualRate: number,
  months: number
): number => {
  if (months <= 0) return currentAmount;
  
  // Convert annual rate to monthly rate (compound)
  const monthlyRate = Math.pow(1 + annualRate / 100, 1/12) - 1;
  
  if (monthlyRate === 0) {
    return currentAmount + (monthlyContribution * months);
  }
  
  // Future value of current amount (compound)
  const fvPresent = currentAmount * Math.pow(1 + monthlyRate, months);
  
  // Future value of monthly contributions (compound)
  const fvContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  
  return fvPresent + fvContributions;
};

// Calculate required monthly contribution to reach target
export const calculateRequiredContribution = (
  currentAmount: number,
  targetAmount: number,
  annualRate: number,
  months: number
): number => {
  if (months <= 0) return 0;
  
  const monthlyRate = Math.pow(1 + annualRate / 100, 1/12) - 1;
  
  // Future value of current amount
  const fvPresent = currentAmount * Math.pow(1 + monthlyRate, months);
  
  // How much we need from contributions
  const needed = targetAmount - fvPresent;
  
  if (needed <= 0) return 0;
  
  if (monthlyRate === 0) {
    return needed / months;
  }
  
  // PMT = FV * r / ((1 + r)^n - 1)
  return needed * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getMonthlyRateEquivalent = (annualRate: number): string => {
  return ((Math.pow(1 + annualRate / 100, 1/12) - 1) * 100).toFixed(4);
};
