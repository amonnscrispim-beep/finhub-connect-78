// ===== Conhecer o Cliente — Data Types =====

export interface ConhecerChildInfo {
  id: string;
  name: string;
  age: string;
  educationPhase?: string;
  educationMonthlyCost?: string;
  livesWithClient?: string;
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
  // Mini-DRE empresarial (PJ / Autônomo / Empresário)
  pjMonthlyRevenue: string; // Faturamento Bruto Mensal R$
  pjMonthlyOpCost: string; // Custo Operacional Mensal R$
  pjProLabore: string; // Pró-labore mensal R$
  pjProfitDistribution: string; // Distribuição de Lucros mensal R$
  pjTaxRegime: string; // Simples | Presumido | Real | Não sei
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
  budgetItems?: BudgetItem[];
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

  // ===== V2 (9 blocos) =====
  _schemaVersion?: number;
  _legacyData?: Record<string, any>;
  // Bloco 1
  spouseWorks: string; spouseProfession: string; spouseIncome: string;
  widowSinceYears: string; paysSupportAlimony: string; alimonyValue: string;
  incomeProvider: string; incomeSharePct: string;
  // Bloco 2
  jobTitle: string;
  cltCompany: string; cltNetSalary: string; cltBenefits: string;
  pjCompanyName: string; pjCnpj: string;
  aposentadoType: string; aposentadoExtraIncomeDesc: string; aposentadoExtraIncomeValue: string;
  servidorOrgao: string; servidorCargo: string; servidorNetSalary: string; servidorEstabilidadeDesde: string;
  annualFamilyIncome: string; monthlyInvestmentCapacity: string; annualInvestmentCapacity: string;
  hasDebts: string; debtsList: DebtItemV2[];
  hasPrivatePension: string; pensionType: string; pensionInstitution: string;
  pensionAccumulated: string; pensionMonthlyContrib: string; pensionYield: string;
  bloco9Comment: string;
  // Bloco 3
  pjPartnersCount: string; pjClientShare: string; pjHasKeyEmployee: string; pjKeyEmployeeName: string;
  // Bloco 4
  totalFinancialPL: string; totalPatrimonyEstimate: string;
  mainBank: string; otherBanks: string; mainCreditCard: string; otherCreditCard: string; fgtsValue: string;
  hasOffshore: string; offshoreInstitution: string; offshoreCountry: string; offshoreValueUSD: string;
  hasInternationalAccount: string; internationalAccountBank: string; internationalAccountValueUSD: string;
  investmentPotential: string; concentrationAsset: string; concentrationPct: string;
  // Bloco 5
  lifeInsuranceType: string; lifeInsuranceInterest: string;
  healthPlanType: string; healthPlanProvider: string;
  hasEmergencyReserve: string; emergencyReserveValue: string; emergencyReserveCoverage: string; emergencyReserveLocation: string;
  familyHealthHistory: string; familyHealthDetails: string;
  continuousMedication: string; continuousMedicationDetails: string;
  visionIssues: string; extremeSports: string; extremeSportsDetails: string;
  privateAircraft: string; smoker: string;
  familyKnowsAssets: string; familyKnowsAssetsDetails: string;
  hadFinancialCheckup: string; hadFinancialCheckupDetails: string;
  // Bloco 6
  successionInterest: string;
  // Bloco 7
  lostSleepDetails: string; investorProfile: string; financeInterestTopics: string;
  // Bloco 9
  hobbiesAndInterests: string[];
  sportsActivities: string; soccerTeam: string; pets: string; favoriteDrink: string; idealGift: string;
  socialClub: string; linkedinUrl: string; politicalPosition: string; religion: string;
  remunerationModel: string; meetingPeriodicity: string; preferredContactChannel: string; generalNotes: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  value: string;
}

