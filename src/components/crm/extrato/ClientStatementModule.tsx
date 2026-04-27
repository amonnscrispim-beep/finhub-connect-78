import { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2, Upload, FileText, AlertTriangle, ShieldCheck, Trash2, Sparkles, Download, Save,
} from 'lucide-react';
import { useClientStatements, AssetClass, ExtractAsset } from '@/hooks/useClientStatements';
import { useAuth } from '@/hooks/useAuth';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateExtractSummaryPdf } from '@/lib/extract-summary-pdf';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v: number) => `${(v || 0).toFixed(2)}%`;

const CLASS_COLORS: Record<AssetClass, string> = {
  'Renda Fixa': 'bg-blue-50 text-blue-700 border-blue-200',
  'Renda Variável': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Fundos Imobiliários': 'bg-amber-50 text-amber-700 border-amber-200',
  'Multimercado': 'bg-purple-50 text-purple-700 border-purple-200',
  'Previdência': 'bg-slate-50 text-slate-700 border-slate-200',
  'Caixa': 'bg-gray-50 text-gray-700 border-gray-200',
};

const ALL_CLASSES: AssetClass[] = [
  'Renda Fixa',
  'Renda Variável',
  'Fundos Imobiliários',
  'Multimercado',
  'Previdência',
  'Caixa',
];

const CONSOLIDATED = '__CONSOLIDATED__';
const CONCENTRATION = '__CONCENTRATION__';

interface Props {
  clientId?: string;
  clientName?: string;
}

// IR regressivo por prazo restante (em dias)
function irRateForDays(days: number | null): number {
  if (days === null) return 0.15; // sem vencimento (ações/fundos abertos): considera 15%
  if (days > 720) return 0.15;
  if (days > 540) return 0.175;
  if (days > 360) return 0.20;
  return 0.225;
}

// IR estimado para um ativo, baseado em isenção e prazo até vencimento
function assetIrRate(a: ExtractAsset): number {
  if (a.is_tax_exempt) return 0;
  // FIIs: rendimentos isentos para PF, mas ganho de capital tem IR. Simplificamos: 0
  if (a.asset_class === 'Fundos Imobiliários') return 0;
  let days: number | null = null;
  if (a.maturity_date) {
    try { days = differenceInDays(parseISO(a.maturity_date), new Date()); } catch { days = null; }
  }
  return irRateForDays(days);
}

