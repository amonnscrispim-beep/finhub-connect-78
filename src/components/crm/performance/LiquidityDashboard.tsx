import { useMemo, useState } from 'react';
import { Copy, Check, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ConsolidatedSummary } from './types';
import { fmt, fmtPct, buildConsolidatedSummary } from './utils';
import { LiquidityChart } from './LiquidityChart';
import { BrokerCard } from './BrokerCard';
import { MaturityAgenda } from './MaturityAgenda';
import { StrategicAlerts } from './StrategicAlerts';
import { PerformanceSummaryModal, type PerformanceSnapshot } from './PerformanceSummaryModal';

interface LiquidityDashboardProps {
  clientName?: string;
  reports: {
    id: string;
    pdfFilename: string;
    broker: string;
    reportType: string;
    reportDate: string;
    status: string;
    extractedData: any;
    alerts: string[];
  }[];
}

export function LiquidityDashboard({ reports, clientName = '' }: LiquidityDashboardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const data = useMemo(() => buildConsolidatedSummary(reports), [reports]);

  const extractedCount = reports.filter(r => r.status === 'extracted').length;
  const failedCount = reports.filter(r => r.status === 'failed').length;

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const snapshot: PerformanceSnapshot = useMemo(() => ({
    clientName,
    totalGross: data.totalGross,
    totalNet: data.netCoverage.available > 0 ? data.totalNet : null,
    netCoverage: data.netCoverage,
    brokers: data.brokers.map(b => ({ broker: b.broker, totalGross: b.totalGross })),
    liquidityBands: data.liquidityBands.map(b => ({
      label: b.label, valueR$: b['valueR$'], pct: b.pct,
    })),
    alerts: data.alerts,
    reportsCount: extractedCount,
  }), [clientName, data, extractedCount]);

  const consolidatedText = useMemo(() => {
    const lines: string[] = [];
    lines.push('DASHBOARD DE LIQUIDEZ E VENCIMENTOS');
    lines.push('═'.repeat(50));
    lines.push('');
    lines.push(`Patrimônio Bruto: R$ ${fmt(data.totalGross)}`);
    if (data.netCoverage.available > 0) {
      lines.push(`Patrimônio Líquido: R$ ${fmt(data.totalNet)} (cobertura: ${data.netCoverage.available} de ${data.netCoverage.total} relatórios)`);
    } else {
      lines.push('Patrimônio Líquido: não informado nos relatórios');
    }
    lines.push(`Relatórios: ${extractedCount} extraídos${failedCount > 0 ? `, ${failedCount} falhou(aram)` : ''}`);
    lines.push(`Corretoras: ${data.brokers.map(b => b.broker).join(', ')}`);
    lines.push('');
    lines.push('LIQUIDEZ CONSOLIDADA');
    lines.push('─'.repeat(40));
    data.liquidityBands.forEach(b => {
      lines.push(`${b.label}: R$ ${fmt(b['valueR$'])} (${b.pct.toFixed(1)}%)`);
    });
    lines.push('');
    data.brokers.forEach(bs => {
      lines.push(`\n▸ ${bs.broker}: R$ ${fmt(bs.totalGross)}`);
      bs.liquidityBands.filter(b => b['valueR$'] > 0).forEach(b => {
        lines.push(`  ${b.label}: R$ ${fmt(b['valueR$'])} (${b.pct.toFixed(1)}%)`);
      });
    });
    if (data.alerts.length > 0) {
      lines.push('\nALERTAS:');
      data.alerts.forEach(a => lines.push(a));
    }
    return lines.join('\n');
  }, [data, extractedCount, failedCount]);

  if (data.totalGross === 0 && data.positions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Nenhum dado extraído disponível para o dashboard.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Failed reports warning */}
      {failedCount > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
          ⚠ {failedCount} relatório(s) falhou(aram) na extração e não estão incluídos no dashboard.
        </div>
      )}

      {/* ── Section 1: Consolidado Geral ── */}
      <div className="p-5 bg-card rounded-xl border border-border shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground text-lg">📊 Consolidado Geral</h3>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(consolidatedText, 'dash_copy')}>
              {copiedField === 'dash_copy' ? <Check className="w-4 h-4 text-primary mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              Copiar resumo
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSummaryOpen(true); }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={data.totalGross === 0}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Gerar Resumo do Relatório
            </Button>
          </div>
        </div>

        {/* Patrimônio cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground">Patrimônio Bruto Total</p>
            <p className="text-2xl font-bold text-foreground">R$ {fmt(data.totalGross)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{extractedCount} relatório(s)</p>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-muted-foreground">Patrimônio Líquido Total</p>
            {data.netCoverage.available > 0 ? (
              <>
                <p className="text-2xl font-bold text-foreground">R$ {fmt(data.totalNet)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Cobertura: {data.netCoverage.available} de {data.netCoverage.total} relatório(s)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Não informado nos relatórios</p>
            )}
          </div>
        </div>

        {/* Gross audit warning */}
        {data.grossAudit.diff > 0.01 && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
            ⚠ Diferença detectada: soma por corretora (R$ {fmt(data.grossAudit.sum)}) ≠ bruto consolidado (R$ {fmt(data.grossAudit.consolidated)}).
            {data.grossAudit.missingBrokers.length > 0 && (
              <> Relatórios possivelmente fora: {data.grossAudit.missingBrokers.join(', ')}.</>
            )}
          </div>
        )}

        {/* Liquidez Consolidada Table */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground text-sm">Liquidez Consolidada</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Faixa de Prazo</TableHead>
                  <TableHead className="text-right text-xs">Valor (R$)</TableHead>
                  <TableHead className="text-right text-xs">Percentual (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.liquidityBands.map(b => (
                  <TableRow key={b.key}>
                    <TableCell className="text-xs">{b.label}</TableCell>
                    <TableCell className="text-right text-xs font-medium">R$ {fmt(b['valueR$'])}</TableCell>
                    <TableCell className="text-right text-xs">{fmtPct(b.pct)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell className="text-xs">Total</TableCell>
                  <TableCell className="text-right text-xs">R$ {fmt(data.totalGross)}</TableCell>
                  <TableCell className="text-right text-xs">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Chart */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground text-sm">Liquidez Média Consolidada</h4>
          <LiquidityChart bands={data.liquidityBands} height={250} />
        </div>
      </div>

      {/* ── Section 2: Por Corretora ── */}
      {data.brokers.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-foreground text-lg">🏦 Por Corretora</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.brokers.map(bs => (
              <BrokerCard key={bs.broker} data={bs} />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 3: Vencimentos ── */}
      <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
        <MaturityAgenda data={data} />
      </div>

      {/* ── Section 4: Alertas ── */}
      <StrategicAlerts alerts={data.alerts} />
    </div>
  );
}
