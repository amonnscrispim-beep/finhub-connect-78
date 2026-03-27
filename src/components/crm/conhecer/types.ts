// ===== Conhecer o Cliente — Data Types =====

export interface ConhecerChildInfo {
  id: string;
  name: string;
  age: string;
}

export interface OtherIncomeItem {
  id: string;
  description: string;
  value: string;
}

export interface AnnualExpenseItem {
  id: string;
  description: string;
  value: string;
}

export interface StrategicPillar {
  id: string;
  name: string;
}

export interface OtherInstitutionItem {
  id: string;
  institution: string;
  value: string;
}

export interface RealEstateCard {
  id: string;
  description: string;
  purpose: string; // Moradia própria | Aluguel | Veraneio | Terreno
  value: string;
}

export interface PatrimonioTableItem {
  id: string;
  description: string;
  category: string;
  value: string;
  liquidezImediata: string; // Sim | Não
}

export interface DebtItem {
  id: string;
  description: string;
  balance: string;
  remainingInstallments: string;
}

export interface ConhecerClienteData {
  // === BLOCO 1 — Dados Pessoais e Perfil ===
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  manualAge: string; // editable when birthDate is empty
  profession: string;
  aboutYourself: string; // textarea - trajetória
  hobbies: string; // textarea - hobbies
  // Estrutura Familiar
  isMarried: string; // Sim | Não
  marriageRegime: string;
  spouseName: string;
  civilStatus: string; // legacy (kept for backward compat)
  civilStatusNotes: string; // textarea when not married
  hasChildren: string; // legacy Sim | Não (kept for backward compat)
  numChildren: string; // Nenhum | 1 | 2 | 3 | 4+
  children: ConhecerChildInfo[];
  // Perfil Financeiro Familiar
  financialDecisionMakers: string; // textarea
  moneyRelationship: string; // textarea
  // Como nos Encontrou
  howFoundUs: string;
  bloco1Comment: string;

  // === BLOCO 2 — Situação Patrimonial e Investimentos ===
  // Bens e Patrimônio
  hasRealEstate: string;
  realEstateUsage: string; // legacy
  realEstateCards: RealEstateCard[];
  hasOtherAssets: string;
  otherAssetsDetails: string;
  // Vida Profissional e Empresarial
  employmentType: string; // CLT | PJ | Autônomo | Aposentado
  cltSalary: string;
  cltGrowthPlan: string;
  pjIncomeType: string; // Pro-labore | Distribuição de Lucros | Ambos
  pjMonthlyWithdrawal: string;
  pjSector: string;
  hasPjPartners: string; // Sim | Não
  pjMajorityPartner: string;
  pjEmployeeCount: string;
  pjCompanyValue: string;
  pjConcerns: string; // textarea
  pjRenewEquipment: string; // Sim | Não
  pjRenewTimeline: string;
  pjRenewValue: string;
  pjRenewDescription: string;
  // Autônomo fields
  autonomoIncome: string;
  autonomoArea: string;
  autonomoStability: string;
  // Aposentado fields
  aposentadoIncome: string;
  aposentadoExtraIncome: string;
  // Other income (always visible)
  hasOtherIncomeB2: string; // Sim | Não
  otherIncomeDescriptionB2: string;
  otherIncomeValueB2: string;
  otherIncomeTypeB2: string; // Fixa | Variável | Mista
  // Investimentos e Liquidez
  investmentInstitutions: string; // textarea
  investmentExperienceDesc: string; // textarea
  monthlyCostOfLiving: string; // R$
  nonRecurrentCostB2: string; // textarea - inflating cost
  travelDetailsB2: string; // textarea
  travelAnnualCostB2: string; // R$
  annualExpensesB2: AnnualExpenseItem[];
  monthlyInvestmentB2: string; // R$
  alreadyInvestingB2: string; // Sim | Parcialmente | Não
  alreadyInvestingWhyNot: string; // textarea when Parcialmente or Não
  emergencyMonthsB2: string; // numeric
  hasPurchasePlan: string; // Sim | Não
  purchasePlanItem: string;
  purchasePlanTimeline: string;
  purchasePlanValue: string;
  // Patrimônio concentrado
  hasConcentrationB2: string; // Sim | Não
  // Tabela de Patrimônio
  patrimonioTableItems: PatrimonioTableItem[];
  // Legacy fields (preserved for backward compat)
  totalPatrimony: string;
  patrimonioImobiliario: string;
  patrimonioImobiliarioDesc: string;
  patrimonioFinanceiro: string;
  participacoesSocietarias: string;
  participacoesSocietariasDesc: string;
  investedAmount: string;
  liquidAmount: string;
  emergencyReserveAmount: string;
  howBuiltWealth: string;
  hasBusinessParticipation: string;
  businessValue: string;
  businessPercentage: string;
  businessEmployees: string;
  pfValue: string;
  pjValue: string;
  businessConcerns: string;
  hasConcentration: string;
  concentrationDetails: string;
  concentrationPercentage: string;
  hasOtherInstitutions: string;
  otherInstitutions: string;
  otherInstitutionsValue: string;
  otherInstitutionsList: OtherInstitutionItem[];
  investmentExperience: string;
  bloco2Comment: string;