export function ClientStatementModule({ clientId, clientName }: Props) {
  const { user } = useAuth();
  const {
    snapshots, activeSnapshotId, setActiveSnapshotId,
    assets, isExtracting, extractAndSave, deleteSnapshot, updateSnapshot,
  } = useClientStatements(clientId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterClass, setFilterClass] = useState<AssetClass | 'all'>('all');
  const [activeBroker, setActiveBroker] = useState<string>(CONSOLIDATED);
  const [concSortDesc, setConcSortDesc] = useState(true);

  // Estado do Resumo Técnico
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [techText, setTechText] = useState('');
  const [comments, setComments] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);

  const activeSnapshot = useMemo(
    () => snapshots.find((s) => s.id === activeSnapshotId) || null,
    [snapshots, activeSnapshotId]
  );

  // Inicializa textos quando snapshot muda
  useEffect(() => {
    if (activeSnapshot) {
      setTechText(activeSnapshot.technical_summary || '');
      setComments(activeSnapshot.consultant_comments || '');
    }
  }, [activeSnapshot?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Brokers únicos no snapshot ativo (do próprio snapshot)
  const brokers = useMemo(() => {
    const set = new Set<string>();
    if (activeSnapshot?.broker) set.add(activeSnapshot.broker);
    // Também tentar enriquecer pelo issuer? Não — broker do snapshot é único por upload.
    return Array.from(set);
  }, [activeSnapshot]);

  // Brokers consolidados de TODOS os snapshots (para visão multi-corretora)
  const allBrokerSnapshots = useMemo(() => {
    const map: Record<string, typeof snapshots> = {};
    snapshots.forEach((s) => {
      const b = s.broker || 'Sem corretora';
      if (!map[b]) map[b] = [];
      map[b].push(s);
    });
    return map;
  }, [snapshots]);

  // Pega o snapshot mais recente de cada corretora para o consolidado
  const latestPerBroker = useMemo(() => {
    return Object.entries(allBrokerSnapshots).map(([broker, list]) => {
      const sorted = [...list].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
      return { broker, snapshot: sorted[0] };
    });
  }, [allBrokerSnapshots]);

  // Carrega assets de TODOS os snapshots mais recentes (para consolidado entre corretoras)
  const [allAssets, setAllAssets] = useState<Array<ExtractAsset & { __broker: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (latestPerBroker.length === 0) {
        setAllAssets([]);
        return;
      }
      const { supabase } = await import('@/integrations/supabase/client');
      const ids = latestPerBroker.map((x) => x.snapshot.id);
      const { data, error } = await supabase
        .from('client_extract_assets')
        .select('*')
        .in('snapshot_id', ids);
      if (cancelled) return;
      if (error) { setAllAssets([]); return; }
      const byId: Record<string, string> = {};
      latestPerBroker.forEach((x) => { byId[x.snapshot.id] = x.broker; });
      setAllAssets((data || []).map((a: any) => ({ ...a, __broker: byId[a.snapshot_id] || 'Sem corretora' })));
    })();
    return () => { cancelled = true; };
  }, [latestPerBroker.map((x) => x.snapshot.id).join('|')]); // eslint-disable-line

  const brokerTabs = useMemo(() => latestPerBroker.map((x) => x.broker), [latestPerBroker]);

  // Assets a exibir conforme aba ativa
  const visibleAssets = useMemo(() => {
    if (activeBroker === CONSOLIDATED) return allAssets;
    return allAssets.filter((a) => a.__broker === activeBroker);
  }, [allAssets, activeBroker]);

  const visibleSnapshots = useMemo(() => {
    if (activeBroker === CONSOLIDATED) return latestPerBroker.map((x) => x.snapshot);
    return latestPerBroker.filter((x) => x.broker === activeBroker).map((x) => x.snapshot);
  }, [latestPerBroker, activeBroker]);

  const total = visibleAssets.reduce((s, a) => s + (a.gross_value || 0), 0);

  // Totais por classe
  const totalsByClass = useMemo(() => {
    const map: Record<string, { value: number; pct: number; count: number }> = {};
    ALL_CLASSES.forEach((c) => (map[c] = { value: 0, pct: 0, count: 0 }));
    visibleAssets.forEach((a) => {
      const k = a.asset_class as AssetClass;
      if (!map[k]) map[k] = { value: 0, pct: 0, count: 0 };
      map[k].value += a.gross_value;
      map[k].count += 1;
    });
    Object.keys(map).forEach((k) => {
      map[k].pct = total > 0 ? (map[k].value / total) * 100 : 0;
    });
    return map;
  }, [visibleAssets, total]);

  // Concentração por emissor
  const concentrationAlerts = useMemo(() => {
    const map: Record<string, number> = {};
    visibleAssets.forEach((a) => {
      const issuer = (a.issuer || a.asset_name).trim();
      if (!issuer) return;
      map[issuer] = (map[issuer] || 0) + a.gross_value;
    });
    return Object.entries(map)
      .map(([issuer, value]) => ({ issuer, value, pct: total > 0 ? (value / total) * 100 : 0 }))
      .filter((x) => x.pct > 20)
      .sort((a, b) => b.pct - a.pct);
  }, [visibleAssets, total]);

  // Concentração por emissor — SEMPRE consolidado (todas corretoras)
  const issuerConcentration = useMemo(() => {
    const totalAll = allAssets.reduce((s, a) => s + (a.gross_value || 0), 0);
    const map: Record<string, { issuer: string; value: number; assets: string[]; allExempt: boolean; anyExempt: boolean }> = {};
    allAssets.forEach((a) => {
      const issuer = (a.issuer || a.asset_name || 'Sem emissor').trim() || 'Sem emissor';
      if (!map[issuer]) {
        map[issuer] = { issuer, value: 0, assets: [], allExempt: true, anyExempt: false };
      }
      map[issuer].value += a.gross_value || 0;
      map[issuer].assets.push(a.asset_name);
      if (a.is_tax_exempt) map[issuer].anyExempt = true;
      else map[issuer].allExempt = false;
    });
    const list = Object.values(map).map((x) => ({
      ...x,
      pct: totalAll > 0 ? (x.value / totalAll) * 100 : 0,
    }));
    list.sort((a, b) => (concSortDesc ? b.pct - a.pct : a.pct - b.pct));
    return { list, totalAll };
  }, [allAssets, concSortDesc]);
  const upcomingMaturities = useMemo(() => {
    const today = new Date();
    return visibleAssets.filter((a) => {
      if (!a.maturity_date) return false;
      try {
        const days = differenceInDays(parseISO(a.maturity_date), today);
        return days >= 0 && days <= 90;
      } catch { return false; }
    });
  }, [visibleAssets]);

  // Isento de IR
  const taxExempt = useMemo(() => {
    const value = visibleAssets.filter((a) => a.is_tax_exempt).reduce((s, a) => s + a.gross_value, 0);
    return { value, pct: total > 0 ? (value / total) * 100 : 0 };
  }, [visibleAssets, total]);

  // Retornos: somar de cada snapshot visível (mês e ano em R$ e %)
  const returns = useMemo(() => {
    let mesValor = 0, anoValor = 0, mesBase = 0, anoBase = 0;
    visibleSnapshots.forEach((s) => {
      mesValor += Number(s.return_month_value) || 0;
      anoValor += Number(s.return_year_value) || 0;
      mesBase += Number(s.total_patrimony) || 0;
      anoBase += Number(s.total_patrimony) || 0;
    });
    const mesPct = mesBase > 0 ? (mesValor / mesBase) * 100 : 0;
    const anoPct = anoBase > 0 ? (anoValor / anoBase) * 100 : 0;

    // IR ponderado dos ativos visíveis (taxa média)
    const irByAsset = visibleAssets.map((a) => ({ value: a.gross_value, ir: assetIrRate(a) }));
    const irBase = irByAsset.reduce((s, x) => s + x.value, 0);
    const irMedio = irBase > 0 ? irByAsset.reduce((s, x) => s + x.value * x.ir, 0) / irBase : 0;

    const mesValorLiq = mesValor * (1 - irMedio);
    const anoValorLiq = anoValor * (1 - irMedio);
    const mesPctLiq = mesPct * (1 - irMedio);
    const anoPctLiq = anoPct * (1 - irMedio);

    return { mesValor, mesPct, anoValor, anoPct, mesValorLiq, mesPctLiq, anoValorLiq, anoPctLiq, irMedio };
  }, [visibleSnapshots, visibleAssets]);

  const filteredAssets = useMemo(() => {
    const list = filterClass === 'all'
      ? visibleAssets
      : visibleAssets.filter((a) => a.asset_class === filterClass);
    return [...list].sort((a, b) => b.gross_value - a.gross_value);
  }, [visibleAssets, filterClass]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await extractAndSave(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isMaturityClose = (asset: ExtractAsset) => {
    if (!asset.maturity_date) return false;
    try {
      const d = differenceInDays(parseISO(asset.maturity_date), new Date());
      return d >= 0 && d <= 90;
    } catch { return false; }
  };

  // Gera o texto técnico automático
  const generateTechnicalText = (): string => {
    const lines: string[] = [];
    lines.push(`Análise consolidada da carteira do cliente em ${activeSnapshot ? format(parseISO(activeSnapshot.snapshot_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}.`);
    lines.push('');

    // Patrimônio por corretora
    if (latestPerBroker.length > 1) {
      lines.push('PATRIMÔNIO POR CORRETORA:');
      latestPerBroker.forEach(({ broker, snapshot }) => {
        lines.push(`• ${broker}: ${fmtCurrency(snapshot.total_patrimony)}`);
      });
      const totalGeral = latestPerBroker.reduce((s, x) => s + x.snapshot.total_patrimony, 0);
      lines.push(`• TOTAL CONSOLIDADO: ${fmtCurrency(totalGeral)}`);
      lines.push('');
    } else {
      lines.push(`Patrimônio total: ${fmtCurrency(total)}`);
      lines.push('');
    }

    // Composição por classe
    lines.push('COMPOSIÇÃO POR CLASSE DE ATIVO:');
    ALL_CLASSES.forEach((c) => {
      const t = totalsByClass[c];
      if (t.value > 0) {
        lines.push(`• ${c}: ${fmtCurrency(t.value)} (${fmtPct(t.pct)})`);
      }
    });
    lines.push('');

    // Top 5 posições
    const top5 = [...visibleAssets].sort((a, b) => b.gross_value - a.gross_value).slice(0, 5);
    if (top5.length > 0) {
      lines.push('PRINCIPAIS POSIÇÕES (TOP 5):');
      top5.forEach((a, i) => {
        const pct = total > 0 ? (a.gross_value / total) * 100 : 0;
        lines.push(`${i + 1}. ${a.asset_name} — ${fmtCurrency(a.gross_value)} (${fmtPct(pct)})`);
      });
      lines.push('');
    }

    // Concentração
    if (concentrationAlerts.length > 0) {
      lines.push('CONCENTRAÇÃO POR EMISSOR (>20%):');
      concentrationAlerts.forEach((c) => {
        lines.push(`• ${c.issuer}: ${fmtCurrency(c.value)} (${fmtPct(c.pct)})`);
      });
      lines.push('');
    }

    // Isento de IR
    lines.push(`PARTICIPAÇÃO ISENTA DE IR: ${fmtCurrency(taxExempt.value)} (${fmtPct(taxExempt.pct)} da carteira).`);
    lines.push('');

    // Retornos
    lines.push('RETORNO LÍQUIDO (após IR estimado):');
    lines.push(`• Mês: ${fmtCurrency(returns.mesValorLiq)} (${fmtPct(returns.mesPctLiq)})`);
    lines.push(`• Ano: ${fmtCurrency(returns.anoValorLiq)} (${fmtPct(returns.anoPctLiq)})`);
    lines.push(`• IR médio ponderado aplicado: ${fmtPct(returns.irMedio * 100)}`);

    return lines.join('\n');
  };

  const openSummary = () => {
    const auto = generateTechnicalText();
    setTechText(auto);
    if (activeSnapshot?.consultant_comments) setComments(activeSnapshot.consultant_comments);
    setSummaryOpen(true);
  };

  const handleSaveSummary = async () => {
    if (!activeSnapshot) return;
    setSavingSummary(true);
    const ok = await updateSnapshot(activeSnapshot.id, {
      technical_summary: techText,
      consultant_comments: comments,
    });
    setSavingSummary(false);
    if (ok) toast.success('Resumo salvo');
  };

  const handleExportPdf = async () => {
    if (!activeSnapshot) return;
    await handleSaveSummary();
    const advisorName = (user?.user_metadata as any)?.full_name || user?.email || '';
    await generateExtractSummaryPdf({
      clientName: clientName || '—',
      snapshotDate: format(parseISO(activeSnapshot.snapshot_date), 'dd/MM/yyyy', { locale: ptBR }),
      technicalSummary: techText,
      consultantComments: comments,
      advisorName,
      filename: `resumo-extrato-${(clientName || 'cliente').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${activeSnapshot.snapshot_date}.pdf`,
    });
  };

  if (!clientId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Salve o cliente antes de utilizar o módulo Extrato.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER: upload + seletor + resumo técnico */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-lg">Extrato do Cliente</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Anexe um PDF de qualquer corretora — a IA classifica e organiza tudo automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {snapshots.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSummary(); }}
              >
                <Sparkles className="w-4 h-4 mr-2" /> Gerar Resumo Técnico
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Anexar Extrato</>
              )}
            </Button>
          </div>
        </CardHeader>

        {snapshots.length > 0 && (
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground">Snapshot atual:</span>
              <Select value={activeSnapshotId || ''} onValueChange={(v) => setActiveSnapshotId(v)}>
                <SelectTrigger className="h-8 w-[320px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {format(parseISO(s.snapshot_date), 'dd/MM/yyyy', { locale: ptBR })}
                      {s.broker ? ` • ${s.broker}` : ''} • {fmtCurrency(s.total_patrimony)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeSnapshot?.pdf_filename && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {activeSnapshot.pdf_filename}
                </span>
              )}
              {activeSnapshot && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { if (confirm('Remover este snapshot?')) deleteSnapshot(activeSnapshot.id); }}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive ml-auto"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remover
                </Button>
              )}
            </div>

            {/* TABS POR CORRETORA */}
            {brokerTabs.length > 0 && (
              <Tabs value={activeBroker} onValueChange={setActiveBroker}>
                <TabsList>
                  <TabsTrigger value={CONSOLIDATED}>Consolidado</TabsTrigger>
                  {brokerTabs.map((b) => (
                    <TabsTrigger key={b} value={b}>{b}</TabsTrigger>
                  ))}
                  <TabsTrigger value={CONCENTRATION}>Concentração</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </CardContent>
        )}
      </Card>

      {snapshots.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum extrato anexado ainda. Clique em <strong>Anexar Extrato</strong> para começar.
          </CardContent>
        </Card>
      )}

      {snapshots.length > 0 && (
        <>
          {/* RETORNOS — campos editáveis para o snapshot ativo */}
          {activeSnapshot && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Retornos — {activeBroker === CONSOLIDATED ? 'Consolidado' : activeBroker}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Edite os retornos brutos do snapshot ativo. O líquido é calculado automaticamente
                  com IR regressivo por prazo de vencimento de cada ativo.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Retorno bruto do mês (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                      value={activeSnapshot.return_month_value || 0}
                      onChange={(e) => updateSnapshot(activeSnapshot.id, { return_month_value: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Retorno bruto do ano (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                      value={activeSnapshot.return_year_value || 0}
                      onChange={(e) => updateSnapshot(activeSnapshot.id, { return_year_value: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-muted-foreground">Bruto Mês</div>
                      <div className="text-base font-bold">{fmtCurrency(returns.mesValor)}</div>
                      <div className="text-xs text-slate-700">{fmtPct(returns.mesPct)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-muted-foreground">Bruto Ano</div>
                      <div className="text-base font-bold">{fmtCurrency(returns.anoValor)}</div>
                      <div className="text-xs text-slate-700">{fmtPct(returns.anoPct)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-emerald-800">Líquido Mês</div>
                      <div className="text-base font-bold text-emerald-800">{fmtCurrency(returns.mesValorLiq)}</div>
                      <div className="text-xs text-emerald-700">{fmtPct(returns.mesPctLiq)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-emerald-800">Líquido Ano</div>
                      <div className="text-base font-bold text-emerald-800">{fmtCurrency(returns.anoValorLiq)}</div>
                      <div className="text-xs text-emerald-700">{fmtPct(returns.anoPctLiq)}</div>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  IR médio ponderado aplicado: <strong>{fmtPct(returns.irMedio * 100)}</strong>
                  {' '}— calculado pelo prazo de vencimento de cada ativo (tabela regressiva: 22,5% → 15%).
                  Ativos isentos (LCI/LCA/CRI/CRA/Debêntures incentivadas/FIIs) entram com 0%.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ALERTAS */}
          {(concentrationAlerts.length > 0 || upcomingMaturities.length > 0) && (
            <div className="grid md:grid-cols-2 gap-3">
              {concentrationAlerts.length > 0 && (
                <Card className="border-amber-300 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="w-4 h-4" /> Concentração por emissor (&gt;20%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    {concentrationAlerts.map((c) => (
                      <div key={c.issuer} className="flex justify-between">
                        <span className="truncate pr-2">{c.issuer}</span>
                        <span className="font-semibold">{fmtPct(c.pct)} • {fmtCurrency(c.value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {upcomingMaturities.length > 0 && (
                <Card className="border-red-300 bg-red-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-800">
                      <AlertTriangle className="w-4 h-4" /> Vencimentos nos próximos 90 dias
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    {upcomingMaturities.map((a) => (
                      <div key={a.id} className="flex justify-between">
                        <span className="truncate pr-2">{a.asset_name}</span>
                        <span className="font-semibold">
                          {format(parseISO(a.maturity_date!), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* CARDS POR CLASSE */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ALL_CLASSES.map((c) => {
              const t = totalsByClass[c];
              return (
                <Card key={c} className={`border ${CLASS_COLORS[c]}`}>
                  <CardContent className="p-3">
                    <div className="text-xs font-medium opacity-80">{c}</div>
                    <div className="text-base font-bold mt-1">{fmtCurrency(t.value)}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {fmtPct(t.pct)} • {t.count} ativo{t.count !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* RESUMO + ISENÇÃO IR */}
          <div className="grid md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Patrimônio total</div>
                <div className="text-2xl font-bold mt-1">{fmtCurrency(total)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Total de ativos</div>
                <div className="text-2xl font-bold mt-1">{visibleAssets.length}</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-300 bg-emerald-50/40">
              <CardContent className="p-4">
                <div className="text-xs text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Isento de IR
                </div>
                <div className="text-2xl font-bold mt-1 text-emerald-800">
                  {fmtCurrency(taxExempt.value)}
                </div>
                <div className="text-xs text-emerald-700">{fmtPct(taxExempt.pct)} da carteira</div>
              </CardContent>
            </Card>
          </div>

          {/* TABELA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="text-base">
                Composição da carteira — {activeBroker === CONSOLIDATED ? 'Consolidado' : activeBroker}
              </CardTitle>
              <Select value={filterClass} onValueChange={(v) => setFilterClass(v as any)}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as classes</SelectItem>
                  {ALL_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    {activeBroker === CONSOLIDATED && <TableHead>Corretora</TableHead>}
                    <TableHead>Tipo</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-right">% Carteira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={activeBroker === CONSOLIDATED ? 8 : 7} className="text-center text-sm text-muted-foreground py-6">
                        Sem ativos nesta seleção.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredAssets.map((a) => {
                    const matClose = isMaturityClose(a);
                    const pctOfTotal = total > 0 ? (a.gross_value / total) * 100 : 0;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{a.asset_name}</span>
                            {a.is_tax_exempt && (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">
                                Isento IR
                              </Badge>
                            )}
                          </div>
                          {a.issuer && (
                            <div className="text-xs text-muted-foreground">{a.issuer}</div>
                          )}
                        </TableCell>
                        {activeBroker === CONSOLIDATED && (
                          <TableCell className="text-xs">{(a as any).__broker}</TableCell>
                        )}
                        <TableCell className="text-sm">{a.asset_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${CLASS_COLORS[a.asset_class as AssetClass] || ''}`}>
                            {a.asset_class}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{a.rate || '—'}</TableCell>
                        <TableCell className={`text-sm ${matClose ? 'text-red-600 font-semibold' : ''}`}>
                          {a.maturity_date ? format(parseISO(a.maturity_date), 'dd/MM/yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmtCurrency(a.gross_value)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmtPct(pctOfTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* MODAL: Resumo Técnico */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Resumo Técnico da Carteira
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1 block">Análise consolidada (auto-gerada — editável)</label>
              <Textarea
                value={techText}
                onChange={(e) => setTechText(e.target.value)}
                rows={16}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Comentários do consultor</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={6}
                placeholder="Adicione recomendações, observações estratégicas ou próximos passos..."
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between gap-2">
            <Button variant="outline" onClick={() => setSummaryOpen(false)}>
              Fechar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveSummary}
                disabled={savingSummary}
              >
                {savingSummary ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
              <Button onClick={handleExportPdf}>
                <Download className="w-4 h-4 mr-2" /> Gerar PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
