import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ConhecerClienteData } from '@/components/crm/conhecer/types';

const NAVY: [number, number, number] = [26, 46, 74];
const GRAY: [number, number, number] = [100, 110, 125];

const money = (v: unknown, currency = 'BRL') => {
  const n = parseFloat(String(v ?? ''));
  if (!n) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(n);
};
const dateBR = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const ageOf = (iso?: string) => {
  if (!iso) return null;
  const b = new Date(`${iso.split('T')[0]}T12:00:00`);
  if (isNaN(b.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
};
const todayBR = () => new Date().toLocaleDateString('pt-BR');
const pct = (v: unknown) => (v ? `${v}%` : '');

/** Gera o PDF "Relatório de Conhecimento do Cliente" com apenas os campos preenchidos. */
export function generateClientPDF(d: ConhecerClienteData, clientName: string, consultorName: string): void {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const name = d.fullName || clientName;

  // === CAPA ===
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 6, 'F');
  doc.setDrawColor(...NAVY);
  doc.line(30, 60, W - 30, 60);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Relatório de Conhecimento', W / 2, 80, { align: 'center' });
  doc.text('do Cliente', W / 2, 92, { align: 'center' });
  doc.line(30, 104, W - 30, 104);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(`Cliente: ${name}`, W / 2, 128, { align: 'center' });
  const age = ageOf(d.birthDate);
  if (d.birthDate) doc.text(`Data de nascimento: ${dateBR(d.birthDate)}${age !== null ? ` (${age} anos)` : ''}`, W / 2, 138, { align: 'center' });
  if (d.civilStatus) doc.text(`Estado civil: ${d.civilStatus}`, W / 2, 148, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  if (consultorName) doc.text(`Consultor: ${consultorName}`, W / 2, 175, { align: 'center' });
  doc.text(`Data: ${todayBR()}`, W / 2, 183, { align: 'center' });
  doc.text('Documento Confidencial', W / 2, 200, { align: 'center' });

  // === SEÇÕES ===
  doc.addPage();
  let y = 24;
  const ensure = (h: number) => { if (y + h > H - 20) { doc.addPage(); y = 24; } };

  const section = (title: string, fields: [string, string | undefined | null][], tables: (() => void)[] = []) => {
    const filled = fields.filter(([, v]) => v && String(v).trim()) as [string, string][];
    if (filled.length === 0 && tables.length === 0) return;
    ensure(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(title, 14, y);
    y += 2;
    doc.setDrawColor(...NAVY);
    doc.line(14, y, W - 14, y);
    y += 7;
    doc.setFontSize(10);
    filled.forEach(([label, value]) => {
      const lines = doc.splitTextToSize(String(value), W - 14 - 76);
      ensure(lines.length * 5 + 2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(`${label}:`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(lines, 76, y);
      y += lines.length * 5 + 2;
    });
    tables.forEach((t) => t());
    y += 5;
  };

  const table = (head: string[], body: string[][]) => () => {
    if (body.length === 0) return;
    ensure(20);
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: 14, right: 14, top: 24, bottom: 20 },
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      alternateRowStyles: { fillColor: [240, 242, 245] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  };

  const married = d.civilStatus === 'Casado(a)' || d.civilStatus === 'União Estável';
  section('1. Identificação & Família', [
    ['Nome', name],
    ['Data de nascimento', d.birthDate ? `${dateBR(d.birthDate)}${age !== null ? ` (${age} anos)` : ''}` : ''],
    ['Estado civil', d.civilStatus],
    [married ? 'Cônjuge' : d.civilStatus === 'Viúvo(a)' ? 'Falecido(a)' : 'Cônjuge', d.spouseName],
    ['Regime matrimonial', married ? d.marriageRegime : ''],
    ['Profissão do cônjuge', d.spouseWorks === 'Sim' ? d.spouseProfession : ''],
    ['Renda do cônjuge', d.spouseWorks === 'Sim' ? money(d.spouseIncome) : ''],
    ['Viúvo(a) há', d.widowSinceYears],
    ['Pensão alimentícia', d.paysSupportAlimony === 'Sim' ? money(d.alimonyValue) || 'Sim' : ''],
    ['Provedor', d.incomeProvider ? `${d.incomeProvider}${d.incomeSharePct ? ` (${d.incomeSharePct}%)` : ''}` : ''],
    ['Filhos', d.hasChildren === 'Sim' ? String(d.numChildren || d.children?.length || 'Sim') : d.hasChildren],
  ], [table(['Nome', 'Idade', 'Fase escolar', 'Custo educação', 'Mora junto'],
    (d.hasChildren === 'Sim' ? d.children || [] : []).map((c) => [c.name || '', c.age ? `${c.age} anos` : '', c.educationPhase || '', money(c.educationMonthlyCost), c.livesWithClient || '']))]);

  section('2. Renda & Custos', [
    ['Regime de trabalho', d.employmentType], ['Profissão', d.profession], ['Cargo', d.jobTitle],
    ['Empresa', d.cltCompany || d.pjCompanyName], ['CNPJ', d.pjCnpj],
    ['Salário bruto', money(d.cltSalary)], ['Salário líquido', money(d.cltNetSalary || d.servidorNetSalary)], ['Benefícios', d.cltBenefits],
    ['Faturamento mensal', money(d.pjMonthlyRevenue)], ['Custo operacional', money(d.pjMonthlyOpCost)],
    ['Pró-labore', money(d.pjProLabore)], ['Distribuição de lucros', money(d.pjProfitDistribution)],
    ['Regime tributário', d.pjTaxRegime], ['Setor', d.pjSector],
    ['Área de atuação', d.autonomoArea], ['Renda média', money(d.autonomoIncome)], ['Estabilidade', d.autonomoStability],
    ['Aposentadoria', d.aposentadoType ? `${d.aposentadoType} ${money(d.aposentadoIncome)}` : money(d.aposentadoIncome)],
    ['Outra renda', d.aposentadoExtraIncome === 'Sim' ? `${d.aposentadoExtraIncomeDesc} ${money(d.aposentadoExtraIncomeValue)}` : ''],
    ['Órgão', d.servidorOrgao], ['Cargo público', d.servidorCargo], ['Estável desde', d.servidorEstabilidadeDesde],
    ['Renda anual familiar', money(d.annualFamilyIncome)], ['Custo mensal da família', money(d.monthlyCostOfLiving)],
    ['Aporte mensal', money(d.monthlyInvestmentCapacity)], ['Aporte anual', money(d.annualInvestmentCapacity)],
    ['Possui dívidas', d.hasDebts],
    ['Previdência', d.hasPrivatePension === 'Sim' ? [d.pensionType, d.pensionInstitution].filter(Boolean).join(' — ') || 'Sim' : d.hasPrivatePension],
    ['Previdência acumulada', money(d.pensionAccumulated)], ['Aporte previdência', money(d.pensionMonthlyContrib)], ['Rendimento previdência', d.pensionYield],
  ], [table(['Tipo', 'Valor total', 'Parcela', 'Juros (% a.m.)', 'Prazo (meses)'],
    (d.hasDebts === 'Sim' ? d.debtsList || [] : []).map((x) => [x.type, money(x.totalValue), money(x.monthlyPayment), x.interestRate, x.remainingMonths]))]);

  if (d.employmentType === 'PJ' || d.employmentType === 'Empresário/Sócio') {
    section('3. Empresa', [
      ['Tem sócios', d.hasPjPartners === 'Sim' ? `Sim${d.pjPartnersCount ? ` (${d.pjPartnersCount})` : ''}` : d.hasPjPartners],
      ['Participação do cliente', pct(d.pjClientShare)], ['Valuation estimado', money(d.pjCompanyValue)],
      ['Funcionário-chave', d.pjHasKeyEmployee === 'Sim' ? d.pjKeyEmployeeName || 'Sim' : d.pjHasKeyEmployee],
      ['Funcionários', d.pjEmployeeCount],
      ['Renovar equipamentos', d.pjRenewEquipment === 'Sim' ? `Sim — ${d.pjRenewTimeline} ${money(d.pjRenewValue)}` : d.pjRenewEquipment],
      ['Preocupações', d.pjConcerns],
    ]);
  }

  section('4. Patrimônio & Banking', [
    ['PL no mercado financeiro', money(d.totalFinancialPL)], ['Patrimônio total estimado', money(d.totalPatrimonyEstimate)],
    ['Banco principal', d.mainBank], ['Outros bancos', d.otherBanks], ['Cartão principal', d.mainCreditCard], ['Outro cartão', d.otherCreditCard],
    ['FGTS', money(d.fgtsValue)],
    ['Offshore', d.hasOffshore === 'Sim' ? [d.offshoreInstitution, d.offshoreCountry, money(d.offshoreValueUSD, 'USD')].filter(Boolean).join(' — ') || 'Sim' : d.hasOffshore],
    ['Conta internacional', d.hasInternationalAccount === 'Sim' ? [d.internationalAccountBank, money(d.internationalAccountValueUSD, 'USD')].filter(Boolean).join(' — ') || 'Sim' : d.hasInternationalAccount],
    ['Potencial de captação', money(d.investmentPotential)],
    ['Concentração', d.hasConcentration === 'Sim' ? `${d.concentrationAsset || 'Sim'}${d.concentrationPct ? ` (${d.concentrationPct}%)` : ''}` : d.hasConcentration],
  ], [
    table(['Imóvel', 'Finalidade', 'Valor'], (d.hasRealEstate === 'Sim' ? d.realEstateCards || [] : []).map((r) => [r.description, r.purpose, money(r.value)])),
    table(['Ativo', 'Categoria', 'Valor', 'Liquidez imediata'], (d.patrimonioTableItems || []).filter((i) => i.description || i.value).map((i) => [i.description, i.category, money(i.value), i.liquidezImediata])),
  ]);

  section('5. Proteção & Segurança', [
    ['Seguro de vida', d.hasLifeInsurance === 'Sim' ? [money(d.lifeInsuranceValue), d.lifeInsuranceType, d.lifeInsuranceCompany].filter(Boolean).join(' — ') || 'Sim' : d.hasLifeInsurance],
    ['Seguro adequado', d.lifeInsuranceAdequate], ['Interesse em seguro', d.lifeInsuranceInterest],
    ['Bens segurados', d.hasPropertyInsurance === 'Sim' ? d.propertyInsuranceDetails || 'Sim' : d.hasPropertyInsurance],
    ['Plano de saúde', [d.healthPlanType, d.healthPlanProvider].filter(Boolean).join(' — ')],
    ['Reserva de emergência', d.hasEmergencyReserve === 'Sim' ? [money(d.emergencyReserveValue), d.emergencyReserveCoverage ? `${d.emergencyReserveCoverage} meses` : '', d.emergencyReserveLocation].filter(Boolean).join(' — ') || 'Sim' : d.hasEmergencyReserve],
    ['Doenças graves na família', d.familyHealthHistory === 'Sim' ? d.familyHealthDetails || 'Sim' : d.familyHealthHistory],
    ['Medicamento contínuo', d.continuousMedication === 'Sim' ? d.continuousMedicationDetails || 'Sim' : d.continuousMedication],
    ['Miopia/astigmatismo', d.visionIssues], ['Esportes radicais', d.extremeSports === 'Sim' ? d.extremeSportsDetails || 'Sim' : d.extremeSports],
    ['Avião particular', d.privateAircraft], ['Tabagismo', d.smoker],
    ['Família sabe do patrimônio', [d.familyKnowsAssets, d.familyKnowsAssetsDetails].filter(Boolean).join(' — ')],
    ['Check-up financeiro', [d.hadFinancialCheckup, d.hadFinancialCheckupDetails].filter(Boolean).join(' — ')],
  ]);

  section('6. Objetivos & Planejamento', [
    ['Objetivos', d.financialGoals], ['Número da liberdade', money(d.successNumber)], ['Prazo', d.successTimeline],
    ['Aposentadoria', d.wantsRetirement], ['Idade desejada', d.wantsRetirement === 'Sim' ? d.retirementAge : ''],
    ['Renda desejada', d.wantsRetirement === 'Sim' ? money(d.retirementIncome) : ''], ['Estilo de vida', d.retirementLifestyle],
    ['Morar no exterior', [d.wantsToLiveAbroad, d.abroadDetails].filter(Boolean).join(' — ')],
    ['Prioridades', [d.priority1, d.priority2, d.priority3].filter(Boolean).map((p, i) => `${i + 1}. ${p}`).join('  ')],
    ['Sucessão', d.successionInterest], ['Detalhes sucessão', d.successionDetails], ['Testamento', d.hasTestament], ['Holding', d.hasHolding],
    ['Restrições', d.restrictions],
  ]);

  section('7. Perfil & Comportamento', [
    ['Perdeu o sono por dinheiro', [d.lostSleepOverMoney, d.lostSleepDetails].filter(Boolean).join(' — ')],
    ['Situação de irritação', d.angerSituation], ['Reação a quedas', d.dropReactionB5], ['Preferência de risco', d.riskPreferenceB5],
    ['Perfil investidor', d.investorProfile], ['Experiência', d.investmentExperience],
    ['Já teve assessor', [d.hasWorkedWithAdvisor, d.advisorExperience].filter(Boolean).join(' — ')],
    ['Preferência de gestão', d.managementPreference], ['Acompanhamento', d.followUpFrequency],
    ['Critério de sucesso', d.successCriteria], ['Temas de interesse', d.financeInterestTopics],
  ]);

  const alloc: [string, string][] = [
    ['Pós-Fixado', d.posFixadoPct], ['Pré-Fixado', d.preFixadoPct], ['Inflação', d.indexadoInflacaoPct], ['Renda Variável', d.rendaVariavelPct],
    ['Renda Passiva / FIIs', d.rendaPassivaPct], ['Internacional', d.internacionalPct], ['Alternativos', d.alternativosPct], ['Caixa', d.caixaPct],
  ];
  section('8. Arquitetura Estratégica', [
    ['Prioridade estratégica', d.strategicPriority], ['Complexidade', d.complexityLevel], ['Riscos identificados', d.identifiedRisks],
    ['Objetivo da carteira', d.portfolioObjective], ['Risco recomendado', d.recommendedRisk], ['Liquidez mínima', pct(d.minLiquidityPct)],
    ['Pilares', (d.strategicPillars || []).map((p) => p.name).filter(Boolean).join(', ')],
    ['Eficiência tributária', d.taxEfficiency], ['Rebalanceamento', d.rebalancingRule], ['Estrutura recomendada', d.recommendedStructure],
  ], [table(['Classe', 'Alocação'], alloc.filter(([, v]) => parseFloat(v) > 0).map(([k, v]) => [k, `${v}%`]))]);

  section('9. Relacionamento', [
    ['Hobbies e interesses', (d.hobbiesAndInterests || []).join(', ')], ['Esportes', d.sportsActivities], ['Time', d.soccerTeam],
    ['Animais', d.pets], ['Bebida', d.favoriteDrink], ['Presente ideal', d.idealGift], ['Clube', d.socialClub], ['LinkedIn', d.linkedinUrl],
    ['Posição política', d.politicalPosition], ['Religião', d.religion],
    ['Remuneração', d.remunerationModel], ['Periodicidade', d.meetingPeriodicity], ['Canal de contato', d.preferredContactChannel],
    ['Como nos conheceu', d.howFoundUs], ['Observações', d.generalNotes],
  ]);

  // Cabeçalho/rodapé em todas as páginas (exceto capa)
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Relatório — ${name}`, 14, 12);
    doc.text(`Página ${i} de ${total}`, W - 14, 12, { align: 'right' });
    doc.setDrawColor(200, 205, 212);
    doc.line(14, 14, W - 14, 14);
    doc.text(`Documento confidencial${consultorName ? ` — ${consultorName}` : ''} — ${todayBR()}`, W / 2, H - 10, { align: 'center' });
  }

  const safe = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');
  const iso = new Date().toISOString().slice(0, 10);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Relatorio_${safe}_${iso}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
