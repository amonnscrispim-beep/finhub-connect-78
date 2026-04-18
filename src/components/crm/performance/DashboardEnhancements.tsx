import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Copy, Check, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ConsolidatedSummary, PositionWithOrigin } from './types';
import { fmt, fmtPct } from './utils';

// ===================== TYPES =====================

interface ReportLite {
  broker: string;
  pdfFilename: string;
  reportDate: string;
  status: string;
  extractedData: any;
}

interface Props {
  data: ConsolidatedSummary;
  reports: ReportLite[];
}

// ===================== COLORS (institucional Navy) =====================

const LIQUIDITY_COLORS: Record<string, string> = {
  dPlus1: '#0B2545',
  upTo35: '#1E6091',
  '35to90': '#3E8FB0',
  '1to5years': '#8AB8D4',
  above5years: '#C9DCEA',
  noLiquidity: '#94A3B8',
};

const INDEXER_COLORS: Record<string, string> = {
  'Pós-fixado (CDI)': '#0B2545',
  'Inflação (IPCA+)': '#1E6091',
  'Pré-fixado': '#3E8FB0',
  'Previdência': '#F4A261',
  'Ações': '#8AB8D4',
  'FII': '#B5D1E3',
  'ETF / Internacional': '#A8C5E0',
  'Caixa': '#DCE9F5',
  'Outros': '#94A3B8',
};

// ===================== INDEXER NORMALIZATION =====================

function classifyIndexer(p: PositionWithOrigin): keyof typeof INDEXER_COLORS {
  const idx = (p.indexer ?? '').toLowerCase();
  const tipo = (p.type ?? '').toLowerCase();
  const nome = (p.name ?? '').toLowerCase();

  if (tipo.includes('previdência') || tipo.includes('previdencia') ||
      tipo.includes('vgbl') || tipo.includes('pgbl') ||
      nome.includes('vgbl') || nome.includes('pgbl')) return 'Previdência';

  if (tipo === 'fii') return 'FII';
  if (tipo === 'etf') return 'ETF / Internacional';
  if (tipo === 'ação' || tipo === 'acao') return 'Ações';

  if (idx.includes('ipca') || idx.includes('infla')) return 'Inflação (IPCA+)';
  if (idx.includes('cdi') || idx.includes('selic') || idx.includes('pós') || idx.includes('pos')) return 'Pós-fixado (CDI)';
  if (idx.includes('pre') || idx.includes('pré') || idx.includes('fixo')) return 'Pré-fixado';

  if (tipo.includes('renda fixa')) return 'Pós-fixado (CDI)';

  return 'Outros';
}

// ===================== DONUT CHART =====================

interface DonutDatum {
  name: string;
  value: number;
  pct: number;
  color: string;
}

function DonutChart({ data, centerLabel, centerValue }: { data: DonutDatum[]; centerLabel?: string; centerValue?: string }) {
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground py-8 text-center">Sem dados.</p>;
  }
  return (
    <div className="relative" style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
                  <p className="font-medium text-foreground">{d.name}</p>
                  <p className="text-muted-foreground">R$ {fmt(d.value)}</p>
                  <p className="text-muted-foreground">{d.pct.toFixed(2)}%</p>
                </div>
              );
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingLeft: 12 }}
            formatter={(value: string, entry: any) => (
              <span className="text-foreground">
                {value} <span className="text-muted-foreground">({entry.payload.pct.toFixed(1)}%)</span>
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingRight: '40%' }}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{centerLabel}</p>
          {centerValue && <p className="text-base font-bold text-foreground">{centerValue}</p>}
        </div>
      )}
    </div>
  );
}

// ===================== MAIN COMPONENT =====================

