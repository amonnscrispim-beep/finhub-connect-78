import { useState, useMemo } from 'react';
import { Copy, Check, AlertTriangle, FileText, Pencil, Lock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INVESTOR_PROFILES, ORGANIZED_FINANCES_OPTIONS } from '@/types/client';
import type { FluxoCaixaData } from './FluxoCaixaAccumulacao';
import type { EstruturaPatrimonialData } from './EstruturaPatrimonial';
import type { DirecionamentoEstrategicoData } from './DirecionamentoEstrategico';
import type { PerfilRiscoData } from './PerfilRisco';
import type { ProtecaoSucessaoData } from './ProtecaoSucessao';
import type { ObjetivosMetasData } from './ObjetivosMetas';
import type { StrategicDiagnosticData } from './DiagnosticoEstrategico';

export interface PainelFinanceiroOverrides {
  financialAssets: string;
  materialAssets: string;
  businessAssets: string;
  emergencyReserve: string;
  monthlyRevenue: string;
  monthlyContribution: string;
  monthlyLivingCost: string;
  passiveIncome: string;
  investorProfile: string;
  financialInstitutions: string;
  successionPlanning: string;
  organizedFinances: string;
}

interface Props {
  // Overrides (legacy/manual fields from formData)
  overrides: PainelFinanceiroOverrides;
  onOverrideChange: (field: keyof PainelFinanceiroOverrides, value: string) => void;
  // Conhecer o Cliente data sources
  fluxoCaixa: FluxoCaixaData;
  estruturaPatrimonial: EstruturaPatrimonialData;
  direcionamentoEstrategico: DirecionamentoEstrategicoData;
  perfilRisco: PerfilRiscoData;
  protecaoSucessao: ProtecaoSucessaoData;
  objetivosMetas: ObjetivosMetasData;
  strategicDiagnostic: StrategicDiagnosticData;
  // Consultant note
  consultantNote: string;
  onConsultantNoteChange: (value: string) => void;
  // Additional context
  clientName: string;
  age: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function ReadOnlyField({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="p-3 bg-muted/20 rounded-lg border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-medium ${alert ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
        {value || <span className="text-muted-foreground italic">Não preenchido</span>}
      </p>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

export function PainelFinanceiro({
  overrides,
  onOverrideChange,
  fluxoCaixa,
  estruturaPatrimonial,
  direcionamentoEstrategico,
  perfilRisco,
  protecaoSucessao,
  objetivosMetas,
  strategicDiagnostic,
  consultantNote,
  onConsultantNoteChange,
  clientName,
  age,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);

  // === DATA RESOLUTION: Conhecer o Cliente is primary, overrides are fallback ===
  const resolve = (conhecerValue: string | undefined, overrideValue: string): number => {
    const fromConhecer = parseFloat(conhecerValue || '') || 0;
    const fromOverride = parseFloat(overrideValue) || 0;
    return fromConhecer || fromOverride;
  };

  const financialAssets = resolve(estruturaPatrimonial.liquidFinancialAssets, overrides.financialAssets);
  const materialAssets = resolve(estruturaPatrimonial.realEstate, overrides.materialAssets);
  const businessAssets = resolve(estruturaPatrimonial.businessParticipations, overrides.businessAssets);
  const emergencyReserve = resolve(undefined, overrides.emergencyReserve); // only from override
  const monthlyRevenue = resolve(fluxoCaixa.monthlyRevenue, overrides.monthlyRevenue);
  const monthlyLivingCost = resolve(fluxoCaixa.livingCost, overrides.monthlyLivingCost);
  const monthlyContribution = resolve(fluxoCaixa.monthlyInvestment, overrides.monthlyContribution);
  const passiveIncome = resolve(undefined, overrides.passiveIncome);
  const investorProfile = perfilRisco.behavioralRisk || overrides.investorProfile || '';
  const financialInstitutions = overrides.financialInstitutions || '';
  const successionPlanning = protecaoSucessao.successionPlanning || overrides.successionPlanning || '';
  const organizedFinances = overrides.organizedFinances || '';

  // === CALCULATIONS ===
  const totalPatrimony = financialAssets + materialAssets + businessAssets;
  const liquidity = monthlyLivingCost > 0 ? emergencyReserve / monthlyLivingCost : null;
  const savingsRate = monthlyRevenue > 0 ? (monthlyContribution / monthlyRevenue) * 100 : null;
  const activeDependencyPct = parseFloat(estruturaPatrimonial.activeDependencyPercent) || null;

  const pctFin = totalPatrimony > 0 ? (financialAssets / totalPatrimony * 100) : 0;
  const pctMat = totalPatrimony > 0 ? (materialAssets / totalPatrimony * 100) : 0;
  const pctBiz = totalPatrimony > 0 ? (businessAssets / totalPatrimony * 100) : 0;

  // === ALERTS ===
  const alerts = useMemo(() => {
    const a: string[] = [];
    if (!monthlyLivingCost) a.push('Sem custo mensal preenchido — não é possível calcular liquidez.');
    if (!monthlyRevenue) a.push('Sem renda mensal preenchida — não é possível calcular taxa de poupança.');
    if (emergencyReserve <= 0) a.push('Reserva de emergência não preenchida.');
    if (liquidity !== null && liquidity < 6) a.push(`Reserva abaixo de 6 meses (${liquidity.toFixed(1)} meses).`);
    if (savingsRate !== null && savingsRate < 10) a.push(`Taxa de poupança baixa (${savingsRate.toFixed(1)}%).`);
    if (totalPatrimony > 0 && pctBiz > 50) a.push('Patrimônio muito concentrado em empresa.');
    if (totalPatrimony > 0 && pctFin < 10) a.push('Patrimônio financeiro abaixo de 10% do total.');
    if (!investorProfile) a.push('Perfil de investidor não definido.');
    if (activeDependencyPct !== null && activeDependencyPct > 70) a.push(`Alta dependência ativa (${activeDependencyPct}%).`);
    return a;
  }, [monthlyLivingCost, monthlyRevenue, emergencyReserve, liquidity, savingsRate, totalPatrimony, pctBiz, pctFin, investorProfile, activeDependencyPct]);

  // === NEXT STEPS ===
  const nextSteps = useMemo(() => {
    const s: string[] = [];
    if (emergencyReserve <= 0 || (liquidity !== null && liquidity < 6)) s.push('Estruturar ou reforçar reserva de emergência.');
    if (savingsRate !== null && savingsRate < 10) s.push('Revisar fluxo de caixa para aumentar capacidade de aporte.');
    if (totalPatrimony > 0 && pctBiz > 50) s.push('Avaliar estratégia de diversificação patrimonial.');
    if (!successionPlanning || successionPlanning === 'Não') s.push('Iniciar planejamento sucessório.');
    if (passiveIncome <= 0 && totalPatrimony > 100000) s.push('Explorar fontes de renda passiva.');
    if (organizedFinances === 'Não') s.push('Organizar finanças pessoais antes de avançar com alocação.');
    if (s.length === 0) s.push('Prosseguir com a construção da arquitetura estratégica da carteira.');
    return s;
  }, [emergencyReserve, liquidity, savingsRate, totalPatrimony, pctBiz, successionPlanning, passiveIncome, organizedFinances]);

  // === AUTO SUMMARY ===
  const autoSummary = useMemo(() => {
    const lines: string[] = [];
    if (clientName) lines.push(`Cliente: ${clientName}${age ? `, ${age} anos` : ''}.`);
    if (totalPatrimony > 0) {
      lines.push(`Patrimônio total estimado: ${fmt(totalPatrimony)}.`);
      const parts: string[] = [];
      if (financialAssets > 0) parts.push(`financeiro ${fmt(financialAssets)} (${pctFin.toFixed(0)}%)`);
      if (materialAssets > 0) parts.push(`material ${fmt(materialAssets)} (${pctMat.toFixed(0)}%)`);
      if (businessAssets > 0) parts.push(`empresarial ${fmt(businessAssets)} (${pctBiz.toFixed(0)}%)`);
      if (parts.length > 0) lines.push(`Composição: ${parts.join(', ')}.`);
    }
    if (monthlyRevenue > 0) lines.push(`Faturamento mensal: ${fmt(monthlyRevenue)}.`);
    if (monthlyContribution > 0) lines.push(`Aporte mensal: ${fmt(monthlyContribution)}.`);
    if (savingsRate !== null) lines.push(`Taxa de poupança: ${savingsRate.toFixed(1)}%.`);
    if (emergencyReserve > 0) {
      lines.push(`Reserva de emergência: ${fmt(emergencyReserve)}.`);
      if (liquidity !== null) lines.push(`Liquidez: ${liquidity.toFixed(1)} meses.`);
    }
    if (passiveIncome > 0) lines.push(`Renda passiva atual: ${fmt(passiveIncome)}.`);
    if (investorProfile) lines.push(`Perfil de investidor: ${investorProfile}.`);
    if (financialInstitutions) lines.push(`Instituições: ${financialInstitutions}.`);
    if (organizedFinances) lines.push(`Finanças organizadas: ${organizedFinances}.`);
    if (successionPlanning) lines.push(`Planejamento sucessório: ${successionPlanning}.`);
    if (activeDependencyPct !== null) lines.push(`Dependência ativa: ${activeDependencyPct}%.`);
    if (direcionamentoEstrategico.strategicPriority) lines.push(`Prioridade estratégica: ${direcionamentoEstrategico.strategicPriority}.`);
    if (direcionamentoEstrategico.executiveSummary) lines.push(`\nSíntese: ${direcionamentoEstrategico.executiveSummary}`);
    return lines.length > 1 ? lines.join('\n') : 'Preencha os dados em "Conhecer o Cliente" para gerar o resumo automático.';
  }, [clientName, age, totalPatrimony, financialAssets, materialAssets, businessAssets, pctFin, pctMat, pctBiz, monthlyRevenue, monthlyContribution, savingsRate, emergencyReserve, liquidity, passiveIncome, investorProfile, financialInstitutions, organizedFinances, successionPlanning, activeDependencyPct, direcionamentoEstrategico]);

  const handleCopyAll = () => {
    const text = `📊 RESUMO FINANCEIRO\n\n${autoSummary}\n\n⚠️ PONTOS DE ATENÇÃO\n\n${alerts.length > 0 ? alerts.map(a => `⚠️ ${a}`).join('\n') : 'Nenhum.'}\n\n➡️ PRÓXIMOS PASSOS\n\n${nextSteps.map(s => `→ ${s}`).join('\n')}${consultantNote ? `\n\n📝 NOTA DO CONSULTOR\n\n${consultantNote}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const liquidityColor = liquidity !== null ? (liquidity < 3 ? 'text-red-500' : liquidity <= 6 ? 'text-yellow-500' : 'text-green-500') : 'text-muted-foreground';
  const savingsColor = savingsRate !== null ? (savingsRate < 10 ? 'text-red-500' : savingsRate <= 25 ? 'text-yellow-500' : 'text-green-500') : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* === RESUMO AUTOMÁTICO === */}
      <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-primary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Resumo Automático do Módulo
          </h4>
          <Button type="button" variant="outline" size="sm" onClick={handleCopyAll} className="gap-2 text-xs">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar tudo'}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Resumo financeiro (auto)</Label>
          <div className="p-3 bg-background rounded-md border border-border text-sm whitespace-pre-line leading-relaxed min-h-[80px]">
            {autoSummary}
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              Pontos de atenção ({alerts.length})
            </Label>
            <div className="p-3 bg-background rounded-md border border-yellow-300/30 text-sm space-y-1">
              {alerts.map((a, i) => (
                <p key={i} className="text-yellow-700 dark:text-yellow-400">⚠️ {a}</p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Próximos passos (auto)</Label>
          <div className="p-3 bg-background rounded-md border border-border text-sm space-y-1">
            {nextSteps.map((s, i) => (
              <p key={i}>→ {s}</p>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Nota do consultor</Label>
          <Textarea
            value={consultantNote}
            onChange={(e) => onConsultantNoteChange(e.target.value)}
            placeholder="Adicione observações, contexto adicional ou ajustes..."
            className="crm-input min-h-[80px] text-sm"
          />
        </div>
      </div>

      {/* === KPIs AUTOMÁTICOS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Patrimônio Total" value={totalPatrimony > 0 ? fmt(totalPatrimony) : 'Sem dados'} />
        <KpiCard label="Liquidez (meses)" value={liquidity !== null ? `${liquidity.toFixed(1)} meses` : 'Sem dados'} color={liquidityColor} />
        <KpiCard label="Taxa de Poupança" value={savingsRate !== null ? `${savingsRate.toFixed(1)}%` : 'Sem dados'} color={savingsColor} />
        <KpiCard label="Dependência Ativa" value={activeDependencyPct !== null ? `${activeDependencyPct}%` : 'Sem dados'} color={activeDependencyPct !== null && activeDependencyPct > 70 ? 'text-red-500' : undefined} />
      </div>

      {/* === DISTRIBUIÇÃO PATRIMONIAL === */}
      {totalPatrimony > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Distribuição Patrimonial
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Financeiro</span>
              <span className="font-medium">{pctFin.toFixed(1)}% — {fmt(financialAssets)}</span>
            </div>
            <Progress value={pctFin} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span>Material / Imobilizado</span>
              <span className="font-medium">{pctMat.toFixed(1)}% — {fmt(materialAssets)}</span>
            </div>
            <Progress value={pctMat} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span>Empresarial</span>
              <span className="font-medium">{pctBiz.toFixed(1)}% — {fmt(businessAssets)}</span>
            </div>
            <Progress value={pctBiz} className="h-2" />
          </div>
        </div>
      )}

      {/* === DADOS CONSOLIDADOS (somente leitura) === */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            {editMode ? <Pencil className="w-4 h-4" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
            Dados Consolidados
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="text-xs gap-1.5"
          >
            {editMode ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                Bloquear edição
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                Editar manualmente
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {editMode
            ? 'Modo de edição manual ativo. As alterações aqui sobrescrevem os dados de "Conhecer o Cliente".'
            : 'Dados puxados automaticamente de "Conhecer o Cliente". Clique em "Editar manualmente" para ajustar.'}
        </p>

        {editMode ? (
          <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Patrimônio Financeiro</Label>
                <CurrencyInput value={overrides.financialAssets} onChange={(v) => onOverrideChange('financialAssets', v)} />
              </div>
              <div className="space-y-2">
                <Label>Patrimônio Material</Label>
                <CurrencyInput value={overrides.materialAssets} onChange={(v) => onOverrideChange('materialAssets', v)} />
              </div>
              <div className="space-y-2">
                <Label>Patrimônio Empresarial</Label>
                <CurrencyInput value={overrides.businessAssets} onChange={(v) => onOverrideChange('businessAssets', v)} />
              </div>
              <div className="space-y-2">
                <Label>Reserva de Emergência</Label>
                <CurrencyInput value={overrides.emergencyReserve} onChange={(v) => onOverrideChange('emergencyReserve', v)} />
              </div>
              <div className="space-y-2">
                <Label>Faturamento Mensal</Label>
                <CurrencyInput value={overrides.monthlyRevenue} onChange={(v) => onOverrideChange('monthlyRevenue', v)} />
              </div>
              <div className="space-y-2">
                <Label>Aporte Mensal</Label>
                <CurrencyInput value={overrides.monthlyContribution} onChange={(v) => onOverrideChange('monthlyContribution', v)} />
              </div>
              <div className="space-y-2">
                <Label>Custo Mensal da Família</Label>
                <CurrencyInput value={overrides.monthlyLivingCost} onChange={(v) => onOverrideChange('monthlyLivingCost', v)} />
              </div>
              <div className="space-y-2">
                <Label>Renda Passiva Atual</Label>
                <CurrencyInput value={overrides.passiveIncome} onChange={(v) => onOverrideChange('passiveIncome', v)} />
              </div>
              <div className="space-y-2">
                <Label>Perfil de Investidor</Label>
                <Select value={overrides.investorProfile} onValueChange={(v) => onOverrideChange('investorProfile', v)}>
                  <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
                  <SelectContent>{INVESTOR_PROFILES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Instituições Financeiras</Label>
              <Textarea value={overrides.financialInstitutions} onChange={(e) => onOverrideChange('financialInstitutions', e.target.value)} placeholder="Ex: Itaú, BTG, XP..." className="crm-input min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Planejamento Sucessório</Label>
                <Select value={overrides.successionPlanning} onValueChange={(v) => onOverrideChange('successionPlanning', v)}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Finanças organizadas?</Label>
                <Select value={overrides.organizedFinances} onValueChange={(v) => onOverrideChange('organizedFinances', v)}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{ORGANIZED_FINANCES_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ReadOnlyField label="Patrimônio Financeiro" value={financialAssets > 0 ? fmt(financialAssets) : ''} />
            <ReadOnlyField label="Patrimônio Material" value={materialAssets > 0 ? fmt(materialAssets) : ''} />
            <ReadOnlyField label="Patrimônio Empresarial" value={businessAssets > 0 ? fmt(businessAssets) : ''} />
            <ReadOnlyField label="Reserva de Emergência" value={emergencyReserve > 0 ? fmt(emergencyReserve) : ''} alert={emergencyReserve <= 0} />
            <ReadOnlyField label="Faturamento Mensal" value={monthlyRevenue > 0 ? fmt(monthlyRevenue) : ''} alert={!monthlyRevenue} />
            <ReadOnlyField label="Aporte Mensal" value={monthlyContribution > 0 ? fmt(monthlyContribution) : ''} />
            <ReadOnlyField label="Custo Mensal da Família" value={monthlyLivingCost > 0 ? fmt(monthlyLivingCost) : ''} alert={!monthlyLivingCost} />
            <ReadOnlyField label="Renda Passiva Atual" value={passiveIncome > 0 ? fmt(passiveIncome) : ''} />
            <ReadOnlyField label="Perfil de Investidor" value={investorProfile} alert={!investorProfile} />
            <ReadOnlyField label="Instituições Financeiras" value={financialInstitutions} />
            <ReadOnlyField label="Planejamento Sucessório" value={successionPlanning} />
            <ReadOnlyField label="Finanças Organizadas" value={organizedFinances} />
          </div>
        )}
      </div>
    </div>
  );
}
