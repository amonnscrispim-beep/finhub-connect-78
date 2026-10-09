import type { ConhecerClienteData } from './types';

/** Campos simples que o formulário do cliente pode preencher. */
export const FORM_MERGE_FIELDS = [
  'birthDate', 'civilStatus', 'marriageRegime', 'spouseName', 'spouseWorks', 'spouseProfession', 'spouseIncome',
  'hasChildren', 'numChildren', 'profession', 'jobTitle', 'employmentType',
  'cltCompany', 'cltSalary', 'cltNetSalary', 'pjCompanyName', 'pjProLabore', 'pjProfitDistribution', 'pjMonthlyRevenue',
  'autonomoArea', 'autonomoIncome', 'aposentadoType', 'aposentadoIncome', 'servidorOrgao', 'servidorNetSalary',
  'monthlyCostOfLiving', 'monthlyInvestmentCapacity',
  'hasDebts', 'hasPrivatePension', 'pensionType', 'pensionInstitution', 'pensionAccumulated', 'pensionMonthlyContrib',
  'totalFinancialPL', 'investmentInstitutions', 'mainBank', 'hasOffshore', 'offshoreInstitution', 'offshoreCountry', 'offshoreValueUSD',
  'hasRealEstate', 'realEstateCount', 'realEstateTotalValue', 'fgtsValue',
  'hasLifeInsurance', 'lifeInsuranceValue', 'lifeInsuranceCompany', 'healthPlanType',
  'familyHealthHistory', 'continuousMedication', 'extremeSports', 'smoker',
  'financialGoals', 'wantsRetirement', 'retirementAge', 'retirementIncome',
  'successionInterest', 'restrictions',
  'dropReactionB5', 'riskPreferenceB5', 'investmentExperience',
  'hasWorkedWithAdvisor', 'advisorExperience',
  'soccerTeam', 'pets', 'vacationPreferences',
] as const;

export const FORM_FIELD_LABELS: Record<string, string> = {
  fullName: 'Nome completo', birthDate: 'Data de nascimento', civilStatus: 'Estado civil', marriageRegime: 'Regime matrimonial',
  spouseName: 'Cônjuge', spouseWorks: 'Cônjuge trabalha', spouseProfession: 'Profissão do cônjuge', spouseIncome: 'Renda do cônjuge',
  hasChildren: 'Tem filhos', numChildren: 'Quantidade de filhos', children: 'Filhos', profession: 'Profissão', jobTitle: 'Cargo',
  employmentType: 'Regime de trabalho', cltCompany: 'Empresa', cltSalary: 'Salário bruto', cltNetSalary: 'Salário líquido',
  pjCompanyName: 'Empresa (PJ)', pjProLabore: 'Pró-labore', pjProfitDistribution: 'Distribuição de lucros', pjMonthlyRevenue: 'Faturamento mensal',
  autonomoArea: 'Área de atuação', autonomoIncome: 'Renda média (autônomo)', aposentadoType: 'Tipo de aposentadoria',
  aposentadoIncome: 'Valor da aposentadoria', servidorOrgao: 'Órgão', servidorNetSalary: 'Salário líquido (servidor)',
  monthlyCostOfLiving: 'Custo mensal da família', monthlyInvestmentCapacity: 'Capacidade de investimento mensal',
  hasDebts: 'Possui dívidas', debtsList: 'Dívidas', hasPrivatePension: 'Previdência privada', pensionType: 'Tipo de previdência',
  pensionInstitution: 'Instituição da previdência', pensionAccumulated: 'Valor acumulado na previdência', pensionMonthlyContrib: 'Aporte mensal na previdência',
  totalFinancialPL: 'Total investido', investmentInstitutions: 'Onde investe', mainBank: 'Banco principal',
  hasOffshore: 'Recursos no exterior', offshoreInstitution: 'Instituição no exterior', offshoreCountry: 'País', offshoreValueUSD: 'Valor no exterior (USD)',
  hasRealEstate: 'Possui imóveis', realEstateCount: 'Quantidade de imóveis', realEstateTotalValue: 'Valor estimado dos imóveis', fgtsValue: 'FGTS',
  hasLifeInsurance: 'Seguro de vida', lifeInsuranceValue: 'Valor do seguro', lifeInsuranceCompany: 'Seguradora', healthPlanType: 'Plano de saúde',
  familyHealthHistory: 'Doenças graves na família', continuousMedication: 'Medicamento contínuo', extremeSports: 'Esportes radicais', smoker: 'Fumante',
  financialGoals: 'Objetivos financeiros', wantsRetirement: 'Pensa em se aposentar', retirementAge: 'Idade de aposentadoria', retirementIncome: 'Renda desejada',
  successionInterest: 'Interesse em sucessão', restrictions: 'Restrições de investimento',
  dropReactionB5: 'Reação a queda de 20%', riskPreferenceB5: 'Preferência de risco', investmentExperience: 'Experiência com investimentos',
  hasWorkedWithAdvisor: 'Já teve assessor', advisorExperience: 'Experiência com assessor',
  hobbiesAndInterests: 'Hobbies e interesses', soccerTeam: 'Time de futebol', pets: 'Animais de estimação', vacationPreferences: 'Férias',
};

