import { useRef, useState } from 'react';
import { Sparkles, Loader2, Building2, Layers, TrendingUp, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmissorRow {
  nome: string;
  setor: string;
  valor: number;
  percentual: number;
  ativos_count: number;
}
interface SetorRow {
  nome: string;
  emissores_count: number;
  valor: number;
  percentual: number;
}
interface IndexerEntry { valor: number; percentual: number }

interface FixedIncomeResult {
  patrimonio_bruto_total: number;
  total_renda_fixa: number;
  emissores: EmissorRow[];
  setores: SetorRow[];
  indexadores: {
    pos_fixado_cdi?: IndexerEntry;
    pos_fixado_selic?: IndexerEntry;
    pre_fixado?: IndexerEntry;
    ipca?: IndexerEntry;
    outros?: IndexerEntry;
  };
  observacoes: string[];
}

interface Props {
  reportIds: string[]; // ids dos performance_reports já extraídos
  disabled?: boolean;
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`;

const INDEXER_LABEL: Record<string, string> = {
  pos_fixado_cdi: 'Pós-fixado (CDI)',
  pos_fixado_selic: 'Pós-fixado (Selic)',
  pre_fixado: 'Pré-fixado',
  ipca: 'IPCA+',
  outros: 'Outros',
};

export function FixedIncomeAnalysis({ reportIds, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<FixedIncomeResult | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!exportRef.current || !data) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }
      pdf.save('Analise_Renda_Fixa_Consolidada.pdf');
      toast.success('PDF gerado com sucesso!');
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao gerar PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleAnalyze = async () => {
    if (reportIds.length === 0) {
      toast.error('Nenhum relatório extraído para analisar.');
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        'analyze-fixed-income',
        { body: { reportIds } },
      );
      if (error) throw error;
      if ((result as any)?.error) throw new Error((result as any).error);
      setData(result as FixedIncomeResult);
      toast.success('Análise de Renda Fixa concluída.');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Falha ao analisar Renda Fixa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 bg-card rounded-xl border border-border shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Análise de Renda Fixa (IA)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            A IA lê as posições reais extraídas dos PDFs e quebra por <b>Emissor</b>,
            <b> Setor</b> e <b>Indexador</b>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            disabled={exporting || loading || !data}
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAnalyze}
            disabled={loading || disabled || reportIds.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A IA está analisando as carteiras...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analisar PDFs (Consolidado)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* LOADING SKELETONS */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-40" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-40" />
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !data && (
        <div className="p-6 bg-muted/30 border border-dashed border-border rounded-md text-center">
          <p className="text-sm text-muted-foreground">
            Clique em <b>Analisar PDFs (Consolidado)</b> para que a IA gere a quebra
            de Renda Fixa por emissor, setor e indexador.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {reportIds.length} relatório(s) extraído(s) disponível(eis).
          </p>
        </div>
      )}

      {/* RESULT */}
      {!loading && data && (
        <div className="space-y-6" ref={exportRef}>
          {/* Totais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground">Patrimônio Bruto Total</p>
              <p className="text-2xl font-bold text-foreground">
                R$ {fmtBRL(data.patrimonio_bruto_total ?? 0)}
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground">Total em Renda Fixa</p>
              <p className="text-2xl font-bold text-foreground">
                R$ {fmtBRL(data.total_renda_fixa ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {data.patrimonio_bruto_total
                  ? `${((data.total_renda_fixa / data.patrimonio_bruto_total) * 100).toFixed(1)}% do patrimônio bruto`
                  : ''}
              </p>
            </div>
          </div>

          {/* Indexadores */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Distribuição por Indexador
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(['pos_fixado_cdi','pos_fixado_selic','pre_fixado','ipca','outros'] as const).map(k => {
                const v = data.indexadores?.[k];
                return (
                  <div key={k} className="p-3 bg-muted/30 rounded-md border border-border">
                    <p className="text-[11px] text-muted-foreground">{INDEXER_LABEL[k]}</p>
                    <p className="text-lg font-bold text-foreground">{fmtPct(v?.percentual ?? 0)}</p>
                    <p className="text-[10px] text-muted-foreground">R$ {fmtBRL(v?.valor ?? 0)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Setores */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Concentração por Setor
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Setor</TableHead>
                    <TableHead className="text-right text-xs">Emissores</TableHead>
                    <TableHead className="text-right text-xs">Valor (R$)</TableHead>
                    <TableHead className="text-right text-xs">% RF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.setores.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{s.nome}</TableCell>
                      <TableCell className="text-right text-xs">{s.emissores_count}</TableCell>
                      <TableCell className="text-right text-xs">R$ {fmtBRL(s.valor)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmtPct(s.percentual)}</TableCell>
                    </TableRow>
                  ))}
                  {data.setores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-xs text-muted-foreground text-center py-4">
                        Nenhum setor identificado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Emissores */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Risco por Emissor
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Emissor</TableHead>
                    <TableHead className="text-xs">Setor</TableHead>
                    <TableHead className="text-right text-xs">Ativos</TableHead>
                    <TableHead className="text-right text-xs">Valor (R$)</TableHead>
                    <TableHead className="text-right text-xs">% RF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.emissores.map((e, i) => {
                    const heavy = e.percentual > 20;
                    return (
                      <TableRow key={i} className={heavy ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs font-medium">{e.nome}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.setor}</TableCell>
                        <TableCell className="text-right text-xs">{e.ativos_count}</TableCell>
                        <TableCell className="text-right text-xs">R$ {fmtBRL(e.valor)}</TableCell>
                        <TableCell className={`text-right text-xs font-semibold ${heavy ? 'text-destructive' : ''}`}>
                          {fmtPct(e.percentual)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {data.emissores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-xs text-muted-foreground text-center py-4">
                        Nenhum emissor identificado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Observações */}
          {data.observacoes.length > 0 && (
            <div className="p-3 bg-muted/40 border border-border rounded-md space-y-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Observações da IA
              </p>
              {data.observacoes.map((o, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {o}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