export function DashboardEnhancements({ data, reports }: Props) {
  const [copied, setCopied] = useState(false);

  const extracted = reports.filter(r => r.status === 'extracted');

  // ----- Weighted month / year returns -----
  const { monthReturn, yearReturn } = useMemo(() => {
    let mNum = 0, mDen = 0, yNum = 0, yDen = 0;
    extracted.forEach(r => {
      const gd = r.extractedData?.generalData ?? {};
      const gross = gd.grossPatrimony ?? 0;
      if (gross <= 0) return;
      if (gd.monthReturn != null) { mNum += gd.monthReturn * gross; mDen += gross; }
      if (gd.yearReturn != null) { yNum += gd.yearReturn * gross; yDen += gross; }
    });
    return {
      monthReturn: mDen > 0 ? mNum / mDen : null,
      yearReturn: yDen > 0 ? yNum / yDen : null,
    };
  }, [extracted]);

  // ----- Liquidity donut data -----
  const liquidityDonut: DonutDatum[] = useMemo(() => {
    return data.liquidityBands
      .filter(b => b.valueR$ > 0)
      .map(b => ({
        name: b.label,
        value: b.valueR$,
        pct: b.pct,
        color: LIQUIDITY_COLORS[b.key] ?? '#94A3B8',
      }));
  }, [data]);

  const liquidityUpTo90 = useMemo(() => {
    return data.liquidityBands
      .filter(b => ['dPlus1', 'upTo35', '35to90'].includes(b.key))
      .reduce((s, b) => s + b.pct, 0);
  }, [data]);

  // ----- Indexer composition (cross-broker) -----
  const indexerData = useMemo(() => {
    const totals: Record<string, { total: number; byBroker: Record<string, number> }> = {};
    data.positions.forEach(p => {
      const cat = classifyIndexer(p);
      if (!totals[cat]) totals[cat] = { total: 0, byBroker: {} };
      const val = p.grossBalance ?? 0;
      totals[cat].total += val;
      totals[cat].byBroker[p.broker] = (totals[cat].byBroker[p.broker] ?? 0) + val;
    });
    const brokers = data.brokers.map(b => b.broker);
    const rows = Object.entries(totals)
      .map(([cat, v]) => ({
        category: cat,
        total: v.total,
        pct: data.totalGross > 0 ? (v.total / data.totalGross) * 100 : 0,
        byBroker: v.byBroker,
        color: INDEXER_COLORS[cat] ?? '#94A3B8',
      }))
      .sort((a, b) => b.total - a.total);
    return { rows, brokers };
  }, [data]);

  const indexerDonut: DonutDatum[] = useMemo(() => {
    return indexerData.rows
      .filter(r => r.total > 0)
      .map(r => ({ name: r.category, value: r.total, pct: r.pct, color: r.color }));
  }, [indexerData]);

  // ----- Maturity within 12 months -----
  const maturity12m = useMemo(() => {
    const now = new Date();
    const in12 = new Date(now); in12.setMonth(in12.getMonth() + 12);
    return data.positions
      .filter(p => p.maturityDate && new Date(p.maturityDate) >= now && new Date(p.maturityDate) <= in12)
      .sort((a, b) => new Date(a.maturityDate!).getTime() - new Date(b.maturityDate!).getTime());
  }, [data]);

  const maturity12mTotal = maturity12m.reduce((s, p) => s + (p.grossBalance ?? 0), 0);

  // ----- Copy resumo -----
  const resumoText = useMemo(() => {
    const lines: string[] = [];
    const dateStr = new Date().toLocaleDateString('pt-BR');
    lines.push('📊 Resumo do Patrimônio');
    lines.push(`Data-base: ${dateStr}`);
    lines.push('');
    lines.push(`Patrimônio Bruto: R$ ${fmt(data.totalGross)}`);
    if (data.netCoverage.available > 0) {
      lines.push(`Patrimônio Líquido: R$ ${fmt(data.totalNet)}`);
    }
    if (monthReturn != null) lines.push(`Rentabilidade Mês: ${monthReturn.toFixed(2)}%`);
    if (yearReturn != null) lines.push(`Rentabilidade Ano: ${yearReturn.toFixed(2)}%`);
    lines.push('');
    lines.push('Liquidez:');
    data.liquidityBands.filter(b => b.valueR$ > 0).forEach(b => {
      lines.push(`• ${b.label}: R$ ${fmt(b.valueR$)} (${b.pct.toFixed(1)}%)`);
    });
    lines.push('');
    lines.push('Composição por Indexador:');
    indexerData.rows.forEach(r => {
      lines.push(`• ${r.category}: R$ ${fmt(r.total)} (${r.pct.toFixed(1)}%)`);
    });
    if (maturity12m.length > 0) {
      lines.push('');
      lines.push(`Vencimentos em 12 meses: ${maturity12m.length} ativo(s) — R$ ${fmt(maturity12mTotal)}`);
    }
    lines.push('');
    lines.push(`Instituições: ${data.brokers.map(b => b.broker).join(', ')}`);
    return lines.join('\n');
  }, [data, monthReturn, yearReturn, indexerData, maturity12m, maturity12mTotal]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resumoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (data.totalGross === 0) return null;

  return (
    <div className="space-y-6">
      {/* ── Cards de Rentabilidade ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-card rounded-lg border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Patrimônio Bruto</p>
          <p className="text-2xl font-bold text-foreground mt-1">R$ {fmt(data.totalGross)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{extracted.length} relatório(s)</p>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Patrimônio Líquido</p>
          {data.netCoverage.available > 0 ? (
            <>
              <p className="text-2xl font-bold text-foreground mt-1">R$ {fmt(data.totalNet)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {data.netCoverage.available}/{data.netCoverage.total} relatórios
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2 italic">Não informado</p>
          )}
        </div>
        <div className="p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rent. Mês</p>
            {monthReturn != null && (monthReturn >= 0
              ? <TrendingUp className="w-3 h-3 text-green-600" />
              : <TrendingDown className="w-3 h-3 text-destructive" />)}
          </div>
          {monthReturn != null ? (
            <p className={`text-2xl font-bold mt-1 ${monthReturn >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {monthReturn.toFixed(2)}%
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-2 italic">—</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">Ponderada</p>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rent. Ano</p>
            {yearReturn != null && (yearReturn >= 0
              ? <TrendingUp className="w-3 h-3 text-green-600" />
              : <TrendingDown className="w-3 h-3 text-destructive" />)}
          </div>
          {yearReturn != null ? (
            <p className={`text-2xl font-bold mt-1 ${yearReturn >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {yearReturn.toFixed(2)}%
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-2 italic">—</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">Ponderada</p>
        </div>
      </div>

      {/* ── Donut: Liquidez Consolidada ── */}
      <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-lg">🥧 Liquidez Consolidada (Donut)</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-primary mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            Copiar resumo
          </Button>
        </div>
        <DonutChart
          data={liquidityDonut}
          centerLabel="Liquidez ≤ 90d"
          centerValue={`${liquidityUpTo90.toFixed(1)}%`}
        />
      </div>

      {/* ── Composição por Indexador ── */}
      <div className="p-5 bg-card rounded-xl border border-border shadow-sm space-y-4">
        <h3 className="font-bold text-foreground text-lg">📈 Composição por Indexador</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DonutChart data={indexerDonut} />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Indexador</TableHead>
                  <TableHead className="text-right text-xs">Total (R$)</TableHead>
                  <TableHead className="text-right text-xs">% Carteira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indexerData.rows.map(r => (
                  <TableRow key={r.category}>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        {r.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">R$ {fmt(r.total)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtPct(r.pct)}</TableCell>
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

        {/* Tabela cruzada por instituição */}
        {indexerData.brokers.length > 1 && (
          <div className="overflow-x-auto pt-2">
            <p className="text-xs font-semibold text-foreground mb-2">Por Instituição</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Indexador</TableHead>
                  {indexerData.brokers.map(b => (
                    <TableHead key={b} className="text-right text-xs">{b}</TableHead>
                  ))}
                  <TableHead className="text-right text-xs">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indexerData.rows.map(r => (
                  <TableRow key={r.category}>
                    <TableCell className="text-xs">{r.category}</TableCell>
                    {indexerData.brokers.map(b => (
                      <TableCell key={b} className="text-right text-xs">
                        {r.byBroker[b] ? `R$ ${fmt(r.byBroker[b])}` : '—'}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-xs font-semibold">R$ {fmt(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Vencimentos em 12 meses (destaque amarelo) ── */}
      {maturity12m.length > 0 && (
        <div className="p-5 rounded-xl border-2 border-yellow-300 shadow-sm" style={{ backgroundColor: '#FFF3CD' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-700" />
              <h3 className="font-bold text-yellow-900 text-lg">Ativos com Vencimento em 12 Meses</h3>
            </div>
            <span className="text-xs font-semibold text-yellow-900 bg-yellow-200 px-2 py-1 rounded">
              {maturity12m.length} ativo(s) • R$ {fmt(maturity12mTotal)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-yellow-300">
                  <TableHead className="text-xs text-yellow-900">Ativo</TableHead>
                  <TableHead className="text-xs text-yellow-900">Indexador</TableHead>
                  <TableHead className="text-xs text-yellow-900">Taxa</TableHead>
                  <TableHead className="text-xs text-yellow-900">Instituição</TableHead>
                  <TableHead className="text-xs text-yellow-900">Vencimento</TableHead>
                  <TableHead className="text-right text-xs text-yellow-900">Valor (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maturity12m.map((p, i) => (
                  <TableRow key={i} className="border-yellow-200 hover:bg-yellow-100/40">
                    <TableCell className="text-xs font-medium text-yellow-950">{p.name}</TableCell>
                    <TableCell className="text-xs text-yellow-950">{p.indexer ?? '—'}</TableCell>
                    <TableCell className="text-xs text-yellow-950">{p.rate ?? '—'}</TableCell>
                    <TableCell className="text-xs text-yellow-950">{p.broker}</TableCell>
                    <TableCell className="text-xs text-yellow-950">
                      {new Date(p.maturityDate!).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold text-yellow-950">
                      R$ {fmt(p.grossBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