export interface DebtItemV2 {
  id: string;
  type: string;
  totalValue: string;
  monthlyPayment: string;
  interestRate: string;
  remainingMonths: string;
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
  pjMonthlyRevenue: '', pjMonthlyOpCost: '', pjProLabore: '', pjProfitDistribution: '', pjTaxRegime: '',
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
  // V2
  spouseWorks: '', spouseProfession: '', spouseIncome: '', widowSinceYears: '', paysSupportAlimony: '', alimonyValue: '',
  incomeProvider: '', incomeSharePct: '',
  jobTitle: '', cltCompany: '', cltNetSalary: '', cltBenefits: '', pjCompanyName: '', pjCnpj: '',
  aposentadoType: '', aposentadoExtraIncomeDesc: '', aposentadoExtraIncomeValue: '',
  servidorOrgao: '', servidorCargo: '', servidorNetSalary: '', servidorEstabilidadeDesde: '',
  annualFamilyIncome: '', monthlyInvestmentCapacity: '', annualInvestmentCapacity: '',
  hasDebts: '', debtsList: [],
  hasPrivatePension: '', pensionType: '', pensionInstitution: '', pensionAccumulated: '', pensionMonthlyContrib: '', pensionYield: '',
  bloco9Comment: '',
  pjPartnersCount: '', pjClientShare: '', pjHasKeyEmployee: '', pjKeyEmployeeName: '',
  totalFinancialPL: '', totalPatrimonyEstimate: '', mainBank: '', otherBanks: '', mainCreditCard: '', otherCreditCard: '', fgtsValue: '',
  hasOffshore: '', offshoreInstitution: '', offshoreCountry: '', offshoreValueUSD: '',
  hasInternationalAccount: '', internationalAccountBank: '', internationalAccountValueUSD: '',
  investmentPotential: '', concentrationAsset: '', concentrationPct: '',
  lifeInsuranceType: '', lifeInsuranceInterest: '', healthPlanType: '', healthPlanProvider: '',
  hasEmergencyReserve: '', emergencyReserveValue: '', emergencyReserveCoverage: '', emergencyReserveLocation: '',
  familyHealthHistory: '', familyHealthDetails: '', continuousMedication: '', continuousMedicationDetails: '',
  visionIssues: '', extremeSports: '', extremeSportsDetails: '', privateAircraft: '', smoker: '',
  familyKnowsAssets: '', familyKnowsAssetsDetails: '', hadFinancialCheckup: '', hadFinancialCheckupDetails: '',
  successionInterest: '', lostSleepDetails: '', investorProfile: '', financeInterestTopics: '',
  hobbiesAndInterests: [], sportsActivities: '', soccerTeam: '', pets: '', favoriteDrink: '', idealGift: '',
  socialClub: '', linkedinUrl: '', politicalPosition: '', religion: '',
  remunerationModel: '', meetingPeriodicity: '', preferredContactChannel: '', generalNotes: '',
  _schemaVersion: 2,
};

const genId = () => Math.random().toString(36).substring(2, 10);

/**
 * Migrate data from old strategic_diagnostic structure to new ConhecerClienteData.
 */
export function migrateFromLegacy(raw: Record<string, any>): ConhecerClienteData {
  return migrateToV2(migrateBase(raw || {}), raw || {});
}

