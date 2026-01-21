export type FunnelStage =
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

export type FileFolder = 'documentos' | 'planejamento' | 'desempenho';

export type ContractedMeetings = 1 | 3 | 6;

export type PrivatePensionStatus = 'Sim' | 'Não' | 'Não precisa' | '';

export type PrivatePensionType = 'PGBL' | 'VGBL' | '';

export type OrganizedFinancesStatus = 'Sim' | 'Não' | 'Não precisa' | '';

export type DebtType = 'emprestimo' | 'financiamento' | 'consorcio';

export type AmortizationPeriodUnit = 'meses' | 'anos';

export type AmortizationSystem = 'PRICE' | 'SAC' | '';

export type AmortizationStrategy = 'Redução de prazo' | 'Redução de parcela' | '';

export interface DebtInfo {
  id: string;
  type: DebtType;
  cetPercentage: number | null; // CET % ao ano
  term: number | null;
  termUnit: AmortizationPeriodUnit;
  amortizationSystem: AmortizationSystem;
  // Payoff planning (manual)
  payoffStrategy: AmortizationStrategy;
  payoffYears: number | null;
  payoffSavings: number | null; // R$
}

export interface ConsultingResult {
  initialPatrimony: number | null;
  finalPatrimony: number | null;
}

export interface ClientFile {
  id: string;
  name: string;
  type: string;
  size: number;
  folder: FileFolder;
  uploadedAt: Date;
  dataUrl: string; // Base64 for localStorage persistence
}

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  createdAt: Date;
}

export interface PartnerInfo {
  name: string;
  age: number | null;
  profession: string;
}

export interface ChildInfo {
  id: string;
  name: string;
  age: number | null;
}

export type AllocationObjective = 'Preservação' | 'Renda' | 'Crescimento' | 'Balanceado' | 'Aposentadoria' | '';
export type PortfolioHorizon = 'Curto prazo' | 'Médio prazo' | 'Longo prazo' | '';

export interface PortfolioDistribution {
  // Fixed Income breakdown
  postFixed: number; // % Pós-fixado
  preFixed: number; // % Prefixado
  inflationIndexed: number; // % Indexado à inflação
  // Other assets
  stocks: number; // % Ações
  realEstate: number; // % Fundos Imobiliários
  international: number; // % Exterior
  // Auxiliary fields
  objective: AllocationObjective;
  horizon: PortfolioHorizon;
  // Legacy field for backward compatibility
  fixedIncome?: number;
}

export interface RetirementGoal {
  desiredAge: number | null;
  desiredMonthlyIncome: number | null;
}

export interface MeetingNotes {
  [key: number]: string; // 1, 2, 3... up to 6
}

export interface ScheduledMeeting {
  date: Date;
  time?: string;
}

export interface Client {
  id: string;
  contractStart: Date;
  contractEnd: Date;
  name: string;
  age: number;
  birthDate: Date | null; // Birthday field
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
  country: string; // For international clients (residence = Mora no exterior)
  funnelStage: FunnelStage;
  renewed: boolean;
  renewalPotential: boolean;
  pendingSchedule: boolean;
  residence: Residence;
  renewalStatus: RenewalStatus;
  renewalDate: Date | null;
  married: boolean;
  partner: PartnerInfo | null;
  hasChildren: boolean;
  children: ChildInfo[];
  portfolioDistribution: PortfolioDistribution | null;
  privatePensionStatus: PrivatePensionStatus;
  privatePensionType: PrivatePensionType;
  retirementGoal: RetirementGoal | null;
  contractedMeetings: ContractedMeetings | null;
  meetingNotes: MeetingNotes;
  lastActivityAt: Date;
  scheduledMeeting: ScheduledMeeting | null;
  files: ClientFile[];
  // New fields
  organizedFinances: OrganizedFinancesStatus;
  debts: DebtInfo[];
  consultingResult: ConsultingResult | null;
  consultingFinished: boolean; // Logical deactivation
  isRenewedClient: boolean; // Premium indicator
  // New consultant annotation fields
  consultingReason: string | null;
  professionalProfile: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const FUNNEL_STAGES: FunnelStage[] = [
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

export const FILE_FOLDERS: { value: FileFolder; label: string }[] = [
  { value: 'documentos', label: 'Documentos' },
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'desempenho', label: 'Desempenho' },
];

export const CONTRACTED_MEETINGS_OPTIONS: ContractedMeetings[] = [1, 3, 6];

export const PRIVATE_PENSION_STATUS_OPTIONS: PrivatePensionStatus[] = [
  'Sim',
  'Não',
  'Não precisa',
];

export const PRIVATE_PENSION_TYPE_OPTIONS: PrivatePensionType[] = [
  'PGBL',
  'VGBL',
];

export const ORGANIZED_FINANCES_OPTIONS: OrganizedFinancesStatus[] = [
  'Sim',
  'Não',
  'Não precisa',
];

export const DEBT_TYPE_OPTIONS: { value: DebtType; label: string }[] = [
  { value: 'emprestimo', label: 'Empréstimo' },
  { value: 'financiamento', label: 'Financiamento' },
  { value: 'consorcio', label: 'Consórcio' },
];

export const AMORTIZATION_SYSTEM_OPTIONS: AmortizationSystem[] = [
  'PRICE',
  'SAC',
];

export const AMORTIZATION_STRATEGY_OPTIONS: AmortizationStrategy[] = [
  'Redução de prazo',
  'Redução de parcela',
];

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
