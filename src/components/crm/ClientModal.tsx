import { useState, useEffect, useRef } from 'react';
import { 
  Heart, Users, PieChart, Landmark, Target, Calendar, Cake, CreditCard, 
  TrendingUp, Award, CheckCircle, User, DollarSign, FileText, Briefcase, ClipboardList, Wallet,
  BarChart3, Shield, Search, Calculator, Sparkles
} from 'lucide-react';
import { DiagnosticoInteligente } from './DiagnosticoInteligente';
import { ClientAportesTab } from './ClientAportesTab';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Taxa de referência (Selic líquida estimada) para arbitragem vs. CET da dívida
const TAXA_SELIC_LIQUIDA = 8.5;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// ScrollArea removed — Radix ScrollArea applies overflow-hidden on Root, clipping nested horizontal scroll
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Client, 
  INVESTOR_PROFILES, 
  BRAZILIAN_STATES, 
  RESIDENCE_OPTIONS, 
  RENEWAL_STATUS_OPTIONS, 
  ClientFile, 
  PartnerInfo,
  ChildInfo,
  RetirementGoal,
  MeetingNotes,
  CONTRACTED_MEETINGS_OPTIONS,
  PRIVATE_PENSION_STATUS_OPTIONS,
  PRIVATE_PENSION_TYPE_OPTIONS,
  ORGANIZED_FINANCES_OPTIONS,
  DEBT_TYPE_OPTIONS,
  AMORTIZATION_SYSTEM_OPTIONS,
  AMORTIZATION_STRATEGY_OPTIONS,
  DebtInfo,
  ModuleNotes,
  DebtType,
  ConsultingResult,
} from '@/types/client';
import { FUNNEL_STAGE_OPTIONS } from '@/lib/funnel-utils';
import { PGBLCalculator } from './PGBLCalculator';
import { ArquiteturaEstrategicaData, defaultArquiteturaEstrategica } from './ArquiteturaEstrategicaCarteira';
import { ArquiteturaEstrategicaPainel } from './ArquiteturaEstrategicaPainel';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BirthDatePicker } from '@/components/ui/birth-date-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients } from '@/contexts/ClientContext';
import { ClientFiles } from './ClientFiles';
import { SimuladorImovelCarteira } from './SimuladorImovelCarteira';
import { RaioXConsolidado } from './RaioXConsolidado';
import { Progress } from '@/components/ui/progress';
import { CollapsibleSection } from './CollapsibleSection';
import { FinancialGoalsSection } from './FinancialGoalsSection';
import { DraftFinancialGoalsSection, DraftGoal } from './DraftFinancialGoalsSection';
import { EmergencyReserveModule, EmergencyReserveData } from './EmergencyReserveModule';
import { DebtSimulatorInline } from './DebtSimulatorInline';
import { ClientTasksSection } from './ClientTasksSection';
import { CollapsibleComments } from './CollapsibleComments';
import type { DebtSimulationData } from '@/types/client';
// PortfolioModule removed from UI (data preserved in DB)
import { DiagnosticoPatrimonial } from './DiagnosticoPatrimonial';
import { ScoreEstrategico } from './ScoreEstrategico';
import { AlertasConsultor } from './AlertasConsultor';
import { ResumoFinanceiroAutomatico } from './ResumoFinanceiroAutomatico';
import { PainelFinanceiro } from './PainelFinanceiro';
import { DiagnosticoEstrategico, defaultStrategicDiagnostic, StrategicDiagnosticData, defaultFamilyData } from './DiagnosticoEstrategico';
import { EstruturaPatrimonial, defaultEstruturaPatrimonial, EstruturaPatrimonialData } from './EstruturaPatrimonial';
import { FluxoCaixaAccumulacao, defaultFluxoCaixa, FluxoCaixaData } from './FluxoCaixaAccumulacao';
import { ObjetivosMetas, defaultObjetivosMetas, ObjetivosMetasData } from './ObjetivosMetas';
import { PerfilRisco, defaultPerfilRisco, PerfilRiscoData } from './PerfilRisco';
import { ProtecaoSucessao, defaultProtecaoSucessao, ProtecaoSucessaoData } from './ProtecaoSucessao';
import { HistoricoMercado, defaultHistoricoMercado, HistoricoMercadoData } from './HistoricoMercado';
import { RelatorioPerformance } from './RelatorioPerformance';
import { RelatorioAutomatizado } from './RelatorioAutomatizado';
import { ResumoRelatorio } from './ResumoRelatorio';
import { ClientFormLink } from './ClientFormLink';
import { useClientPortfolio } from '@/hooks/useClientPortfolio';
import { DirecionamentoEstrategico, defaultDirecionamentoEstrategico, DirecionamentoEstrategicoData } from './DirecionamentoEstrategico';
import { ClientPortfolioSection } from './ClientPortfolioSection';
import { ClientStatementModule } from './extrato/ClientStatementModule';

import { ArquiteturaCarteira, defaultArquiteturaCarteira, ArquiteturaCarteiraData } from './ArquiteturaCarteira';
import { ConhecerClienteModule } from './conhecer/ConhecerClienteModule';
import { defaultConhecerCliente, migrateFromLegacy, ConhecerClienteData, calculateProgress } from './conhecer/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

import type { InvestorProfile, FunnelStage, Residence, RenewalStatus, ContractedMeetings, PrivatePensionStatus, PrivatePensionType, OrganizedFinancesStatus, AmortizationSystem, AmortizationStrategy } from '@/types/client';

// List of common countries for international clients
const COMMON_COUNTRIES = [
  'Estados Unidos', 'Portugal', 'Espanha', 'Alemanha', 'França', 'Reino Unido', 
  'Itália', 'Canadá', 'Austrália', 'Japão', 'Suíça', 'Holanda', 'Irlanda',
  'Dubai (EAU)', 'Singapura', 'Argentina', 'Chile', 'México', 'Outro'
];

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
}

