import { useState, useEffect } from 'react';
import { X, Heart, Users, PieChart, Landmark, Target, Calendar, Cake, CreditCard, TrendingUp, Award, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Client, 
  FUNNEL_STAGES, 
  INVESTOR_PROFILES, 
  BRAZILIAN_STATES, 
  RESIDENCE_OPTIONS, 
  RENEWAL_STATUS_OPTIONS, 
  ClientFile, 
  PartnerInfo,
  ChildInfo,
  PortfolioDistribution,
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
  DebtType,
  ConsultingResult,
  ScheduledMeeting,
} from '@/types/client';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients } from '@/contexts/ClientContext';
import { ClientFiles } from './ClientFiles';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

import type { InvestorProfile, FunnelStage, Residence, RenewalStatus, ContractedMeetings, PrivatePensionStatus, PrivatePensionType, OrganizedFinancesStatus, AmortizationSystem, AmortizationStrategy, AmortizationPeriodUnit } from '@/types/client';

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
  hasChildren: boolean;
  children: ChildInfo[];
  portfolioFixedIncome: string;
  portfolioStocks: string;
  portfolioRealEstate: string;
  portfolioInternational: string;
  privatePensionStatus: PrivatePensionStatus;
  privatePensionType: PrivatePensionType;
  retirementAge: string;
  retirementIncome: string;
  contractedMeetings: ContractedMeetings | null;
  meetingNotes: MeetingNotes;
  files: ClientFile[];
  // New fields
  organizedFinances: OrganizedFinancesStatus;
  selectedDebtTypes: DebtType[];
  debts: DebtInfo[];
  consultingInitialPatrimony: string;
  consultingFinalPatrimony: string;
  consultingFinished: boolean;
  isRenewedClient: boolean;
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
  hasChildren: false,
  children: [],
  portfolioFixedIncome: '',
  portfolioStocks: '',
  portfolioRealEstate: '',
  portfolioInternational: '',
  privatePensionStatus: '',
  privatePensionType: '',
  retirementAge: '',
  retirementIncome: '',
  contractedMeetings: null,
  meetingNotes: {},
  files: [],
  organizedFinances: '',
  selectedDebtTypes: [],
  debts: [],
  consultingInitialPatrimony: '',
  consultingFinalPatrimony: '',
  consultingFinished: false,
  isRenewedClient: false,
};