  // === BLOCO 3 — Proteção e Segurança (NEW — replaces old Bloco 3) ===
  hasLifeInsurance: string; // Sim | Não
  lifeInsuranceValue: string;
  lifeInsuranceCompany: string;
  lifeInsuranceAdequate: string; // textarea
  hasPropertyInsurance: string; // Sim | Não | Parcialmente
  propertyInsuranceDetails: string; // textarea
  hasDebtsB3: string; // Sim | Não
  debtsListB3: DebtItem[];
  hasEmergencyReserveB3: string; // Sim | Não
  emergencyReserveValueB3: string;
  emergencyReserveCoverageB3: string; // months
  emergencyReserveLocationB3: string; // texto
  familyKnowsB3: string; // Sim | Não | Parcialmente
  familyKnowsDetailsB3: string; // textarea
  hadFinancialCheckupB3: string; // Sim | Não
  financialCheckupDetailsB3: string; // textarea
  bloco3Comment: string;

  // === Legacy Bloco 3 fields (preserved) ===
  selectedCurrency: string;
  monthlyRevenue: string;
  revenueSource: string;
  hasOtherIncome: string;
  otherIncomes: OtherIncomeItem[];
  revenueStability: string;
  livingCost: string;
  nonRecurrentCost: string;
  travelDetails: string;
  travelAnnualCost: string;
  annualExpenses: AnnualExpenseItem[];
  monthlyInvestment: string;
  alreadyInvesting: string;
  emergencyMonths: string;
  successionThought: string;
  successionDetails: string;
  successionOrganization: string;
  hasTestament: string;
  hasHolding: string;
  hasLifeInsuranceB3: string;

  // === BLOCO 4 — Objetivos e Sonhos (restructured) ===
  financialGoals: string;
  successNumber: string;
  successTimeline: string;
  successTargetDate: string;
  wantsRetirement: string;
  retirementAge: string; // NEW
  retirementIncome: string;
  retirementYears: string;
  retirementWithdrawalRate: string;
  retirementLifestyle: string; // NEW textarea
  wantsToLiveAbroad: string;
  abroadDetails: string;
  abroadCountry: string; // NEW
  abroadTimeline: string; // NEW
  childrenEducation: string;
  childrenEducationDetails: string; // NEW textarea
  travelDetailsB4: string; // NEW textarea
  travelAnnualCostB4: string; // NEW R$
  annualExpensesB4: AnnualExpenseItem[]; // NEW
  successionThoughtB4: string; // NEW Sim / Não
  successionDetailsB4: string; // NEW textarea
  successionOrganizationB4: string; // NEW textarea
  restrictions: string;
  priority1: string;
  priority2: string;
  priority3: string;
  bloco4Comment: string;

  // === BLOCO 5 — Perfil Comportamental (merges old 5, 6, 7) ===
  // Part 1 - Behavioral cards
  lostSleepOverMoney: string; // textarea
  angerSituation: string; // textarea
  dropReactionB5: string; // Vendo tudo | Aguardo | Compro mais
  dropReactionDetailsB5: string; // textarea
  riskPreferenceB5: string; // Prefiro segurança | Equilíbrio | Aceito mais risco
  riskPreferenceDetailsB5: string; // textarea
  understandsDiagnosisB5: string; // Sim, quero entender tudo | Prefiro só o essencial
  understandsDiagnosisDetailsB5: string; // textarea
  lastInvestmentDecision: string; // textarea
  // Part 2 - History & Expectations
  hasInvestmentHistoryB5: string; // Sim | Não
  investmentHistoryDetailsB5: string; // textarea
  hasWorkedWithAdvisorB5: string; // Sim | Não
  advisorExperienceB5: string; // textarea
  managementPreferenceB5: string; // radio
  followUpFrequencyB5: string; // Mensal | Bimestral | Trimestral
  successCriteriaB5: string; // textarea
  bloco5Comment: string;

