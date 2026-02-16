import { useMemo, useState } from 'react';
import { Copy, Check, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { FluxoCaixaData } from './FluxoCaixaAccumulacao';
import type { EstruturaPatrimonialData } from './EstruturaPatrimonial';
import type { DirecionamentoEstrategicoData } from './DirecionamentoEstrategico';

interface ResumoFinanceiroProps {
  // Direct fields from Situação Financeira
  financialAssets: number;
  materialAssets: number;
  businessAssets: number;
  emergencyReserve: number;
  monthlyLivingCost: number | null;
  monthlyRevenue: number;
  monthlyContribution: number;
  passiveIncome: number;
  investorProfile: string;
  financialInstitutions: string;
  successionPlanning: string;
  organizedFinances: string;
  // Data from "Conhecer o Cliente"
  fluxoCaixa: FluxoCaixaData;
  estruturaPatrimonial: EstruturaPatrimonialData;
  direcionamentoEstrategico: DirecionamentoEstrategicoData;
  // Consultant note
  consultantNote: string;
  onConsultantNoteChange: (value: string) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function ResumoFinanceiroAutomatico({
  financialAssets,
  materialAssets,
  businessAssets,
  emergencyReserve,
  monthlyLivingCost,
  monthlyRevenue,
  monthlyContribution,
  passiveIncome,
  investorProfile,
  financialInstitutions,
  successionPlanning,
  organizedFinances,
  fluxoCaixa,
  estruturaPatrimonial,
  direcionamentoEstrategico,
  consultantNote,
  onConsultantNoteChange,
}: ResumoFinanceiroProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // Use "Conhecer o Cliente" as primary source when available, fallback to direct fields
  const effectiveRevenue = parseFloat(fluxoCaixa.monthlyRevenue) || monthlyRevenue;
  const effectiveContribution = parseFloat(fluxoCaixa.monthlyInvestment) || monthlyContribution;
  const effectiveLivingCost = parseFloat(fluxoCaixa.livingCost) || monthlyLivingCost || 0;
  const effectiveInstitutions = financialInstitutions;

  // Calculated values
  const totalPatrimony = financialAssets + materialAssets + businessAssets;
  const liquidity = effectiveLivingCost > 0 ? emergencyReserve / effectiveLivingCost : null;
  const annualRevenue = effectiveRevenue * 12;
  const annualSavings = effectiveContribution * 12;
  const savingsRate = annualRevenue > 0 ? (annualSavings / annualRevenue) * 100 : null;

  // Auto-generated summary
  const resumo = useMemo(() => {
    const lines: string[] = [];

    if (totalPatrimony > 0) {
      lines.push(`Patrimônio total estimado: ${fmt(totalPatrimony)}.`);
      const parts: string[] = [];
      if (financialAssets > 0) parts.push(`financeiro ${fmt(financialAssets)}`);
      if (materialAssets > 0) parts.push(`material/imobilizado ${fmt(materialAssets)}`);
      if (businessAssets > 0) parts.push(`empresarial ${fmt(businessAssets)}`);
      if (parts.length > 0) lines.push(`Composição: ${parts.join(', ')}.`);
    }

    if (effectiveRevenue > 0) {
      lines.push(`Faturamento mensal: ${fmt(effectiveRevenue)}.`);
    }

    if (effectiveContribution > 0) {
      lines.push(`Aporte mensal: ${fmt(effectiveContribution)}.`);
    }

    if (savingsRate !== null) {
      lines.push(`Taxa de poupança anual: ${savingsRate.toFixed(1)}%.`);
    }

    if (emergencyReserve > 0) {
      lines.push(`Reserva de emergência: ${fmt(emergencyReserve)}.`);
      if (liquidity !== null) {
        lines.push(`Liquidez: ${liquidity.toFixed(1)} meses de custo de vida cobertos.`);
      }
    }

    if (passiveIncome > 0) {
      lines.push(`Renda passiva atual estimada: ${fmt(passiveIncome)}.`);
    }

    if (investorProfile) {
      lines.push(`Perfil de investidor: ${investorProfile}.`);
    }

    if (effectiveInstitutions) {
      lines.push(`Instituições financeiras: ${effectiveInstitutions}.`);
    }

    if (organizedFinances) {
      lines.push(`Finanças organizadas: ${organizedFinances}.`);
    }

    if (successionPlanning) {
      lines.push(`Planejamento sucessório: ${successionPlanning}.`);
    }

    // Data from Conhecer o Cliente
    if (direcionamentoEstrategico.strategicPriority) {
      lines.push(`Prioridade estratégica: ${direcionamentoEstrategico.strategicPriority}.`);
    }

    if (direcionamentoEstrategico.executiveSummary) {
      lines.push(`\nSíntese do consultor: ${direcionamentoEstrategico.executiveSummary}`);
    }

    return lines.length > 0 ? lines.join('\n') : 'Preencha os dados do cliente para gerar o resumo automático.';
  }, [totalPatrimony, financialAssets, materialAssets, businessAssets, effectiveRevenue, effectiveContribution, savingsRate, emergencyReserve, liquidity, passiveIncome, investorProfile, effectiveInstitutions, organizedFinances, successionPlanning, direcionamentoEstrategico]);

  // Alerts
  const pontosAtencao = useMemo(() => {
    const alerts: string[] = [];

    if (!effectiveLivingCost || effectiveLivingCost === 0) {
      alerts.push('⚠️ Sem custo mensal preenchido — não é possível calcular liquidez.');
    }

    if (!effectiveRevenue || effectiveRevenue === 0) {
      alerts.push('⚠️ Sem renda mensal preenchida — não é possível calcular taxa de poupança.');
    }

    if (emergencyReserve <= 0) {
      alerts.push('⚠️ Reserva de emergência não preenchida.');
    }

    if (liquidity !== null && liquidity < 6) {
      alerts.push(`⚠️ Reserva abaixo de 6 meses (${liquidity.toFixed(1)} meses).`);
    }

    if (savingsRate !== null && savingsRate < 10) {
      alerts.push(`⚠️ Taxa de poupança baixa (${savingsRate.toFixed(1)}%).`);
    }

    if (totalPatrimony > 0 && businessAssets / totalPatrimony > 0.5) {
      alerts.push('⚠️ Patrimônio muito concentrado em empresa.');
    }

    if (totalPatrimony > 0 && financialAssets / totalPatrimony < 0.1) {
      alerts.push('⚠️ Patrimônio financeiro abaixo de 10% do total.');
    }

    if (!investorProfile) {
      alerts.push('⚠️ Perfil de investidor não definido.');
    }

    return alerts.length > 0 ? alerts.join('\n') : 'Nenhum ponto de atenção identificado.';
  }, [effectiveLivingCost, effectiveRevenue, emergencyReserve, liquidity, savingsRate, totalPatrimony, businessAssets, financialAssets, investorProfile]);

  // Next steps
  const proximosPassos = useMemo(() => {
    const steps: string[] = [];

    if (emergencyReserve <= 0 || (liquidity !== null && liquidity < 6)) {
      steps.push('→ Estruturar ou reforçar reserva de emergência.');
    }

    if (savingsRate !== null && savingsRate < 10) {
      steps.push('→ Revisar fluxo de caixa para aumentar capacidade de aporte.');
    }

    if (totalPatrimony > 0 && businessAssets / totalPatrimony > 0.5) {
      steps.push('→ Avaliar estratégia de diversificação patrimonial.');
    }

    if (!successionPlanning || successionPlanning === 'Não') {
      steps.push('→ Iniciar planejamento sucessório.');
    }

    if (passiveIncome <= 0 && totalPatrimony > 100000) {
      steps.push('→ Explorar fontes de renda passiva.');
    }

    if (organizedFinances === 'Não') {
      steps.push('→ Organizar finanças pessoais antes de avançar com alocação.');
    }

    if (steps.length === 0) {
      steps.push('→ Prosseguir com a construção da arquitetura estratégica da carteira.');
    }

    return steps.join('\n');
  }, [emergencyReserve, liquidity, savingsRate, totalPatrimony, businessAssets, successionPlanning, passiveIncome, organizedFinances]);

  const handleCopy = (text: string, field: string) => {
    const fullText = `📊 RESUMO FINANCEIRO\n\n${resumo}\n\n⚠️ PONTOS DE ATENÇÃO\n\n${pontosAtencao}\n\n➡️ PRÓXIMOS PASSOS\n\n${proximosPassos}${consultantNote ? `\n\n📝 NOTA DO CONSULTOR\n\n${consultantNote}` : ''}`;
    navigator.clipboard.writeText(fullText);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-primary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Resumo Financeiro Automático
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleCopy('all', 'all')}
          className="gap-2 text-xs"
        >
          {copied === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied === 'all' ? 'Copiado!' : 'Copiar tudo'}
        </Button>
      </div>

      {/* Resumo financeiro (auto) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Resumo financeiro (auto)</Label>
        <div className="p-3 bg-background rounded-md border border-border text-sm whitespace-pre-line leading-relaxed min-h-[80px]">
          {resumo}
        </div>
      </div>

      {/* Pontos de atenção (auto) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          Pontos de atenção (auto)
        </Label>
        <div className="p-3 bg-background rounded-md border border-border text-sm whitespace-pre-line leading-relaxed min-h-[40px]">
          {pontosAtencao}
        </div>
      </div>

      {/* Próximos passos (auto) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Próximos passos (auto)</Label>
        <div className="p-3 bg-background rounded-md border border-border text-sm whitespace-pre-line leading-relaxed min-h-[40px]">
          {proximosPassos}
        </div>
      </div>

      {/* Nota do consultor (editável) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Nota do consultor</Label>
        <Textarea
          value={consultantNote}
          onChange={(e) => onConsultantNoteChange(e.target.value)}
          placeholder="Adicione observações, contexto adicional ou ajustes ao resumo automático..."
          className="crm-input min-h-[80px] text-sm"
        />
      </div>

      {/* Calculated KPIs read-only */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">Patrimônio Total</p>
          <p className="text-sm font-bold text-foreground">{totalPatrimony > 0 ? fmt(totalPatrimony) : 'Sem dados'}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">Liquidez (meses)</p>
          <p className={`text-sm font-bold ${liquidity !== null ? (liquidity < 3 ? 'text-red-500' : liquidity <= 6 ? 'text-yellow-500' : 'text-green-500') : 'text-muted-foreground'}`}>
            {liquidity !== null ? `${liquidity.toFixed(1)} meses` : 'Sem dados'}
          </p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">Taxa de Poupança</p>
          <p className={`text-sm font-bold ${savingsRate !== null ? (savingsRate < 10 ? 'text-red-500' : savingsRate <= 25 ? 'text-yellow-500' : 'text-green-500') : 'text-muted-foreground'}`}>
            {savingsRate !== null ? `${savingsRate.toFixed(1)}%` : 'Sem dados'}
          </p>
        </div>
      </div>
    </div>
  );
}
