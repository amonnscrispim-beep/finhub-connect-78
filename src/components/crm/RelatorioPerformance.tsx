import { useState, useEffect } from 'react';
import { Upload, FileText, AlertTriangle, Copy, Check, Edit3, RotateCcw, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  positions?: Array<{
    name: string;
    type: string;
    indexer: string;
    rate: string;
    maturityDate: string | null;
    grossBalance: number;
    portfolioPct: number;
  }>;
  indexerExposure?: {
    ipca?: number | null;
    prefixed?: number | null;
    postFixed?: number | null;
    other?: number | null;
  };
  reportDate?: string | null;
}

type ModuleState = 'idle' | 'loading' | 'extracted' | 'failed';

interface RelatorioPerformanceProps {
  clientId?: string;
}

const fmt = (v: number | null | undefined) => {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
};

export function RelatorioPerformance({ clientId }: RelatorioPerformanceProps) {
  const { user } = useAuth();
  const [moduleState, setModuleState] = useState<ModuleState>('idle');
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState('');

  const [reportData, setReportData] = useState<PerformanceReportData | null>(null);
  const [originalData, setOriginalData] = useState<PerformanceReportData | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [technicalSummary, setTechnicalSummary] = useState('');
  const [commercialSummary, setCommercialSummary] = useState('');
  const [consultantConclusion, setConsultantConclusion] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [pdfFilename, setPdfFilename] = useState('');

  // Load existing report data
  useEffect(() => {
    if (!clientId || !user) return;
    loadReport();
  }, [clientId, user]);

  const loadReport = async () => {
    if (!clientId || !user) return;
    setIsInitialLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_performance_reports')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const extracted = (data.extracted_data ?? {}) as PerformanceReportData;
        setReportData(extracted);
        setOriginalData(extracted);
        setAlerts(Array.isArray(data.alerts) ? (data.alerts as string[]) : []);
        setTechnicalSummary(data.technical_summary ?? '');
        setCommercialSummary(data.commercial_summary ?? '');
        setConsultantConclusion(data.consultant_conclusion ?? '');
        setReportDate(data.report_date ?? '');
        setPdfFilename(data.pdf_filename ?? '');
        setModuleState('extracted');
      }
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId || !user) return;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são aceitos.');
      return;
    }

    setModuleState('loading');
    setFailureMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-performance-report`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errData?.error ?? 'Erro na extração');
      }

      const result = await response.json();
      
      if (!result?.success) {
        throw new Error(result?.error ?? 'Extração retornou sem sucesso');
      }

      setReportData(result.extractedData ?? {});
      setOriginalData(result.extractedData ?? {});
      setAlerts(Array.isArray(result.alerts) ? result.alerts : []);
      setTechnicalSummary(result.technicalSummary ?? '');
      setCommercialSummary(result.commercialSummary ?? '');
      setReportDate(result.reportDate ?? '');
      setPdfFilename(result.pdfFilename ?? '');
      setEditMode(false);
      setModuleState('extracted');
      toast.success('Relatório extraído com sucesso!');
    } catch (err: any) {
      console.error('Extraction error:', err);
      setModuleState('failed');
      setFailureMessage(err?.message ?? 'Erro ao extrair dados do PDF');
      toast.error(err?.message ?? 'Erro ao extrair dados do PDF');
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRestoreOriginal = () => {
    if (originalData) {
      setReportData(originalData);
      setEditMode(false);
      toast.success('Dados restaurados do PDF original.');
    }
  };

  const handleSaveConclusion = async () => {
    if (!clientId || !user) return;
    try {
      await supabase
        .from('client_performance_reports')
        .update({ consultant_conclusion: consultantConclusion, updated_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .eq('user_id', user.id);
      toast.success('Conclusão salva.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar conclusão.');
    }
  };

  const handlePositionChange = (index: number, field: string, value: string) => {
    const positions = reportData?.positions;
    if (!Array.isArray(positions)) return;
    setReportData(prev => {
      if (!prev?.positions) return prev;
      const updated = [...prev.positions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, positions: updated };
    });
  };

  // Safe accessors
  const positions = Array.isArray(reportData?.positions) ? reportData.positions : [];
  const gd = reportData?.generalData ?? {};
  const liq = reportData?.liquidity ?? {};
  const ie = reportData?.indexerExposure ?? {};

  if (!clientId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Salve o cliente primeiro para utilizar o Relatório de Performance.</p>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-muted-foreground">Carregando relatório...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              <Upload className="w-4 h-4" />
              <span>{moduleState === 'loading' ? 'Extraindo...' : (reportData ? 'Substituir PDF' : 'Upload do Relatório (PDF)')}</span>
              {moduleState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={moduleState === 'loading'}
            />
          </Label>
          {pdfFilename && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{pdfFilename}</span>
            </div>
          )}
        </div>

        {/* Report Date */}
        {(moduleState === 'extracted' || reportDate) && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm">Data do Relatório:</Label>
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="crm-input w-48"
            />
          </div>
        )}
      </div>

      {/* Loading state */}
      {moduleState === 'loading' && (
        <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm font-medium">Extraindo dados do PDF com IA...</p>
          <Progress value={undefined} className="h-2" />
          <p className="text-xs text-muted-foreground">Analisando patrimônio, posições, vencimentos e riscos...</p>
        </div>
      )}

      {/* Failed state */}
      {moduleState === 'failed' && (
        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30 space-y-2">
          <p className="text-sm font-medium text-foreground">
            Não foi possível extrair automaticamente.
          </p>
          <p className="text-xs text-muted-foreground">
            {failureMessage || 'Erro desconhecido durante a extração.'}
          </p>
          <p className="text-xs text-muted-foreground">
            Tente novamente com outro PDF ou clique em "Editar manualmente" para inserir os dados.
          </p>
        </div>
      )}

      {/* Extracted state — show data */}
      {moduleState === 'extracted' && reportData && (
        <>
          {/* Edit Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              {editMode ? 'Modo Edição Ativo' : 'Editar manualmente'}
            </Button>
            {editMode && (
              <Button type="button" variant="outline" size="sm" onClick={handleRestoreOriginal}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Restaurar dados do PDF
              </Button>
            )}
          </div>

          {/* Dados Gerais */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
            <h4 className="font-semibold text-foreground">Dados Gerais</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Patrimônio Bruto</p>
                <p className="text-lg font-bold text-foreground">R$ {fmt(gd.grossPatrimony)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Patrimônio Líquido</p>
                <p className="text-lg font-bold text-foreground">R$ {fmt(gd.netPatrimony)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rent. Mês</p>
                <p className="text-lg font-bold text-foreground">{fmtPct(gd.monthReturn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rent. Ano</p>
                <p className="text-lg font-bold text-foreground">{fmtPct(gd.yearReturn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rent. 12 Meses</p>
                <p className="text-lg font-bold text-foreground">{fmtPct(gd.twelveMonthReturn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rent. Acumulada</p>
                <p className="text-lg font-bold text-foreground">{fmtPct(gd.cumulativeReturn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CDI Equivalente</p>
                <p className="text-lg font-bold text-foreground">{fmtPct(gd.cdiEquivalent)}</p>
              </div>
            </div>
          </div>

          {/* Liquidez por Prazo */}
          {(liq.dPlus1 != null || liq.upTo1Year != null || liq.oneToFiveYears != null || liq.aboveFiveYears != null) && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              <h4 className="font-semibold text-foreground">Liquidez por Prazo</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">D+1</p>
                  <p className="text-lg font-bold text-foreground">{fmtPct(liq.dPlus1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Até 1 ano</p>
                  <p className="text-lg font-bold text-foreground">{fmtPct(liq.upTo1Year)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">1 a 5 anos</p>
                  <p className="text-lg font-bold text-foreground">{fmtPct(liq.oneToFiveYears)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Acima de 5 anos</p>
                  <p className="text-lg font-bold text-foreground">{fmtPct(liq.aboveFiveYears)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Posições */}
          {positions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Posições ({positions.length})</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Nome do Ativo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Indexador</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Saldo (R$)</TableHead>
                      <TableHead className="text-right">% Carteira</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((pos, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">{pos?.name ?? '—'}</TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              value={pos?.type ?? ''}
                              onChange={(e) => handlePositionChange(idx, 'type', e.target.value)}
                              className="crm-input h-8 text-xs w-24"
                            />
                          ) : (
                            <Badge variant="outline" className="text-xs">{pos?.type ?? '—'}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{pos?.indexer ?? '—'}</TableCell>
                        <TableCell className="text-xs">{pos?.rate ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          {editMode ? (
                            <Input
                              type="date"
                              value={pos?.maturityDate ?? ''}
                              onChange={(e) => handlePositionChange(idx, 'maturityDate', e.target.value)}
                              className="crm-input h-8 text-xs w-32"
                            />
                          ) : (
                            pos?.maturityDate ? new Date(pos.maturityDate).toLocaleDateString('pt-BR') : '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">R$ {fmt(pos?.grossBalance)}</TableCell>
                        <TableCell className="text-right text-xs">{fmtPct(pos?.portfolioPct)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Exposição por Indexador */}
          {(ie.ipca != null || ie.prefixed != null || ie.postFixed != null || ie.other != null) && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              <h4 className="font-semibold text-foreground">Exposição por Indexador</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ie.ipca != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">IPCA+</p>
                    <p className={`text-lg font-bold ${(ie.ipca ?? 0) > 60 ? 'text-destructive' : 'text-foreground'}`}>
                      {fmtPct(ie.ipca)}
                    </p>
                  </div>
                )}
                {ie.prefixed != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Prefixado</p>
                    <p className={`text-lg font-bold ${(ie.prefixed ?? 0) > 50 ? 'text-destructive' : 'text-foreground'}`}>
                      {fmtPct(ie.prefixed)}
                    </p>
                  </div>
                )}
                {ie.postFixed != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Pós-fixado</p>
                    <p className={`text-lg font-bold ${(ie.postFixed ?? 0) < 5 ? 'text-destructive' : 'text-foreground'}`}>
                      {fmtPct(ie.postFixed)}
                    </p>
                  </div>
                )}
                {ie.other != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Outros</p>
                    <p className="text-lg font-bold text-foreground">{fmtPct(ie.other)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alertas Estratégicos */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Alertas Estratégicos
            </h4>
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="p-2 bg-destructive/10 rounded text-sm text-foreground border border-destructive/20">
                    {alert}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">✅ Estrutura equilibrada dentro dos parâmetros definidos.</p>
            )}
          </div>

          {/* Resumo Técnico — only when extracted */}
          {technicalSummary && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">📄 Resumo Técnico (Automático)</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(technicalSummary, 'technical')}
                >
                  {copiedField === 'technical' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{technicalSummary}</pre>
            </div>
          )}

          {/* Resumo Comercial — only when extracted */}
          {commercialSummary && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">💬 Resumo Comercial (Automático)</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(commercialSummary, 'commercial')}
                >
                  {copiedField === 'commercial' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{commercialSummary}</pre>
            </div>
          )}

          {/* Conclusão Estratégica do Consultor */}
          <div className="space-y-2">
            <Label className="font-semibold">Conclusão Estratégica do Consultor</Label>
            <Textarea
              value={consultantConclusion}
              onChange={(e) => setConsultantConclusion(e.target.value)}
              onBlur={handleSaveConclusion}
              placeholder="Registre sua análise personalizada, recomendações e próximos passos estratégicos..."
              className="crm-input min-h-[100px]"
            />
          </div>
        </>
      )}

      {/* Idle state — no data yet */}
      {moduleState === 'idle' && !reportData && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum relatório anexado</p>
          <p className="text-xs mt-1">Faça upload de um PDF para extrair automaticamente os dados financeiros.</p>
        </div>
      )}
    </div>
  );
}