  // === Legacy Bloco 5 fields (preserved) ===
  hasExperiencedDrops: string;
  dropReaction: string;
  hypotheticalReaction: string;
  maxAcceptableDrop: string;
  uncertaintyPreference: string;
  liquidityPreference: string;
  impulseDecision: string;
  impulseDetails: string;

  // === Legacy Bloco 6 fields (preserved, data not deleted) ===
  hasSuccessionPlan: string;
  hasLegalStructure: string;
  legalStructureDetails: string;
  isProtected: string;
  hasLifeInsuranceB6: string;
  hasInternationalAssets: string;
  internationalDetails: string;
  internationalValue: string;
  bloco6Comment: string;

  // === Legacy Bloco 7 fields (preserved, data not deleted) ===
  hasInvestmentHistory: string;
  investmentDuration: string;
  assetTypes: string;
  hasWorkedWithAdvisor: string;
  advisorExperience: string;
  managementPreference: string;
  followUpFrequency: string;
  successCriteria: string;
  bloco7Comment: string;

  // === BLOCO 8 — Arquitetura Estratégica (2ª Reunião) ===
  strategicPriority: string;
  complexityLevel: string;
  identifiedRisks: string;
  portfolioObjective: string;
  recommendedRisk: string;
  minLiquidityPct: string;
  minLiquidityJustification: string;
  rendaFixaPct: string;
  posFixadoPct: string;
  preFixadoPct: string;
  indexadoInflacaoPct: string;
  rendaVariavelPct: string;
  rendaPassivaPct: string;
  internacionalPct: string;
  alternativosPct: string;
  caixaPct: string;
  strategicPillars: StrategicPillar[];
  taxEfficiency: string;
  taxEfficiencyNotes: string;
  rebalancingRule: string;
  recommendedStructure: string;
  planningPdfUrl: string;
  bloco8Comment: string;
}

export const PATRIMONIO_CATEGORIES = {
  financeiro: {
    label: '💰 Patrimônio Financeiro',
    items: ['Poupança', 'CDB/LCI/LCA', 'Tesouro Direto', 'Renda Fixa (outros)', 'Ações', 'FII', 'FIA/Fundos Multimercado', 'Criptoativos', 'Renda Variável (outros)', 'Previdência Privada'],
  },
  reserva: {
    label: '🛡 Reserva de Emergência',
    items: ['Reserva de Emergência'],
  },
  imobiliario: {
    label: '🏠 Imobiliário',
    items: ['Imóvel Residencial', 'Imóvel Comercial', 'Imóvel para Aluguel', 'Terreno/Rural'],
  },
  societario: {
    label: '🏢 Participações Societárias',
    items: ['Participação em Empresa', 'Cotas de Empresa'],
  },
  outros: {
    label: '🚗 Outros Bens',
    items: ['Veículo/Frota', 'Embarcação/Aeronave', 'Obra de Arte/Coleção', 'Joia/Bem de Luxo', 'Outros Bens'],
  },
};

export function getCategoryGroup(category: string): string {
  for (const [group, data] of Object.entries(PATRIMONIO_CATEGORIES)) {
    if (data.items.includes(category)) return group;
  }
  return 'outros';
}

