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
  EmergencyReserveStatus,
  ModuleNotes
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
    moduleNotes: ((row as any).module_notes as ModuleNotes) ?? {},
    kanbanOrder: (row as any).kanban_order ?? null,
    businessAssets: Number((row as any).business_assets) || 0,
    passiveIncome: Number((row as any).passive_income) || 0,
    successionPlanning: (row as any).succession_planning ?? '',
    strategicDiagnostic: (row as any).strategic_diagnostic ?? {},
    patrimonioFinanceiroLiquido: Number((row as any).patrimonio_financeiro_liquido) || null,
    isTop10: (row as any).is_top10 ?? false,
    top10Order: (row as any).top10_order ?? null,
    previousFunnelStage: (row as any).previous_funnel_stage ?? null,
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
    module_notes: client.moduleNotes ?? {},
    kanban_order: client.kanbanOrder ?? null,
    business_assets: client.businessAssets ?? 0,
    passive_income: (client as any).passiveIncome ?? 0,
    succession_planning: (client as any).successionPlanning ?? '',
    strategic_diagnostic: (client as any).strategicDiagnostic ?? {},
    patrimonio_financeiro_liquido: client.patrimonioFinanceiroLiquido ?? null,
    is_top10: client.isTop10 ?? false,
    top10_order: client.top10Order ?? null,
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
  if (updates.moduleNotes !== undefined) (dbUpdates as any).module_notes = updates.moduleNotes;
  if (updates.businessAssets !== undefined) (dbUpdates as any).business_assets = updates.businessAssets;
  if ((updates as any).passiveIncome !== undefined) (dbUpdates as any).passive_income = (updates as any).passiveIncome;
  if ((updates as any).successionPlanning !== undefined) (dbUpdates as any).succession_planning = (updates as any).successionPlanning;
  if ((updates as any).strategicDiagnostic !== undefined) (dbUpdates as any).strategic_diagnostic = (updates as any).strategicDiagnostic;
  if ((updates as any).patrimonioFinanceiroLiquido !== undefined) (dbUpdates as any).patrimonio_financeiro_liquido = (updates as any).patrimonioFinanceiroLiquido;
  if ((updates as any).isTop10 !== undefined) (dbUpdates as any).is_top10 = (updates as any).isTop10;
  if ((updates as any).top10Order !== undefined) (dbUpdates as any).top10_order = (updates as any).top10Order;
  if ((updates as any).previousFunnelStage !== undefined) (dbUpdates as any).previous_funnel_stage = (updates as any).previousFunnelStage;
  
  // Handle kanbanOrder - explicitly extract and log for debugging
  const kanbanOrderValue = (updates as any).kanbanOrder;
  if (kanbanOrderValue !== undefined) {
    (dbUpdates as any).kanban_order = kanbanOrderValue;
    console.log('[Kanban] Preparing update - kanban_order:', kanbanOrderValue);
  }
  
  console.log('[Kanban] dbUpdates being sent:', JSON.stringify(dbUpdates));
  
  return dbUpdates;
}

// Flag to prevent refetch during reorder operations
let isReorderingInProgress = false;
let reorderTimeoutId: ReturnType<typeof setTimeout> | null = null;
// Queue for pending swap operations (per-stage debounce)
const pendingSwaps: Map<string, { clientAId: string; clientBId: string; orderA: number; orderB: number }[]> = new Map();

