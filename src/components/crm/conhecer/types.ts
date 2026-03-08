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

export interface ConhecerClienteData {
  // === BLOCO 1 — Quem é você? ===
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  profession: string;
  isMarried: string; // Sim | Não
  marriageRegime: string;
  civilStatus: string; // solteiro | divorciado | viúvo (if not married)
  hasChildren: string; // Sim | Não
  children: ConhecerChildInfo[];
  howFoundUs: string;
  bloco1Comment: string;

  // === BLOCO 2 — Situação Patrimonial e Investimentos ===
  hasRealEstate: string;
  realEstateUsage: string; // Morar | Alugar | Ambos
  hasOtherAssets: string;
  otherAssetsDetails: string;
  totalPatrimony: string; // R$ (read-only, auto-calculated)
  // New: 3 sub-blocks for patrimônio
  patrimonioImobiliario: string; // R$
  patrimonioImobiliarioDesc: string;
  patrimonioFinanceiro: string; // R$ — syncs to financialAssets in Situação Financeira
  participacoesSocietarias: string; // R$
  participacoesSocietariasDesc: string;
  investedAmount: string; // R$ — syncs to financialAssets (legacy, now use patrimonioFinanceiro)
  liquidAmount: string; // R$ — available with immediate liquidity
  emergencyReserveAmount: string; // R$ — syncs to emergencyReserve
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
  otherInstitutions: string; // legacy single field
  otherInstitutionsValue: string; // legacy single field
  otherInstitutionsList: OtherInstitutionItem[]; // new multi-entry
  investmentExperience: string;
  bloco2Comment: string;

  // === BLOCO 3 — Fluxo de Caixa e Estilo de Vida ===
  selectedCurrency: string; // BRL | USD | EUR | GBP | ARS
  monthlyRevenue: string;
  revenueSource: string;
  hasOtherIncome: string;
  otherIncomes: OtherIncomeItem[];
  revenueStability: string; // Fixa | Variável | Mista
  livingCost: string;
  nonRecurrentCost: string;
  travelDetails: string;
  travelAnnualCost: string;
  annualExpenses: AnnualExpenseItem[];
  monthlyInvestment: string;
  alreadyInvesting: string; // Sim | Parcialmente | Não
  emergencyMonths: string;
  // Proteção e Sucessão (fim do bloco 3)
  successionThought: string; // Sim | Não
  successionDetails: string;
  successionOrganization: string;
  hasTestament: string;
  hasHolding: string;
  hasLifeInsuranceB3: string;
  bloco3Comment: string;

  // === BLOCO 4 — Objetivos e Sonhos ===
  financialGoals: string;
  successNumber: string; // R$ ou R$/mês
  successTimeline: string;
  successTargetDate: string;
  wantsRetirement: string;
  retirementIncome: string;
  retirementYears: string;
  retirementWithdrawalRate: string; // 4 | 5 | 6
  wantsToLiveAbroad: string;
  abroadDetails: string;
  childrenEducation: string;
  restrictions: string;
  priority1: string;
  priority2: string;
  priority3: string;
  bloco4Comment: string;

  // === BLOCO 5 — Perfil de Risco e Comportamento ===
  hasExperiencedDrops: string;
  dropReaction: string;
  hypotheticalReaction: string;
  maxAcceptableDrop: string; // 5% | 10% | 20% | 30% | Não me incomodaria
  uncertaintyPreference: string;
  liquidityPreference: string; // Sim | Não | Depende
  impulseDecision: string;
  impulseDetails: string;
  bloco5Comment: string;

  // === BLOCO 6 — Proteção, Sucessão e Blindagem ===
  hasSuccessionPlan: string; // Sim | Não | Parcialmente
  hasLegalStructure: string;
  legalStructureDetails: string;
  isProtected: string; // Sim | Não | Não sei
  hasLifeInsuranceB6: string; // Sim | Não | Parcialmente
  hasInternationalAssets: string;
  internationalDetails: string;
  internationalValue: string;
  bloco6Comment: string;

