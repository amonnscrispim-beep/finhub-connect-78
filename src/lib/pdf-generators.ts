/**
 * PDF generation utilities for CRM modules.
 * Uses HTML template → Blob → download approach.
 */

const today = () => new Date().toLocaleDateString('pt-BR');
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title>
<style>
  @media print { @page { margin: 20mm; } }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 30px; }
  .header { border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; margin: 0 0 4px; color: #6366f1; }
  .header p { font-size: 12px; color: #64748b; margin: 2px 0; }
  h2 { font-size: 16px; color: #6366f1; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 28px; }
  .field { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .field .label { color: #64748b; }
  .field .value { font-weight: 600; text-align: right; max-width: 60%; }
  .note { background: #f8fafc; border-left: 3px solid #6366f1; padding: 10px 14px; margin: 10px 0; font-size: 13px; color: #334155; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .card .pct { font-size: 20px; font-weight: 700; color: #6366f1; }
  .card .name { font-size: 11px; color: #64748b; }
</style></head><body>${bodyHtml}</body></html>`;
}

function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fieldRow(label: string, value: string | undefined | null): string {
  if (!value || value.trim() === '' || value === '0') return '';
  return `<div class="field"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

// ========== ARQUITETURA ESTRATÉGICA PDF ==========

interface ArquiteturaData {
  clientName: string;
  advisorName: string;
  objective: string;
  riskLevel: string;
  liquidity: string;
  horizon: string;
  taxDirective: string;
  pillars: string[];
  macroFields: { fields: { label: string; value: string }[] } | null;
  consultantNote: string;
}

export function generateArquiteturaPdf(d: ArquiteturaData) {
  let body = `
    <div class="header">
      <h1>Arquitetura Estratégica da Carteira</h1>
      <p><strong>Cliente:</strong> ${d.clientName || '—'}</p>
      <p><strong>Assessor:</strong> ${d.advisorName || '—'}</p>
      <p><strong>Data:</strong> ${today()}</p>
    </div>

    <h2>Resumo Estratégico</h2>
    ${fieldRow('Objetivo dominante', d.objective)}
    ${fieldRow('Nível de risco recomendado', d.riskLevel)}
    ${fieldRow('Horizonte estratégico', d.horizon)}
    ${fieldRow('Liquidez mínima necessária', d.liquidity)}
    ${fieldRow('Diretrizes tributárias', d.taxDirective)}
  `;

  if (d.pillars.length > 0) {
    body += `<h2>Pilares Estratégicos</h2><p>${d.pillars.map(p => `<span class="badge" style="background:#ede9fe;color:#6366f1;margin-right:6px;">${p}</span>`).join('')}</p>`;
  }

  if (d.macroFields && d.macroFields.fields.length > 0) {
    const cards = d.macroFields.fields
      .filter(f => parseFloat(f.value) > 0)
      .map(f => `<div class="card"><div class="pct">${parseFloat(f.value)}%</div><div class="name">${f.label}</div></div>`)
      .join('');
    body += `<h2>Mapa Macro de Alocação</h2><div class="grid">${cards}</div>`;
  }

  if (d.consultantNote) {
    body += `<h2>Observação do Consultor</h2><div class="note">${d.consultantNote}</div>`;
  }

  body += `<div class="footer">FinHub CRM — Gerado em ${today()}</div>`;
  downloadHtml(wrapHtml('Arquitetura Estratégica', body), `arquitetura-estrategica-${d.clientName || 'cliente'}.html`);
}

// ========== CONHECER O CLIENTE PDF ==========

import type { ConhecerClienteData } from '@/components/crm/conhecer/types';

export function generateConhecerPdf(data: ConhecerClienteData, clientName: string, advisorName: string) {
  const r = fieldRow;
  const fmtC = (v: string) => { const n = parseFloat(v); return n ? fmt(n) : ''; };

  let body = `
    <div class="header">
      <h1>Perfil do Cliente — Conhecer o Cliente</h1>
      <p><strong>Cliente:</strong> ${clientName || data.fullName || '—'}</p>
      <p><strong>Assessor:</strong> ${advisorName || '—'}</p>
      <p><strong>Data:</strong> ${today()}</p>
    </div>
  `;

  // Bloco 1
  const b1 = [
    r('Nome completo', data.fullName),
    r('Data de nascimento', data.birthDate),
    r('Profissão', data.profession),
    r('Casado(a)', data.isMarried),
    data.isMarried === 'Sim' ? r('Regime de casamento', data.marriageRegime) : r('Estado civil', data.civilStatus),
    r('Tem filhos', data.hasChildren),
    ...(data.children.length > 0 ? data.children.map((c, i) => r(`Filho ${i + 1}`, `${c.name || '—'} (${c.age || '?'} anos)`)) : []),
    r('Como chegou', data.howFoundUs),
  ].filter(Boolean).join('');
  if (b1) body += `<h2>Bloco 1 — Quem é você?</h2>${b1}`;
  if (data.bloco1Comment) body += `<div class="note"><strong>Consultor:</strong> ${data.bloco1Comment}</div>`;

  // Bloco 2
  const b2 = [
    r('Possui imóveis', data.hasRealEstate),
    data.hasRealEstate === 'Sim' ? r('Uso dos imóveis', data.realEstateUsage) : '',
    r('Outros bens', data.hasOtherAssets),
    r('Detalhes dos bens', data.otherAssetsDetails),
    r('Patrimônio total', fmtC(data.totalPatrimony)),
    r('Como construiu', data.howBuiltWealth),
    r('Participação societária', data.hasBusinessParticipation),
    data.hasBusinessParticipation === 'Sim' ? [
      r('Valor empresa', fmtC(data.businessValue)),
      r('% participação', data.businessPercentage ? `${data.businessPercentage}%` : ''),
      r('Funcionários', data.businessEmployees),
      r('Valor PF', fmtC(data.pfValue)),
      r('Valor PJ', fmtC(data.pjValue)),
      r('Preocupações', data.businessConcerns),
    ].join('') : '',
    r('Concentração', data.hasConcentration),
    data.hasConcentration === 'Sim' ? [r('Descrição', data.concentrationDetails), r('% estimado', data.concentrationPercentage ? `${data.concentrationPercentage}%` : '')].join('') : '',
    r('Outras instituições', data.hasOtherInstitutions),
    data.hasOtherInstitutions === 'Sim' ? [r('Quais', data.otherInstitutions), r('Valor', fmtC(data.otherInstitutionsValue)), r('Experiência', data.investmentExperience)].join('') : '',
  ].filter(Boolean).join('');
  if (b2) body += `<h2>Bloco 2 — Situação Patrimonial</h2>${b2}`;
  if (data.bloco2Comment) body += `<div class="note"><strong>Consultor:</strong> ${data.bloco2Comment}</div>`;

  // Bloco 3
  const b3 = [
    r('Receita mensal', fmtC(data.monthlyRevenue)),
    r('Fonte principal', data.revenueSource),
    r('Outras rendas', data.hasOtherIncome),
    ...(data.otherIncomes.filter(i => i.description || i.value).map(i => r(i.description || 'Outra renda', fmtC(i.value)))),
    r('Estabilidade', data.revenueStability),
    r('Custo de vida', fmtC(data.livingCost)),
    r('Custos não recorrentes', data.nonRecurrentCost),
    r('Viagens', data.travelDetails),
    r('Gasto anual viagens', fmtC(data.travelAnnualCost)),
    ...(data.annualExpenses.filter(e => e.description || e.value).map(e => r(e.description || 'Gasto anual', fmtC(e.value)))),
    r('Aporte mensal', fmtC(data.monthlyInvestment)),
    r('Já investindo', data.alreadyInvesting),
    r('Meses de reserva', data.emergencyMonths),
    r('Planejamento sucessório', data.successionThought),
    data.successionThought === 'Sim' ? [r('Testamento', data.hasTestament), r('Holding', data.hasHolding), r('Seguro de vida', data.hasLifeInsuranceB3)].join('') : '',
    r('Organização sucessória', data.successionOrganization),
  ].filter(Boolean).join('');
  if (b3) body += `<h2>Bloco 3 — Fluxo de Caixa e Estilo de Vida</h2>${b3}`;
  if (data.bloco3Comment) body += `<div class="note"><strong>Consultor:</strong> ${data.bloco3Comment}</div>`;

  // Bloco 4
  const b4 = [
    r('Objetivos financeiros', data.financialGoals),
    r('Número do sucesso', fmtC(data.successNumber)),
    r('Prazo', data.successTimeline),
    r('Data alvo', data.successTargetDate),
    r('Aposentadoria', data.wantsRetirement),
    data.wantsRetirement === 'Sim' ? [
      r('Renda desejada', fmtC(data.retirementIncome)),
      r('Prazo (anos)', data.retirementYears),
      r('Taxa de retirada', data.retirementWithdrawalRate ? `${data.retirementWithdrawalRate}%` : ''),
    ].join('') : '',
    r('Morar no exterior', data.wantsToLiveAbroad),
    r('Detalhes exterior', data.abroadDetails),
    r('Educação dos filhos', data.childrenEducation),
    r('Restrições', data.restrictions),
    r('Prioridade 1', data.priority1),
    r('Prioridade 2', data.priority2),
    r('Prioridade 3', data.priority3),
  ].filter(Boolean).join('');
  if (b4) body += `<h2>Bloco 4 — Objetivos e Sonhos</h2>${b4}`;
  if (data.bloco4Comment) body += `<div class="note"><strong>Consultor:</strong> ${data.bloco4Comment}</div>`;

  // Bloco 5
  const b5 = [
    r('Já experimentou quedas', data.hasExperiencedDrops),
    r('Reação à queda', data.dropReaction),
    r('Reação hipotética', data.hypotheticalReaction),
    r('Queda máxima aceitável', data.maxAcceptableDrop),
    r('Preferência sob incerteza', data.uncertaintyPreference),
    r('Preferência de liquidez', data.liquidityPreference),
    r('Decisão impulsiva', data.impulseDecision),
    r('Detalhes impulsividade', data.impulseDetails),
  ].filter(Boolean).join('');
  if (b5) body += `<h2>Bloco 5 — Perfil de Risco</h2>${b5}`;
  if (data.bloco5Comment) body += `<div class="note"><strong>Consultor:</strong> ${data.bloco5Comment}</div>`;

  // Bloco 6
  const b6 = [
    r('Plano sucessório', data.hasSuccessionPlan),
    r('Estrutura jurídica', data.hasLegalStructure),
    r('Detalhes estrutura', data.legalStructureDetails),
    r('Protegido', data.isProtected),
    r('Seguro de vida', data.hasLifeInsuranceB6),
    r('Ativos internacionais', data.hasInternationalAssets),
    data.hasInternationalAssets === 'Sim' ? [r('Detalhes', data.internationalDetails), r('Valor', fmtC(data.internationalValue))].join('') : '',
  ].filter(Boolean).join('');
  if (b6) body += `<h2>Bloco 6 — Proteção e Sucessão</h2>${b6}`;
  if (data.bloco6Comment) body += `<div class="note"><strong>Consultor:</strong> ${data.bloco6Comment}</div>`;

  // Bloco 7
  const b7 = [
    r('Histórico de investimento', data.hasInvestmentHistory),
    r('Tempo de experiência', data.investmentDuration),
    r('Tipos de ativos', data.assetTypes),
    r('Trabalhou com assessor', data.hasWorkedWithAdvisor),
    r('Experiência com assessor', data.advisorExperience),
    r('Preferência de gestão', data.managementPreference),
    r('Frequência de acompanhamento', data.followUpFrequency),
    r('Critério de sucesso', data.successCriteria),
  ].filter(Boolean).join('');
  if (b7) body += `<h2>Bloco 7 — Histórico e Expectativas</h2>${b7}`;
  if (data.bloco7Comment) body += `<div class="note"><strong>Consultor:</strong> ${data.bloco7Comment}</div>`;

  // Bloco 8
  const b8 = [
    r('Prioridade estratégica', data.strategicPriority),
    r('Nível de complexidade', data.complexityLevel),
    r('Riscos identificados', data.identifiedRisks),
    r('Objetivo da carteira', data.portfolioObjective),
    r('Risco recomendado', data.recommendedRisk),
    r('Liquidez mínima', data.minLiquidityPct ? `${data.minLiquidityPct}%` : ''),
    r('Justificativa liquidez', data.minLiquidityJustification),
    r('Renda Fixa', data.rendaFixaPct ? `${data.rendaFixaPct}%` : ''),
    r('Renda Variável', data.rendaVariavelPct ? `${data.rendaVariavelPct}%` : ''),
    r('Renda Passiva', data.rendaPassivaPct ? `${data.rendaPassivaPct}%` : ''),
    r('Internacional', data.internacionalPct ? `${data.internacionalPct}%` : ''),
    r('Alternativos', data.alternativosPct ? `${data.alternativosPct}%` : ''),
    r('Caixa', data.caixaPct ? `${data.caixaPct}%` : ''),
    r('Eficiência tributária', data.taxEfficiency),
    r('Notas tributárias', data.taxEfficiencyNotes),
    r('Regra de rebalanceamento', data.rebalancingRule),
    r('Estrutura recomendada', data.recommendedStructure),
  ].filter(Boolean).join('');
  if (b8) body += `<h2>Bloco 8 — Arquitetura Estratégica</h2>${b8}`;
  if (data.strategicPillars.length > 0) {
    body += `<p>${data.strategicPillars.map(p => `<span class="badge" style="background:#ede9fe;color:#6366f1;margin-right:6px;">${p.name}</span>`).join('')}</p>`;
  }
  if (data.bloco8Comment) body += `<div class="note"><strong>Consultor:</strong> ${data.bloco8Comment}</div>`;

  body += `<div class="footer">FinHub CRM — Gerado em ${today()}</div>`;
  downloadHtml(wrapHtml('Conhecer o Cliente', body), `conhecer-cliente-${clientName || data.fullName || 'cliente'}.html`);
}