export function useSupabaseClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // INSTANT optimistic swap in React Query cache (no await, no blocking)
  const optimisticSwapInCache = (clientAId: string, clientBId: string) => {
    const previousClients = queryClient.getQueryData<Client[]>(['clients', user?.id]);
    if (!previousClients) return null;
    
    const clientA = previousClients.find(c => c.id === clientAId);
    const clientB = previousClients.find(c => c.id === clientBId);
    
    if (!clientA || !clientB) return null;
    
    const orderA = clientA.kanbanOrder ?? 0;
    const orderB = clientB.kanbanOrder ?? 0;
    
    // Swap orders in cache IMMEDIATELY
    queryClient.setQueryData<Client[]>(['clients', user?.id], old =>
      old?.map(client => {
        if (client.id === clientAId) {
          return { ...client, kanbanOrder: orderB };
        }
        if (client.id === clientBId) {
          return { ...client, kanbanOrder: orderA };
        }
        return client;
      }) ?? []
    );
    
    return { previousClients, orderA, orderB };
  };

  // Atomic swap using database RPC function (fire-and-forget with rollback)
  // CRITICAL: This function updates cache INSTANTLY and persists in background
  // NO refetch after success - optimistic state IS the source of truth
  const swapKanbanOrder = async (clientAId: string, clientBId: string): Promise<boolean> => {
    // Block any refetch during this operation
    isReorderingInProgress = true;
    
    // INSTANT: Update cache first, don't wait for DB
    const snapshot = optimisticSwapInCache(clientAId, clientBId);
    
    // Persist in background (fire-and-forget style)
    console.log('[Kanban] RPC swap_kanban_order (background):', { clientAId, clientBId });
    
    try {
      const { data, error } = await supabase.rpc('swap_kanban_order', {
        p_client_a: clientAId,
        p_client_b: clientBId
      });
      
      if (error) {
        console.error('[Kanban] RPC swap_kanban_order error:', error);
        // Rollback on error
        if (snapshot?.previousClients) {
          queryClient.setQueryData(['clients', user?.id], snapshot.previousClients);
          toast.error('Não foi possível salvar a ordem. Tente novamente.');
        }
        isReorderingInProgress = false;
        return false;
      }
      
      const result = data as { success: boolean; error?: string } | null;
      console.log('[Kanban] RPC swap_kanban_order result:', result);
      
      if (!result?.success) {
        // Rollback on failure
        if (snapshot?.previousClients) {
          queryClient.setQueryData(['clients', user?.id], snapshot.previousClients);
          toast.error('Não foi possível salvar a ordem.');
        }
        isReorderingInProgress = false;
        return false;
      }
      
      // SUCCESS: Do NOT refetch! The optimistic cache is correct.
      // Just release the lock after a short delay to prevent race conditions
      setTimeout(() => {
        isReorderingInProgress = false;
      }, 200);
      
      return true;
    } catch (err) {
      console.error('[Kanban] RPC swap error:', err);
      if (snapshot?.previousClients) {
        queryClient.setQueryData(['clients', user?.id], snapshot.previousClients);
        toast.error('Erro ao reordenar. Tente novamente.');
      }
      isReorderingInProgress = false;
      return false;
    }
  };

  // Normalize column using database RPC function
  // This is only called when there are null/duplicate orders - rare case
  const normalizeColumn = async (stage: string): Promise<boolean> => {
    if (!user) return false;
    
    console.log('[Kanban] Calling RPC normalize_kanban_order:', { userId: user.id, stage });
    
    const { data, error } = await supabase.rpc('normalize_kanban_order', {
      p_user_id: user.id,
      p_stage: stage
    });
    
    if (error) {
      console.error('[Kanban] RPC normalize_kanban_order error:', error);
      return false;
    }
    
    const result = data as { success: boolean; normalized_count?: number } | null;
    console.log('[Kanban] RPC normalize_kanban_order result:', result);
    
    // After normalization, we need to fetch fresh data to get the new orders
    // This is the ONLY case where we should refetch after a kanban operation
    if (result?.success && result.normalized_count && result.normalized_count > 0) {
      // Small delay to ensure DB transaction is committed
      setTimeout(async () => {
        isReorderingInProgress = true; // Block during refetch
        await queryClient.refetchQueries({ queryKey: ['clients', user.id] });
        isReorderingInProgress = false;
      }, 150);
    }
    
    return result?.success === true;
  };

  // Fetch all clients for current user
  const { data: clients = [], isLoading, error, refetch } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Block refetch if reordering is in progress
      if (isReorderingInProgress) {
        console.log('[Kanban] Blocking refetch - reorder in progress');
        const cached = queryClient.getQueryData<Client[]>(['clients', user?.id]);
        if (cached) return cached;
      }
      
      console.log('[Kanban] Fetching clients from Supabase...');
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('funnel_stage', { ascending: true })
        .order('kanban_order', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true }); // Stable fallback by id
      
      if (error) {
        console.error('[Kanban] Error fetching clients:', error);
        throw error;
      }
      
      console.log('[Kanban] Fetched', data.length, 'clients');
      
      const clients = data.map(dbToClient);
      return clients;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  // Update client mutation with optimistic updates for stage changes
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Client> }) => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('[Kanban] updateClientMutation called with id:', id, 'updates:', updates);
      
      const dbUpdates = clientToDbUpdate(updates);
      
      console.log('[Kanban] Sending update to Supabase:', { id, dbUpdates });
      
      const { data, error } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('[Kanban] Supabase update error:', error);
        throw error;
      }
      
      console.log('[Kanban] Supabase update success, returned data kanban_order:', data.kanban_order);
      return dbToClient(data);
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ id, updates }) => {
      // Set reordering flag to prevent refetch interference
      const isKanbanUpdate = (updates as any).kanbanOrder !== undefined;
      if (isKanbanUpdate) {
        isReorderingInProgress = true;
      }
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['clients', user?.id] });
      
      // Snapshot previous value
      const previousClients = queryClient.getQueryData<Client[]>(['clients', user?.id]);
      
      // Optimistically update the cache
      if (previousClients) {
        queryClient.setQueryData<Client[]>(['clients', user?.id], old =>
          old?.map(client =>
            client.id === id
              ? { ...client, ...updates, updatedAt: new Date() }
              : client
          ) ?? []
        );
      }
      
      return { previousClients, isKanbanUpdate };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousClients) {
        queryClient.setQueryData(['clients', user?.id], context.previousClients);
      }
      console.error('Error updating client:', error);
      // More specific error message for kanban reorder
      if ((variables.updates as any).kanbanOrder !== undefined || variables.updates.funnelStage !== undefined) {
        toast.error('Não foi possível salvar a ordem. Tente novamente.');
      } else {
        toast.error('Erro ao atualizar cliente. Alteração revertida.');
      }
    },
    onSettled: (data, error, variables, context) => {
      // For kanban updates, do NOT invalidate - optimistic cache is source of truth
      if (context?.isKanbanUpdate) {
        setTimeout(() => {
          isReorderingInProgress = false;
          console.log('[Kanban] Reorder complete, refetch allowed but NOT triggered');
          // DO NOT invalidate queries here - this causes the "bounce back" bug
          // The optimistic update is the correct state
        }, 300);
      } else {
        // Non-kanban updates can refetch immediately
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      }
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
    swapKanbanOrder,
    normalizeColumn,
    setReorderingFlag: (value: boolean) => {
      isReorderingInProgress = value;
      // Clear any existing timeout
      if (reorderTimeoutId) {
        clearTimeout(reorderTimeoutId);
        reorderTimeoutId = null;
      }
      // Do NOT invalidate queries when turning off - this causes bounce back
      // The optimistic cache is the source of truth
    },
    isAdding: addClientMutation.isPending,
    isUpdating: updateClientMutation.isPending,
    isDeleting: deleteClientMutation.isPending,
  };
}