  // === BLOCO 7 — Histórico e Expectativas ===
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
  // Replaced rendaFixaPct with 3 subcategories
  rendaFixaPct: string; // legacy — kept for backward compat
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

export const defaultConhecerCliente: ConhecerClienteData = {
  // Bloco 1
  fullName: '', birthDate: '', profession: '',
  isMarried: '', marriageRegime: '', civilStatus: '', hasChildren: '', children: [], howFoundUs: '', bloco1Comment: '',
  // Bloco 2
  hasRealEstate: '', realEstateUsage: '', hasOtherAssets: '', otherAssetsDetails: '', totalPatrimony: '',
  patrimonioImobiliario: '', patrimonioImobiliarioDesc: '',
  patrimonioFinanceiro: '', participacoesSocietarias: '', participacoesSocietariasDesc: '',
  investedAmount: '', liquidAmount: '', emergencyReserveAmount: '',
  howBuiltWealth: '', hasBusinessParticipation: '', businessValue: '', businessPercentage: '', businessEmployees: '',
  pfValue: '', pjValue: '', businessConcerns: '', hasConcentration: '', concentrationDetails: '', concentrationPercentage: '',
  hasOtherInstitutions: '', otherInstitutions: '', otherInstitutionsValue: '', otherInstitutionsList: [],
  investmentExperience: '', bloco2Comment: '',
  // Bloco 3
  selectedCurrency: 'BRL',
  monthlyRevenue: '', revenueSource: '', hasOtherIncome: '', otherIncomes: [], revenueStability: '', livingCost: '',
  nonRecurrentCost: '', travelDetails: '', travelAnnualCost: '', annualExpenses: [], monthlyInvestment: '',
  alreadyInvesting: '', emergencyMonths: '', successionThought: '', successionDetails: '', successionOrganization: '',
  hasTestament: '', hasHolding: '', hasLifeInsuranceB3: '', bloco3Comment: '',
  // Bloco 4
  financialGoals: '', successNumber: '', successTimeline: '', successTargetDate: '', wantsRetirement: '',
  retirementIncome: '', retirementYears: '', retirementWithdrawalRate: '6', wantsToLiveAbroad: '', abroadDetails: '',
  childrenEducation: '', restrictions: '', priority1: '', priority2: '', priority3: '', bloco4Comment: '',
  // Bloco 5
  hasExperiencedDrops: '', dropReaction: '', hypotheticalReaction: '', maxAcceptableDrop: '',
  uncertaintyPreference: '', liquidityPreference: '', impulseDecision: '', impulseDetails: '', bloco5Comment: '',
  // Bloco 6
  hasSuccessionPlan: '', hasLegalStructure: '', legalStructureDetails: '', isProtected: '',
  hasLifeInsuranceB6: '', hasInternationalAssets: '', internationalDetails: '', internationalValue: '', bloco6Comment: '',
  // Bloco 7
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
    return {
      ...d, ...raw,
      children: raw.children || [],
      otherIncomes: raw.otherIncomes || [],
      annualExpenses: raw.annualExpenses || [],
      strategicPillars: raw.strategicPillars || [],
      otherInstitutionsList: raw.otherInstitutionsList || [],
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
  }

  // === Migrate from old structure ===
  const fam = raw.family || {};
  d.isMarried = fam.maritalStatus === 'Casado(a)' || fam.maritalStatus === 'União estável' ? 'Sim' : (fam.maritalStatus ? 'Não' : '');
  d.marriageRegime = fam.propertyRegime || '';
  d.civilStatus = fam.maritalStatus && d.isMarried === 'Não' ? fam.maritalStatus.replace('(a)', '').toLowerCase() : '';
  d.hasChildren = fam.hasChildren || '';
  if (fam.childrenCount) {
    const count = parseInt(fam.childrenCount) || 0;
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
  d.monthlyInvestment = fc.monthlyInvestment || '';
  d.alreadyInvesting = fc.alreadyInvesting || '';
  d.emergencyMonths = fc.autonomyMonths || '';

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
  d.managementPreference = hm.managementPreference || '';
  d.followUpFrequency = hm.followUpFrequency || '';
  d.successCriteria = hm.successCriteria || '';

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
  d.bloco5Comment = pr.consultantComment || '';
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
    data.isMarried, data.hasChildren,
    // Bloco 2
    data.patrimonioFinanceiro || data.totalPatrimony, data.hasBusinessParticipation,
    // Bloco 3
    data.monthlyRevenue, data.livingCost, data.monthlyInvestment, data.emergencyMonths,
    // Bloco 4
    data.financialGoals, data.successNumber,
    // Bloco 5
    data.hasExperiencedDrops, data.maxAcceptableDrop,
    // Bloco 6
    data.hasSuccessionPlan,
    // Bloco 7
    data.hasInvestmentHistory, data.managementPreference,
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
