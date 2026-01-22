import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { 
  Client, 
  FunnelStage, 
  ClientFile, 
  ScheduledMeeting, 
  ChildInfo, 
  PartnerInfo, 
  PortfolioDistribution,
  RetirementGoal,
  MeetingNotes,
  DebtInfo,
  ConsultingResult,
  InvestorProfile,
  Residence,
  RenewalStatus,
  PrivatePensionStatus,
  PrivatePensionType,
  OrganizedFinancesStatus,
  EmergencyReserveStatus
} from '@/types/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Type for database row
type ClientRow = Tables<'clients'>;

// Convert database row to Client type
function dbToClient(row: ClientRow): Client {
  return {
    id: row.id,
    contractStart: new Date(row.contract_start),
    contractEnd: new Date(row.contract_end),
    name: row.name,
    age: row.age ?? 0,
    birthDate: row.birth_date ? new Date(row.birth_date) : null,
    email: row.email ?? '',
    phone: row.phone ?? '',
    profession: row.profession ?? '',
    objective: row.objective ?? '',
    investmentTerm: row.investment_term ?? '',
    financialAssets: Number(row.financial_assets) ?? 0,
    materialAssets: Number(row.material_assets) ?? 0,
    emergencyReserve: Number(row.emergency_reserve) ?? 0,
    investorProfile: (row.investor_profile as InvestorProfile) ?? 'Moderado',
    monthlyRevenue: Number(row.monthly_revenue) ?? 0,
    monthlyContribution: Number(row.monthly_contribution) ?? 0,
    workDone: row.work_done ?? '',
    tasks: [], // Tasks are loaded separately from tasks table
    observations: row.observations ?? '',
    city: row.city ?? '',
    state: row.state ?? 'SP',
    country: (row as any).country ?? '',
    funnelStage: (row.funnel_stage as FunnelStage) ?? 'Em atendimento',
    renewed: row.renewed ?? false,
    renewalPotential: row.renewal_potential ?? false,
    pendingSchedule: row.pending_schedule ?? false,
    residence: (row.residence as Residence) ?? '',
    renewalStatus: (row.renewal_status as RenewalStatus) ?? '',
    renewalDate: row.renewal_date ? new Date(row.renewal_date) : null,
    married: row.married ?? false,
    partner: row.partner ? {
      ...(row.partner as unknown as PartnerInfo),
      monthlyRevenue: (row as any).partner_monthly_revenue ?? (row.partner as any)?.monthlyRevenue ?? null,
    } : null,
    hasChildren: row.has_children ?? false,
    children: (row.children as unknown as ChildInfo[]) ?? [],
    portfolioDistribution: row.portfolio_distribution as unknown as PortfolioDistribution | null,
    privatePensionStatus: (row.private_pension_status as PrivatePensionStatus) ?? '',
    privatePensionType: (row.private_pension_type as PrivatePensionType) ?? '',
    retirementGoal: row.retirement_goal as unknown as RetirementGoal | null,
    contractedMeetings: row.contracted_meetings as 1 | 3 | 6 | null,
    meetingNotes: (row.meeting_notes as unknown as MeetingNotes) ?? {},
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : new Date(),
    scheduledMeeting: row.scheduled_meeting as unknown as ScheduledMeeting | null,
    files: (row.files as unknown as ClientFile[]) ?? [],
    organizedFinances: (row.organized_finances as OrganizedFinancesStatus) ?? '',
    debts: (row.debts as unknown as DebtInfo[]) ?? [],
    consultingResult: row.consulting_result as unknown as ConsultingResult | null,
    consultingFinished: row.consulting_finished ?? false,
    isRenewedClient: row.is_renewed_client ?? false,
    consultingReason: (row as any).consulting_reason ?? null,
    professionalProfile: (row as any).professional_profile ?? null,
    financialInstitutions: (row as any).financial_institutions ?? null,
    shortTermGoals: (row as any).short_term_goals ?? null,
    mediumTermGoals: (row as any).medium_term_goals ?? null,
    longTermGoals: (row as any).long_term_goals ?? null,
    currentWealthNotes: (row as any).current_wealth_notes ?? null,
    emergencyStartMonth: (row as any).emergency_start_month ?? null,
    emergencyStartYear: (row as any).emergency_start_year ?? null,
    monthlyLivingCost: Number((row as any).monthly_living_cost) || null,
    emergencyCoverageMonths: (row as any).emergency_coverage_months ?? 6,
    emergencyContributionsCount: (row as any).emergency_contributions_count ?? 12,
    emergencyReserveStatus: ((row as any).emergency_reserve_status as EmergencyReserveStatus) ?? '',
    emergencyReserveNote: (row as any).emergency_reserve_note ?? null,
    alreadyInvests: (row as any).already_invests ?? false,
    investingOrigin: (row as any).investing_origin ?? null,
    debtsComments: (row as any).debts_comments ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Convert Client to database insert format
function clientToDbInsert(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>, userId: string): TablesInsert<'clients'> {
  return {
    user_id: userId,
    name: client.name,
    contract_start: client.contractStart.toISOString().split('T')[0],
    contract_end: client.contractEnd.toISOString().split('T')[0],
    age: client.age,
    birth_date: client.birthDate?.toISOString().split('T')[0] ?? null,
    email: client.email,
    phone: client.phone,
    profession: client.profession,
    objective: client.objective,
    investment_term: client.investmentTerm,
    financial_assets: client.financialAssets,
    material_assets: client.materialAssets,
    emergency_reserve: client.emergencyReserve,
    investor_profile: client.investorProfile,
    monthly_revenue: client.monthlyRevenue,
    monthly_contribution: client.monthlyContribution,
    work_done: client.workDone,
    observations: client.observations,
    city: client.city,
    state: client.state,
    country: client.country,
    funnel_stage: client.funnelStage,
    renewed: client.renewed,
    renewal_potential: client.renewalPotential,
    pending_schedule: client.pendingSchedule,
    residence: client.residence,
    renewal_status: client.renewalStatus,
    renewal_date: client.renewalDate?.toISOString().split('T')[0] ?? null,
    married: client.married,
    partner: client.partner as any,
    partner_monthly_revenue: client.partner?.monthlyRevenue ?? null,
    has_children: client.hasChildren,
    children: client.children as any,
    portfolio_distribution: client.portfolioDistribution as any,
    private_pension_status: client.privatePensionStatus,
    private_pension_type: client.privatePensionType,
    retirement_goal: client.retirementGoal as any,
    contracted_meetings: client.contractedMeetings,
    meeting_notes: client.meetingNotes as any,
    last_activity_at: client.lastActivityAt?.toISOString() ?? new Date().toISOString(),
    scheduled_meeting: client.scheduledMeeting as any,
    files: client.files as any,
    organized_finances: client.organizedFinances,
    debts: client.debts as any,
    consulting_result: client.consultingResult as any,
    consulting_finished: client.consultingFinished,
    is_renewed_client: client.isRenewedClient,
    consulting_reason: client.consultingReason,
    professional_profile: client.professionalProfile,
    financial_institutions: client.financialInstitutions,
    short_term_goals: client.shortTermGoals,
    medium_term_goals: client.mediumTermGoals,
    long_term_goals: client.longTermGoals,
    current_wealth_notes: client.currentWealthNotes,
    emergency_start_month: client.emergencyStartMonth,
    emergency_start_year: client.emergencyStartYear,
    monthly_living_cost: client.monthlyLivingCost,
    emergency_coverage_months: client.emergencyCoverageMonths,
    emergency_contributions_count: client.emergencyContributionsCount,
    emergency_reserve_status: client.emergencyReserveStatus || null,
    emergency_reserve_note: client.emergencyReserveNote,
    already_invests: client.alreadyInvests,
    investing_origin: client.investingOrigin,
    debts_comments: client.debtsComments,
  } as any;
}

// Convert partial Client updates to database update format
function clientToDbUpdate(updates: Partial<Client>): TablesUpdate<'clients'> {
  const dbUpdates: TablesUpdate<'clients'> = {};
  
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.contractStart !== undefined) dbUpdates.contract_start = updates.contractStart.toISOString().split('T')[0];
  if (updates.contractEnd !== undefined) dbUpdates.contract_end = updates.contractEnd.toISOString().split('T')[0];
  if (updates.age !== undefined) dbUpdates.age = updates.age;
  if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate?.toISOString().split('T')[0] ?? null;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.profession !== undefined) dbUpdates.profession = updates.profession;
  if (updates.objective !== undefined) dbUpdates.objective = updates.objective;
  if (updates.investmentTerm !== undefined) dbUpdates.investment_term = updates.investmentTerm;
  if (updates.financialAssets !== undefined) dbUpdates.financial_assets = updates.financialAssets;
  if (updates.materialAssets !== undefined) dbUpdates.material_assets = updates.materialAssets;
  if (updates.emergencyReserve !== undefined) dbUpdates.emergency_reserve = updates.emergencyReserve;
  if (updates.investorProfile !== undefined) dbUpdates.investor_profile = updates.investorProfile;
  if (updates.monthlyRevenue !== undefined) dbUpdates.monthly_revenue = updates.monthlyRevenue;
  if (updates.monthlyContribution !== undefined) dbUpdates.monthly_contribution = updates.monthlyContribution;
  if (updates.workDone !== undefined) dbUpdates.work_done = updates.workDone;
  if (updates.observations !== undefined) dbUpdates.observations = updates.observations;
  if (updates.city !== undefined) dbUpdates.city = updates.city;
  if (updates.state !== undefined) dbUpdates.state = updates.state;
  if ((updates as any).country !== undefined) (dbUpdates as any).country = (updates as any).country;
  if (updates.funnelStage !== undefined) dbUpdates.funnel_stage = updates.funnelStage;
  if (updates.renewed !== undefined) dbUpdates.renewed = updates.renewed;
  if (updates.renewalPotential !== undefined) dbUpdates.renewal_potential = updates.renewalPotential;
  if (updates.pendingSchedule !== undefined) dbUpdates.pending_schedule = updates.pendingSchedule;
  if (updates.residence !== undefined) dbUpdates.residence = updates.residence;
  if (updates.renewalStatus !== undefined) dbUpdates.renewal_status = updates.renewalStatus;
  if (updates.renewalDate !== undefined) dbUpdates.renewal_date = updates.renewalDate?.toISOString().split('T')[0] ?? null;
  if (updates.married !== undefined) dbUpdates.married = updates.married;
  if (updates.partner !== undefined) {
    dbUpdates.partner = updates.partner as any;
    (dbUpdates as any).partner_monthly_revenue = updates.partner?.monthlyRevenue ?? null;
  }
  if (updates.hasChildren !== undefined) dbUpdates.has_children = updates.hasChildren;
  if (updates.children !== undefined) dbUpdates.children = updates.children as any;
  if (updates.portfolioDistribution !== undefined) dbUpdates.portfolio_distribution = updates.portfolioDistribution as any;
  if (updates.privatePensionStatus !== undefined) dbUpdates.private_pension_status = updates.privatePensionStatus;
  if (updates.privatePensionType !== undefined) dbUpdates.private_pension_type = updates.privatePensionType;
  if (updates.retirementGoal !== undefined) dbUpdates.retirement_goal = updates.retirementGoal as any;
  if (updates.contractedMeetings !== undefined) dbUpdates.contracted_meetings = updates.contractedMeetings;
  if (updates.meetingNotes !== undefined) dbUpdates.meeting_notes = updates.meetingNotes as any;
  if (updates.lastActivityAt !== undefined) dbUpdates.last_activity_at = updates.lastActivityAt.toISOString();
  if (updates.scheduledMeeting !== undefined) dbUpdates.scheduled_meeting = updates.scheduledMeeting as any;
  if (updates.files !== undefined) dbUpdates.files = updates.files as any;
  if (updates.organizedFinances !== undefined) dbUpdates.organized_finances = updates.organizedFinances;
  if (updates.debts !== undefined) dbUpdates.debts = updates.debts as any;
  if (updates.consultingResult !== undefined) dbUpdates.consulting_result = updates.consultingResult as any;
  if (updates.consultingFinished !== undefined) dbUpdates.consulting_finished = updates.consultingFinished;
  if (updates.isRenewedClient !== undefined) dbUpdates.is_renewed_client = updates.isRenewedClient;
  if (updates.consultingReason !== undefined) (dbUpdates as any).consulting_reason = updates.consultingReason;
  if (updates.professionalProfile !== undefined) (dbUpdates as any).professional_profile = updates.professionalProfile;
  if (updates.financialInstitutions !== undefined) (dbUpdates as any).financial_institutions = updates.financialInstitutions;
  if (updates.shortTermGoals !== undefined) (dbUpdates as any).short_term_goals = updates.shortTermGoals;
  if (updates.mediumTermGoals !== undefined) (dbUpdates as any).medium_term_goals = updates.mediumTermGoals;
  if (updates.longTermGoals !== undefined) (dbUpdates as any).long_term_goals = updates.longTermGoals;
  if (updates.currentWealthNotes !== undefined) (dbUpdates as any).current_wealth_notes = updates.currentWealthNotes;
  if (updates.emergencyStartMonth !== undefined) (dbUpdates as any).emergency_start_month = updates.emergencyStartMonth;
  if (updates.emergencyStartYear !== undefined) (dbUpdates as any).emergency_start_year = updates.emergencyStartYear;
  if (updates.monthlyLivingCost !== undefined) (dbUpdates as any).monthly_living_cost = updates.monthlyLivingCost;
  if (updates.emergencyCoverageMonths !== undefined) (dbUpdates as any).emergency_coverage_months = updates.emergencyCoverageMonths;
  if (updates.emergencyContributionsCount !== undefined) (dbUpdates as any).emergency_contributions_count = updates.emergencyContributionsCount;
  if (updates.emergencyReserveStatus !== undefined) (dbUpdates as any).emergency_reserve_status = updates.emergencyReserveStatus || null;
  if (updates.emergencyReserveNote !== undefined) (dbUpdates as any).emergency_reserve_note = updates.emergencyReserveNote;
  if (updates.alreadyInvests !== undefined) (dbUpdates as any).already_invests = updates.alreadyInvests;
  if (updates.investingOrigin !== undefined) (dbUpdates as any).investing_origin = updates.investingOrigin;
  if (updates.debtsComments !== undefined) (dbUpdates as any).debts_comments = updates.debtsComments;
  
  return dbUpdates;
}