const empty = (v: unknown) =>
  v === undefined || v === null || v === '' || v === '0' || (Array.isArray(v) && v.length === 0);

export type MergeStatus = 'add' | 'keep' | 'update';

/** Classifica cada campo enviado: será adicionado, já existe (mantido) ou atualizado (nome). */
export function previewMerge(current: ConhecerClienteData, submitted: Record<string, any>) {
  const rows: { key: string; label: string; value: unknown; status: MergeStatus }[] = [];
  const cur = current as any;
  if (submitted.fullName?.trim()) rows.push({ key: 'fullName', label: FORM_FIELD_LABELS.fullName, value: submitted.fullName.trim(), status: 'update' });
  for (const key of [...FORM_MERGE_FIELDS, 'children', 'debtsList', 'hobbiesAndInterests']) {
    const v = submitted[key];
    if (empty(v)) continue;
    let status: MergeStatus = empty(cur[key]) ? 'add' : 'keep';
    if (key === 'hobbiesAndInterests') status = 'add';
    if (key === 'vacationPreferences' || key === 'realEstateCount' || key === 'realEstateTotalValue') status = 'add';
    rows.push({ key, label: FORM_FIELD_LABELS[key] || key, value: v, status });
  }
  return rows;
}

/**
 * Mescla os dados do formulário do cliente: campos vazios no CRM são preenchidos,
 * campos já preenchidos pelo consultor são mantidos. O nome sempre atualiza.
 */
export function mergeClientFormData(current: ConhecerClienteData, submitted: Record<string, any>): ConhecerClienteData {
  const merged: any = { ...current };
  if (submitted.fullName?.trim()) merged.fullName = submitted.fullName.trim();

  for (const field of FORM_MERGE_FIELDS) {
    const v = submitted[field];
    if (empty(v)) continue;
    if (field === 'vacationPreferences' || field === 'realEstateCount' || field === 'realEstateTotalValue') continue;
    if (empty(merged[field])) merged[field] = v;
  }

  if (submitted.children?.length > 0 && (!merged.children || merged.children.length === 0)) {
    merged.children = submitted.children;
  }
  if (submitted.debtsList?.length > 0 && (!merged.debtsList || merged.debtsList.length === 0)) {
    merged.debtsList = submitted.debtsList;
  }
  if (submitted.hobbiesAndInterests?.length > 0) {
    merged.hobbiesAndInterests = Array.from(new Set([...(merged.hobbiesAndInterests || []), ...submitted.hobbiesAndInterests]));
  }
  // Imóveis: vira um item resumo se o CRM ainda não tem nenhum
  if (submitted.hasRealEstate === 'Sim' && submitted.realEstateTotalValue && (!merged.realEstateCards || merged.realEstateCards.length === 0)) {
    merged.realEstateCards = [{
      id: Math.random().toString(36).substring(2, 10),
      description: `Imóveis informados pelo cliente${submitted.realEstateCount ? ` (${submitted.realEstateCount})` : ''}`,
      purpose: '', value: String(submitted.realEstateTotalValue),
    }];
  }
  // Informações sem campo próprio vão para as observações gerais
  const extras: string[] = [];
  if (submitted.vacationPreferences) extras.push(`Férias: ${submitted.vacationPreferences}`);
  if (extras.length) {
    const note = `[Formulário do cliente] ${extras.join(' | ')}`;
    if (!String(merged.generalNotes || '').includes(note)) merged.generalNotes = [merged.generalNotes, note].filter(Boolean).join('\n');
  }
  return merged as ConhecerClienteData;
}
