import { useState, useEffect } from 'react';
import { 
  Heart, Users, PieChart, Landmark, Target, Calendar, Cake, CreditCard, 
  TrendingUp, Award, CheckCircle, User, DollarSign, FileText, Briefcase, ClipboardList
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { AllocationStrategySection, AllocationData, migratePortfolioToAllocation, allocationToPortfolio } from './AllocationStrategySection';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients } from '@/contexts/ClientContext';
import { ClientFiles } from './ClientFiles';
import { Progress } from '@/components/ui/progress';
import { CollapsibleSection } from './CollapsibleSection';
import { FinancialGoalsSection } from './FinancialGoalsSection';
import { DraftFinancialGoalsSection, DraftGoal } from './DraftFinancialGoalsSection';
import { EmergencyReserveModule, EmergencyReserveData } from './EmergencyReserveModule';
import { DebtSimulatorInline } from './DebtSimulatorInline';
import { ClientTasksSection } from './ClientTasksSection';
import { CollapsibleComments } from './CollapsibleComments';
import type { DebtSimulationData } from '@/types/client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  allocation: AllocationData;
  privatePensionStatus: PrivatePensionStatus;
  privatePensionType: PrivatePensionType;
  retirementAge: string;
  retirementIncome: string;
  contractedMeetings: ContractedMeetings | null;
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
  allocation: {
    reserve: 0,
    postFixed: 0,
    preFixed: 0,
    inflationIndexed: 0,
    stocks: 0,
    realEstate: 0,
    international: 0,
    objective: '',
    horizon: '',
    allocationProfile: ''
  },
  privatePensionStatus: '',
  privatePensionType: '',
  retirementAge: '',
  retirementIncome: '',
  contractedMeetings: null,
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
};