interface FormData {
  contractStart: string;
  contractEnd: string;
  name: string;
  age: string;
  birthDate: Date | null;
  email: string;
  phone: string;
  profession: string;
  objective: string;
  investmentTerm: string;
  financialAssets: string;
  materialAssets: string;
  emergencyReserve: string;
  investorProfile: InvestorProfile;
  monthlyRevenue: string;
  monthlyContribution: string;
  workDone: string;
  observations: string;
  city: string;
  state: string;
  country: string;
  funnelStage: FunnelStage;
  renewed: boolean;
  renewalPotential: boolean;
  pendingSchedule: boolean;
  residence: Residence;
  renewalStatus: RenewalStatus;
  renewalDate: Date | null;
  married: boolean;
  partnerName: string;
  partnerAge: string;
  partnerProfession: string;
  partnerMonthlyRevenue: string;
  hasChildren: boolean;
  children: ChildInfo[];
  arquiteturaEstrategica: ArquiteturaEstrategicaData;
  privatePensionStatus: PrivatePensionStatus;
  privatePensionType: PrivatePensionType;
  retirementAge: string;
  retirementIncome: string;
  contractedMeetings: ContractedMeetings | null;
  meetingPeriodicityDays: 30 | 60 | 90 | null;
  meetingNotes: MeetingNotes;
  files: ClientFile[];
  organizedFinances: OrganizedFinancesStatus;
  debts: DebtInfo[];
  consultingInitialPatrimony: string;
  consultingFinalPatrimony: string;
  consultingFinished: boolean;
  isRenewedClient: boolean;
  consultingReason: string;
  financialInstitutions: string;
  shortTermGoals: string;
  mediumTermGoals: string;
  longTermGoals: string;
  professionalProfile: string;
  currentWealthNotes: string;
  emergencyStartMonth: number | null;
  emergencyStartYear: number | null;
  monthlyLivingCost: string;
  emergencyCoverageMonths: string;
  emergencyContributionsCount: string;
  emergencyReserveStatus: string;
  emergencyReserveNote: string;
  alreadyInvests: boolean;
  investingOrigin: string;
  debtsComments: string;
  moduleNotes: ModuleNotes;
  businessAssets: string;
  passiveIncome: string;
  successionPlanning: string;
  strategicDiagnostic: StrategicDiagnosticData;
  estruturaPatrimonial: EstruturaPatrimonialData;
  fluxoCaixa: FluxoCaixaData;
  objetivosMetas: ObjetivosMetasData;
  perfilRisco: PerfilRiscoData;
  protecaoSucessao: ProtecaoSucessaoData;
  historicoMercado: HistoricoMercadoData;
  direcionamentoEstrategico: DirecionamentoEstrategicoData;
  arquiteturaCarteira: ArquiteturaCarteiraData;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const defaultFormData: FormData = {
  contractStart: new Date().toISOString().split('T')[0],
  contractEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  name: '',
  age: '',
  birthDate: null,
  email: '',
  phone: '',
  profession: '',
  objective: '',
  investmentTerm: '',
  financialAssets: '',
  materialAssets: '',
  emergencyReserve: '',
  investorProfile: 'Moderado',
  monthlyRevenue: '',
  monthlyContribution: '',
  workDone: '',
  observations: '',
  city: '',
  state: 'SP',
  country: '',
  funnelStage: 'Em atendimento',
  renewed: false,
  renewalPotential: false,
  pendingSchedule: false,
  residence: '',
  renewalStatus: '',
  renewalDate: null,
  married: false,
  partnerName: '',
  partnerAge: '',
  partnerProfession: '',
  partnerMonthlyRevenue: '',
  hasChildren: false,
  children: [],
  arquiteturaEstrategica: defaultArquiteturaEstrategica,
  privatePensionStatus: '',
  privatePensionType: '',
  retirementAge: '',
  retirementIncome: '',
  contractedMeetings: null,
  meetingPeriodicityDays: 30,
  meetingNotes: {},
  files: [],
  organizedFinances: '',
  debts: [],
  consultingInitialPatrimony: '',
  consultingFinalPatrimony: '',
  consultingFinished: false,
  isRenewedClient: false,
  consultingReason: '',
  professionalProfile: '',
  financialInstitutions: '',
  shortTermGoals: '',
  mediumTermGoals: '',
  longTermGoals: '',
  currentWealthNotes: '',
  emergencyStartMonth: null,
  emergencyStartYear: null,
  monthlyLivingCost: '',
  emergencyCoverageMonths: '6',
  emergencyContributionsCount: '12',
  emergencyReserveStatus: '',
  emergencyReserveNote: '',
  alreadyInvests: false,
  investingOrigin: '',
  debtsComments: '',
  moduleNotes: {},
  businessAssets: '',
  passiveIncome: '',
  successionPlanning: '',
  strategicDiagnostic: defaultStrategicDiagnostic,
  estruturaPatrimonial: defaultEstruturaPatrimonial,
  fluxoCaixa: defaultFluxoCaixa,
  objetivosMetas: defaultObjetivosMetas,
  perfilRisco: defaultPerfilRisco,
  protecaoSucessao: defaultProtecaoSucessao,
  historicoMercado: defaultHistoricoMercado,
  direcionamentoEstrategico: defaultDirecionamentoEstrategico,
  arquiteturaCarteira: defaultArquiteturaCarteira,
};

const CLIENT_DRAFT_VERSION = 1;

function restoreFormDraft(draftFormData: Partial<FormData>): FormData {
  return {
    ...defaultFormData,
    ...draftFormData,
    birthDate: draftFormData.birthDate ? new Date(draftFormData.birthDate as Date | string) : null,
    renewalDate: draftFormData.renewalDate ? new Date(draftFormData.renewalDate as Date | string) : null,
    files: (draftFormData.files || []).map((file) => ({
      ...file,
      uploadedAt: file.uploadedAt ? new Date(file.uploadedAt as Date | string) : new Date(),
    })),
  };
}

export function ClientModal({ open, onOpenChange, client }: ClientModalProps) {
  const { addClient, updateClient } = useClients();
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const draftToastShownRef = useRef(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [draftGoals, setDraftGoals] = useState<DraftGoal[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [conhecerData, setConhecerData] = useState<ConhecerClienteData>(defaultConhecerCliente);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [autoReportObservation, setAutoReportObservation] = useState('');
  const [reportConsultantObs, setReportConsultantObs] = useState('');
  const portfolio = useClientPortfolio(client?.id);
  const [activeTab, setActiveTab] = useState<string>('personal');
  const draftKey = user ? `crm-client-draft:${user.id}:${client?.id ?? 'new'}` : null;

  // Reset to first tab whenever the modal opens
  useEffect(() => {
    if (open) setActiveTab('personal');
  }, [open]);

  // Log client visit when modal opens
  useEffect(() => {
    if (open && client) {
      logActivity('visita', 'Cliente visitado', client.id, client.name);
    }
  }, [open, client?.id]);

  useEffect(() => {
    if (!open) return;
    setDraftHydrated(false);

    if (client) {
      draftToastShownRef.current = false;
      setFormData({
        contractStart: client.contractStart.toISOString().split('T')[0],
        contractEnd: client.contractEnd.toISOString().split('T')[0],
        name: client.name,
        age: client.age.toString(),
        birthDate: client.birthDate ? new Date(client.birthDate) : null,
        email: client.email,
        phone: client.phone,
        profession: client.profession,
        objective: client.objective,
        investmentTerm: client.investmentTerm,
        financialAssets: client.financialAssets.toString(),
        materialAssets: client.materialAssets.toString(),
        emergencyReserve: client.emergencyReserve.toString(),
        investorProfile: client.investorProfile,
        monthlyRevenue: client.monthlyRevenue.toString(),
        monthlyContribution: client.monthlyContribution.toString(),
        workDone: client.workDone,
        observations: client.observations,
        city: client.city,
        state: client.state,
        country: client.country || '',
        funnelStage: client.funnelStage,
        renewed: client.renewed,
        renewalPotential: client.renewalPotential,
        pendingSchedule: client.pendingSchedule,
        residence: client.residence,
        renewalStatus: client.renewalStatus,
        renewalDate: client.renewalDate,
        married: client.married,
        partnerName: client.partner?.name || '',
        partnerAge: client.partner?.age?.toString() || '',
        partnerProfession: client.partner?.profession || '',
        partnerMonthlyRevenue: client.partner?.monthlyRevenue?.toString() || '',
        hasChildren: client.hasChildren || false,
        children: client.children || [],
        arquiteturaEstrategica: { ...defaultArquiteturaEstrategica, ...(client.portfolioDistribution as any)?.arquiteturaEstrategica || {} },
        privatePensionStatus: client.privatePensionStatus || '',
        privatePensionType: client.privatePensionType || '',
        retirementAge: client.retirementGoal?.desiredAge?.toString() || '',
        retirementIncome: client.retirementGoal?.desiredMonthlyIncome?.toString() || '',
        contractedMeetings: client.contractedMeetings || null,
        meetingPeriodicityDays: (client as any).meetingPeriodicityDays ?? 30,
        meetingNotes: client.meetingNotes || {},
        files: client.files || [],
        organizedFinances: client.organizedFinances || '',
        debts: client.debts || [],
        consultingInitialPatrimony: client.consultingResult?.initialPatrimony?.toString() || '',
        consultingFinalPatrimony: client.consultingResult?.finalPatrimony?.toString() || '',
        consultingFinished: client.consultingFinished || false,
        isRenewedClient: client.isRenewedClient || false,
        consultingReason: client.consultingReason || '',
        professionalProfile: client.professionalProfile || '',
        financialInstitutions: client.financialInstitutions || '',
        shortTermGoals: client.shortTermGoals || '',
        mediumTermGoals: client.mediumTermGoals || '',
        longTermGoals: client.longTermGoals || '',
        currentWealthNotes: client.currentWealthNotes || '',
        emergencyStartMonth: client.emergencyStartMonth,
        emergencyStartYear: client.emergencyStartYear,
        monthlyLivingCost: client.monthlyLivingCost?.toString() || '',
        emergencyCoverageMonths: client.emergencyCoverageMonths?.toString() || '6',
        emergencyContributionsCount: client.emergencyContributionsCount?.toString() || '12',
        emergencyReserveStatus: client.emergencyReserveStatus || '',
        emergencyReserveNote: client.emergencyReserveNote || '',
        alreadyInvests: client.alreadyInvests || false,
        investingOrigin: client.investingOrigin || '',
        debtsComments: client.debtsComments || '',
        moduleNotes: client.moduleNotes || {},
        businessAssets: (client as any).businessAssets?.toString() || '',
        passiveIncome: (client as any).passiveIncome?.toString() || '',
        successionPlanning: (client as any).successionPlanning || '',
        strategicDiagnostic: (() => {
          const base = { ...defaultStrategicDiagnostic, ...((client as any).strategicDiagnostic || {}) };
          // Migrate legacy family data if family block is empty
          if (!base.family || !base.family.maritalStatus) {
            const legacyFamily = {
              maritalStatus: client.married ? 'Casado(a)' : '',
              hasChildren: client.hasChildren ? 'Sim' : '',
              childrenCount: client.children?.length?.toString() || '',
              childrenAges: client.children?.map((c: any) => c.age ? `${c.age} anos` : '').filter(Boolean).join(', ') || '',
              spouseHasIncome: client.partner?.monthlyRevenue ? 'Sim' : '',
              spouseMonthlyIncome: client.partner?.monthlyRevenue?.toString() || '',
            };
            base.family = { ...(base.family || {}), ...legacyFamily };
          }
          // Ensure family defaults
          base.family = { ...defaultFamilyData, ...(base.family || {}) };
          return base;
        })(),
        estruturaPatrimonial: { ...defaultEstruturaPatrimonial, ...((client as any).estruturaPatrimonial || ((client as any).strategicDiagnostic?.estruturaPatrimonial) || {}) },
        fluxoCaixa: { ...defaultFluxoCaixa, ...((client as any).fluxoCaixa || ((client as any).strategicDiagnostic?.fluxoCaixa) || {}) },
        objetivosMetas: { ...defaultObjetivosMetas, ...((client as any).objetivosMetas || ((client as any).strategicDiagnostic?.objetivosMetas) || {}) },
        perfilRisco: { ...defaultPerfilRisco, ...((client as any).perfilRisco || ((client as any).strategicDiagnostic?.perfilRisco) || {}) },
        protecaoSucessao: { ...defaultProtecaoSucessao, ...((client as any).protecaoSucessao || ((client as any).strategicDiagnostic?.protecaoSucessao) || {}) },
        historicoMercado: { ...defaultHistoricoMercado, ...((client as any).historicoMercado || ((client as any).strategicDiagnostic?.historicoMercado) || {}) },
        direcionamentoEstrategico: { ...defaultDirecionamentoEstrategico, ...((client as any).direcionamentoEstrategico || ((client as any).strategicDiagnostic?.direcionamentoEstrategico) || {}) },
        arquiteturaCarteira: { ...defaultArquiteturaCarteira, ...((client as any).arquiteturaCarteira || ((client as any).strategicDiagnostic?.arquiteturaCarteira) || {}) },
      });
      setDraftGoals([]);
      // Initialize conhecerData from strategicDiagnostic via migration
      const rawDiag = (client as any).strategicDiagnostic || {};
      setConhecerData(migrateFromLegacy(rawDiag));
    } else {
      draftToastShownRef.current = false;
      setFormData(defaultFormData);
      setDraftGoals([]);
      setConhecerData(defaultConhecerCliente);
    }
  }, [open, client?.id]);

  useEffect(() => {
    if (!open || !draftKey) {
      setDraftHydrated(false);
      return;
    }

    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (!rawDraft) {
        setDraftHydrated(true);
        return;
      }

      const draft = JSON.parse(rawDraft) as {
        version?: number;
        savedAt?: string;
        formData?: Partial<FormData>;
        conhecerData?: Partial<ConhecerClienteData>;
      };

      if (draft.version !== CLIENT_DRAFT_VERSION) {
        localStorage.removeItem(draftKey);
        setDraftHydrated(true);
        return;
      }

      const draftSavedAt = draft.savedAt ? new Date(draft.savedAt).getTime() : 0;
      const serverUpdatedAt = client?.updatedAt ? new Date(client.updatedAt).getTime() : 0;
      if (!client || draftSavedAt > serverUpdatedAt) {
        setFormData(restoreFormDraft(draft.formData || {}));
        setConhecerData({ ...defaultConhecerCliente, ...(draft.conhecerData || {}) });
        toast.info('Rascunho local recuperado. Revise e clique em Salvar Alterações para gravar no CRM.');
      }
    } catch (error) {
      console.error('Erro ao recuperar rascunho do cliente:', error);
      localStorage.removeItem(draftKey);
    } finally {
      setDraftHydrated(true);
    }
  }, [open, draftKey, client?.updatedAt]);

  useEffect(() => {
    if (!open || !draftKey || !draftHydrated || isSaving) return;

    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({
        version: CLIENT_DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        formData,
        conhecerData,
      }));
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [open, draftKey, draftHydrated, isSaving, formData, conhecerData]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!open || isSaving) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [open, isSaving]);

  // Handle status automation rules
  const handleConsultingFinishedChange = (value: boolean) => {
    setFormData(prev => ({
      ...prev,
      consultingFinished: value,
      // Rule: If consultingFinished = Sim, automatically pendingSchedule = Não
      pendingSchedule: value ? false : prev.pendingSchedule,
    }));
  };

  const handleRenewedChange = (value: boolean) => {
    setFormData(prev => ({
      ...prev,
      renewed: value,
      // Rule: If renewed = Sim, renewalStatus changes to "Renovação"
      renewalStatus: value ? 'Renovação' : prev.renewalStatus,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Derive legacy family fields from strategicDiagnostic.family
    const familyData = formData.strategicDiagnostic.family;
    const isMarried = familyData?.maritalStatus === 'Casado(a)' || familyData?.maritalStatus === 'União estável';
    
    let partner: PartnerInfo | null = null;
    if (isMarried && (formData.partnerName || formData.partnerAge || formData.partnerProfession || familyData?.spouseMonthlyIncome)) {
      partner = {
        name: formData.partnerName,
        age: formData.partnerAge ? parseInt(formData.partnerAge) : null,
        profession: formData.partnerProfession,
        monthlyRevenue: familyData?.spouseMonthlyIncome ? parseFloat(familyData.spouseMonthlyIncome) : (formData.partnerMonthlyRevenue ? parseFloat(formData.partnerMonthlyRevenue) : null),
      };
    } else if (!isMarried && client?.partner) {
      partner = client.partner;
    }

    const hasChildrenFromDiag = familyData?.hasChildren === 'Sim';
    let children: ChildInfo[] = hasChildrenFromDiag ? formData.children : (client?.children || []);

    // Store arquitetura estrategica in portfolio_distribution
    const portfolioDistribution = { arquiteturaEstrategica: formData.arquiteturaEstrategica };

    let retirementGoal: RetirementGoal | null = null;
    if (formData.retirementAge || formData.retirementIncome) {
      retirementGoal = {
        desiredAge: formData.retirementAge ? parseInt(formData.retirementAge) : null,
        desiredMonthlyIncome: formData.retirementIncome ? parseFloat(formData.retirementIncome) : null,
      };
    }

    let consultingResult: ConsultingResult | null = null;
    if (formData.consultingInitialPatrimony || formData.consultingFinalPatrimony) {
      consultingResult = {
        initialPatrimony: formData.consultingInitialPatrimony ? parseFloat(formData.consultingInitialPatrimony) : null,
        finalPatrimony: formData.consultingFinalPatrimony ? parseFloat(formData.consultingFinalPatrimony) : null,
      };
    }

    // Handle state/country based on residence
    const isExterior = formData.residence === 'Mora no exterior';
    const finalState = isExterior ? '' : formData.state;
    const finalCountry = isExterior ? formData.country : '';

    // Resolve patrimony values: Manual override (primary) > ConhecerCliente (fallback)
    // When user manually edits a value in the financial panel, it takes priority
    const resolveNum = (conhecer: string | undefined, override: string): number => {
      const fromOverride = parseFloat(override) || 0;
      const fromConhecer = parseFloat(conhecer || '') || 0;
      return fromOverride > 0 ? fromOverride : fromConhecer;
    };
    const resolvedFinancialAssets = resolveNum(conhecerData.totalPatrimony, formData.financialAssets);
    const resolvedMaterialAssets = resolveNum(undefined, formData.materialAssets);
    const resolvedBusinessAssets = resolveNum(conhecerData.businessValue, formData.businessAssets);

    // Consolidate canonical patrimonio_financeiro_liquido: manual override > conhecer
    const liquidFromLegacy = parseFloat(formData.financialAssets) || 0;
    const liquidFromConhecer = parseFloat(conhecerData.totalPatrimony || '') || 0;
    const patrimonioFinanceiroLiquido = liquidFromLegacy > 0 ? liquidFromLegacy : (liquidFromConhecer > 0 ? liquidFromConhecer : null);

    const clientData = {
      contractStart: new Date(formData.contractStart),
      contractEnd: new Date(formData.contractEnd),
      name: formData.name,
      age: parseInt(formData.age) || 0,
      birthDate: formData.birthDate,
      email: formData.email,
      phone: formData.phone,
      profession: formData.profession,
      objective: formData.objective,
      investmentTerm: formData.investmentTerm,
      financialAssets: resolvedFinancialAssets,
      materialAssets: resolvedMaterialAssets,
      emergencyReserve: parseFloat(formData.emergencyReserve) || 0,
      investorProfile: formData.investorProfile,
      monthlyRevenue: parseFloat(formData.monthlyRevenue) || 0,
      monthlyContribution: parseFloat(formData.monthlyContribution) || 0,
      workDone: formData.workDone,
      tasks: client?.tasks || [],
      observations: formData.observations,
      city: formData.city,
      state: finalState,
      country: finalCountry,
      funnelStage: formData.funnelStage,
      renewed: formData.renewed,
      renewalPotential: formData.renewalPotential,
      pendingSchedule: formData.pendingSchedule,
      residence: formData.residence,
      renewalStatus: formData.renewalStatus,
      renewalDate: formData.renewalDate,
      married: isMarried,
      partner: isMarried ? partner : (client?.partner || null),
      hasChildren: hasChildrenFromDiag,
      children: children,
      portfolioDistribution: portfolioDistribution,
      privatePensionStatus: formData.privatePensionStatus,
      privatePensionType: formData.privatePensionStatus === 'Sim' ? formData.privatePensionType : '',
      retirementGoal: retirementGoal,
      contractedMeetings: formData.contractedMeetings,
      meetingPeriodicityDays: formData.meetingPeriodicityDays,
      meetingNotes: formData.meetingNotes,
      lastActivityAt: client?.lastActivityAt || new Date(),
      scheduledMeeting: client?.scheduledMeeting || null,
      files: formData.files,
      organizedFinances: formData.organizedFinances,
      debts: formData.debts,
      consultingResult: consultingResult,
      consultingFinished: formData.consultingFinished,
      isRenewedClient: formData.isRenewedClient,
      consultingReason: formData.consultingReason || null,
      professionalProfile: formData.professionalProfile || null,
      financialInstitutions: formData.financialInstitutions || null,
      shortTermGoals: formData.shortTermGoals || null,
      mediumTermGoals: formData.mediumTermGoals || null,
      longTermGoals: formData.longTermGoals || null,
      currentWealthNotes: formData.currentWealthNotes || null,
      emergencyStartMonth: formData.emergencyStartMonth,
      emergencyStartYear: formData.emergencyStartYear,
      monthlyLivingCost: formData.monthlyLivingCost ? parseFloat(formData.monthlyLivingCost) : null,
      emergencyCoverageMonths: formData.emergencyCoverageMonths ? parseInt(formData.emergencyCoverageMonths) : 6,
      emergencyContributionsCount: formData.emergencyContributionsCount ? parseInt(formData.emergencyContributionsCount) : 12,
      emergencyReserveStatus: (formData.emergencyReserveStatus as any) || '',
      emergencyReserveNote: formData.emergencyReserveNote || null,
      alreadyInvests: formData.alreadyInvests,
      investingOrigin: formData.investingOrigin || null,
      debtsComments: formData.debtsComments || null,
      moduleNotes: formData.moduleNotes,
      kanbanOrder: client?.kanbanOrder || null,
      businessAssets: resolvedBusinessAssets,
      passiveIncome: parseFloat(formData.passiveIncome) || 0,
      successionPlanning: formData.successionPlanning || '',
      strategicDiagnostic: conhecerData as any,
      patrimonioFinanceiroLiquido: patrimonioFinanceiroLiquido,
      isTop10: client?.isTop10 ?? false,
      top10Order: client?.top10Order ?? null,
      previousFunnelStage: client?.previousFunnelStage ?? null,
    };

    try {
      if (client) {
        await updateClient(client.id, clientData);
        await logActivity('edicao', 'Cliente atualizado', client.id, clientData.name);
      } else {
        // Add new client and save draft goals
        const newClient = await addClient(clientData);
        if (newClient) {
          await logActivity('edicao', 'Novo cliente criado', newClient.id, clientData.name);
        }
        
        // Save draft goals to database
        if (draftGoals.length > 0 && user && newClient) {
          const goalsToInsert = draftGoals.map(goal => ({
            client_id: newClient.id,
            user_id: user.id,
            name: goal.name,
            goal_type: goal.goal_type,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            monthly_contribution: goal.monthly_contribution,
            annual_interest_rate: goal.annual_interest_rate,
            deadline_months: goal.deadline_months,
          }));
          
          const { error } = await supabase
            .from('financial_goals')
            .insert(goalsToInsert);
          
          if (error) {
            console.error('Error saving draft goals:', error);
            toast.error('Cliente salvo, mas houve erro ao salvar as metas');
          } else {
            toast.success('Cliente e metas salvos com sucesso!');
          }
        }
      }
      
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      setIsSaving(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving client:', error);
      setIsSaving(false);
      // Don't close modal on error - keep draft data
    }
  };

  const handleChange = (field: string, value: string | boolean | Date | null | ContractedMeetings | ArquiteturaEstrategicaData) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConhecerChange = (nextData: ConhecerClienteData) => {
    setConhecerData(nextData);
    if (!draftToastShownRef.current) {
      draftToastShownRef.current = true;
      toast.info('Rascunho atualizado. Clique em Salvar Alterações para gravar no CRM.');
    }
  };

  const handleFilesChange = (files: ClientFile[]) => {
    setFormData(prev => ({ ...prev, files }));
  };

  const handleAddChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, { id: generateId(), name: '', age: null }],
    }));
  };

