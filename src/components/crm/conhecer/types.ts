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
  // Investimentos e Liquidez
  investmentInstitutions: string; // textarea
  investmentExperienceDesc: string; // textarea
  monthlyCostOfLiving: string; // R$
  hasPurchasePlan: string; // Sim | Não
  purchasePlanItem: string;
  purchasePlanTimeline: string;
  purchasePlanValue: string;
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

  // === BLOCO 3 — Fluxo de Caixa e Estilo de Vida ===
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
  bloco3Comment: string;

  // === BLOCO 4 — Objetivos e Sonhos ===
  financialGoals: string;
  successNumber: string;
  successTimeline: string;
  successTargetDate: string;
  wantsRetirement: string;
  retirementIncome: string;
  retirementYears: string;
  retirementWithdrawalRate: string;
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
  maxAcceptableDrop: string;
  uncertaintyPreference: string;
  liquidityPreference: string;
  impulseDecision: string;
  impulseDetails: string;
  bloco5Comment: string;

  // === BLOCO 6 — Proteção, Sucessão e Blindagem ===
  hasSuccessionPlan: string;
  hasLegalStructure: string;
  legalStructureDetails: string;
  isProtected: string;
  hasLifeInsuranceB6: string;
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
  investmentInstitutions: '', investmentExperienceDesc: '',
  monthlyCostOfLiving: '', hasPurchasePlan: '', purchasePlanItem: '', purchasePlanTimeline: '', purchasePlanValue: '',
  patrimonioTableItems: [],
  totalPatrimony: '',
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
    const merged = {
      ...d, ...raw,
      children: raw.children || [],
      otherIncomes: raw.otherIncomes || [],
      annualExpenses: raw.annualExpenses || [],
      strategicPillars: raw.strategicPillars || [],
      otherInstitutionsList: raw.otherInstitutionsList || [],
      realEstateCards: raw.realEstateCards || [],
      patrimonioTableItems: raw.patrimonioTableItems || [],
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
    data.isMarried, data.numChildren || data.hasChildren,
    // Bloco 2
    data.patrimonioFinanceiro || data.totalPatrimony || (data.patrimonioTableItems?.length > 0 ? 'yes' : ''),
    data.employmentType || data.hasBusinessParticipation,
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
