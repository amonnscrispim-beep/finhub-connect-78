import { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, Copy, Check, Edit3, RotateCcw, Loader2, Calendar, ChevronDown, ChevronUp, Trash2, Building2 } from 'lucide-react';
import { RelatorioExecutivoLiquidez } from './RelatorioExecutivoLiquidez';
import { LiquidityDashboard } from './performance/LiquidityDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ---------- Types ----------

interface PerformanceReportData {
  generalData?: {
    grossPatrimony?: number | null;
    netPatrimony?: number | null;
    monthReturn?: number | null;
    yearReturn?: number | null;
    twelveMonthReturn?: number | null;
    cumulativeReturn?: number | null;
    cdiEquivalent?: number | null;
  };
  liquidity?: {
    dPlus1?: number | null;
    upTo1Year?: number | null;
    oneToFiveYears?: number | null;
    aboveFiveYears?: number | null;
  };
  positions?: Position[];
  indexerExposure?: {
    ipca?: number | null;
    prefixed?: number | null;
    postFixed?: number | null;
    other?: number | null;
  };
  reportDate?: string | null;
}

interface Position {
  name: string;
  type: string;
  indexer: string;
  rate: string;
  maturityDate: string | null;
  grossBalance: number;
  portfolioPct: number;
}

type ReportStatus = 'processing' | 'extracted' | 'failed';

interface ReportRecord {
  id: string;
  pdfFilename: string;
  broker: string;
  reportType: string;
  reportDate: string;
  status: ReportStatus;
  extractedData: PerformanceReportData;
  alerts: string[];
  technicalSummary: string;
  commercialSummary: string;
  consultantConclusion: string;
}

const BROKERS = ['BTG', 'XP', 'Itaú', 'Safra', 'Nubank', 'Outros'];
const REPORT_TYPES = ['Renda fixa', 'Renda variável', 'Consolidado', 'Outro'];

interface RelatorioPerformanceProps {
  clientId?: string;
  investorProfile?: string | null;
}

// ---------- Helpers ----------

const fmt = (v: number | null | undefined) => {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
};

// ---------- Component ----------

