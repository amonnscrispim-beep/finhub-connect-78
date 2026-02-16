import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Copy, Check, Download, FileText, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PortfolioAsset } from '@/hooks/useClientPortfolio';
import { Client } from '@/types/client';

interface Props {
  client: Client;
  assets: PortfolioAsset[];
  consultantObservation: string;
  onObservationChange: (v: string) => void;
  onObservationBlur: () => void;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR');
};

export function RelatorioAutomatizado({ client, assets, consultantObservation, onObservationChange, onObservationBlur }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Derived data
  const assetsWithValue = useMemo(() => assets.filter(a => a.current_price != null && a.current_price > 0), [assets]);
  const totalValue = useMemo(() => assetsWithValue.reduce((s, a) => s + (a.current_price ?? 0), 0), [assetsWithValue]);
  const hasData = assetsWithValue.length > 0 && totalValue > 0;

  // Patrimony from master module
  const financialAssets = client.financialAssets || 0;
  const materialAssets = client.materialAssets || 0;
  const businessAssets = (client as any).businessAssets || 0;
  const totalPatrimony = financialAssets + materialAssets + businessAssets;
  const monthlyLivingCost = (client as any).monthlyLivingCost || 0;

  // Liquidity analysis
  const liquidityAnalysis = useMemo(() => {
    if (!hasData) return null;
    const d0 = assetsWithValue.filter(a => a.liquidity_days != null && a.liquidity_days === 0);
    const d30 = assetsWithValue.filter(a => a.liquidity_days != null && a.liquidity_days > 0 && a.liquidity_days <= 30);
    const above30 = assetsWithValue.filter(a => a.liquidity_days != null && a.liquidity_days > 30);
    const noLiq = assetsWithValue.filter(a => a.liquidity_days == null);

    const d0Val = d0.reduce((s, a) => s + (a.current_price ?? 0), 0);
    const d30Val = d30.reduce((s, a) => s + (a.current_price ?? 0), 0);
    const above30Val = above30.reduce((s, a) => s + (a.current_price ?? 0), 0);

    const liquidityMonths = monthlyLivingCost > 0 ? (d0Val + d30Val) / monthlyLivingCost : null;

    return {
      d0: { count: d0.length, value: d0Val, pct: (d0Val / totalValue) * 100 },
      d30: { count: d30.length, value: d30Val, pct: (d30Val / totalValue) * 100 },
      above30: { count: above30.length, value: above30Val, pct: (above30Val / totalValue) * 100 },
      noLiq: noLiq.length,
      liquidityMonths,
    };
  }, [assetsWithValue, totalValue, hasData, monthlyLivingCost]);

  // Maturity analysis
  const maturityAnalysis = useMemo(() => {
    if (!hasData) return null;
    const now = new Date();
    const in3m = new Date(now); in3m.setMonth(in3m.getMonth() + 3);
    const in6m = new Date(now); in6m.setMonth(in6m.getMonth() + 6);
    const in12m = new Date(now); in12m.setMonth(in12m.getMonth() + 12);

    const withMat = assetsWithValue
      .filter(a => a.maturity_date)
      .map(a => ({ ...a, matDate: new Date(a.maturity_date + 'T00:00:00') }))
      .filter(a => a.matDate >= now)
      .sort((a, b) => a.matDate.getTime() - b.matDate.getTime());

    const within3m = withMat.filter(a => a.matDate <= in3m);
    const threeTo6m = withMat.filter(a => a.matDate > in3m && a.matDate <= in6m);
    const sixTo12m = withMat.filter(a => a.matDate > in6m && a.matDate <= in12m);

    return { within3m, threeTo6m, sixTo12m, total: withMat.length };
  }, [assetsWithValue, hasData]);

  // Distribution by asset class
  const classDistribution = useMemo(() => {
    if (!hasData) return [];
    const map: Record<string, number> = {};
    assetsWithValue.forEach(a => {
      map[a.asset_class] = (map[a.asset_class] || 0) + (a.current_price ?? 0);
    });
    return Object.entries(map)
      .map(([cls, val]) => ({ cls, val, pct: (val / totalValue) * 100 }))
      .sort((a, b) => b.val - a.val);
  }, [assetsWithValue, totalValue, hasData]);

  // Concentration (top 3 assets)
  const top3Assets = useMemo(() => {
    return [...assetsWithValue]
      .sort((a, b) => (b.current_price ?? 0) - (a.current_price ?? 0))
      .slice(0, 3)
      .map(a => ({ ticker: a.ticker || a.name, value: a.current_price ?? 0, pct: ((a.current_price ?? 0) / totalValue) * 100 }));
  }, [assetsWithValue, totalValue]);

  // Alerts / pendencies
  const alerts = useMemo(() => {
    const list: string[] = [];
    if (!hasData) {
      list.push('Nenhum ativo com valor atual preenchido na Carteira.');
      return list;
    }
    if (liquidityAnalysis?.noLiq && liquidityAnalysis.noLiq > 0) {
      list.push(`${liquidityAnalysis.noLiq} ativo(s) sem informação de liquidez (D+X).`);
    }
    if (liquidityAnalysis?.liquidityMonths == null && monthlyLivingCost === 0) {
      list.push('Custo de vida mensal não preenchido — não é possível calcular liquidez em meses.');
    }
    const noMatCount = assetsWithValue.filter(a => !a.maturity_date).length;
    if (noMatCount > 0) {
      list.push(`${noMatCount} ativo(s) sem data de vencimento preenchida.`);
    }
    if (top3Assets.length > 0 && top3Assets[0].pct > 30) {
      list.push(`Alta concentração: ${top3Assets[0].ticker} representa ${fmtPct(top3Assets[0].pct)} da carteira.`);
    }
    return list;
  }, [hasData, liquidityAnalysis, assetsWithValue, monthlyLivingCost, top3Assets]);

  // Technical report
  const technicalReport = useMemo(() => {
    const lines: string[] = [];
    lines.push('RELATÓRIO AUTOMATIZADO DE CONSULTORIA');
    lines.push(`Cliente: ${client.name}`);
    lines.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
    lines.push(`Perfil: ${client.investorProfile}`);
    lines.push('═'.repeat(50));
    lines.push('');

    // 1. Visão Geral Patrimonial
    lines.push('1. VISÃO GERAL PATRIMONIAL');
    lines.push('─'.repeat(40));
    if (totalPatrimony > 0) {
      lines.push(`Patrimônio Total: R$ ${fmt(totalPatrimony)}`);
      if (financialAssets > 0) lines.push(`  Ativos Financeiros: R$ ${fmt(financialAssets)}`);
      if (materialAssets > 0) lines.push(`  Bens Materiais: R$ ${fmt(materialAssets)}`);
      if (businessAssets > 0) lines.push(`  Patrimônio Empresarial: R$ ${fmt(businessAssets)}`);
    }
    lines.push(`Valor Total da Carteira (ativos): R$ ${fmt(totalValue)}`);
    lines.push(`Total de ativos na carteira: ${assetsWithValue.length}`);
    lines.push('');

    // 2. Liquidez
    lines.push('2. LIQUIDEZ');
    lines.push('─'.repeat(40));
    if (liquidityAnalysis) {
      lines.push(`• D+0 (imediata): ${fmtPct(liquidityAnalysis.d0.pct)} — R$ ${fmt(liquidityAnalysis.d0.value)} (${liquidityAnalysis.d0.count} ativos)`);
      lines.push(`• D+1 a D+30: ${fmtPct(liquidityAnalysis.d30.pct)} — R$ ${fmt(liquidityAnalysis.d30.value)} (${liquidityAnalysis.d30.count} ativos)`);
      lines.push(`• Acima de D+30: ${fmtPct(liquidityAnalysis.above30.pct)} — R$ ${fmt(liquidityAnalysis.above30.value)} (${liquidityAnalysis.above30.count} ativos)`);
      if (liquidityAnalysis.liquidityMonths != null) {
        lines.push(`• Liquidez em meses (D+0 a D+30 / custo mensal): ${liquidityAnalysis.liquidityMonths.toFixed(1)} meses`);
      }
    } else {
      lines.push('Dados de liquidez indisponíveis.');
    }
    lines.push('');

    // 3. Vencimentos
    lines.push('3. VENCIMENTOS');
    lines.push('─'.repeat(40));
    if (maturityAnalysis) {
      const renderBucket = (label: string, items: typeof maturityAnalysis.within3m) => {
        if (items.length === 0) return;
        const total = items.reduce((s, a) => s + (a.current_price ?? 0), 0);
        lines.push(`► ${label}: ${items.length} ativo(s) | R$ ${fmt(total)}`);
        items.forEach(a => {
          lines.push(`  • ${a.ticker || a.name} | Venc: ${fmtDate(a.maturity_date!)} | R$ ${fmt(a.current_price ?? 0)}`);
        });
      };
      renderBucket('Próximos 3 meses', maturityAnalysis.within3m);
      renderBucket('3 a 6 meses', maturityAnalysis.threeTo6m);
      renderBucket('6 a 12 meses', maturityAnalysis.sixTo12m);
      if (maturityAnalysis.total === 0) lines.push('Nenhum ativo com vencimento identificado.');
    }
    lines.push('');

    // 4. Distribuição por classe
    lines.push('4. DISTRIBUIÇÃO POR CLASSE DE ATIVO');
    lines.push('─'.repeat(40));
    classDistribution.forEach(({ cls, val, pct }) => {
      lines.push(`• ${cls}: ${fmtPct(pct)} — R$ ${fmt(val)}`);
    });
    lines.push('');

    // 5. Concentração
    lines.push('5. CONCENTRAÇÃO');
    lines.push('─'.repeat(40));
    lines.push('Top 3 ativos:');
    top3Assets.forEach(({ ticker, value, pct }, i) => {
      lines.push(`  ${i + 1}. ${ticker}: R$ ${fmt(value)} (${fmtPct(pct)})`);
    });
    lines.push('');

    // 6. Diagnóstico e recomendações
    lines.push('6. DIAGNÓSTICO TÉCNICO E RECOMENDAÇÕES');
    lines.push('─'.repeat(40));
    const diag: string[] = [];
    if (liquidityAnalysis) {
      if (liquidityAnalysis.d0.pct + liquidityAnalysis.d30.pct < 10) {
        diag.push('Liquidez de curto prazo (D+0 a D+30) abaixo de 10% da carteira, o que pode representar risco em situações emergenciais.');
      }
      if (liquidityAnalysis.liquidityMonths != null && liquidityAnalysis.liquidityMonths < 6) {
        diag.push(`Liquidez cobre apenas ${liquidityAnalysis.liquidityMonths.toFixed(1)} meses de custo de vida, abaixo do recomendado (6 meses).`);
      }
    }
    if (top3Assets.length > 0 && top3Assets[0].pct > 25) {
      diag.push(`Concentração elevada: ${top3Assets[0].ticker} representa ${fmtPct(top3Assets[0].pct)} da carteira. Recomenda-se diversificação.`);
    }
    if (diag.length === 0) diag.push('Carteira apresenta estrutura equilibrada considerando os dados disponíveis.');
    diag.forEach(d => lines.push(`• ${d}`));
    lines.push('');

    // Alerts
    if (alerts.length > 0) {
      lines.push('PENDÊNCIAS');
      lines.push('─'.repeat(40));
      alerts.forEach(a => lines.push(`⚠ ${a}`));
      lines.push('');
    }

    if (consultantObservation) {
      lines.push('OBSERVAÇÕES DO CONSULTOR');
      lines.push('─'.repeat(40));
      lines.push(consultantObservation);
    }

    return lines.join('\n');
  }, [client, totalPatrimony, financialAssets, materialAssets, businessAssets, totalValue, assetsWithValue, liquidityAnalysis, maturityAnalysis, classDistribution, top3Assets, alerts, consultantObservation]);

  // Commercial report
  const commercialReport = useMemo(() => {
    if (!hasData) return '';
    const parts: string[] = [];
    parts.push(`Olá, ${client.name.split(' ')[0]}! Segue um resumo da sua carteira:\n`);

    parts.push(`💰 *Carteira total:* R$ ${fmt(totalValue)} (${assetsWithValue.length} ativos)`);

    if (liquidityAnalysis) {
      const liqImediata = liquidityAnalysis.d0.value + liquidityAnalysis.d30.value;
      parts.push(`📊 *Liquidez rápida (até D+30):* R$ ${fmt(liqImediata)} (${fmtPct((liqImediata / totalValue) * 100)})`);
      if (liquidityAnalysis.liquidityMonths != null) {
        parts.push(`⏱ *Cobertura:* ${liquidityAnalysis.liquidityMonths.toFixed(1)} meses de custo de vida`);
      }
    }

    if (maturityAnalysis && maturityAnalysis.within3m.length > 0) {
      const total3m = maturityAnalysis.within3m.reduce((s, a) => s + (a.current_price ?? 0), 0);
      parts.push(`\n📅 *Vencimentos nos próximos 3 meses:* ${maturityAnalysis.within3m.length} ativo(s) — R$ ${fmt(total3m)}`);
    }

    if (classDistribution.length > 0) {
      parts.push(`\n📈 *Principal alocação:* ${classDistribution[0].cls} (${fmtPct(classDistribution[0].pct)})`);
    }

    if (top3Assets.length > 0 && top3Assets[0].pct > 25) {
      parts.push(`\n⚠️ *Atenção:* ${top3Assets[0].ticker} concentra ${fmtPct(top3Assets[0].pct)} da carteira.`);
    }

    parts.push('\n📌 *Próximo passo:* Agendar reunião para revisão estratégica da carteira.');

    return parts.join('\n');
  }, [hasData, client, totalValue, assetsWithValue, liquidityAnalysis, maturityAnalysis, classDistribution, top3Assets]);

  // PDF generation
  const handleGeneratePdf = useCallback(() => {
    const content = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório - ${client.name}</title>
<style>
  @media print { body { margin: 0; } }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
  .cover { text-align: center; padding: 120px 0; page-break-after: always; }
  .cover h1 { font-size: 28px; margin-bottom: 8px; }
  .cover .subtitle { font-size: 16px; color: #666; margin-bottom: 40px; }
  .cover .date { font-size: 14px; color: #999; }
  .toc { page-break-after: always; }
  .toc h2 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { padding: 6px 0; border-bottom: 1px dotted #ccc; }
  h2 { font-size: 18px; color: #222; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px; }
  .metric { display: inline-block; background: #f5f5f5; border-radius: 6px; padding: 12px 16px; margin: 4px; min-width: 140px; }
  .metric .label { font-size: 11px; color: #888; text-transform: uppercase; }
  .metric .value { font-size: 16px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #f0f0f0; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  .alert { background: #fff3e0; border-left: 4px solid #ff9800; padding: 8px 12px; margin: 8px 0; font-size: 13px; }
  .section { margin-bottom: 24px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
</style>
</head>
<body>
<div class="cover">
  <h1>Relatório de Consultoria</h1>
  <p class="subtitle">${client.name}</p>
  <p class="date">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
</div>
<div class="toc">
  <h2>Sumário</h2>
  <ul>
    <li>1. Visão Geral Patrimonial</li>
    <li>2. Liquidez</li>
    <li>3. Vencimentos</li>
    <li>4. Distribuição por Classe de Ativo</li>
    <li>5. Concentração</li>
    <li>6. Diagnóstico Técnico e Recomendações</li>
    ${alerts.length > 0 ? '<li>Pendências</li>' : ''}
    ${consultantObservation ? '<li>Observações do Consultor</li>' : ''}
  </ul>
</div>
<div class="section">
<pre>${technicalReport}</pre>
</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }, [client, technicalReport, alerts, consultantObservation]);

  if (!client) return null;

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleCopy(text, field)}>
      {copiedField === field ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copiedField === field ? 'Copiado' : 'Copiar'}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-foreground text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Relatório Automatizado
        </h4>
        <Button onClick={handleGeneratePdf} disabled={!hasData} className="gap-2">
          <Download className="w-4 h-4" />
          Gerar PDF
        </Button>
      </div>

      {!hasData && (
        <div className="bg-muted/50 border border-border rounded-lg p-6 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm">Nenhum ativo com valor atual preenchido na Carteira.</p>
          <p className="text-xs mt-1">Preencha os ativos no módulo Carteira para gerar o relatório automaticamente.</p>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && hasData && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Pendências</p>
          {alerts.map((a, i) => (
            <div key={i} className="bg-destructive/10 text-destructive text-xs p-2 rounded flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {a}
            </div>
          ))}
        </div>
      )}

      {hasData && (
        <>
          {/* Relatório Técnico */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="w-4 h-4" /> Relatório Técnico
              </Label>
              <CopyButton text={technicalReport} field="tech" />
            </div>
            <div className="bg-muted/30 border border-border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{technicalReport}</pre>
            </div>
          </div>

          {/* Resumo Comercial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <MessageSquare className="w-4 h-4" /> Resumo Comercial (WhatsApp)
              </Label>
              <CopyButton text={commercialReport} field="commercial" />
            </div>
            <div className="bg-muted/30 border border-border rounded-lg p-4 max-h-[250px] overflow-y-auto">
              <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{commercialReport}</pre>
            </div>
          </div>
        </>
      )}

      {/* Observações do Consultor */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Observações do Consultor</Label>
        <Textarea
          value={consultantObservation}
          onChange={e => onObservationChange(e.target.value)}
          onBlur={onObservationBlur}
          placeholder="Insira suas observações estratégicas aqui..."
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}