export const defaultConhecerCliente: ConhecerClienteData = {
  // Bloco 1
  fullName: '', birthDate: '', manualAge: '', profession: '',
  aboutYourself: '', hobbies: '',
  isMarried: '', marriageRegime: '', spouseName: '', civilStatus: '', civilStatusNotes: '',
  hasChildren: '', numChildren: '', children: [],
  financialDecisionMakers: '', moneyRelationship: '',
  howFoundUs: '', bloco1Comment: '',
  // Bloco 2
  hasRealEstate: '', realEstateUsage: '', realEstateCards: [],
  hasOtherAssets: '', otherAssetsDetails: '',
  employmentType: '', cltSalary: '', cltGrowthPlan: '',
  pjIncomeType: '', pjMonthlyWithdrawal: '', pjSector: '',
  hasPjPartners: '', pjMajorityPartner: '', pjEmployeeCount: '', pjCompanyValue: '',
  pjConcerns: '', pjRenewEquipment: '', pjRenewTimeline: '', pjRenewValue: '', pjRenewDescription: '',
  autonomoIncome: '', autonomoArea: '', autonomoStability: '',
  aposentadoIncome: '', aposentadoExtraIncome: '',
  hasOtherIncomeB2: '', otherIncomeDescriptionB2: '', otherIncomeValueB2: '', otherIncomeTypeB2: '',
  investmentInstitutions: '', investmentExperienceDesc: '',
  monthlyCostOfLiving: '',
  nonRecurrentCostB2: '', travelDetailsB2: '', travelAnnualCostB2: '',
  annualExpensesB2: [], monthlyInvestmentB2: '',
  alreadyInvestingB2: '', alreadyInvestingWhyNot: '',
  emergencyMonthsB2: '',
  hasPurchasePlan: '', purchasePlanItem: '', purchasePlanTimeline: '', purchasePlanValue: '',
  hasConcentrationB2: '',
  patrimonioTableItems: [],
  totalPatrimony: '',
  patrimonioImobiliario: '', patrimonioImobiliarioDesc: '',
  patrimonioFinanceiro: '', participacoesSocietarias: '', participacoesSocietariasDesc: '',
  investedAmount: '', liquidAmount: '', emergencyReserveAmount: '',
  howBuiltWealth: '', hasBusinessParticipation: '', businessValue: '', businessPercentage: '', businessEmployees: '',
  pfValue: '', pjValue: '', businessConcerns: '', hasConcentration: '', concentrationDetails: '', concentrationPercentage: '',
  hasOtherInstitutions: '', otherInstitutions: '', otherInstitutionsValue: '', otherInstitutionsList: [],
  investmentExperience: '', bloco2Comment: '',
  // Bloco 3 — Proteção e Segurança
  hasLifeInsurance: '', lifeInsuranceValue: '', lifeInsuranceCompany: '', lifeInsuranceAdequate: '',
  hasPropertyInsurance: '', propertyInsuranceDetails: '',
  hasDebtsB3: '', debtsListB3: [],
  hasEmergencyReserveB3: '', emergencyReserveValueB3: '', emergencyReserveCoverageB3: '', emergencyReserveLocationB3: '',
  familyKnowsB3: '', familyKnowsDetailsB3: '',
  hadFinancialCheckupB3: '', financialCheckupDetailsB3: '',
  bloco3Comment: '',
  // Legacy Bloco 3
  selectedCurrency: 'BRL',
  monthlyRevenue: '', revenueSource: '', hasOtherIncome: '', otherIncomes: [], revenueStability: '', livingCost: '',
  nonRecurrentCost: '', travelDetails: '', travelAnnualCost: '', annualExpenses: [], monthlyInvestment: '',
  alreadyInvesting: '', emergencyMonths: '', successionThought: '', successionDetails: '', successionOrganization: '',
  hasTestament: '', hasHolding: '', hasLifeInsuranceB3: '',
  // Bloco 4 — Objetivos e Sonhos
  financialGoals: '', successNumber: '', successTimeline: '', successTargetDate: '', wantsRetirement: '',
  retirementAge: '', retirementIncome: '', retirementYears: '', retirementWithdrawalRate: '6',
  retirementLifestyle: '',
  wantsToLiveAbroad: '', abroadDetails: '', abroadCountry: '', abroadTimeline: '',
  childrenEducation: '', childrenEducationDetails: '',
  travelDetailsB4: '', travelAnnualCostB4: '', annualExpensesB4: [],
  successionThoughtB4: '', successionDetailsB4: '', successionOrganizationB4: '',
  restrictions: '', priority1: '', priority2: '', priority3: '', bloco4Comment: '',
  // Bloco 5 — Perfil Comportamental (merge of old 5/6/7)
  lostSleepOverMoney: '', angerSituation: '',
  dropReactionB5: '', dropReactionDetailsB5: '',
  riskPreferenceB5: '', riskPreferenceDetailsB5: '',
  understandsDiagnosisB5: '', understandsDiagnosisDetailsB5: '',
  lastInvestmentDecision: '',
  hasInvestmentHistoryB5: '', investmentHistoryDetailsB5: '',
  hasWorkedWithAdvisorB5: '', advisorExperienceB5: '',
  managementPreferenceB5: '', followUpFrequencyB5: '', successCriteriaB5: '',
  bloco5Comment: '',
  // Legacy Bloco 5
  hasExperiencedDrops: '', dropReaction: '', hypotheticalReaction: '', maxAcceptableDrop: '',
  uncertaintyPreference: '', liquidityPreference: '', impulseDecision: '', impulseDetails: '',
  // Legacy Bloco 6
  hasSuccessionPlan: '', hasLegalStructure: '', legalStructureDetails: '', isProtected: '',
  hasLifeInsuranceB6: '', hasInternationalAssets: '', internationalDetails: '', internationalValue: '', bloco6Comment: '',
  // Legacy Bloco 7
  hasInvestmentHistory: '', investmentDuration: '', assetTypes: '', hasWorkedWithAdvisor: '',
  advisorExperience: '', managementPreference: '', followUpFrequency: '', successCriteria: '', bloco7Comment: '',
  // Bloco 8
  strategicPriority: '', complexityLevel: '', identifiedRisks: '', portfolioObjective: '', recommendedRisk: '',
  minLiquidityPct: '', minLiquidityJustification: '',
  rendaFixaPct: '', posFixadoPct: '', preFixadoPct: '', indexadoInflacaoPct: '',
  rendaVariavelPct: '', rendaPassivaPct: '',
  internacionalPct: '', alternativosPct: '', caixaPct: '', strategicPillars: [], taxEfficiency: '',
  taxEfficiencyNotes: '', rebalancingRule: '', recommendedStructure: '', planningPdfUrl: '', bloco8Comment: '',
};