  const handleRemoveChild = (childId: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter(c => c.id !== childId),
    }));
  };

  const handleChildChange = (childId: string, field: 'name' | 'age', value: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map(c =>
        c.id === childId
          ? { ...c, [field]: field === 'age' ? (value ? parseInt(value) : null) : value }
          : c
      ),
    }));
  };

  const handleMeetingNoteChange = (meetingNumber: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      meetingNotes: { ...prev.meetingNotes, [meetingNumber]: value },
    }));
  };

  const handleAddDebt = () => {
    const newDebt: DebtInfo = {
      id: generateId(),
      type: 'emprestimo',
      cetPercentage: null,
      term: null,
      termUnit: 'meses',
      amortizationSystem: '',
      payoffStrategy: '',
      payoffYears: null,
      payoffSavings: null,
    };
    setFormData(prev => ({
      ...prev,
      debts: [...prev.debts, newDebt],
    }));
  };

  const handleRemoveDebt = (debtId: string) => {
    setFormData(prev => ({
      ...prev,
      debts: prev.debts.filter(d => d.id !== debtId),
    }));
  };

  const handleDebtChange = (debtId: string, field: keyof DebtInfo, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      debts: prev.debts.map(d =>
        d.id === debtId ? { ...d, [field]: value } : d
      ),
    }));
  };

  const handleDebtSimulationChange = (debtId: string, simulation: DebtSimulationData) => {
    setFormData(prev => ({
      ...prev,
      debts: prev.debts.map(d =>
        d.id === debtId ? { ...d, simulation } : d
      ),
    }));
  };

  // Check if client lives abroad
  const isExterior = formData.residence === 'Mora no exterior';

  // Vertical tabs definition
  const TABS = [
    { id: 'personal', label: 'Informações Pessoais', icon: User },
    { id: 'meetings', label: 'Reuniões', icon: Calendar },
    { id: 'financial', label: 'Situação Financeira Atual', icon: DollarSign },
    { id: 'debts', label: 'Dívidas e Obrigações', icon: CreditCard },
    { id: 'pension', label: 'Previdência e Aposentadoria', icon: Landmark },
    { id: 'goals', label: 'Metas Financeiras', icon: Target },
    
    { id: 'contracts', label: 'Contratos e Entregas', icon: ClipboardList },
    { id: 'tasks', label: 'Tarefas e Status', icon: CheckCircle },
    { id: 'performance', label: 'Relatório de Performance', icon: BarChart3 },
    { id: 'extrato', label: 'Extrato do Cliente', icon: Wallet },
    { id: 'reports', label: 'Arquivos e Resumos', icon: FileText },
    { id: 'simulator', label: 'Simulador', icon: Calculator },
    { id: 'aportes', label: 'Histórico de Aportes', icon: Wallet },
    { id: 'diagnostico-ia', label: 'Diagnóstico Inteligente', icon: Sparkles },
  ] as const;

  // Unified progress: single source of truth = calculateProgress(conhecerData)
  // Same value shown in the header AND in the "Conhecer o Cliente" card,
  // so both indicators always agree. (Removes the old "fake count" that gave
  // a point per tab just because funnelStage existed.)
  const completionPct = calculateProgress(conhecerData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-7xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden"
        style={{ resize: 'both' as const, minWidth: '720px', minHeight: '500px', maxWidth: '98vw', maxHeight: '95vh' }}
      >
        {/* Sticky Header with progress */}
        <DialogHeader className="crm-header px-6 py-4 rounded-t-lg border-b border-border">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DialogTitle className="text-xl">
              {client ? `Editar Cliente${formData.name ? ` — ${formData.name}` : ''}` : 'Novo Cliente'}
            </DialogTitle>
            <div className="flex items-center gap-3 min-w-[260px]">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Perfil {completionPct}% completo</span>
              <Progress value={completionPct} className="h-2 flex-1" />
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar (25%) — fixed, no scroll on outer container */}
          <aside className="w-[25%] min-w-[200px] max-w-[280px] border-r border-border bg-muted/30 overflow-y-auto scrollbar-thin flex-shrink-0">
            <nav className="p-2 space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content (75%) */}
          <div className="flex-1 overflow-y-auto scrollbar-thin min-w-0">
            <div className="p-6 space-y-4 min-w-0">

              {/* Form Link Section - only show for existing clients */}
              {client && (
                <ClientFormLink
                  clientId={client.id}
                  clientName={client.name}
                  onFormCompleted={() => {
                    // Reload client data after form sync
                  }}
                />
              )}

            {/* SECTION 1: Informações Pessoais - defaultOpen=false */}
            <div hidden={activeTab !== 'personal'} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractStart">Início do Contrato</Label>
                  <Input id="contractStart" type="date" value={formData.contractStart} onChange={(e) => handleChange('contractStart', e.target.value)} className="crm-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractEnd">Fim do Contrato</Label>
                  <Input id="contractEnd" type="date" value={formData.contractEnd} onChange={(e) => handleChange('contractEnd', e.target.value)} className="crm-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Nome completo" className="crm-input" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input id="age" type="number" value={formData.age} onChange={(e) => handleChange('age', e.target.value)} placeholder="Ex: 35" className="crm-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input id="profession" value={formData.profession} onChange={(e) => handleChange('profession', e.target.value)} placeholder="Ex: Engenheiro" className="crm-input" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-pink-500" />
                  <Label htmlFor="birthDate">Data de Nascimento (Aniversário)</Label>
                </div>
                <BirthDatePicker
                  value={formData.birthDate}
                  onChange={(date) => handleChange('birthDate', date)}
                  placeholder="Selecione a data de nascimento"
                  className="crm-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@exemplo.com" className="crm-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(00) 00000-0000" className="crm-input" />
                </div>
              </div>

              {/* Residence and Location fields */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="residence">Residência</Label>
                  <Select value={formData.residence} onValueChange={(value) => handleChange('residence', value)}>
                    <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{RESIDENCE_OPTIONS.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="São Paulo" className="crm-input" />
                </div>
                {/* Show UF for Brazil, Country for Exterior */}
                {isExterior ? (
                  <div className="space-y-2">
                    <Label htmlFor="country">País *</Label>
                    <Select value={formData.country} onValueChange={(value) => handleChange('country', value)}>
                      <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione o país..." /></SelectTrigger>
                      <SelectContent>
                        {COMMON_COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="state">UF {formData.residence === 'Mora no Brasil' ? '*' : ''}</Label>
                    <Select value={formData.state} onValueChange={(value) => handleChange('state', value)}>
                      <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
                      <SelectContent>{BRAZILIAN_STATES.map((state) => (<SelectItem key={state} value={state}>{state}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="objective">Objetivo</Label>
                  <Input id="objective" value={formData.objective} onChange={(e) => handleChange('objective', e.target.value)} placeholder="Ex: Aposentadoria" className="crm-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investmentTerm">Prazo de Investimentos</Label>
                  <Input id="investmentTerm" value={formData.investmentTerm} onChange={(e) => handleChange('investmentTerm', e.target.value)} placeholder="Ex: 10 anos" className="crm-input" />
                </div>
              </div>

              {/* consultingReason and professionalProfile fields hidden from UI - data preserved in database */}

              {/* Investment History fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alreadyInvests">Cliente já investe?</Label>
                  <Select 
                    value={formData.alreadyInvests ? 'sim' : 'não'} 
                    onValueChange={(value) => handleChange('alreadyInvests', value === 'sim')}
                  >
                    <SelectTrigger className="crm-input w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.alreadyInvests && (
                <div className="space-y-2">
                  <Label htmlFor="investingOrigin">Como começou a investir?</Label>
                  <Textarea 
                    id="investingOrigin" 
                    value={formData.investingOrigin} 
                    onChange={(e) => handleChange('investingOrigin', e.target.value)} 
                    placeholder="Ex: comecei no Nubank com fundo, depois ações/FIIs, indicação de gerente, YouTube, etc."
                    className="crm-input min-h-[80px]"
                  />
                </div>
              )}

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.personalInfo || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, personalInfo: value }
                }))}
              />
            </div>

            {/* SECTION 1.5: Conhecer o Cliente (Módulo Mestre) — agora dentro da aba Reuniões */}
            <div hidden={activeTab !== 'meetings'} className="space-y-4">
              <ConhecerClienteModule
                data={conhecerData}
                onChange={handleConhecerChange}
                hasChildrenFromBloco1={conhecerData.hasChildren === 'Sim'}
                clientAge={parseInt(formData.age) || 0}
                clientName={formData.name}
                advisorName=""
              />
              {/* Anotações por reunião — movidas do bloco "Contrato, Reuniões e Entregas" */}
              {formData.contractedMeetings && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                  <h4 className="font-medium text-foreground">O que foi feito em cada reunião</h4>
                  {Array.from({ length: formData.contractedMeetings }, (_, i) => i + 1).map((meetingNum) => (
                    <div key={meetingNum} className="space-y-2">
                      <Label htmlFor={`meeting-${meetingNum}`}>{meetingNum}ª Reunião</Label>
                      <Textarea id={`meeting-${meetingNum}`} value={formData.meetingNotes[meetingNum] || ''} onChange={(e) => handleMeetingNoteChange(meetingNum, e.target.value)} placeholder={`Anotações da ${meetingNum}ª reunião...`} className="crm-input min-h-[80px]" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 3: Situação Financeira Atual (Painel Automático) */}
            <div hidden={activeTab !== 'financial'} className="space-y-4">
              <PainelFinanceiro
                conhecerData={conhecerData}
                overrides={{
                  financialAssets: formData.financialAssets,
                  materialAssets: formData.materialAssets,
                  businessAssets: formData.businessAssets,
                  emergencyReserve: formData.emergencyReserve,
                  monthlyRevenue: formData.monthlyRevenue,
                  monthlyContribution: formData.monthlyContribution,
                  monthlyLivingCost: formData.monthlyLivingCost,
                  passiveIncome: formData.passiveIncome,
                }}
                onOverrideChange={(field, value) => {
                  setFormData(prev => ({ ...prev, [field]: value }));
                }}
                consultantNote={formData.moduleNotes.financialSummary || ''}
                onConsultantNoteChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, financialSummary: value }
                }))}
                clientName={formData.name}
                age={parseInt(formData.age) || 0}
              />


              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.financial || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, financial: value }
                }))}
              />
            </div>

            {/* SECTION 4: Dívidas e Obrigações */}
            <div hidden={activeTab !== 'debts'} className="space-y-4">
              <div className="space-y-4">
                {formData.debts.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma dívida cadastrada. Clique no botão abaixo para adicionar.</p>
                )}

                {formData.debts.map((debt, index) => {
                  const debtLabel = DEBT_TYPE_OPTIONS.find(d => d.value === debt.type)?.label || debt.type;
                  
                  return (
                    <div key={debt.id} className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">Dívida {index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveDebt(debt.id)} 
                          className="text-destructive hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo da Dívida</Label>
                          <Select value={debt.type} onValueChange={(value) => handleDebtChange(debt.id, 'type', value)}>
                            <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DEBT_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>CET (% ao ano)</Label>
                          <Input 
                            type="number" 
                            step="0.01" 
                            value={debt.cetPercentage?.toString() || ''} 
                            onChange={(e) => handleDebtChange(debt.id, 'cetPercentage', e.target.value ? parseFloat(e.target.value) : null)} 
                            placeholder="Ex: 12.5" 
                            className="crm-input" 
                          />
                          {debt.cetPercentage !== null && debt.cetPercentage !== undefined && (
                            debt.cetPercentage < TAXA_SELIC_LIQUIDA ? (
                              <Badge className="bg-green-500 hover:bg-green-500 text-white border-transparent">
                                Vantajoso manter dívida
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500 hover:bg-red-500 text-white border-transparent">
                                Sugerir Amortização
                              </Badge>
                            )
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            Referência Selic líquida: {TAXA_SELIC_LIQUIDA}% a.a.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Prazo</Label>
                          <div className="flex gap-2">
                            <Input 
                              type="number" 
                              value={debt.term?.toString() || ''} 
                              onChange={(e) => handleDebtChange(debt.id, 'term', e.target.value ? parseInt(e.target.value) : null)} 
                              placeholder="Ex: 24" 
                              className="crm-input flex-1" 
                            />
                            <Select value={debt.termUnit} onValueChange={(value) => handleDebtChange(debt.id, 'termUnit', value)}>
                              <SelectTrigger className="crm-input w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="meses">meses</SelectItem>
                                <SelectItem value="anos">anos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Sistema de Amortização</Label>
                          <Select value={debt.amortizationSystem} onValueChange={(value) => handleDebtChange(debt.id, 'amortizationSystem', value)}>
                            <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {AMORTIZATION_SYSTEM_OPTIONS.map((system) => (
                                <SelectItem key={system} value={system}>{system}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-card rounded-lg border border-border">
                        <h5 className="text-sm font-medium text-muted-foreground mb-3">Planejamento de Quitação (Consultoria)</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Estratégia de amortização</Label>
                            <Select value={debt.payoffStrategy} onValueChange={(value) => handleDebtChange(debt.id, 'payoffStrategy', value)}>
                              <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {AMORTIZATION_STRATEGY_OPTIONS.map((strategy) => (
                                  <SelectItem key={strategy} value={strategy}>{strategy}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Em quantos anos a dívida termina</Label>
                            <Input 
                              type="number" 
                              step="0.5" 
                              value={debt.payoffYears?.toString() || ''} 
                              onChange={(e) => handleDebtChange(debt.id, 'payoffYears', e.target.value ? parseFloat(e.target.value) : null)} 
                              placeholder="Ex: 2.5" 
                              className="crm-input" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Economia estimada</Label>
                            <CurrencyInput 
                              value={debt.payoffSavings?.toString() || ''} 
                              onChange={(value) => handleDebtChange(debt.id, 'payoffSavings', value ? parseFloat(value) : null)} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Inline Simulator */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <DebtSimulatorInline 
                          debt={debt}
                          onSimulationChange={(simulation) => handleDebtSimulationChange(debt.id, simulation)}
                        />
                      </div>
                    </div>
                  );
                })}

                <Button type="button" variant="outline" size="sm" onClick={handleAddDebt} className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar dívida
                </Button>

                {/* Collapsible Comments Section using module notes */}
                <CollapsibleComments
                  value={formData.moduleNotes.debts || ''}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    moduleNotes: { ...prev.moduleNotes, debts: value }
                  }))}
                  placeholder="Ex: observações gerais sobre dívidas, contexto do cliente, acordos informais, renegociações futuras…"
                />
              </div>
            </div>

            {/* SECTION 5: Previdência e Aposentadoria */}
            <div hidden={activeTab !== 'pension'} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="privatePensionStatus">Possui previdência privada?</Label>
                  <Select value={formData.privatePensionStatus} onValueChange={(value) => handleChange('privatePensionStatus', value)}>
                    <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{PRIVATE_PENSION_STATUS_OPTIONS.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                
                {formData.privatePensionStatus === 'Sim' && (
                  <div className="space-y-2">
                    <Label htmlFor="privatePensionType">Modalidade</Label>
                    <Select value={formData.privatePensionType} onValueChange={(value) => handleChange('privatePensionType', value)}>
                      <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{PRIVATE_PENSION_TYPE_OPTIONS.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* PGBL Tax Benefit Calculator */}
              {formData.privatePensionStatus === 'Sim' && formData.privatePensionType === 'PGBL' && (
                <PGBLCalculator />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retirementAge">Idade desejada para aposentadoria</Label>
                  <Input id="retirementAge" type="number" min="0" max="120" value={formData.retirementAge} onChange={(e) => handleChange('retirementAge', e.target.value)} placeholder="Ex: 60" className="crm-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retirementIncome">Renda mensal desejada</Label>
                  <CurrencyInput id="retirementIncome" value={formData.retirementIncome} onChange={(value) => handleChange('retirementIncome', value)} />
                </div>
              </div>

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.retirement || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, retirement: value }
                }))}
              />
            </div>

            {/* SECTION 6: Metas Financeiras */}
            <div hidden={activeTab !== 'goals'} className="space-y-4">
              {client ? (
                <FinancialGoalsSection clientId={client.id} />
              ) : (
                <DraftFinancialGoalsSection 
                  draftGoals={draftGoals} 
                  onGoalsChange={setDraftGoals} 
                />
              )}

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.goals || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, goals: value }
                }))}
              />
            </div>

            {/* SECTION 8: Contratos e Entregas (sub-bloco de anotações por reunião foi movido para a aba "Reuniões") */}
            <div hidden={activeTab !== 'contracts'} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractedMeetings">Quantidade de Reuniões</Label>
                <Select value={formData.contractedMeetings?.toString() || ''} onValueChange={(value) => handleChange('contractedMeetings', value ? parseInt(value) as ContractedMeetings : null)}>
                  <SelectTrigger className="crm-input w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{CONTRACTED_MEETINGS_OPTIONS.map((num) => (<SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'reunião' : 'reuniões'}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meetingPeriodicityDays">Periodicidade de Reuniões</Label>
                <Select
                  value={(formData.meetingPeriodicityDays ?? 30).toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, meetingPeriodicityDays: parseInt(value) as 30 | 60 | 90 }))}
                >
                  <SelectTrigger className="crm-input w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define quando o card do cliente exibirá alerta de reunião em atraso ou próxima.
                </p>
              </div>

              {/* Sub-bloco "O que foi feito em cada reunião" foi movido para a aba Reuniões */}


              <div className="space-y-2">
                <Label htmlFor="workDone">Trabalho Desenvolvido</Label>
                <Textarea id="workDone" value={formData.workDone} onChange={(e) => handleChange('workDone', e.target.value)} placeholder="Descreva o trabalho desenvolvido com o cliente..." className="crm-input min-h-[100px]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea id="observations" value={formData.observations} onChange={(e) => handleChange('observations', e.target.value)} placeholder="Observações gerais..." className="crm-input min-h-[80px]" />
              </div>

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.contract || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, contract: value }
                }))}
              />
            </div>

            {/* SECTION 9 + Tarefas: Status do Cliente + ClientTasksSection — agrupados na aba "Tarefas e Status" */}
            <div hidden={activeTab !== 'tasks'} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Etapa do funil */}
                <div className="space-y-2">
                  <Label htmlFor="funnelStage">Etapa do Funil</Label>
                  <Select value={formData.funnelStage} onValueChange={(value) => handleChange('funnelStage', value)}>
                    <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
                    <SelectContent>{FUNNEL_STAGE_OPTIONS.map((stage) => (<SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                
                {/* Agendamento pendente */}
                <div className="space-y-2">
                  <Label htmlFor="pendingSchedule">Agendamento Pendente?</Label>
                  <Select 
                    value={formData.pendingSchedule ? 'sim' : 'não'} 
                    onValueChange={(value) => handleChange('pendingSchedule', value === 'sim')}
                    disabled={formData.consultingFinished}
                  >
                    <SelectTrigger className={`crm-input ${formData.pendingSchedule ? 'border-destructive bg-destructive/10' : ''}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="não">Não</SelectItem></SelectContent>
                  </Select>
                </div>

                {/* Status de renovação */}
                <div className="space-y-2">
                  <Label htmlFor="renewalStatus">Status de Renovação</Label>
                  <Select value={formData.renewalStatus} onValueChange={(value) => handleChange('renewalStatus', value)}>
                    <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{RENEWAL_STATUS_OPTIONS.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Data de renovação */}
                <div className="space-y-2">
                  <Label htmlFor="renewalDate">Data de Renovação</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal crm-input", !formData.renewalDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.renewalDate ? format(new Date(formData.renewalDate), "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={formData.renewalDate ? new Date(formData.renewalDate) : undefined} onSelect={(date) => handleChange('renewalDate', date || null)} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Renovado? */}
                <div className="space-y-2">
                  <Label htmlFor="renewed">Renovado?</Label>
                  <Select value={formData.renewed ? 'sim' : 'não'} onValueChange={(value) => handleRenewedChange(value === 'sim')}>
                    <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="não">Não</SelectItem></SelectContent>
                  </Select>
                </div>

                {/* Potencial de renovação */}
                <div className="space-y-2">
                  <Label htmlFor="renewalPotential">Potencial Renovação?</Label>
                  <Select value={formData.renewalPotential ? 'sim' : 'não'} onValueChange={(value) => handleChange('renewalPotential', value === 'sim')}>
                    <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="não">Não</SelectItem></SelectContent>
                  </Select>
                </div>

                {/* Consultoria finalizada */}
                <div className="space-y-2">
                  <Label htmlFor="consultingFinished">Consultoria Finalizada?</Label>
                  <Select value={formData.consultingFinished ? 'sim' : 'não'} onValueChange={(value) => handleConsultingFinishedChange(value === 'sim')}>
                    <SelectTrigger className={`crm-input ${formData.consultingFinished ? 'border-muted-foreground bg-muted/50' : ''}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="não">Não</SelectItem></SelectContent>
                  </Select>
                  {formData.consultingFinished && <p className="text-xs text-muted-foreground">Cliente não contado no total de ativos</p>}
                </div>
              </div>

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.status || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, status: value }
                }))}
              />
              {/* SECTION 10: Tarefas do Cliente (somente para clientes existentes) — agora dentro da aba "Tarefas e Status" */}
              {client && (
                <ClientTasksSection 
                  client={client} 
                  moduleNotes={formData.moduleNotes}
                  onModuleNotesChange={(notes) => setFormData(prev => ({ ...prev, moduleNotes: notes }))}
                />
              )}
            </div>

            {/* SECTION: Relatório de Performance (aba dedicada) */}
            <div hidden={activeTab !== 'performance'} className="space-y-4">
              <RelatorioPerformance clientId={client?.id} clientName={formData.name || client?.name || ''} investorProfile={formData.investorProfile} />

              {/* Raio-X Consolidado (IA) */}
              <div className="border-t border-border pt-4">
                <RaioXConsolidado />
              </div>
            </div>

            {/* SECTION: Extrato do Cliente */}
            <div hidden={activeTab !== 'extrato'} className="space-y-4">
              <ClientStatementModule clientId={client?.id} clientName={formData.name || client?.name || ''} />
            </div>

            {/* SECTION: Arquivos e Resumos (Resultado da Consultoria + Arquivos do Cliente) */}
            <div hidden={activeTab !== 'reports'} className="space-y-4">
              {/* Resultado da Consultoria */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Resultado da Consultoria</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consultingInitialPatrimony">Patrimônio no início da consultoria</Label>
                    <CurrencyInput id="consultingInitialPatrimony" value={formData.consultingInitialPatrimony} onChange={(value) => handleChange('consultingInitialPatrimony', value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultingFinalPatrimony">Patrimônio ao final do período</Label>
                    <CurrencyInput id="consultingFinalPatrimony" value={formData.consultingFinalPatrimony} onChange={(value) => handleChange('consultingFinalPatrimony', value)} />
                  </div>
                </div>

                {client && (
                  <div className="border-t border-border pt-4 mt-4">
                    <RelatorioAutomatizado
                      client={client}
                      assets={portfolio.assets}
                      consultantObservation={autoReportObservation}
                      onObservationChange={setAutoReportObservation}
                      onObservationBlur={() => {}}
                    />
                  </div>
                )}

                <CollapsibleComments
                  value={formData.moduleNotes.result || ''}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    moduleNotes: { ...prev.moduleNotes, result: value }
                  }))}
                />
              </div>



              {/* Arquivos do Cliente */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Arquivos do Cliente</h4>
                <ClientFiles files={formData.files} onFilesChange={handleFilesChange} />
                <CollapsibleComments
                  value={formData.moduleNotes.files || ''}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    moduleNotes: { ...prev.moduleNotes, files: value }
                  }))}
                  placeholder="Comentários sobre documentos, pendências, envios…"
                />
              </div>
            </div>

            {/* SECTION: Simulador */}
            <div hidden={activeTab !== 'simulator'} className="space-y-4">
              {client?.id ? (
                <SimuladorImovelCarteira
                  clienteId={client.id}
                  clienteNome={formData.name}
                  onAttach={(file) => setFormData(prev => ({ ...prev, files: [...prev.files, file] }))}
                />
              ) : (
                <div className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-md">
                  Salve o cliente primeiro para usar o simulador.
                </div>
              )}
            </div>

            {/* SECTION: Histórico de Aportes */}
            <div hidden={activeTab !== 'aportes'} className="space-y-4">
              {client?.id ? (
                <ClientAportesTab
                  clientId={client.id}
                  clientName={formData.name}
                  defaultPlanned={Number(formData.monthlyContribution) || 0}
                />
              ) : (
                <div className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-md">
                  Salve o cliente primeiro para acompanhar aportes.
                </div>
              )}
            </div>

            {/* SECTION: Diagnóstico Inteligente (IA) */}
            <div hidden={activeTab !== 'diagnostico-ia'} className="space-y-4">
              <DiagnosticoInteligente
                formData={formData}
                setFormData={setFormData}
                conhecerData={conhecerData}
                setConhecerData={setConhecerData}
              />
            </div>

            </div>
          </div>
          </div>

          {/* Sticky Footer */}
          <div className="border-t border-border bg-card px-6 py-3 flex justify-end gap-3 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="crm-button-primary" disabled={isSaving}>
              {isSaving ? 'Salvando...' : (client ? 'Salvar Alterações' : 'Adicionar Cliente')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

