import { useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Download, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';

interface Position {
  name: string;
  type: string;
  indexer: string;
  rate: string;
  maturityDate: string | null;
  grossBalance: number;
  portfolioPct: number;
}

interface LiquidityData {
  dPlus1?: number | null;
  upTo1Year?: number | null;
  oneToFiveYears?: number | null;
  aboveFiveYears?: number | null;
}

interface Props {
  grossPatrimony: number | null;
  liquidity: LiquidityData;
  positions: Position[];
  investorProfile?: string | null;
  consultantObservation: string;
  onObservationChange: (value: string) => void;
  onObservationBlur: () => void;
}

const fmt = (v: number | null | undefined) => {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export function RelatorioExecutivoLiquidez({
  grossPatrimony,
  liquidity: liq,
  positions,
  investorProfile,
  consultantObservation,
  onObservationChange,
  onObservationBlur,
}: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ overview: true });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const liqValue = (pct: number | null | undefined) => {
    if (pct == null || grossPatrimony == null) return null;
    return grossPatrimony * (pct / 100);
  };

  // Maturity analysis
  const maturityAnalysis = useMemo(() => {
    if (positions.length === 0) return null;

    const now = new Date();
    const in6m = new Date(now); in6m.setMonth(in6m.getMonth() + 6);
    const in12m = new Date(now); in12m.setMonth(in12m.getMonth() + 12);

    const withMat = positions
      .filter(p => p?.maturityDate && p?.grossBalance != null)
      .map(p => ({ ...p, matDate: new Date(p.maturityDate!) }))
      .filter(p => p.matDate >= now)
      .sort((a, b) => a.matDate.getTime() - b.matDate.getTime());

    const within6m = withMat.filter(p => p.matDate <= in6m);
    const sixTo12m = withMat.filter(p => p.matDate > in6m && p.matDate <= in12m);

    const byYear: Record<string, typeof withMat> = {};
    withMat.forEach(p => {
      const yr = p.matDate.getFullYear().toString();
      if (!byYear[yr]) byYear[yr] = [];
      byYear[yr].push(p);
    });

    // Concentration analysis
    const totalMaturing = withMat.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
    let maxYear = '';
    let maxYearTotal = 0;
    let maxYearCount = 0;
    Object.entries(byYear).forEach(([yr, items]) => {
      const yrTotal = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
      if (yrTotal > maxYearTotal) {
        maxYear = yr;
        maxYearTotal = yrTotal;
        maxYearCount = items.length;
      }
    });

    const maxYearPct = grossPatrimony && grossPatrimony > 0 ? (maxYearTotal / grossPatrimony) * 100 : 0;
    let concentrationLevel: string;
    if (maxYearPct > 40) concentrationLevel = 'Alta concentração de risco temporal';
    else if (maxYearPct > 25) concentrationLevel = 'Concentração moderada';
    else concentrationLevel = 'Estrutura equilibrada';

    return { within6m, sixTo12m, byYear, maxYear, maxYearTotal, maxYearCount, maxYearPct, concentrationLevel, totalMaturing };
  }, [positions, grossPatrimony]);

  // Generate technical report text
  const technicalReport = useMemo(() => {
    if (positions.length === 0) return '';
    const lines: string[] = [];
    lines.push('RELATÓRIO EXECUTIVO DE LIQUIDEZ E VENCIMENTOS');
    lines.push('═'.repeat(50));
    lines.push('');

    // 1. Visão Geral da Liquidez
    lines.push('1. VISÃO GERAL DA LIQUIDEZ');
    lines.push('─'.repeat(40));
    if (grossPatrimony != null) lines.push(`Patrimônio Bruto Total: R$ ${fmt(grossPatrimony)}`);
    lines.push('');

    const liqItems = [
      { label: 'Liquidez Imediata (D+1)', pct: liq.dPlus1 },
      { label: 'Até 1 ano', pct: liq.upTo1Year },
      { label: 'Entre 1 e 5 anos', pct: liq.oneToFiveYears },
      { label: 'Acima de 5 anos', pct: liq.aboveFiveYears },
    ];
    liqItems.forEach(({ label, pct }) => {
      if (pct != null) {
        const val = liqValue(pct);
        lines.push(`• ${label}: ${fmtPct(pct)}${val != null ? ` (R$ ${fmt(val)})` : ''}`);
      }
    });
    lines.push('');

    // Explanatory text
    if (liq.dPlus1 != null && grossPatrimony != null) {
      const d1Val = liqValue(liq.dPlus1);
      lines.push(`A carteira apresenta liquidez imediata de ${fmtPct(liq.dPlus1)}${d1Val != null ? ` (R$ ${fmt(d1Val)})` : ''}.`);
      if ((liq.dPlus1 ?? 0) < 5) {
        lines.push('⚠ ATENÇÃO: Liquidez imediata abaixo de 5%, indicando baixa disponibilidade de caixa no curto prazo.');
      }
    }

    // Find highest liquidity band
    const bands = [
      { label: 'até 1 ano', pct: liq.upTo1Year ?? 0 },
      { label: 'entre 1 e 5 anos', pct: liq.oneToFiveYears ?? 0 },
      { label: 'acima de 5 anos', pct: liq.aboveFiveYears ?? 0 },
    ];
    const maxBand = bands.sort((a, b) => b.pct - a.pct)[0];
    if (maxBand && maxBand.pct > 0) {
      const maxVal = grossPatrimony != null ? grossPatrimony * (maxBand.pct / 100) : null;
      lines.push(`A maior concentração de recursos está alocada ${maxBand.label}, representando ${fmtPct(maxBand.pct)} do patrimônio${maxVal != null ? ` (R$ ${fmt(maxVal)})` : ''}.`);
    }
    lines.push('');

    // 2. Agenda de Vencimentos
    if (maturityAnalysis) {
      lines.push('2. AGENDA ESTRUTURADA DE VENCIMENTOS');
      lines.push('─'.repeat(40));
      lines.push('');

      const renderBucket = (label: string, items: typeof maturityAnalysis.within6m) => {
        if (items.length === 0) return;
        const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
        lines.push(`► ${label}: ${items.length} ${items.length === 1 ? 'ativo' : 'ativos'} | Total: R$ ${fmt(total)}`);
        items.forEach(p => {
          lines.push(`  • ${p.name} | Venc: ${fmtDate(p.maturityDate!)} | R$ ${fmt(p.grossBalance)}`);
        });
        lines.push('');
      };

      renderBucket('Próximos 6 meses', maturityAnalysis.within6m);
      renderBucket('Entre 6 e 12 meses', maturityAnalysis.sixTo12m);

      Object.entries(maturityAnalysis.byYear).sort(([a], [b]) => a.localeCompare(b)).forEach(([year, items]) => {
        const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
        const pctPatrimonio = grossPatrimony && grossPatrimony > 0 ? (total / grossPatrimony) * 100 : 0;
        lines.push(`► Ano ${year}: ${items.length} ativos | Total: R$ ${fmt(total)} | ${fmtPct(pctPatrimonio)} do patrimônio`);
        items.forEach(p => {
          lines.push(`  • ${p.name} | Venc: ${fmtDate(p.maturityDate!)} | R$ ${fmt(p.grossBalance)}`);
        });
        lines.push('');
      });

      // 3. Concentração
      lines.push('3. ANÁLISE DE CONCENTRAÇÃO DE VENCIMENTOS');
      lines.push('─'.repeat(40));
      if (maturityAnalysis.maxYear) {
        lines.push(`Ano com maior concentração: ${maturityAnalysis.maxYear}`);
        lines.push(`Número de ativos: ${maturityAnalysis.maxYearCount}`);
        lines.push(`Valor total: R$ ${fmt(maturityAnalysis.maxYearTotal)}`);
        lines.push(`Percentual do patrimônio: ${fmtPct(maturityAnalysis.maxYearPct)}`);
        lines.push(`Avaliação: ${maturityAnalysis.concentrationLevel}`);
      } else {
        lines.push('Sem ativos com vencimento identificado.');
      }
      lines.push('');

      // 4. Diagnóstico
      lines.push('4. DIAGNÓSTICO ESTRATÉGICO FINAL');
      lines.push('─'.repeat(40));

      const diagnosticParts: string[] = [];
      if (liq.dPlus1 != null) {
        diagnosticParts.push(
          (liq.dPlus1 ?? 0) < 5
            ? `A liquidez imediata de ${fmtPct(liq.dPlus1)} apresenta risco de indisponibilidade de caixa no curto prazo`
            : `A liquidez imediata de ${fmtPct(liq.dPlus1)} está dentro dos parâmetros adequados`
        );
      }
      if (maturityAnalysis.maxYear) {
        diagnosticParts.push(
          `a maior concentração de vencimentos está em ${maturityAnalysis.maxYear} (${fmtPct(maturityAnalysis.maxYearPct)} do patrimônio), classificada como "${maturityAnalysis.concentrationLevel}"`
        );
      }
      if (investorProfile) {
        diagnosticParts.push(`considerando o perfil "${investorProfile}" do cliente`);
      }

      if (diagnosticParts.length > 0) {
        lines.push(diagnosticParts.join('; ') + '.');
        lines.push('');
        lines.push('Recomenda-se reavaliar a distribuição temporal dos ativos, priorizando a adequação da liquidez ao perfil e às necessidades do cliente.');
      }
    }

    if (consultantObservation) {
      lines.push('');
      lines.push('OBSERVAÇÃO ESTRATÉGICA DO CONSULTOR');
      lines.push('─'.repeat(40));
      lines.push(consultantObservation);
    }

    return lines.join('\n');
  }, [positions, grossPatrimony, liq, maturityAnalysis, investorProfile, consultantObservation]);

  // Commercial summary
  const commercialReport = useMemo(() => {
    if (positions.length === 0) return '';
    const parts: string[] = [];
    parts.push('Olá! Segue a análise de liquidez e vencimentos da sua carteira:\n');

    if (liq.dPlus1 != null && grossPatrimony != null) {
      const val = liqValue(liq.dPlus1);
      parts.push(`📊 *Liquidez imediata:* ${fmtPct(liq.dPlus1)}${val != null ? ` (R$ ${fmt(val)})` : ''}`);
      if ((liq.dPlus1 ?? 0) < 5) parts.push('⚠️ Atenção: liquidez imediata abaixo do recomendado (5%).');
    }

    if (maturityAnalysis?.maxYear) {
      parts.push(`\n📅 *Principal concentração:* ${maturityAnalysis.maxYear} — ${maturityAnalysis.maxYearCount} ativos totalizando R$ ${fmt(maturityAnalysis.maxYearTotal)} (${fmtPct(maturityAnalysis.maxYearPct)} do patrimônio)`);
      parts.push(`📊 *Avaliação:* ${maturityAnalysis.concentrationLevel}`);
    }

    if (maturityAnalysis && maturityAnalysis.within6m.length > 0) {
      const total6m = maturityAnalysis.within6m.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
      parts.push(`\n⏰ *Vencimentos próximos (6 meses):* ${maturityAnalysis.within6m.length} ativos — R$ ${fmt(total6m)}`);
    }

    parts.push('\n📌 *Próximo passo:* Agendar reunião para discutir ajustes na distribuição temporal e adequação da liquidez.');

    return parts.join('\n');
  }, [positions, grossPatrimony, liq, maturityAnalysis]);

  const handleDownloadPdf = () => {
    // Simple text download as .txt (PDF generation would require backend)
    const blob = new Blob([technicalReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-executivo-liquidez.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório baixado.');
  };

  if (positions.length === 0) return null;

  const SectionHeader = ({ id, title, icon }: { id: string; title: string; icon: string }) => (
    <button type="button" className="flex items-center gap-2 w-full text-left py-2" onClick={() => toggleSection(id)}>
      {expandedSections[id] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      <span className="font-semibold text-foreground">{icon} {title}</span>
    </button>
  );

  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
      <h4 className="font-bold text-foreground text-base flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Relatório Executivo de Liquidez e Vencimentos
      </h4>

      {/* 1. Visão Geral da Liquidez */}
      <div className="border-t border-border pt-3">
        <SectionHeader id="overview" title="Visão Geral da Liquidez" icon="1️⃣" />
        {expandedSections['overview'] && (
          <div className="pl-6 space-y-3 mt-2">
            {grossPatrimony != null && (
              <p className="text-sm font-medium text-foreground">Patrimônio Bruto: R$ {fmt(grossPatrimony)}</p>
            )}
            {grossPatrimony == null && (
              <p className="text-xs text-destructive">⚠ Sem patrimônio bruto para calcular valores em R$.</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'D+1', pct: liq.dPlus1 },
                { label: 'Até 1 ano', pct: liq.upTo1Year },
                { label: '1 a 5 anos', pct: liq.oneToFiveYears },
                { label: 'Acima de 5 anos', pct: liq.aboveFiveYears },
              ].map(({ label, pct }) => (
                <div key={label} className="p-2 bg-card rounded border border-border">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold text-foreground">{fmtPct(pct)}</p>
                  {pct != null && grossPatrimony != null && (
                    <p className="text-xs text-muted-foreground">R$ {fmt(grossPatrimony * (pct / 100))}</p>
                  )}
                </div>
              ))}
            </div>
            {/* Auto-generated explanatory text */}
            <div className="text-sm text-foreground bg-card p-3 rounded border border-border space-y-1">
              {liq.dPlus1 != null && grossPatrimony != null && (
                <p>A carteira apresenta liquidez imediata de {fmtPct(liq.dPlus1)} (R$ {fmt(liqValue(liq.dPlus1))}){(liq.dPlus1 ?? 0) < 5 ? ', indicando baixa disponibilidade de caixa no curto prazo.' : '.'}</p>
              )}
              {(() => {
                const bands = [
                  { label: 'até 1 ano', pct: liq.upTo1Year ?? 0 },
                  { label: 'entre 1 e 5 anos', pct: liq.oneToFiveYears ?? 0 },
                  { label: 'acima de 5 anos', pct: liq.aboveFiveYears ?? 0 },
                ].sort((a, b) => b.pct - a.pct);
                const top = bands[0];
                if (top && top.pct > 0 && grossPatrimony != null) {
                  const val = grossPatrimony * (top.pct / 100);
                  return <p>A maior concentração de recursos está alocada {top.label}, representando {fmtPct(top.pct)} do patrimônio (R$ {fmt(val)}).</p>;
                }
                return null;
              })()}
              {(liq.dPlus1 ?? 100) < 5 && (
                <p className="text-destructive font-medium">⚠ Risco de liquidez: disponibilidade imediata abaixo de 5% do patrimônio.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Agenda de Vencimentos */}
      {maturityAnalysis && (
        <div className="border-t border-border pt-3">
          <SectionHeader id="maturity" title="Agenda Estruturada de Vencimentos" icon="2️⃣" />
          {expandedSections['maturity'] && (
            <div className="pl-6 space-y-3 mt-2">
              {[
                { key: '6m', label: 'Próximos 6 meses', items: maturityAnalysis.within6m },
                { key: '12m', label: 'Entre 6 e 12 meses', items: maturityAnalysis.sixTo12m },
              ].filter(b => b.items.length > 0).map(({ key, label, items }) => {
                const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
                const show = expandedSections[`mat_${key}`];
                const display = show ? items : items.slice(0, 10);
                return (
                  <div key={key} className="bg-card p-3 rounded border border-border space-y-1">
                    <button type="button" className="flex items-center gap-2 w-full text-left" onClick={() => toggleSection(`mat_${key}`)}>
                      {show ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span className="text-sm font-medium">{label}: {items.length} {items.length === 1 ? 'ativo' : 'ativos'} | Total: R$ {fmt(total)}</span>
                    </button>
                    {show && (
                      <div className="pl-5 space-y-1 mt-1">
                        {display.map((p, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {p.name} | Venc: {fmtDate(p.maturityDate!)} | R$ {fmt(p.grossBalance)}
                          </p>
                        ))}
                        {items.length > 10 && !expandedSections[`mat_${key}_all`] && (
                          <button type="button" className="text-xs text-primary underline" onClick={() => setExpandedSections(prev => ({ ...prev, [`mat_${key}_all`]: true, [`mat_${key}`]: true }))}>
                            Ver lista completa ({items.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* By year */}
              {Object.entries(maturityAnalysis.byYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, items]) => {
                const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
                const pctPat = grossPatrimony && grossPatrimony > 0 ? (total / grossPatrimony) * 100 : 0;
                const key = `mat_yr_${year}`;
                const show = expandedSections[key];
                const display = show ? items : items.slice(0, 10);
                return (
                  <div key={year} className="bg-card p-3 rounded border border-border space-y-1">
                    <button type="button" className="flex items-center gap-2 w-full text-left" onClick={() => toggleSection(key)}>
                      {show ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span className="text-sm font-medium">Ano {year}: {items.length} ativos | R$ {fmt(total)} | {fmtPct(pctPat)} do patrimônio</span>
                    </button>
                    {show && (
                      <div className="pl-5 space-y-1 mt-1">
                        {display.map((p, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {p.name} | Venc: {fmtDate(p.maturityDate!)} | R$ {fmt(p.grossBalance)}
                          </p>
                        ))}
                        {items.length > 10 && !expandedSections[`${key}_all`] && (
                          <button type="button" className="text-xs text-primary underline" onClick={() => setExpandedSections(prev => ({ ...prev, [`${key}_all`]: true, [key]: true }))}>
                            Ver lista completa ({items.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Concentração */}
      {maturityAnalysis?.maxYear && (
        <div className="border-t border-border pt-3">
          <SectionHeader id="concentration" title="Análise de Concentração de Vencimentos" icon="3️⃣" />
          {expandedSections['concentration'] && (
            <div className="pl-6 mt-2 bg-card p-3 rounded border border-border space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Ano com maior concentração</p>
                  <p className="text-sm font-bold text-foreground">{maturityAnalysis.maxYear}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nº de ativos</p>
                  <p className="text-sm font-bold text-foreground">{maturityAnalysis.maxYearCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor total</p>
                  <p className="text-sm font-bold text-foreground">R$ {fmt(maturityAnalysis.maxYearTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">% do patrimônio</p>
                  <p className="text-sm font-bold text-foreground">{fmtPct(maturityAnalysis.maxYearPct)}</p>
                </div>
              </div>
              <Badge variant={maturityAnalysis.concentrationLevel.includes('Alta') ? 'destructive' : maturityAnalysis.concentrationLevel.includes('moderada') ? 'secondary' : 'outline'}>
                {maturityAnalysis.concentrationLevel}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* 4. Diagnóstico Estratégico */}
      {maturityAnalysis && (
        <div className="border-t border-border pt-3">
          <SectionHeader id="diagnostic" title="Diagnóstico Estratégico Final" icon="4️⃣" />
          {expandedSections['diagnostic'] && (
            <div className="pl-6 mt-2 bg-card p-3 rounded border border-border text-sm text-foreground space-y-2">
              {liq.dPlus1 != null && (
                <p>
                  {(liq.dPlus1 ?? 0) < 5
                    ? `A liquidez imediata de ${fmtPct(liq.dPlus1)} apresenta risco de indisponibilidade de caixa no curto prazo.`
                    : `A liquidez imediata de ${fmtPct(liq.dPlus1)} está dentro dos parâmetros adequados.`}
                </p>
              )}
              {maturityAnalysis.maxYear && (
                <p>A maior concentração de vencimentos está em {maturityAnalysis.maxYear} ({fmtPct(maturityAnalysis.maxYearPct)} do patrimônio), classificada como "{maturityAnalysis.concentrationLevel}".</p>
              )}
              {investorProfile && (
                <p>Considerando o perfil "{investorProfile}" do cliente, recomenda-se reavaliar a distribuição temporal dos ativos.</p>
              )}
              <p className="text-muted-foreground italic">Recomenda-se reavaliar a distribuição temporal dos ativos, priorizando a adequação da liquidez ao perfil e às necessidades do cliente.</p>
            </div>
          )}
        </div>
      )}

      {/* Observação Estratégica do Consultor */}
      <div className="border-t border-border pt-3 space-y-2">
        <Label className="font-semibold text-foreground">✏️ Observação Estratégica do Consultor</Label>
        <Textarea
          value={consultantObservation}
          onChange={(e) => onObservationChange(e.target.value)}
          onBlur={onObservationBlur}
          placeholder="Registre suas observações sobre a liquidez e vencimentos deste cliente..."
          className="crm-input min-h-[80px]"
        />
      </div>

      {/* Two output formats */}
      <div className="border-t border-border pt-3 space-y-4">
        {/* Technical Report */}
        <div className="bg-card p-4 rounded border border-border space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h5 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              📄 Relatório Técnico Completo
            </h5>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(technicalReport, 'exec_tech')}>
                {copiedField === 'exec_tech' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1 text-xs">Copiar</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf}>
                <Download className="w-4 h-4" />
                <span className="ml-1 text-xs">Baixar</span>
              </Button>
            </div>
          </div>
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans max-h-[300px] overflow-y-auto">{technicalReport}</pre>
        </div>

        {/* Commercial Report */}
        <div className="bg-card p-4 rounded border border-border space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h5 className="font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              💬 Resumo Comercial (WhatsApp)
            </h5>
            <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(commercialReport, 'exec_comm')}>
              {copiedField === 'exec_comm' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              <span className="ml-1 text-xs">Copiar</span>
            </Button>
          </div>
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">{commercialReport}</pre>
        </div>
      </div>
    </div>
  );
}
