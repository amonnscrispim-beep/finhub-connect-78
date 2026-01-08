export type FunnelStage =
  | 'Novo cliente'
  | 'Em atendimento'
  | '1ª Reunião agendada'
  | '2ª Reunião agendada'
  | '3ª Reunião agendada'
  | '4ª Reunião agendada'
  | '5ª Reunião agendada'
  | '6ª Reunião agendada'
  | 'Conclusão';

export type InvestorProfile = 
  | 'Conservador' 
  | 'Moderado' 
  | 'Arrojado' 
  | 'Agressivo';

export type Residence = 'Mora no Brasil' | 'Mora no exterior' | '';

export type RenewalStatus = 'Renovação' | 'Potencial Renovação' | 'Não aplicável' | '';

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  createdAt: Date;
}

export interface Client {
  id: string;
  contractStart: Date;
  contractEnd: Date;
  name: string;
  age: number;
  email: string;
  phone: string;
  profession: string;
  objective: string;
  investmentTerm: string;
  financialAssets: number;
  materialAssets: number;
  emergencyReserve: number;
  investorProfile: InvestorProfile;
  monthlyRevenue: number;
  monthlyContribution: number;
  workDone: string;
  tasks: Task[];
  observations: string;
  city: string;
  state: string;
  funnelStage: FunnelStage;
  renewed: boolean;
  renewalPotential: boolean;
  pendingSchedule: boolean;
  residence: Residence;
  renewalStatus: RenewalStatus;
  renewalDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const FUNNEL_STAGES: FunnelStage[] = [
  'Novo cliente',
  'Em atendimento',
  '1ª Reunião agendada',
  '2ª Reunião agendada',
  '3ª Reunião agendada',
  '4ª Reunião agendada',
  '5ª Reunião agendada',
  '6ª Reunião agendada',
  'Conclusão',
];

export const INVESTOR_PROFILES: InvestorProfile[] = [
  'Conservador',
  'Moderado',
  'Arrojado',
  'Agressivo',
];

export const RESIDENCE_OPTIONS: Residence[] = [
  'Mora no Brasil',
  'Mora no exterior',
];

export const RENEWAL_STATUS_OPTIONS: RenewalStatus[] = [
  'Renovação',
  'Potencial Renovação',
  'Não aplicável',
];

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