export function RelatorioPerformance({ clientId, investorProfile }: RelatorioPerformanceProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [executiveObservation, setExecutiveObservation] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBroker, setSelectedBroker] = useState<string>('');
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [agendaBrokerFilter, setAgendaBrokerFilter] = useState<string>('all');

  // Upload metadata state
  const [uploadBroker, setUploadBroker] = useState('');
  const [uploadBrokerOther, setUploadBrokerOther] = useState('');
  const [uploadReportType, setUploadReportType] = useState('');

  // Load all reports for this client
  useEffect(() => {
    if (!clientId || !user) return;
    loadReports();
  }, [clientId, user]);

  const loadReports = async () => {
    if (!clientId || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_reports')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mapped: ReportRecord[] = (data ?? []).map((d: any) => ({
        id: d.id,
        pdfFilename: d.pdf_filename ?? d.nome_arquivo ?? '',
        broker: d.broker ?? d.corretora ?? '',
        reportType: d.report_type ?? d.tipo_relatorio ?? '',
        reportDate: d.report_date ?? d.data_relatorio ?? '',
        status: d.status === 'extracted' ? 'extracted' as ReportStatus :
                d.status === 'processing' ? 'processing' as ReportStatus :
                d.status === 'failed' ? 'failed' as ReportStatus :
                (d.extracted_data && Object.keys(d.extracted_data).length > 0) ? 'extracted' as ReportStatus : 'failed' as ReportStatus,
        extractedData: (d.extracted_data ?? {}) as PerformanceReportData,
        alerts: Array.isArray(d.alerts) ? (d.alerts as string[]) : [],
        technicalSummary: d.technical_summary ?? '',
        commercialSummary: d.commercial_summary ?? '',
        consultantConclusion: d.consultant_conclusion ?? '',
      }));
      setReports(mapped);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !clientId || !user) return;
    if (!uploadBroker) {
      toast.error('Selecione a Corretora/Instituição antes do upload.');
      return;
    }

    const brokerValue = uploadBroker === 'Outros' ? (uploadBrokerOther || 'Outros') : uploadBroker;

    const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const ACCEPTED_EXTS = ['pdf', 'jpg', 'jpeg', 'png'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTS.includes(ext)) {
        toast.error(`"${file.name}" não é PDF ou imagem. Ignorado.`);
        continue;
      }
      uploadSingleFile(file, brokerValue, uploadReportType);
    }
    e.target.value = '';
  };

  const uploadSingleFile = async (file: File, broker: string, reportType: string) => {
    const tempId = `temp_${Date.now()}_${file.name}`;
    setUploadingFiles(prev => new Set(prev).add(tempId));

    // Add a processing placeholder
    setReports(prev => [{
      id: tempId,
      pdfFilename: file.name,
      broker,
      reportType,
      reportDate: '',
      status: 'processing',
      extractedData: {},
      alerts: [],
      technicalSummary: '',
      commercialSummary: '',
      consultantConclusion: '',
    }, ...prev]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId!);
      formData.append('broker', broker);
      if (reportType) formData.append('reportType', reportType);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-performance-report`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errData?.error ?? 'Erro na extração');
      }

      const result = await response.json();
      if (!result?.success) throw new Error(result?.error ?? 'Extração falhou');

      // Replace placeholder with real data
      setReports(prev => prev.map(r => r.id === tempId ? {
        id: result.reportId ?? tempId,
        pdfFilename: result.pdfFilename ?? file.name,
        broker: result.broker ?? broker,
        reportType: result.reportType ?? reportType,
        reportDate: result.reportDate ?? '',
        status: 'extracted' as ReportStatus,
        extractedData: result.extractedData ?? {},
        alerts: Array.isArray(result.alerts) ? result.alerts : [],
        technicalSummary: result.technicalSummary ?? '',
        commercialSummary: result.commercialSummary ?? '',
        consultantConclusion: '',
      } : r));
      toast.success(`"${file.name}" extraído com sucesso!`);
    } catch (err: any) {
      setReports(prev => prev.map(r => r.id === tempId ? { ...r, status: 'failed' as ReportStatus } : r));
      toast.error(`Erro em "${file.name}": ${err?.message ?? 'Erro'}`);
    } finally {
      setUploadingFiles(prev => { const s = new Set(prev); s.delete(tempId); return s; });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!user) return;
    try {
      if (!reportId.startsWith('temp_')) {
        await supabase.from('performance_reports').delete().eq('id', reportId).eq('user_id', user.id);
      }
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success('Relatório removido.');
    } catch (err) {
      toast.error('Erro ao remover relatório.');
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ---------- Consolidated data ----------

  const extractedReports = reports.filter(r => r.status === 'extracted');

  const consolidatedData = useMemo(() => {
    if (extractedReports.length === 0) return null;

    let totalGross = 0;
    let totalNet = 0;
    const allPositions: (Position & { broker: string; pdfFilename: string })[] = [];
    const liqByReport: { gross: number; liq: PerformanceReportData['liquidity'] }[] = [];

    extractedReports.forEach(r => {
      const gd = r.extractedData?.generalData ?? {};
      const gross = gd.grossPatrimony ?? 0;
      const net = gd.netPatrimony ?? 0;
      totalGross += gross;
      totalNet += net;
      liqByReport.push({ gross, liq: r.extractedData?.liquidity ?? {} });

      const positions = Array.isArray(r.extractedData?.positions) ? r.extractedData.positions : [];
      positions.forEach(p => {
        allPositions.push({ ...p, broker: r.broker, pdfFilename: r.pdfFilename });
      });
    });

    // Consolidated liquidity: sum R$ values per band then compute %
    const liqBands = ['dPlus1', 'upTo1Year', 'oneToFiveYears', 'aboveFiveYears'] as const;
    const consolidatedLiq: Record<string, number | null> = {};
    liqBands.forEach(band => {
      let totalVal = 0;
      let hasData = false;
      liqByReport.forEach(({ gross, liq }) => {
        const pct = liq?.[band] ?? null;
        if (pct != null && gross > 0) {
          totalVal += gross * (pct / 100);
          hasData = true;
        }
      });
      consolidatedLiq[band] = hasData && totalGross > 0 ? (totalVal / totalGross) * 100 : null;
    });

    // Consolidated alerts
    const allAlerts: string[] = [];
    extractedReports.forEach(r => {
      r.alerts.forEach(a => {
        allAlerts.push(`[${r.broker || r.pdfFilename}] ${a}`);
      });
    });

    return {
      totalGross,
      totalNet,
      allPositions,
      liquidity: {
        dPlus1: consolidatedLiq.dPlus1,
        upTo1Year: consolidatedLiq.upTo1Year,
        oneToFiveYears: consolidatedLiq.oneToFiveYears,
        aboveFiveYears: consolidatedLiq.aboveFiveYears,
      },
      alerts: allAlerts,
    };
  }, [extractedReports]);

  // ---------- Per-broker data ----------

  const brokerList = useMemo(() => {
    const set = new Set<string>();
    extractedReports.forEach(r => { if (r.broker) set.add(r.broker); });
    return Array.from(set).sort();
  }, [extractedReports]);

  const brokerData = useMemo(() => {
    if (!selectedBroker) return null;
    const brokerReports = extractedReports.filter(r => r.broker === selectedBroker);
    if (brokerReports.length === 0) return null;

    let totalGross = 0;
    let totalNet = 0;
    const allPositions: (Position & { pdfFilename: string })[] = [];
    const liqByReport: { gross: number; liq: PerformanceReportData['liquidity'] }[] = [];

    brokerReports.forEach(r => {
      const gd = r.extractedData?.generalData ?? {};
      totalGross += gd.grossPatrimony ?? 0;
      totalNet += gd.netPatrimony ?? 0;
      liqByReport.push({ gross: gd.grossPatrimony ?? 0, liq: r.extractedData?.liquidity ?? {} });
      (r.extractedData?.positions ?? []).forEach(p => allPositions.push({ ...p, pdfFilename: r.pdfFilename }));
    });

    const liqBands = ['dPlus1', 'upTo1Year', 'oneToFiveYears', 'aboveFiveYears'] as const;
    const consolidatedLiq: Record<string, number | null> = {};
    liqBands.forEach(band => {
      let totalVal = 0; let hasData = false;
      liqByReport.forEach(({ gross, liq }) => {
        const pct = liq?.[band] ?? null;
        if (pct != null && gross > 0) { totalVal += gross * (pct / 100); hasData = true; }
      });
      consolidatedLiq[band] = hasData && totalGross > 0 ? (totalVal / totalGross) * 100 : null;
    });

    const allAlerts: string[] = [];
    brokerReports.forEach(r => r.alerts.forEach(a => allAlerts.push(`[${r.pdfFilename}] ${a}`)));

    return {
      totalGross, totalNet, allPositions,
      liquidity: {
        dPlus1: consolidatedLiq.dPlus1, upTo1Year: consolidatedLiq.upTo1Year,
        oneToFiveYears: consolidatedLiq.oneToFiveYears, aboveFiveYears: consolidatedLiq.aboveFiveYears,
      },
      alerts: allAlerts,
    };
  }, [extractedReports, selectedBroker]);

  // ---------- Per-report data ----------

  const selectedReport = useMemo(() => {
    return extractedReports.find(r => r.id === selectedReportId) ?? null;
  }, [extractedReports, selectedReportId]);

  // ---------- Render helpers ----------

  const renderDataPanel = (
    label: string,
    grossPatrimony: number,
    netPatrimony: number,
    liq: PerformanceReportData['liquidity'],
    positions: (Position & { broker?: string; pdfFilename?: string })[],
    alerts: string[],
    keyPrefix: string,
  ) => {
    const withMat = positions
      .filter(p => p.maturityDate && p.grossBalance != null)
      .map(p => ({ ...p, matDate: new Date(p.maturityDate!) }))
      .filter(p => p.matDate >= new Date())
      .sort((a, b) => a.matDate.getTime() - b.matDate.getTime());

    const now = new Date();
    const in6m = new Date(now); in6m.setMonth(in6m.getMonth() + 6);
    const in12m = new Date(now); in12m.setMonth(in12m.getMonth() + 12);
    const within6m = withMat.filter(p => p.matDate <= in6m);
    const sixTo12m = withMat.filter(p => p.matDate > in6m && p.matDate <= in12m);
    const byYear: Record<string, typeof withMat> = {};
    withMat.forEach(p => {
      const yr = p.matDate.getFullYear().toString();
      if (!byYear[yr]) byYear[yr] = [];
      byYear[yr].push(p);
    });

    return (
      <div className="space-y-4">
        {/* Patrimônio */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-3">{label}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Patrimônio Bruto</p>
              <p className="text-lg font-bold text-foreground">R$ {fmt(grossPatrimony)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patrimônio Líquido</p>
              <p className="text-lg font-bold text-foreground">R$ {fmt(netPatrimony)}</p>
            </div>
          </div>
        </div>

        {/* Liquidez */}
        {liq && (liq.dPlus1 != null || liq.upTo1Year != null || liq.oneToFiveYears != null || liq.aboveFiveYears != null) && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
            <h4 className="font-semibold text-foreground">Liquidez por Prazo</h4>
            {grossPatrimony <= 0 && <p className="text-xs text-destructive">⚠ Sem patrimônio bruto para calcular valores em R$.</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'D+1', value: liq.dPlus1 },
                { label: 'Até 1 ano', value: liq.upTo1Year },
                { label: '1 a 5 anos', value: liq.oneToFiveYears },
                { label: 'Acima de 5 anos', value: liq.aboveFiveYears },
              ].map(({ label: l, value }) => (
                <div key={l}>
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="text-lg font-bold text-foreground">{fmtPct(value)}</p>
                  {value != null && grossPatrimony > 0 && (
                    <p className="text-xs text-muted-foreground">R$ {fmt(grossPatrimony * (value / 100))}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vencimentos */}
        {withMat.length > 0 && (() => {
          // Get unique brokers from maturity items
          const agendaBrokers = Array.from(new Set(withMat.map(p => (p as any).broker).filter(Boolean))).sort() as string[];
          const filteredMat = agendaBrokerFilter === 'all' ? withMat : withMat.filter(p => (p as any).broker === agendaBrokerFilter);
          const filteredWithin6m = filteredMat.filter(p => p.matDate <= in6m);
          const filteredSixTo12m = filteredMat.filter(p => p.matDate > in6m && p.matDate <= in12m);
          const filteredByYear: Record<string, typeof filteredMat> = {};
          filteredMat.forEach(p => {
            const yr = p.matDate.getFullYear().toString();
            if (!filteredByYear[yr]) filteredByYear[yr] = [];
            filteredByYear[yr].push(p);
          });

          return (
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-semibold text-foreground">Agenda de Vencimentos</h4>
                {agendaBrokers.length > 1 && (
                  <Select value={agendaBrokerFilter} onValueChange={setAgendaBrokerFilter}>
                    <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas corretoras</SelectItem>
                      {agendaBrokers.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {[
                { label: 'Até 6 meses', items: filteredWithin6m },
                { label: '6 a 12 meses', items: filteredSixTo12m },
              ].filter(b => b.items.length > 0).map(({ label: l, items }) => {
                const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
                return (
                  <div key={l} className="p-3 bg-accent/30 rounded border border-border space-y-1">
                    <p className="text-sm font-medium">{l}: {items.length} {items.length === 1 ? 'ativo' : 'ativos'} | Total: R$ {fmt(total)}</p>
                    {items.slice(0, 10).map((p, i) => (
                      <p key={i} className="text-xs text-muted-foreground pl-4">
                        {p.name} | Venc: {new Date(p.maturityDate!).toLocaleDateString('pt-BR')} | R$ {fmt(p.grossBalance)}
                        {(p as any).broker ? ` | Origem: ${(p as any).broker}` : ''}{(p as any).pdfFilename ? ` – ${(p as any).pdfFilename}` : ''}
                      </p>
                    ))}
                    {items.length > 10 && <p className="text-xs text-muted-foreground pl-4">...e mais {items.length - 10}</p>}
                  </div>
                );
              })}

              {Object.entries(filteredByYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, items]) => {
                const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
                const pctPat = grossPatrimony > 0 ? (total / grossPatrimony) * 100 : 0;
                return (
                  <div key={year} className="p-3 bg-accent/30 rounded border border-border space-y-1">
                    <p className="text-sm font-medium">Ano {year}: {items.length} ativos | R$ {fmt(total)} | {fmtPct(pctPat)} do patrimônio</p>
                    {items.slice(0, 10).map((p, i) => (
                      <p key={i} className="text-xs text-muted-foreground pl-4">
                        {p.name} | Venc: {new Date(p.maturityDate!).toLocaleDateString('pt-BR')} | R$ {fmt(p.grossBalance)}
                        {(p as any).broker ? ` | Origem: ${(p as any).broker}` : ''}{(p as any).pdfFilename ? ` – ${(p as any).pdfFilename}` : ''}
                      </p>
                    ))}
                    {items.length > 10 && <p className="text-xs text-muted-foreground pl-4">...e mais {items.length - 10}</p>}
                  </div>
                );
              })}
              {filteredMat.length === 0 && <p className="text-xs text-muted-foreground">Nenhum vencimento encontrado para o filtro selecionado.</p>}
            </div>
          );
        })()}

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Alertas Estratégicos
            </h4>
            {alerts.map((a, i) => (
              <div key={i} className="p-2 bg-destructive/10 rounded text-xs text-foreground border border-destructive/20">{a}</div>
            ))}
          </div>
        )}

        {/* Posições Table */}
        {positions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Posições ({positions.length})</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Indexador</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{p.name ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.type ?? '—'}</Badge></TableCell>
                      <TableCell className="text-xs">{p.indexer ?? '—'}</TableCell>
                      <TableCell className="text-xs">{p.rate ?? '—'}</TableCell>
                      <TableCell className="text-xs">{p.maturityDate ? new Date(p.maturityDate).toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell className="text-right text-xs">R$ {fmt(p.grossBalance)}</TableCell>
                      <TableCell className="text-right text-xs">{fmtPct(p.portfolioPct)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(p as any).broker ? `${(p as any).broker}` : '—'}
                        {(p as any).pdfFilename ? ` – ${(p as any).pdfFilename}` : ''}
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
  };

  const renderSummaries = (techSummary: string, commSummary: string, keyPrefix: string) => (
    <div className="space-y-4">
      {techSummary && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">📄 Relatório Técnico</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(techSummary, `${keyPrefix}_tech`)}>
              {copiedField === `${keyPrefix}_tech` ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans max-h-[300px] overflow-y-auto">{techSummary}</pre>
        </div>
      )}
      {commSummary && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">💬 Resumo Comercial (WhatsApp)</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(commSummary, `${keyPrefix}_comm`)}>
              {copiedField === `${keyPrefix}_comm` ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">{commSummary}</pre>
        </div>
      )}
    </div>
  );

  // Build consolidated summaries
  const consolidatedTechSummary = useMemo(() => {
    if (!consolidatedData) return '';
    const lines: string[] = ['RELATÓRIO CONSOLIDADO — TODAS AS CORRETORAS', '═'.repeat(50), ''];
    lines.push(`Patrimônio Bruto Total: R$ ${fmt(consolidatedData.totalGross)}`);
    lines.push(`Patrimônio Líquido Total: R$ ${fmt(consolidatedData.totalNet)}`);
    lines.push(`Relatórios analisados: ${extractedReports.length}`);
    lines.push(`Corretoras: ${brokerList.join(', ') || 'N/A'}`);
    lines.push('');
    extractedReports.forEach(r => {
      const gd = r.extractedData?.generalData ?? {};
      lines.push(`► ${r.broker || 'N/A'} — ${r.pdfFilename}: R$ ${fmt(gd.grossPatrimony)}`);
    });

    // Per-position listing with origin
    if (consolidatedData.allPositions.length > 0) {
      lines.push('', '─'.repeat(50), 'POSIÇÕES CONSOLIDADAS', '');
      consolidatedData.allPositions.forEach(p => {
        const venc = p.maturityDate ? new Date(p.maturityDate).toLocaleDateString('pt-BR') : '—';
        lines.push(`${p.name} | ${p.type || '—'} | Venc: ${venc} | R$ ${fmt(p.grossBalance)} | Origem: ${p.broker || 'N/A'} – ${p.pdfFilename || 'N/A'}`);
      });
    }

    // Per-broker breakdown
    if (brokerList.length > 0) {
      lines.push('', '═'.repeat(50), 'DETALHAMENTO POR CORRETORA', '═'.repeat(50));
      brokerList.forEach(broker => {
        const brokerPositions = consolidatedData.allPositions.filter(p => p.broker === broker);
        const brokerReports = extractedReports.filter(r => r.broker === broker);
        const brokerGross = brokerReports.reduce((s, r) => s + (r.extractedData?.generalData?.grossPatrimony ?? 0), 0);
        
        lines.push('', `▸ ${broker}`, '─'.repeat(40));
        lines.push(`  Patrimônio: R$ ${fmt(brokerGross)} | ${brokerPositions.length} ativos`);
        
        // Maturity by year for this broker
        const withMatBroker = brokerPositions
          .filter(p => p.maturityDate && new Date(p.maturityDate) >= new Date())
          .sort((a, b) => new Date(a.maturityDate!).getTime() - new Date(b.maturityDate!).getTime());

        if (withMatBroker.length > 0) {
          const byYearBroker: Record<string, typeof withMatBroker> = {};
          withMatBroker.forEach(p => {
            const yr = new Date(p.maturityDate!).getFullYear().toString();
            if (!byYearBroker[yr]) byYearBroker[yr] = [];
            byYearBroker[yr].push(p);
          });
          lines.push('  Vencimentos:');
          Object.entries(byYearBroker).sort(([a], [b]) => a.localeCompare(b)).forEach(([year, items]) => {
            const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
            lines.push(`    ${year}: ${items.length} ativos | R$ ${fmt(total)}`);
            items.forEach(p => {
              lines.push(`      - ${p.name} | Venc: ${new Date(p.maturityDate!).toLocaleDateString('pt-BR')} | R$ ${fmt(p.grossBalance)}`);
            });
          });
        }

        // Liquidity for this broker
        const brokerLiqReports = brokerReports.map(r => ({
          gross: r.extractedData?.generalData?.grossPatrimony ?? 0,
          liq: r.extractedData?.liquidity ?? {},
        }));
        const liqBands = ['dPlus1', 'upTo1Year', 'oneToFiveYears', 'aboveFiveYears'] as const;
        const liqLabels: Record<string, string> = { dPlus1: 'D+1', upTo1Year: 'Até 1 ano', oneToFiveYears: '1-5 anos', aboveFiveYears: '5+ anos' };
        const liqParts: string[] = [];
        liqBands.forEach(band => {
          let totalVal = 0; let hasData = false;
          brokerLiqReports.forEach(({ gross, liq }) => {
            const pct = liq?.[band] ?? null;
            if (pct != null && gross > 0) { totalVal += gross * (pct / 100); hasData = true; }
          });
          if (hasData && brokerGross > 0) {
            liqParts.push(`${liqLabels[band]}: ${((totalVal / brokerGross) * 100).toFixed(1)}% (R$ ${fmt(totalVal)})`);
          }
        });
        if (liqParts.length > 0) {
          lines.push(`  Liquidez: ${liqParts.join(' | ')}`);
        }
      });
    }

    if (consolidatedData.alerts.length > 0) {
      lines.push('', '─'.repeat(50), 'ALERTAS:', ...consolidatedData.alerts);
    }
    return lines.join('\n');
  }, [consolidatedData, extractedReports, brokerList]);

  const consolidatedCommSummary = useMemo(() => {
    if (!consolidatedData) return '';
    const parts: string[] = [];
    parts.push(`Olá! Segue a análise consolidada da sua carteira:\n`);
    parts.push(`📊 *Patrimônio total:* R$ ${fmt(consolidatedData.totalGross)}`);
    parts.push(`📋 *Relatórios:* ${extractedReports.length} (${brokerList.join(', ')})\n`);
    if (consolidatedData.alerts.length > 0) {
      parts.push(`⚠️ *Alertas:* ${consolidatedData.alerts.length} pontos de atenção identificados.\n`);
    }
    parts.push(`📌 *Próximo passo:* Agendar reunião para discutir a visão consolidada.`);

    // Origin line with per-broker totals
    if (brokerList.length > 0) {
      const brokerTotals = brokerList.map(broker => {
        const total = extractedReports
          .filter(r => r.broker === broker)
          .reduce((s, r) => s + (r.extractedData?.generalData?.grossPatrimony ?? 0), 0);
        return `${broker} (R$ ${fmt(total)})`;
      });
      parts.push(`\n📎 *Origem dos dados:* ${brokerTotals.join(' | ')}`);
    }

    return parts.join('\n');
  }, [consolidatedData, extractedReports, brokerList]);

  // ---------- Render ----------

  if (!clientId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Salve o cliente primeiro para utilizar o Relatório de Performance.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-muted-foreground">Carregando relatórios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
        <h4 className="font-semibold text-foreground">Relatórios (PDF / Imagens)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Corretora/Instituição *</Label>
            <Select value={uploadBroker} onValueChange={setUploadBroker}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {BROKERS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            {uploadBroker === 'Outros' && (
              <Input value={uploadBrokerOther} onChange={e => setUploadBrokerOther(e.target.value)} placeholder="Nome da instituição" className="mt-1 h-8 text-xs" />
            )}
          </div>
          <div>
            <Label className="text-xs">Tipo de relatório</Label>
            <Select value={uploadReportType} onValueChange={setUploadReportType}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Opcional..." /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Label className="cursor-pointer w-full">
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors h-9">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Anexar PDF / Imagem</span>
              </div>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/jpg,.pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingFiles.size > 0} />
            </Label>
          </div>
        </div>

        {/* Reports list */}
        {reports.length > 0 && (
          <div className="space-y-2 mt-3">
            <Label className="text-xs text-muted-foreground">PDFs anexados ({reports.length})</Label>
            {reports.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2 bg-card rounded border border-border">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{r.pdfFilename}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.broker && <span>{r.broker} • </span>}
                    {r.reportType && <span>{r.reportType} • </span>}
                    {r.reportDate && <span>{new Date(r.reportDate).toLocaleDateString('pt-BR')} • </span>}
                    <Badge variant={r.status === 'extracted' ? 'default' : r.status === 'processing' ? 'secondary' : 'destructive'} className="text-[10px] py-0">
                      {r.status === 'extracted' ? 'Extraído' : r.status === 'processing' ? 'Processando...' : 'Falhou'}
                    </Badge>
                  </p>
                </div>
                {r.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteReport(r.id)} className="h-7 w-7 p-0">
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Tabs */}
      {extractedReports.length > 0 && consolidatedData && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="text-xs">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="consolidated" className="text-xs">Consolidação Geral</TabsTrigger>
            <TabsTrigger value="broker" className="text-xs">Por Corretora</TabsTrigger>
            <TabsTrigger value="report" className="text-xs">Por Relatório</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="mt-4">
            <LiquidityDashboard reports={reports.map(r => ({
              id: r.id,
              pdfFilename: r.pdfFilename,
              broker: r.broker,
              reportType: r.reportType,
              reportDate: r.reportDate,
              status: r.status,
              extractedData: r.extractedData,
              alerts: r.alerts,
            }))} />
          </TabsContent>

          {/* A) Consolidated */}
          <TabsContent value="consolidated" className="space-y-4 mt-4">
            {renderDataPanel(
              `Consolidação Geral (${extractedReports.length} relatório${extractedReports.length > 1 ? 's' : ''})`,
              consolidatedData.totalGross,
              consolidatedData.totalNet,
              consolidatedData.liquidity,
              consolidatedData.allPositions,
              consolidatedData.alerts,
              'cons',
            )}
            <RelatorioExecutivoLiquidez
              grossPatrimony={consolidatedData.totalGross}
              liquidity={consolidatedData.liquidity}
              positions={consolidatedData.allPositions}
              investorProfile={investorProfile}
              consultantObservation={executiveObservation}
              onObservationChange={setExecutiveObservation}
              onObservationBlur={() => {}}
            />
            {renderSummaries(consolidatedTechSummary, consolidatedCommSummary, 'cons')}
          </TabsContent>

          {/* B) Per Broker */}
          <TabsContent value="broker" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Selecionar corretora</Label>
              <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                <SelectTrigger className="w-64 h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {brokerList.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {brokerData && (
              <>
                {renderDataPanel(
                  `Resumo — ${selectedBroker}`,
                  brokerData.totalGross,
                  brokerData.totalNet,
                  brokerData.liquidity,
                  brokerData.allPositions,
                  brokerData.alerts,
                  'broker',
                )}
                {renderSummaries(
                  extractedReports.filter(r => r.broker === selectedBroker).map(r => r.technicalSummary).filter(Boolean).join('\n\n---\n\n'),
                  extractedReports.filter(r => r.broker === selectedBroker).map(r => r.commercialSummary).filter(Boolean).join('\n\n---\n\n'),
                  'broker',
                )}
              </>
            )}
            {!selectedBroker && <p className="text-sm text-muted-foreground py-4">Selecione uma corretora para ver o resumo.</p>}
          </TabsContent>

          {/* C) Per Report */}
          <TabsContent value="report" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Selecionar relatório (PDF)</Label>
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="w-full max-w-md h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {extractedReports.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.broker ? `${r.broker} — ` : ''}{r.pdfFilename}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedReport && (() => {
              const gd = selectedReport.extractedData?.generalData ?? {};
              const positions = Array.isArray(selectedReport.extractedData?.positions) ? selectedReport.extractedData.positions : [];
              return (
                <>
                  {renderDataPanel(
                    `${selectedReport.broker || 'Relatório'} — ${selectedReport.pdfFilename}`,
                    gd.grossPatrimony ?? 0,
                    gd.netPatrimony ?? 0,
                    selectedReport.extractedData?.liquidity ?? {},
                    positions.map(p => ({ ...p, broker: selectedReport.broker, pdfFilename: selectedReport.pdfFilename })),
                    selectedReport.alerts,
                    'report',
                  )}

                  {/* Exposição por Indexador */}
                  {(() => {
                    const ie = selectedReport.extractedData?.indexerExposure ?? {};
                    if (ie.ipca == null && ie.prefixed == null && ie.postFixed == null) return null;
                    return (
                      <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                        <h4 className="font-semibold text-foreground">Exposição por Indexador</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {ie.ipca != null && <div><p className="text-xs text-muted-foreground">IPCA+</p><p className={`text-lg font-bold ${(ie.ipca ?? 0) > 60 ? 'text-destructive' : 'text-foreground'}`}>{fmtPct(ie.ipca)}</p></div>}
                          {ie.prefixed != null && <div><p className="text-xs text-muted-foreground">Prefixado</p><p className={`text-lg font-bold ${(ie.prefixed ?? 0) > 50 ? 'text-destructive' : 'text-foreground'}`}>{fmtPct(ie.prefixed)}</p></div>}
                          {ie.postFixed != null && <div><p className="text-xs text-muted-foreground">Pós-fixado</p><p className={`text-lg font-bold ${(ie.postFixed ?? 0) < 5 ? 'text-destructive' : 'text-foreground'}`}>{fmtPct(ie.postFixed)}</p></div>}
                          {ie.other != null && <div><p className="text-xs text-muted-foreground">Outros</p><p className="text-lg font-bold text-foreground">{fmtPct(ie.other)}</p></div>}
                        </div>
                      </div>
                    );
                  })()}

                  {renderSummaries(selectedReport.technicalSummary, selectedReport.commercialSummary, 'rpt')}
                </>
              );
            })()}
            {!selectedReportId && <p className="text-sm text-muted-foreground py-4">Selecione um relatório para ver os detalhes.</p>}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum relatório anexado</p>
          <p className="text-xs mt-1">Selecione a corretora e faça upload de PDFs para extrair dados financeiros.</p>
        </div>
      )}
    </div>
  );
}