export function ClientModal({ open, onOpenChange, client }: ClientModalProps) {
  const { addClient, updateClient } = useClients();
  const [formData, setFormData] = useState(defaultFormData);

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
        hasChildren: client.hasChildren || false,
        children: client.children || [],
        portfolioFixedIncome: client.portfolioDistribution?.fixedIncome?.toString() || '',
        portfolioStocks: client.portfolioDistribution?.stocks?.toString() || '',
        portfolioRealEstate: client.portfolioDistribution?.realEstate?.toString() || '',
        portfolioInternational: client.portfolioDistribution?.international?.toString() || '',
        privatePensionStatus: client.privatePensionStatus || '',
        privatePensionType: client.privatePensionType || '',
        retirementAge: client.retirementGoal?.desiredAge?.toString() || '',
        retirementIncome: client.retirementGoal?.desiredMonthlyIncome?.toString() || '',
        contractedMeetings: client.contractedMeetings || null,
        meetingNotes: client.meetingNotes || {},
        files: client.files || [],
        organizedFinances: client.organizedFinances || '',
        selectedDebtTypes: client.debts?.map(d => d.type) || [],
        debts: client.debts || [],
        consultingInitialPatrimony: client.consultingResult?.initialPatrimony?.toString() || '',
        consultingFinalPatrimony: client.consultingResult?.finalPatrimony?.toString() || '',
        consultingFinished: client.consultingFinished || false,
        isRenewedClient: client.isRenewedClient || false,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [client, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build partner info - keep data saved but hidden if married is false
    let partner: PartnerInfo | null = null;
    if (formData.married && (formData.partnerName || formData.partnerAge || formData.partnerProfession)) {
      partner = {
        name: formData.partnerName,
        age: formData.partnerAge ? parseInt(formData.partnerAge) : null,
        profession: formData.partnerProfession,
      };
    } else if (!formData.married && client?.partner) {
      // Keep partner data saved but hidden
      partner = client.partner;
    }

    // Build children array - keep data saved but hidden if hasChildren is false
    let children: ChildInfo[] = formData.hasChildren ? formData.children : (client?.children || []);

    // Build portfolio distribution
    let portfolioDistribution: PortfolioDistribution | null = null;
    if (formData.portfolioFixedIncome || formData.portfolioStocks || formData.portfolioRealEstate || formData.portfolioInternational) {
      portfolioDistribution = {
        fixedIncome: parseFloat(formData.portfolioFixedIncome) || 0,
        stocks: parseFloat(formData.portfolioStocks) || 0,
        realEstate: parseFloat(formData.portfolioRealEstate) || 0,
        international: parseFloat(formData.portfolioInternational) || 0,
      };
    }

    // Build retirement goal
    let retirementGoal: RetirementGoal | null = null;
    if (formData.retirementAge || formData.retirementIncome) {
      retirementGoal = {
        desiredAge: formData.retirementAge ? parseInt(formData.retirementAge) : null,
        desiredMonthlyIncome: formData.retirementIncome ? parseFloat(formData.retirementIncome) : null,
      };
    }

    // Build consulting result
    let consultingResult: ConsultingResult | null = null;
    if (formData.consultingInitialPatrimony || formData.consultingFinalPatrimony) {
      consultingResult = {
        initialPatrimony: formData.consultingInitialPatrimony ? parseFloat(formData.consultingInitialPatrimony) : null,
        finalPatrimony: formData.consultingFinalPatrimony ? parseFloat(formData.consultingFinalPatrimony) : null,
      };
    }

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
      state: formData.state,
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
    };

    if (client) {
      updateClient(client.id, clientData);
    } else {
      addClient(clientData);
    }
    
    onOpenChange(false);
  };

  const handleChange = (field: string, value: string | boolean | Date | null | ContractedMeetings) => {
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

  // Debt handling
  const handleDebtTypeToggle = (debtType: DebtType, checked: boolean) => {
    if (checked) {
      // Add new debt
      const newDebt: DebtInfo = {
        id: generateId(),
        type: debtType,
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
        selectedDebtTypes: [...prev.selectedDebtTypes, debtType],
        debts: [...prev.debts, newDebt],
      }));
    } else {
      // Remove debt (keep data hidden)
      setFormData(prev => ({
        ...prev,
        selectedDebtTypes: prev.selectedDebtTypes.filter(t => t !== debtType),
      }));
    }
  };

  const handleDebtChange = (debtType: DebtType, field: keyof DebtInfo, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      debts: prev.debts.map(d =>
        d.type === debtType ? { ...d, [field]: value } : d
      ),
    }));
  };

  const getDebtByType = (type: DebtType): DebtInfo | undefined => {
    return formData.debts.find(d => d.type === type);
  };

  // Calculate portfolio total
  const portfolioTotal = 
    (parseFloat(formData.portfolioFixedIncome) || 0) +
    (parseFloat(formData.portfolioStocks) || 0) +
    (parseFloat(formData.portfolioRealEstate) || 0) +
    (parseFloat(formData.portfolioInternational) || 0);

  const portfolioValid = portfolioTotal === 0 || portfolioTotal === 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="crm-header p-6 rounded-t-lg">
          <DialogTitle className="text-xl">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Contract Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractStart">Início do Contrato</Label>
                <Input
                  id="contractStart"
                  type="date"
                  value={formData.contractStart}
                  onChange={(e) => handleChange('contractStart', e.target.value)}
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractEnd">Fim do Contrato</Label>
                <Input
                  id="contractEnd"
                  type="date"
                  value={formData.contractEnd}
                  onChange={(e) => handleChange('contractEnd', e.target.value)}
                  className="crm-input"
                />
              </div>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nome completo"
                  className="crm-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="Ex: 35"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profissão</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => handleChange('profession', e.target.value)}
                  placeholder="Ex: Engenheiro"
                  className="crm-input"
                />
              </div>
            </div>

            {/* Birthday Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-500" />
                <Label htmlFor="birthDate">Data de Nascimento (Aniversário)</Label>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start text-left font-normal crm-input",
                      !formData.birthDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.birthDate ? (
                      format(new Date(formData.birthDate), "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data de nascimento</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.birthDate ? new Date(formData.birthDate) : undefined}
                    onSelect={(date) => handleChange('birthDate', date || null)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="crm-input"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="São Paulo"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Select value={formData.state} onValueChange={(value) => handleChange('state', value)}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="residence">Residência</Label>
                <Select value={formData.residence} onValueChange={(value) => handleChange('residence', value)}>
                  <SelectTrigger className="crm-input">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RESIDENCE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Married Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Estado Civil</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="married">Casado(a)?</Label>
                <Select value={formData.married ? 'sim' : 'não'} onValueChange={(value) => handleChange('married', value === 'sim')}>
                  <SelectTrigger className="crm-input w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.married && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                  <h4 className="font-medium text-foreground">Dados do Parceiro(a)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partnerName">Nome do Parceiro(a)</Label>
                      <Input
                        id="partnerName"
                        value={formData.partnerName}
                        onChange={(e) => handleChange('partnerName', e.target.value)}
                        placeholder="Nome completo"
                        className="crm-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerAge">Idade</Label>
                      <Input
                        id="partnerAge"
                        type="number"
                        value={formData.partnerAge}
                        onChange={(e) => handleChange('partnerAge', e.target.value)}
                        placeholder="Ex: 35"
                        className="crm-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerProfession">Profissão</Label>
                      <Input
                        id="partnerProfession"
                        value={formData.partnerProfession}
                        onChange={(e) => handleChange('partnerProfession', e.target.value)}
                        placeholder="Ex: Advogada"
                        className="crm-input"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Children Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Filhos</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hasChildren">Filhos?</Label>
                <Select value={formData.hasChildren ? 'sim' : 'não'} onValueChange={(value) => {
                  const hasChildren = value === 'sim';
                  handleChange('hasChildren', hasChildren);
                  if (hasChildren && formData.children.length === 0) {
                    handleAddChild();
                  }
                }}>
                  <SelectTrigger className="crm-input w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.hasChildren && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                  <h4 className="font-medium text-foreground">Dados dos Filhos</h4>
                  {formData.children.map((child, index) => (
                    <div key={child.id} className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label>Nome do Filho(a) {index + 1}</Label>
                        <Input
                          value={child.name}
                          onChange={(e) => handleChildChange(child.id, 'name', e.target.value)}
                          placeholder="Nome completo"
                          className="crm-input"
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label>Idade</Label>
                        <Input
                          type="number"
                          value={child.age?.toString() || ''}
                          onChange={(e) => handleChildChange(child.id, 'age', e.target.value)}
                          placeholder="Idade"
                          className="crm-input"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveChild(child.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddChild}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar outro filho
                  </Button>
                </div>
              )}
            </div>
            <Separator />

            {/* Financial Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="financialAssets">Patrimônio Financeiro</Label>
                <Input
                  id="financialAssets"
                  type="number"
                  value={formData.financialAssets}
                  onChange={(e) => handleChange('financialAssets', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialAssets">Patrimônio Material</Label>
                <Input
                  id="materialAssets"
                  type="number"
                  value={formData.materialAssets}
                  onChange={(e) => handleChange('materialAssets', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyReserve">Reserva de Emergência</Label>
                <Input
                  id="emergencyReserve"
                  type="number"
                  value={formData.emergencyReserve}
                  onChange={(e) => handleChange('emergencyReserve', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRevenue">Faturamento Mensal</Label>
                <Input
                  id="monthlyRevenue"
                  type="number"
                  value={formData.monthlyRevenue}
                  onChange={(e) => handleChange('monthlyRevenue', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyContribution">Aporte Mensal</Label>
                <Input
                  id="monthlyContribution"
                  type="number"
                  value={formData.monthlyContribution}
                  onChange={(e) => handleChange('monthlyContribution', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investorProfile">Perfil de Investidor</Label>
                <Select value={formData.investorProfile} onValueChange={(value) => handleChange('investorProfile', value)}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTOR_PROFILES.map((profile) => (
                      <SelectItem key={profile} value={profile}>
                        {profile}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Organized Finances */}
            <div className="space-y-2">
              <Label htmlFor="organizedFinances">Finanças pessoais organizadas?</Label>
              <Select value={formData.organizedFinances} onValueChange={(value) => handleChange('organizedFinances', value)}>
                <SelectTrigger className="crm-input w-[200px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZED_FINANCES_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Debts Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Dívidas</Label>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {DEBT_TYPE_OPTIONS.map((debtType) => (
                  <div key={debtType.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`debt-${debtType.value}`}
                      checked={formData.selectedDebtTypes.includes(debtType.value)}
                      onCheckedChange={(checked) => handleDebtTypeToggle(debtType.value, !!checked)}
                    />
                    <Label htmlFor={`debt-${debtType.value}`} className="cursor-pointer">
                      {debtType.label}
                    </Label>
                  </div>
                ))}
              </div>

              {formData.selectedDebtTypes.map((debtType) => {
                const debt = getDebtByType(debtType);
                const debtLabel = DEBT_TYPE_OPTIONS.find(d => d.value === debtType)?.label || debtType;
                if (!debt) return null;
                
                return (
                  <div key={debtType} className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                    <h4 className="font-medium text-foreground">{debtLabel}</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>CET (% ao ano)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={debt.cetPercentage?.toString() || ''}
                          onChange={(e) => handleDebtChange(debtType, 'cetPercentage', e.target.value ? parseFloat(e.target.value) : null)}
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
                            onChange={(e) => handleDebtChange(debtType, 'term', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Ex: 24"
                            className="crm-input flex-1"
                          />
                          <Select 
                            value={debt.termUnit} 
                            onValueChange={(value) => handleDebtChange(debtType, 'termUnit', value)}
                          >
                            <SelectTrigger className="crm-input w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="meses">meses</SelectItem>
                              <SelectItem value="anos">anos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Sistema de Amortização</Label>
                        <Select 
                          value={debt.amortizationSystem} 
                          onValueChange={(value) => handleDebtChange(debtType, 'amortizationSystem', value)}
                        >
                          <SelectTrigger className="crm-input">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {AMORTIZATION_SYSTEM_OPTIONS.map((system) => (
                              <SelectItem key={system} value={system}>
                                {system}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Payoff Planning */}
                    <div className="pt-2 border-t border-border/50">
                      <h5 className="text-sm font-medium text-muted-foreground mb-3">Planejamento de Quitação (Consultoria)</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Estratégia de amortização</Label>
                          <Select 
                            value={debt.payoffStrategy || ''} 
                            onValueChange={(value) => handleDebtChange(debtType, 'payoffStrategy', value)}
                          >
                            <SelectTrigger className="crm-input">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {AMORTIZATION_STRATEGY_OPTIONS.map((strategy) => (
                                <SelectItem key={strategy} value={strategy}>
                                  {strategy}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Em quantos anos a dívida termina</Label>
                          <Input
                            type="number"
                            value={debt.payoffYears?.toString() || ''}
                            onChange={(e) => handleDebtChange(debtType, 'payoffYears', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Ex: 3"
                            className="crm-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Quanto o cliente economiza (R$)</Label>
                          <Input
                            type="number"
                            value={debt.payoffSavings?.toString() || ''}
                            onChange={(e) => handleDebtChange(debtType, 'payoffSavings', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="R$ 0,00"
                            className="crm-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Portfolio Distribution Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Distribuição da Carteira</Label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="portfolioFixedIncome">% Renda Fixa</Label>
                  <Input
                    id="portfolioFixedIncome"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.portfolioFixedIncome}
                    onChange={(e) => handleChange('portfolioFixedIncome', e.target.value)}
                    placeholder="0"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolioStocks">% Ações</Label>
                  <Input
                    id="portfolioStocks"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.portfolioStocks}
                    onChange={(e) => handleChange('portfolioStocks', e.target.value)}
                    placeholder="0"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolioRealEstate">% Fundos Imob.</Label>
                  <Input
                    id="portfolioRealEstate"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.portfolioRealEstate}
                    onChange={(e) => handleChange('portfolioRealEstate', e.target.value)}
                    placeholder="0"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolioInternational">% Exterior</Label>
                  <Input
                    id="portfolioInternational"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.portfolioInternational}
                    onChange={(e) => handleChange('portfolioInternational', e.target.value)}
                    placeholder="0"
                    className="crm-input"
                  />
                </div>
              </div>
              
              {portfolioTotal > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className={portfolioValid ? 'text-success font-medium' : 'text-destructive font-medium'}>
                      {portfolioTotal}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(portfolioTotal, 100)} 
                    className={`h-2 ${!portfolioValid ? '[&>div]:bg-destructive' : ''}`}
                  />
                  {!portfolioValid && (
                    <p className="text-xs text-destructive">A soma deve ser igual a 100%</p>
                  )}
                </div>
              )}
            </div>

            {/* Private Pension Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Previdência Privada</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="privatePensionStatus">Possui previdência privada?</Label>
                  <Select value={formData.privatePensionStatus} onValueChange={(value) => handleChange('privatePensionStatus', value)}>
                    <SelectTrigger className="crm-input">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIVATE_PENSION_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.privatePensionStatus === 'Sim' && (
                  <div className="space-y-2">
                    <Label htmlFor="privatePensionType">Modalidade</Label>
                    <Select value={formData.privatePensionType} onValueChange={(value) => handleChange('privatePensionType', value)}>
                      <SelectTrigger className="crm-input">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIVATE_PENSION_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Retirement Goal Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Objetivo de Aposentadoria</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retirementAge">Idade desejada para aposentadoria</Label>
                  <Input
                    id="retirementAge"
                    type="number"
                    min="0"
                    max="120"
                    value={formData.retirementAge}
                    onChange={(e) => handleChange('retirementAge', e.target.value)}
                    placeholder="Ex: 60"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retirementIncome">Renda mensal desejada (R$)</Label>
                  <Input
                    id="retirementIncome"
                    type="number"
                    value={formData.retirementIncome}
                    onChange={(e) => handleChange('retirementIncome', e.target.value)}
                    placeholder="R$ 0,00"
                    className="crm-input"
                  />
                </div>
              </div>
            </div>

            {/* Consulting Result Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Resultado da Consultoria</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consultingInitialPatrimony">Patrimônio no início da consultoria (R$)</Label>
                  <Input
                    id="consultingInitialPatrimony"
                    type="number"
                    value={formData.consultingInitialPatrimony}
                    onChange={(e) => handleChange('consultingInitialPatrimony', e.target.value)}
                    placeholder="R$ 0,00"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultingFinalPatrimony">Patrimônio ao final do período (R$)</Label>
                  <Input
                    id="consultingFinalPatrimony"
                    type="number"
                    value={formData.consultingFinalPatrimony}
                    onChange={(e) => handleChange('consultingFinalPatrimony', e.target.value)}
                    placeholder="R$ 0,00"
                    className="crm-input"
                  />
                </div>
              </div>
            </div>

            {/* Objectives */}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Input
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => handleChange('objective', e.target.value)}
                  placeholder="Ex: Aposentadoria"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investmentTerm">Prazo de Investimentos</Label>
                <Input
                  id="investmentTerm"
                  value={formData.investmentTerm}
                  onChange={(e) => handleChange('investmentTerm', e.target.value)}
                  placeholder="Ex: 10 anos"
                  className="crm-input"
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="funnelStage">Etapa do Funil</Label>
                <Select value={formData.funnelStage} onValueChange={(value) => handleChange('funnelStage', value)}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNNEL_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewed">Renovado?</Label>
                <Select value={formData.renewed ? 'sim' : 'não'} onValueChange={(value) => handleChange('renewed', value === 'sim')}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewalPotential">Potencial Renovação?</Label>
                <Select value={formData.renewalPotential ? 'sim' : 'não'} onValueChange={(value) => handleChange('renewalPotential', value === 'sim')}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pendingSchedule">Agendamento Pendente?</Label>
                <Select value={formData.pendingSchedule ? 'sim' : 'não'} onValueChange={(value) => handleChange('pendingSchedule', value === 'sim')}>
                  <SelectTrigger className={`crm-input ${formData.pendingSchedule ? 'border-destructive bg-destructive/10' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Renewal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="renewalStatus">Status de Renovação</Label>
                <Select value={formData.renewalStatus} onValueChange={(value) => handleChange('renewalStatus', value)}>
                  <SelectTrigger className="crm-input">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RENEWAL_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewalDate">Data de Renovação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal crm-input",
                        !formData.renewalDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.renewalDate ? (
                        format(new Date(formData.renewalDate), "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.renewalDate ? new Date(formData.renewalDate) : undefined}
                      onSelect={(date) => handleChange('renewalDate', date || null)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Client Status Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Status do Cliente</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consultingFinished">Consultoria finalizada?</Label>
                  <Select value={formData.consultingFinished ? 'sim' : 'não'} onValueChange={(value) => handleChange('consultingFinished', value === 'sim')}>
                    <SelectTrigger className={`crm-input ${formData.consultingFinished ? 'border-muted-foreground bg-muted/50' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.consultingFinished && (
                    <p className="text-xs text-muted-foreground">
                      Este cliente não será contado no total de clientes ativos
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isRenewedClient" className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Cliente renovado?
                  </Label>
                  <Select value={formData.isRenewedClient ? 'sim' : 'não'} onValueChange={(value) => handleChange('isRenewedClient', value === 'sim')}>
                    <SelectTrigger className={`crm-input ${formData.isRenewedClient ? 'border-amber-500/50 bg-amber-500/10' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.isRenewedClient && (
                    <p className="text-xs text-amber-600">
                      Identificado como cliente premium renovado
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contracted Meetings Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Reuniões Contratadas</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contractedMeetings">Quantidade de Reuniões</Label>
                <Select 
                  value={formData.contractedMeetings?.toString() || ''} 
                  onValueChange={(value) => handleChange('contractedMeetings', value ? parseInt(value) as ContractedMeetings : null)}
                >
                  <SelectTrigger className="crm-input w-[200px]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACTED_MEETINGS_OPTIONS.map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'reunião' : 'reuniões'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.contractedMeetings && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
                  <h4 className="font-medium text-foreground">O que foi feito em cada reunião</h4>
                  {Array.from({ length: formData.contractedMeetings }, (_, i) => i + 1).map((meetingNum) => (
                    <div key={meetingNum} className="space-y-2">
                      <Label htmlFor={`meeting-${meetingNum}`}>{meetingNum}ª Reunião</Label>
                      <Textarea
                        id={`meeting-${meetingNum}`}
                        value={formData.meetingNotes[meetingNum] || ''}
                        onChange={(e) => handleMeetingNoteChange(meetingNum, e.target.value)}
                        placeholder={`Descreva o que foi realizado na ${meetingNum}ª reunião...`}
                        className="crm-input min-h-[80px]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="workDone">O que foi feito (geral)</Label>
              <Textarea
                id="workDone"
                value={formData.workDone}
                onChange={(e) => handleChange('workDone', e.target.value)}
                placeholder="Descreva o trabalho realizado..."
                className="crm-input min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleChange('observations', e.target.value)}
                placeholder="Observações adicionais..."
                className="crm-input min-h-[80px]"
              />
            </div>

            {/* Files Section */}
            <Separator />
            <ClientFiles 
              files={formData.files} 
              onFilesChange={handleFilesChange}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="crm-btn-accent" disabled={portfolioTotal > 0 && !portfolioValid}>
                {client ? 'Salvar Alterações' : 'Criar Cliente'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