function migrateBase(raw: Record<string, any>): ConhecerClienteData {
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
      debtsList: raw.debtsList || [],
      hobbiesAndInterests: raw.hobbiesAndInterests || [],
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

const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Migra dados antigos para a estrutura V2 (9 blocos). Nunca apaga campos:
 * apenas preenche os novos que estiverem vazios e guarda uma cópia em `_legacyData`.
 */
export function migrateToV2(base: ConhecerClienteData, raw: Record<string, any>): ConhecerClienteData {
  if (raw._schemaVersion === 2) return { ...base, _schemaVersion: 2 };
  const m: any = { ...base };
  const old: any = raw;
  const fill = (key: string, ...values: any[]) => {
    if (!isEmpty(m[key])) return;
    const v = values.find((x) => !isEmpty(x));
    if (v !== undefined) m[key] = v;
  };

  // Bloco 1
  if (!m.civilStatus || ['solteiro', 'divorciado', 'viúvo', 'separado'].includes(String(m.civilStatus).toLowerCase())) {
    const map: Record<string, string> = { solteiro: 'Solteiro(a)', divorciado: 'Divorciado(a)', 'viúvo': 'Viúvo(a)', separado: 'Separado(a)' };
    const lower = String(m.civilStatus || '').toLowerCase();
    m.civilStatus = map[lower] || (m.isMarried === 'Sim' ? 'Casado(a)' : m.civilStatus || '');
  }
  if (m.civilStatus === 'União estável') m.civilStatus = 'União Estável';
  if (isEmpty(m.hasChildren) && m.numChildren) m.hasChildren = m.numChildren === 'Nenhum' ? 'Não' : 'Sim';
  if (m.numChildren === 'Nenhum') m.numChildren = '';
  if (m.numChildren === '4+') m.numChildren = String(Math.max(4, m.children?.length || 4));
  m.children = (m.children || []).map((c: any) => ({ educationPhase: '', educationMonthlyCost: '', livesWithClient: '', ...c }));
  if (isEmpty(m.incomeProvider) && old.financialDecisionMakers) {
    const t = String(old.financialDecisionMakers);
    m.incomeProvider = t.includes('Eu') && !t.includes('cônjuge') ? 'Provedor único' : 'Renda dividida';
  }

  // Bloco 2
  if (m.employmentType === 'Autônomo' || m.employmentType === 'Autonomo') m.employmentType = 'Autônomo';
  fill('autonomoIncome', old.autonomoMonthlyIncome);
  fill('aposentadoIncome', old.aposentadoMonthlyIncome);
  fill('pjProLabore', old.pjMonthlyWithdrawal);
  fill('monthlyCostOfLiving', old.livingCost);
  fill('monthlyInvestmentCapacity', old.monthlyInvestmentB2, old.monthlyInvestment);
  if (isEmpty(m.hasDebts) && (old.hasDebtsB3 === 'Sim' || old.hasDebtsB3 === true)) m.hasDebts = 'Sim';
  else fill('hasDebts', old.hasDebtsB3 === 'Não' ? 'Não' : '');
  if (isEmpty(m.debtsList) && Array.isArray(old.debtsListB3) && old.debtsListB3.length) {
    m.debtsList = old.debtsListB3.map((d: any) => ({
      id: d.id || genId(), type: d.description || 'Outro', totalValue: d.balance || '',
      monthlyPayment: '', interestRate: '', remainingMonths: d.remainingInstallments || '',
    }));
  }

  // Bloco 3
  fill('pjCompanyValue', old.businessValue);
  fill('pjEmployeeCount', old.businessEmployees);
  fill('pjConcerns', old.businessConcerns);
  fill('pjClientShare', old.businessPercentage);

  // Bloco 4
  fill('hasConcentration', old.hasConcentrationB2);
  fill('totalFinancialPL', old.patrimonioFinanceiro, old.investedAmount);
  fill('totalPatrimonyEstimate', old.totalPatrimony);
  if (isEmpty(m.hasOffshore) && old.hasInternationalAssets === 'Sim') {
    m.hasOffshore = 'Sim';
    fill('offshoreInstitution', old.internationalDetails);
    fill('offshoreValueUSD', old.internationalValue);
  }

  // Bloco 5
  fill('hasLifeInsurance', old.hasLifeInsuranceB3, old.hasLifeInsuranceB6);
  fill('hasEmergencyReserve', old.hasEmergencyReserveB3);
  fill('emergencyReserveValue', old.emergencyReserveValueB3, old.emergencyReserveAmount);
  fill('emergencyReserveCoverage', old.emergencyReserveCoverageB3, old.emergencyMonths, old.emergencyMonthsB2);
  fill('emergencyReserveLocation', old.emergencyReserveLocationB3);
  fill('familyKnowsAssets', old.familyKnowsB3);
  fill('familyKnowsAssetsDetails', old.familyKnowsDetailsB3);
  fill('hadFinancialCheckup', old.hadFinancialCheckupB3);
  fill('hadFinancialCheckupDetails', old.financialCheckupDetailsB3);

  // Bloco 6
  fill('abroadDetails', old.abroadCountry);
  fill('successionInterest', old.successionThoughtB4, old.successionThought);
  if (isEmpty(m.successionDetails)) m.successionDetails = old.successionDetailsB4 || old.successionDetails || '';

  // Bloco 7
  if (m.lostSleepOverMoney && !['Sim', 'Não'].includes(m.lostSleepOverMoney)) {
    fill('lostSleepDetails', m.lostSleepOverMoney);
    m.lostSleepOverMoney = 'Sim';
  }
  fill('dropReactionB5', old.dropReaction && ['Não me afetou', 'Fiquei preocupado', 'Vendi parte', 'Vendi tudo'].includes(old.dropReaction) ? old.dropReaction : '');
  const dropMap: Record<string, string> = { 'Vendo tudo': 'Vendi tudo', 'Aguardo': 'Fiquei preocupado', 'Compro mais': 'Não me afetou' };
  if (dropMap[m.dropReactionB5]) m.dropReactionB5 = dropMap[m.dropReactionB5];
  if (isEmpty(m.investmentExperience) || !['Nenhuma', 'Básica (poupança/CDB)', 'Intermediária (fundos/ações)', 'Avançada (derivativos/offshore)'].includes(m.investmentExperience)) {
    if (m.investmentExperience && isEmpty(m.investmentExperienceDesc)) m.investmentExperienceDesc = m.investmentExperience;
    m.investmentExperience = '';
  }
  if (old.hasWorkedWithAdvisorB5) m.hasWorkedWithAdvisor = old.hasWorkedWithAdvisorB5;
  if (old.advisorExperienceB5) m.advisorExperience = old.advisorExperienceB5;
  if (old.managementPreferenceB5) m.managementPreference = old.managementPreferenceB5;
  if (old.followUpFrequencyB5) m.followUpFrequency = old.followUpFrequencyB5;
  if (old.successCriteriaB5) m.successCriteria = old.successCriteriaB5;

  // Bloco 9
  if (isEmpty(m.hobbiesAndInterests) && typeof old.hobbies === 'string' && old.hobbies.trim()) {
    m.hobbiesAndInterests = old.hobbies.split(',').map((h: string) => h.trim()).filter(Boolean);
  }

  const legacy = { ...old };
  delete legacy._schemaVersion;
  delete legacy._legacyData;
  m._legacyData = old._legacyData || legacy;
  m._schemaVersion = 2;
  return m as ConhecerClienteData;
}

/** Mantém campos antigos que outras telas ainda leem em sincronia com os novos. */
export function syncLegacyFields(d: ConhecerClienteData): ConhecerClienteData {
  const married = d.civilStatus === 'Casado(a)' || d.civilStatus === 'União Estável';
  return {
    ...d,
    isMarried: d.civilStatus ? (married ? 'Sim' : 'Não') : d.isMarried,
    hasEmergencyReserveB3: d.hasEmergencyReserve || d.hasEmergencyReserveB3,
    emergencyReserveValueB3: d.emergencyReserveValue || d.emergencyReserveValueB3,
    hasDebtsB3: d.hasDebts || d.hasDebtsB3,
    monthlyInvestmentB2: d.monthlyInvestmentCapacity || d.monthlyInvestmentB2,
    successionThoughtB4: d.successionInterest || d.successionThoughtB4,
    hasWorkedWithAdvisorB5: d.hasWorkedWithAdvisor || d.hasWorkedWithAdvisorB5,
    advisorExperienceB5: d.advisorExperience || d.advisorExperienceB5,
    managementPreferenceB5: d.managementPreference || d.managementPreferenceB5,
    followUpFrequencyB5: d.followUpFrequency || d.followUpFrequencyB5,
    successCriteriaB5: d.successCriteria || d.successCriteriaB5,
    hobbies: (d.hobbiesAndInterests || []).join(', ') || d.hobbies,
  };
}

/** Renda mensal do cliente conforme o regime de trabalho. */
export function getConhecerMonthlyIncome(d: Partial<ConhecerClienteData> & Record<string, any>): number {
  const n = (v: any) => parseFloat(String(v ?? '')) || 0;
  switch (d.employmentType) {
    case 'CLT': return n(d.cltNetSalary) || n(d.cltSalary);
    case 'PJ':
    case 'Empresário/Sócio': return (n(d.pjProLabore) + n(d.pjProfitDistribution)) || n(d.pjMonthlyWithdrawal) || n(d.pjMonthlyRevenue);
    case 'Autônomo': return n(d.autonomoIncome) || n(d.autonomoMonthlyIncome);
    case 'Aposentado': return n(d.aposentadoIncome) + n(d.aposentadoExtraIncomeValue);
    case 'Servidor Público': return n(d.servidorNetSalary);
    default: return n(d.monthlyIncome);
  }
}

/** Mapeia perfil de risco para o perfil do investidor da ficha. */
export function getConhecerInvestorProfile(d: ConhecerClienteData): string | undefined {
  if (['Conservador', 'Moderado', 'Arrojado', 'Agressivo'].includes(d.investorProfile)) return d.investorProfile;
  const map: Record<string, string> = { 'Prefiro segurança': 'Conservador', 'Equilíbrio': 'Moderado', 'Aceito mais risco': 'Arrojado' };
  return map[d.riskPreferenceB5 || ''];
}

/**
 * Calculate profile completeness percentage.
 */
export function calculateProgress(data: ConhecerClienteData): number {
  const isPj = data.employmentType === 'PJ' || data.employmentType === 'Empresário/Sócio';
  const checks = [
    !!data.fullName, !!data.birthDate, !!data.civilStatus, !!data.hasChildren,
    !!data.employmentType, !!data.profession, !!data.monthlyCostOfLiving,
    isPj ? !!data.pjCompanyValue : true,
    !!data.totalFinancialPL || (data.patrimonioTableItems?.length ?? 0) > 0, !!data.mainBank,
    !!data.hasLifeInsurance, !!data.hasEmergencyReserve,
    !!data.financialGoals, !!data.wantsRetirement,
    !!data.riskPreferenceB5 || !!data.investorProfile, !!data.hasWorkedWithAdvisor,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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