export function useSupabaseClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all clients for current user
  const { data: clients = [], isLoading, error, refetch } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
      
      return data.map(dbToClient);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const dbClient = clientToDbInsert(clientData, user.id);
      
      const { data, error } = await supabase
        .from('clients')
        .insert(dbClient)
        .select()
        .single();
      
      if (error) throw error;
      return dbToClient(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente adicionado com sucesso!');
    },
    onError: (error) => {
      console.error('Error adding client:', error);
      toast.error('Erro ao adicionar cliente');
    },
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Client> }) => {
      if (!user) throw new Error('User not authenticated');
      
      const dbUpdates = clientToDbUpdate(updates);
      
      const { data, error } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return dbToClient(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error('Error updating client:', error);
      toast.error('Erro ao atualizar cliente');
    },
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');
      
      // First delete related tasks
      await supabase
        .from('tasks')
        .delete()
        .eq('client_id', id)
        .eq('user_id', user.id);
      
      // Then delete related financial goals
      await supabase
        .from('financial_goals')
        .delete()
        .eq('client_id', id)
        .eq('user_id', user.id);
      
      // Finally delete the client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['financial_goals'] });
      toast.success('Cliente removido com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting client:', error);
      toast.error('Erro ao remover cliente');
    },
  });

  return {
    clients,
    isLoading,
    error,
    refetch,
    addClient: addClientMutation.mutateAsync,
    updateClient: (id: string, updates: Partial<Client>) => updateClientMutation.mutateAsync({ id, updates }),
    deleteClient: deleteClientMutation.mutateAsync,
    isAdding: addClientMutation.isPending,
    isUpdating: updateClientMutation.isPending,
    isDeleting: deleteClientMutation.isPending,
  };
}