export function ClientModal({ open, onOpenChange, client }: ClientModalProps) {
  const { addClient, updateClient } = useClients();
  const { user } = useAuth();
  const [formData, setFormData] = useState(defaultFormData);
  const [draftGoals, setDraftGoals] = useState<DraftGoal[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (client) {
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
        allocation: migratePortfolioToAllocation(client.portfolioDistribution),
        privatePensionStatus: client.privatePensionStatus || '',
        privatePensionType: client.privatePensionType || '',
        retirementAge: client.retirementGoal?.desiredAge?.toString() || '',
        retirementIncome: client.retirementGoal?.desiredMonthlyIncome?.toString() || '',
        contractedMeetings: client.contractedMeetings || null,
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
      });
      setDraftGoals([]);
    } else {
      setFormData(defaultFormData);
      setDraftGoals([]);
    }
  }, [client, open]);

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
    
    let partner: PartnerInfo | null = null;
    if (formData.married && (formData.partnerName || formData.partnerAge || formData.partnerProfession || formData.partnerMonthlyRevenue)) {
      partner = {
        name: formData.partnerName,
        age: formData.partnerAge ? parseInt(formData.partnerAge) : null,
        profession: formData.partnerProfession,
        monthlyRevenue: formData.partnerMonthlyRevenue ? parseFloat(formData.partnerMonthlyRevenue) : null,
      };
    } else if (!formData.married && client?.partner) {
      partner = client.partner;
    }

    let children: ChildInfo[] = formData.hasChildren ? formData.children : (client?.children || []);

    // Convert allocation to portfolio distribution format
    const hasAllocation = formData.allocation.postFixed > 0 || 
      formData.allocation.preFixed > 0 || 
      formData.allocation.inflationIndexed > 0 || 
      formData.allocation.stocks > 0 || 
      formData.allocation.realEstate > 0 || 
      formData.allocation.international > 0;
    
    const portfolioDistribution = hasAllocation ? allocationToPortfolio(formData.allocation) : null;

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
      financialAssets: parseFloat(formData.financialAssets) || 0,
      materialAssets: parseFloat(formData.materialAssets) || 0,
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
      married: formData.married,
      partner: formData.married ? partner : (client?.partner || null),
      hasChildren: formData.hasChildren,
      children: children,
      portfolioDistribution: portfolioDistribution,
      privatePensionStatus: formData.privatePensionStatus,
      privatePensionType: formData.privatePensionStatus === 'Sim' ? formData.privatePensionType : '',
      retirementGoal: retirementGoal,
      contractedMeetings: formData.contractedMeetings,
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
    };

    try {
      if (client) {
        await updateClient(client.id, clientData);
      } else {
        // Add new client and save draft goals
        const newClient = await addClient(clientData);
        
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
      
      setIsSaving(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving client:', error);
      setIsSaving(false);
      // Don't close modal on error - keep draft data
    }
  };

  const handleChange = (field: string, value: string | boolean | Date | null | ContractedMeetings | AllocationData) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="crm-header p-6 rounded-t-lg">
          <DialogTitle className="text-xl">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* SECTION 1: Informações Pessoais - defaultOpen=false */}
            <CollapsibleSection title="Informações Pessoais" icon={User} defaultOpen={false}>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal crm-input", !formData.birthDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.birthDate ? format(new Date(formData.birthDate), "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data de nascimento</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={formData.birthDate ? new Date(formData.birthDate) : undefined} onSelect={(date) => handleChange('birthDate', date || null)} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
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

              {/* Consultant annotation fields */}
              <div className="space-y-2">
                <Label htmlFor="consultingReason">Motivo da Consultoria</Label>
                <Textarea 
                  id="consultingReason" 
                  value={formData.consultingReason} 
                  onChange={(e) => handleChange('consultingReason', e.target.value)} 
                  placeholder="Ex: veio por indicação, quer organizar finanças, montar carteira, planejar mudança de país, aposentadoria…"
                  className="crm-input min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="professionalProfile">Perfil Profissional</Label>
                <Textarea 
                  id="professionalProfile" 
                  value={formData.professionalProfile} 
                  onChange={(e) => handleChange('professionalProfile', e.target.value)} 
                  placeholder="Ex: cargo, área, como ganha dinheiro, estabilidade, bônus, PJ/CLT, sazonalidade…"
                  className="crm-input min-h-[80px]"
                />
              </div>

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
            </CollapsibleSection>

            {/* SECTION 2: Estrutura Familiar */}
            <CollapsibleSection title="Estrutura Familiar" icon={Heart} defaultOpen={false}>
              <div className="space-y-2">
                <Label htmlFor="married">Casado(a)?</Label>
                <Select value={formData.married ? 'sim' : 'não'} onValueChange={(value) => handleChange('married', value === 'sim')}>
                  <SelectTrigger className="crm-input w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="não">Não</SelectItem></SelectContent>
                </Select>
              </div>

              {formData.married && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                  <h4 className="font-medium text-foreground">Dados do Parceiro(a)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partnerName">Nome</Label>
                      <Input id="partnerName" value={formData.partnerName} onChange={(e) => handleChange('partnerName', e.target.value)} placeholder="Nome completo" className="crm-input" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerAge">Idade</Label>
                      <Input id="partnerAge" type="number" value={formData.partnerAge} onChange={(e) => handleChange('partnerAge', e.target.value)} placeholder="Ex: 35" className="crm-input" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerProfession">Profissão</Label>
                      <Input id="partnerProfession" value={formData.partnerProfession} onChange={(e) => handleChange('partnerProfession', e.target.value)} placeholder="Ex: Advogada" className="crm-input" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerMonthlyRevenue">Faturamento mensal do parceiro(a)</Label>
                      <CurrencyInput id="partnerMonthlyRevenue" value={formData.partnerMonthlyRevenue} onChange={(value) => handleChange('partnerMonthlyRevenue', value)} placeholder="R$ 0,00" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="hasChildren">Filhos?</Label>
                <Select value={formData.hasChildren ? 'sim' : 'não'} onValueChange={(value) => { const hasChildren = value === 'sim'; handleChange('hasChildren', hasChildren); if (hasChildren && formData.children.length === 0) handleAddChild(); }}>
                  <SelectTrigger className="crm-input w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="não">Não</SelectItem></SelectContent>
                </Select>
              </div>

              {formData.hasChildren && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                  <h4 className="font-medium text-foreground">Dados dos Filhos</h4>
                  {formData.children.map((child, index) => (
                    <div key={child.id} className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label>Nome do Filho(a) {index + 1}</Label>
                        <Input value={child.name} onChange={(e) => handleChildChange(child.id, 'name', e.target.value)} placeholder="Nome completo" className="crm-input" />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label>Idade</Label>
                        <Input type="number" value={child.age?.toString() || ''} onChange={(e) => handleChildChange(child.id, 'age', e.target.value)} placeholder="Idade" className="crm-input" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveChild(child.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddChild} className="mt-2"><Plus className="w-4 h-4 mr-2" />Adicionar outro filho</Button>
                </div>
              )}

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.family || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, family: value }
                }))}
              />
            </CollapsibleSection>

            {/* SECTION 3: Situação Financeira Atual */}
            <CollapsibleSection title="Situação Financeira Atual" icon={DollarSign} defaultOpen={false}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="financialAssets">Patrimônio Financeiro</Label>
                  <CurrencyInput id="financialAssets" value={formData.financialAssets} onChange={(value) => handleChange('financialAssets', value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materialAssets">Patrimônio Material</Label>
                  <CurrencyInput id="materialAssets" value={formData.materialAssets} onChange={(value) => handleChange('materialAssets', value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyReserve">Reserva de Emergência</Label>
                  <CurrencyInput id="emergencyReserve" value={formData.emergencyReserve} onChange={(value) => handleChange('emergencyReserve', value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyRevenue">Faturamento Mensal</Label>
                  <CurrencyInput id="monthlyRevenue" value={formData.monthlyRevenue} onChange={(value) => handleChange('monthlyRevenue', value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyContribution">Aporte Mensal</Label>
                  <CurrencyInput id="monthlyContribution" value={formData.monthlyContribution} onChange={(value) => handleChange('monthlyContribution', value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investorProfile">Perfil de Investidor</Label>
                  <Select value={formData.investorProfile} onValueChange={(value) => handleChange('investorProfile', value)}>
                    <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
                    <SelectContent>{INVESTOR_PROFILES.map((profile) => (<SelectItem key={profile} value={profile}>{profile}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizedFinances">Finanças pessoais organizadas?</Label>
                <Select value={formData.organizedFinances} onValueChange={(value) => handleChange('organizedFinances', value)}>
                  <SelectTrigger className="crm-input w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{ORGANIZED_FINANCES_OPTIONS.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              {/* Patrimônio Atual */}
              <div className="space-y-2">
                <Label htmlFor="currentWealthNotes">Patrimônio Atual</Label>
                <Textarea 
                  id="currentWealthNotes" 
                  value={formData.currentWealthNotes} 
                  onChange={(e) => handleChange('currentWealthNotes', e.target.value)} 
                  placeholder="• Imóvel residencial em fase final de construção (valor ainda não estimado)&#10;• Veículo próprio avaliado em aproximadamente R$ 30.000&#10;• Veículo da esposa avaliado entre R$ 15.000 e R$ 20.000"
                  className="crm-input min-h-[100px]"
                />
              </div>

              {/* Instituições Financeiras */}
              <div className="space-y-2">
                <Label htmlFor="financialInstitutions">Instituições Financeiras</Label>
                <Textarea 
                  id="financialInstitutions" 
                  value={formData.financialInstitutions} 
                  onChange={(e) => handleChange('financialInstitutions', e.target.value)} 
                  placeholder="Ex: Itaú, BTG Pactual, XP, Nubank, corretora internacional, previdência privada, etc."
                  className="crm-input min-h-[80px]"
                />
              </div>

              {/* Módulo de Reserva de Emergência */}
              <EmergencyReserveModule
                data={{
                  status: formData.emergencyReserveStatus,
                  note: formData.emergencyReserveNote,
                  startMonth: formData.emergencyStartMonth,
                  startYear: formData.emergencyStartYear,
                  monthlyLivingCost: formData.monthlyLivingCost ? parseFloat(formData.monthlyLivingCost) : null,
                  coverageMonths: formData.emergencyCoverageMonths ? parseInt(formData.emergencyCoverageMonths) : 6,
                  contributionsCount: formData.emergencyContributionsCount ? parseInt(formData.emergencyContributionsCount) : 12,
                  currentReserve: formData.emergencyReserve ? parseFloat(formData.emergencyReserve) : 0,
                }}
                onChange={(field, value) => {
                  if (field === 'status') {
                    setFormData(prev => ({ ...prev, emergencyReserveStatus: value as string }));
                  } else if (field === 'note') {
                    setFormData(prev => ({ ...prev, emergencyReserveNote: value as string }));
                  } else if (field === 'startMonth') {
                    setFormData(prev => ({ ...prev, emergencyStartMonth: value as number | null }));
                  } else if (field === 'startYear') {
                    setFormData(prev => ({ ...prev, emergencyStartYear: value as number | null }));
                  } else if (field === 'monthlyLivingCost') {
                    setFormData(prev => ({ ...prev, monthlyLivingCost: value?.toString() || '' }));
                  } else if (field === 'coverageMonths') {
                    setFormData(prev => ({ ...prev, emergencyCoverageMonths: value?.toString() || '6' }));
                  } else if (field === 'contributionsCount') {
                    setFormData(prev => ({ ...prev, emergencyContributionsCount: value?.toString() || '12' }));
                  } else if (field === 'currentReserve') {
                    setFormData(prev => ({ ...prev, emergencyReserve: value?.toString() || '0' }));
                  }
                }}
              />

              {/* Objetivos Financeiros */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Objetivos Financeiros
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="shortTermGoals">Curto Prazo</Label>
                  <Textarea 
                    id="shortTermGoals" 
                    value={formData.shortTermGoals} 
                    onChange={(e) => handleChange('shortTermGoals', e.target.value)} 
                    placeholder="Ex: reserva de emergência, quitar dívidas, viagem, compra de carro…"
                    className="crm-input min-h-[70px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mediumTermGoals">Médio Prazo</Label>
                  <Textarea 
                    id="mediumTermGoals" 
                    value={formData.mediumTermGoals} 
                    onChange={(e) => handleChange('mediumTermGoals', e.target.value)} 
                    placeholder="Ex: troca de imóvel, expansão profissional, renda passiva inicial…"
                    className="crm-input min-h-[70px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longTermGoals">Longo Prazo</Label>
                  <Textarea 
                    id="longTermGoals" 
                    value={formData.longTermGoals} 
                    onChange={(e) => handleChange('longTermGoals', e.target.value)} 
                    placeholder="Ex: aposentadoria, independência financeira, sucessão patrimonial…"
                    className="crm-input min-h-[70px]"
                  />
                </div>
              </div>

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.financial || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, financial: value }
                }))}
              />
            </CollapsibleSection>

            {/* SECTION 4: Dívidas e Obrigações */}
            <CollapsibleSection title="Dívidas e Obrigações" icon={CreditCard} defaultOpen={false}>
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
            </CollapsibleSection>

            {/* SECTION 5: Previdência e Aposentadoria */}
            <CollapsibleSection title="Previdência e Aposentadoria" icon={Landmark} defaultOpen={false}>
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
            </CollapsibleSection>

            {/* SECTION 6: Metas Financeiras */}
            <CollapsibleSection title="Metas Financeiras" icon={Target} defaultOpen={false}>
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
            </CollapsibleSection>

            {/* SECTION 7: Estratégia de Alocação */}
            <CollapsibleSection title="Estratégia de Alocação" icon={PieChart} defaultOpen={false}>
              <AllocationStrategySection 
                value={formData.allocation}
                onChange={(allocation) => handleChange('allocation', allocation)}
                investorProfile={formData.investorProfile}
              />

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.allocation || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, allocation: value }
                }))}
              />
            </CollapsibleSection>

            {/* SECTION 8: Contrato, Reuniões e Entregas */}
            <CollapsibleSection title="Contrato, Reuniões e Entregas" icon={Calendar} defaultOpen={false}>
              <div className="space-y-2">
                <Label htmlFor="contractedMeetings">Quantidade de Reuniões</Label>
                <Select value={formData.contractedMeetings?.toString() || ''} onValueChange={(value) => handleChange('contractedMeetings', value ? parseInt(value) as ContractedMeetings : null)}>
                  <SelectTrigger className="crm-input w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{CONTRACTED_MEETINGS_OPTIONS.map((num) => (<SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'reunião' : 'reuniões'}</SelectItem>))}</SelectContent>
                </Select>
              </div>

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
            </CollapsibleSection>

            {/* SECTION 9: Status do Cliente */}
            <CollapsibleSection title="Status do Cliente" icon={CheckCircle} defaultOpen={false}>
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
            </CollapsibleSection>

            {/* SECTION 10: Tarefas do Cliente (somente para clientes existentes) */}
            {client && (
              <ClientTasksSection 
                client={client} 
                moduleNotes={formData.moduleNotes}
                onModuleNotesChange={(notes) => setFormData(prev => ({ ...prev, moduleNotes: notes }))}
              />
            )}

            {/* SECTION 11: Resultado da Consultoria */}
            <CollapsibleSection title="Resultado da Consultoria" icon={TrendingUp} defaultOpen={false}>
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

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.result || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, result: value }
                }))}
              />
            </CollapsibleSection>

            {/* SECTION 12: Arquivos do Cliente */}
            <CollapsibleSection title="Arquivos do Cliente" icon={FileText} defaultOpen={false}>
              <ClientFiles files={formData.files} onFilesChange={handleFilesChange} />

              {/* Collapsible Comments */}
              <CollapsibleComments
                value={formData.moduleNotes.files || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  moduleNotes: { ...prev.moduleNotes, files: value }
                }))}
                placeholder="Comentários sobre documentos, pendências, envios…"
              />
            </CollapsibleSection>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="crm-button-primary" disabled={isSaving}>
                {isSaving ? 'Salvando...' : (client ? 'Salvar Alterações' : 'Adicionar Cliente')}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