const genId = () => Math.random().toString(36).substring(2, 10);

/**
 * Migrate data from old strategic_diagnostic structure to new ConhecerClienteData.
 */
export function migrateFromLegacy(raw: Record<string, any>): ConhecerClienteData {
  const d = { ...defaultConhecerCliente };

  // If already has new fields, use them
  if (raw.bloco1Comment !== undefined || raw.isMarried !== undefined) {
    const merged = {
      ...d, ...raw,
      children: raw.children || [],
      otherIncomes: raw.otherIncomes || [],
      annualExpenses: raw.annualExpenses || [],
      annualExpensesB2: raw.annualExpensesB2 || [],
      annualExpensesB4: raw.annualExpensesB4 || [],
      strategicPillars: raw.strategicPillars || [],
      otherInstitutionsList: raw.otherInstitutionsList || [],
      realEstateCards: raw.realEstateCards || [],
      patrimonioTableItems: raw.patrimonioTableItems || [],
      debtsListB3: raw.debtsListB3 || [],
      investedAmount: raw.investedAmount || '',
      liquidAmount: raw.liquidAmount || '',
      emergencyReserveAmount: raw.emergencyReserveAmount || '',
      patrimonioImobiliario: raw.patrimonioImobiliario || '',
      patrimonioImobiliarioDesc: raw.patrimonioImobiliarioDesc || '',
      patrimonioFinanceiro: raw.patrimonioFinanceiro || '',
      participacoesSocietarias: raw.participacoesSocietarias || '',
      participacoesSocietariasDesc: raw.participacoesSocietariasDesc || '',
      selectedCurrency: raw.selectedCurrency || 'BRL',
      posFixadoPct: raw.posFixadoPct || '',
      preFixadoPct: raw.preFixadoPct || '',
      indexadoInflacaoPct: raw.indexadoInflacaoPct || '',
    };

    // Migrate hasChildren → numChildren if needed
    if (!merged.numChildren && merged.hasChildren === 'Sim') {
      const count = merged.children?.length || 1;
      merged.numChildren = count >= 4 ? '4+' : count.toString();
    } else if (!merged.numChildren && merged.hasChildren === 'Não') {
      merged.numChildren = 'Nenhum';
    }

    // Migrate civilStatus to civilStatusNotes
    if (!merged.civilStatusNotes && merged.civilStatus) {
      merged.civilStatusNotes = merged.civilStatus;
    }

    // Migrate business fields to new employment fields
    if (!merged.employmentType && merged.hasBusinessParticipation === 'Sim') {
      merged.employmentType = 'PJ';
      merged.pjCompanyValue = merged.businessValue || '';
      merged.pjEmployeeCount = merged.businessEmployees || '';
      merged.pjConcerns = merged.businessConcerns || '';
    }

    // Migrate old Bloco 5 → new Bloco 5 behavioral fields
    if (!merged.dropReactionB5 && merged.dropReaction) {
      merged.dropReactionDetailsB5 = merged.dropReaction;
    }
    if (!merged.hasInvestmentHistoryB5 && merged.hasInvestmentHistory) {
      merged.hasInvestmentHistoryB5 = merged.hasInvestmentHistory;
    }
    if (!merged.hasWorkedWithAdvisorB5 && merged.hasWorkedWithAdvisor) {
      merged.hasWorkedWithAdvisorB5 = merged.hasWorkedWithAdvisor;
      merged.advisorExperienceB5 = merged.advisorExperience || '';
    }
    if (!merged.managementPreferenceB5 && merged.managementPreference) {
      merged.managementPreferenceB5 = merged.managementPreference;
    }
    if (!merged.followUpFrequencyB5 && merged.followUpFrequency) {
      merged.followUpFrequencyB5 = merged.followUpFrequency;
    }
    if (!merged.successCriteriaB5 && merged.successCriteria) {
      merged.successCriteriaB5 = merged.successCriteria;
    }

    // Migrate old Bloco 3 → new Bloco 2 fields
    if (!merged.monthlyInvestmentB2 && merged.monthlyInvestment) {
      merged.monthlyInvestmentB2 = merged.monthlyInvestment;
    }
    if (!merged.alreadyInvestingB2 && merged.alreadyInvesting) {
      merged.alreadyInvestingB2 = merged.alreadyInvesting;
    }
    if (!merged.emergencyMonthsB2 && merged.emergencyMonths) {
      merged.emergencyMonthsB2 = merged.emergencyMonths;
    }
    if (!merged.monthlyCostOfLiving && merged.livingCost) {
      merged.monthlyCostOfLiving = merged.livingCost;
    }

    // Merge bloco5Comment from old 5+6+7
    if (!merged.bloco5Comment) {
      const parts = [merged.bloco5Comment, merged.bloco6Comment, merged.bloco7Comment].filter(Boolean);
      if (parts.length > 0) merged.bloco5Comment = parts.join('\n\n');
    }

    return merged;
  }

  // === Migrate from old structure ===
  const fam = raw.family || {};
  d.isMarried = fam.maritalStatus === 'Casado(a)' || fam.maritalStatus === 'União estável' ? 'Sim' : (fam.maritalStatus ? 'Não' : '');
  d.marriageRegime = fam.propertyRegime || '';
  d.civilStatus = fam.maritalStatus && d.isMarried === 'Não' ? fam.maritalStatus.replace('(a)', '').toLowerCase() : '';
  d.civilStatusNotes = d.civilStatus;
  d.hasChildren = fam.hasChildren || '';
  if (fam.childrenCount) {
    const count = parseInt(fam.childrenCount) || 0;
    d.numChildren = count >= 4 ? '4+' : (count > 0 ? count.toString() : 'Nenhum');
    d.children = Array.from({ length: count }, (_, i) => ({
      id: genId(),
      name: '',
      age: fam.childrenAges?.split(',')[i]?.trim() || '',
    }));
  }

  const ep = raw.estruturaPatrimonial || {};
  d.totalPatrimony = ep.totalPatrimony || '';
  d.pfValue = ep.pfValue || '';
  d.pjValue = ep.pjValue || '';
  d.hasConcentration = ep.hasConcentration || '';
  d.concentrationDetails = ep.concentrationDetail || ep.concentrationNotes || '';

  const fc = raw.fluxoCaixa || {};
  d.monthlyRevenue = fc.monthlyRevenue || '';
  d.revenueSource = fc.revenueSource || '';
  d.revenueStability = fc.revenueStability === 'Alta previsibilidade' ? 'Fixa' : fc.revenueStability === 'Alta variação' ? 'Variável' : fc.revenueStability ? 'Mista' : '';
  d.livingCost = fc.livingCost || '';
  d.monthlyCostOfLiving = fc.livingCost || '';
  d.monthlyInvestment = fc.monthlyInvestment || '';
  d.monthlyInvestmentB2 = fc.monthlyInvestment || '';
  d.alreadyInvesting = fc.alreadyInvesting || '';
  d.alreadyInvestingB2 = fc.alreadyInvesting || '';
  d.emergencyMonths = fc.autonomyMonths || '';
  d.emergencyMonthsB2 = fc.autonomyMonths || '';

  const om = raw.objetivosMetas || {};
  d.financialGoals = om.mainObjective || '';
  d.successNumber = om.goalMonthlyIncome || om.goalTargetWealth || om.goalEstimatedValue || '';
  d.successTimeline = om.timeframe || '';
  d.restrictions = om.restrictions || '';
  d.priority1 = om.priority1 || '';
  d.priority2 = om.priority2 || '';
  d.priority3 = om.priority3 || '';

  const pr = raw.perfilRisco || {};
  d.hasExperiencedDrops = pr.volatilityExperience || '';
  d.dropReaction = pr.volatilityReaction || '';
  d.maxAcceptableDrop = pr.oscillationLimit || '';
  d.uncertaintyPreference = pr.crisisPriority || '';
  d.liquidityPreference = pr.liquidityComfort || '';
  d.impulseDecision = pr.pressureSelling || '';
  d.impulseDetails = pr.pressureMotivation || '';

  const ps = raw.protecaoSucessao || {};
  d.hasSuccessionPlan = ps.successionPlanning || '';

  const hm = raw.historicoMercado || {};
  d.hasInvestmentHistory = hm.investmentHistory || '';
  d.hasInvestmentHistoryB5 = hm.investmentHistory || '';
  d.managementPreference = hm.managementPreference || '';
  d.managementPreferenceB5 = hm.managementPreference || '';
  d.followUpFrequency = hm.followUpFrequency || '';
  d.followUpFrequencyB5 = hm.followUpFrequency || '';
  d.successCriteria = hm.successCriteria || '';
  d.successCriteriaB5 = hm.successCriteria || '';

  const de = raw.direcionamentoEstrategico || {};
  const ac = raw.arquiteturaCarteira || {};
  d.strategicPriority = de.strategicPriority || ac.strategicPriority || '';
  d.identifiedRisks = ac.identifiedRisks || '';
  d.rendaFixaPct = ac.rendaFixaPct || '';
  d.rendaVariavelPct = ac.rendaVariavelPct || '';
  d.rendaPassivaPct = ac.rendaPassivaPct || '';
  d.internacionalPct = ac.internacionalPct || '';
  d.alternativosPct = ac.alternativosPct || '';
  d.caixaPct = ac.caixaPct || '';

  d.bloco1Comment = raw.consultantComment || fam.familySynthesis || '';
  d.bloco2Comment = ep.consultantComment || '';
  d.bloco3Comment = fc.consultantComment || '';
  d.bloco4Comment = om.consultantComment || '';
  d.bloco5Comment = [pr.consultantComment, ps.consultantComment, hm.consultantComment].filter(Boolean).join('\n\n') || '';
  d.bloco6Comment = ps.consultantComment || '';
  d.bloco7Comment = hm.consultantComment || '';
  d.bloco8Comment = ac.consultantComment || de.consultantComment || '';

  return d;
}

/**
 * Calculate profile completeness percentage.
 */
export function calculateProgress(data: ConhecerClienteData): number {
  const fields = [
    // Bloco 1
    data.isMarried, data.numChildren || data.hasChildren,
    // Bloco 2
    data.patrimonioFinanceiro || data.totalPatrimony || (data.patrimonioTableItems?.length > 0 ? 'yes' : ''),
    data.employmentType || data.hasBusinessParticipation,
    data.monthlyCostOfLiving || data.livingCost,
    data.monthlyInvestmentB2 || data.monthlyInvestment,
    // Bloco 3
    data.hasLifeInsurance, data.hasDebtsB3, data.hasEmergencyReserveB3,
    // Bloco 4
    data.financialGoals, data.successNumber || data.wantsRetirement,
    // Bloco 5
    data.dropReactionB5 || data.hasExperiencedDrops,
    data.managementPreferenceB5 || data.managementPreference,
    data.hasInvestmentHistoryB5 || data.hasInvestmentHistory,
    // Bloco 8
    data.strategicPriority, data.portfolioObjective,
  ];
  const filled = fields.filter(f => f && f.trim() !== '').length;
  return Math.round((filled / fields.length) * 100);
}

export function getProgressColor(pct: number): string {
  if (pct <= 40) return 'text-red-500';
  if (pct <= 70) return 'text-yellow-500';
  return 'text-green-500';
}

export function getProgressBgColor(pct: number): string {
  if (pct <= 40) return 'bg-red-500';
  if (pct <= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}
