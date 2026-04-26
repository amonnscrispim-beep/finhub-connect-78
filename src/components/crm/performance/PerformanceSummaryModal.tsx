import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, Loader2, X, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generatePerformancePdf } from '@/lib/performance-pdf';
import { buildRichSnapshot, fmtBRL, fmtPct, type PerformanceSnapshotRich } from './performance-calculations';
import { toast } from 'sonner';

// Mantemos o tipo antigo exportado para compatibilidade com importações existentes
export interface PerformanceSnapshot extends PerformanceSnapshotRich {}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: any[];
  clientName: string;
}

interface SummaryBlocks {
  executive_summary: string;
  patrimonial_situation: string;
  monthly_performance: string;
  portfolio_composition: string;
  future_projection: string;
  consultant_comments: string;
  next_steps: string;
}

const EMPTY: SummaryBlocks = {
  executive_summary: '',
  patrimonial_situation: '',
  monthly_performance: '',
  portfolio_composition: '',
  future_projection: '',
  consultant_comments: '',
  next_steps: '',
};

export function PerformanceSummaryModal({ open, onOpenChange, reports, clientName }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [advisorName, setAdvisorName] = useState('');
  const [blocks, setBlocks] = useState<SummaryBlocks>(EMPTY);
  const [monthlyAporte, setMonthlyAporte] = useState<number>(0);
  const [snapshot, setSnapshot] = useState<PerformanceSnapshotRich | null>(null);

  const generate = async (aporte: number) => {
    if (!user) return;
    setLoading(true);
    setBlocks(EMPTY);
    try {
      const snap = buildRichSnapshot(reports, clientName, aporte);
      setSnapshot(snap);

      const profilePromise = supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const aiPromise = supabase.functions.invoke('generate-performance-summary', {
        body: { snapshot: snap },
      });

      const [profileRes, aiRes] = await Promise.all([profilePromise, aiPromise]);
      setAdvisorName(profileRes.data?.full_name || '');

      if (aiRes.error) {
        console.error('AI summary error:', aiRes.error);
        toast.error('Erro ao gerar resumo via IA');
        return;
      }
      const summary = (aiRes.data as { summary?: SummaryBlocks })?.summary;
      if (summary) setBlocks({ ...EMPTY, ...summary });
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar resumo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !user) return;
    generate(monthlyAporte);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const update = (key: keyof SummaryBlocks, value: string) =>
    setBlocks(prev => ({ ...prev, [key]: value }));

  const handleRecalc = () => {
    if (!snapshot) return;
    // recalcula apenas as projeções localmente sem chamar IA novamente
    const fresh = buildRichSnapshot(reports, clientName, monthlyAporte);
    setSnapshot(fresh);
  };

  const handleGeneratePdf = () => {
    if (!snapshot) return;
    setGenerating(true);
    try {
      generatePerformancePdf({
        snapshot,
        advisorName,
        blocks,
        filename: `Resumo_Performance_${clientName.replace(/\s+/g, '_')}_${new Date()
          .toISOString().slice(0, 10)}`,
      });
      toast.success('PDF gerado com sucesso!');
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="max-w-4xl h-[92vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Resumo do Relatório de Performance
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Gerado por IA (Lovable AI Gateway) com base nos dados extraídos. Edite cada bloco antes de exportar o PDF Gofferje Investimentos.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              Calculando consolidado, alpha vs CDI, projeções e gerando texto…
            </div>
          ) : snapshot ? (
            <div className="space-y-6">
              {/* ─── Cards de destaque ─── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card label="Patrimônio Bruto" value={fmtBRL(snapshot.totalGross)} highlight />
                <Card label="Ganho Líquido (período)" value={fmtBRL(snapshot.netGainBRL)} positive />
                <Card label="% do CDI no ano" value={snapshot.pctOfCdiYear != null ? `${snapshot.pctOfCdiYear.toFixed(0)}%` : '—'} positive />
                <Card label="Alpha vs CDI (R$)" value={fmtBRL(snapshot.alphaVsCdiBRL)} positive />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card label="Isento de IR" value={fmtBRL(snapshot.taxExemptValueBRL)} sub={`${snapshot.taxExemptPct.toFixed(1)}% da carteira`} />
                <Card label="Rentab. Ano" value={fmtPct(snapshot.yearReturnPct)} sub={`CDI ${fmtPct(snapshot.cdiYearPct)}`} />
                <Card label="Período" value={snapshot.reportPeriodLabel} sub={`${snapshot.reportsCount} relatório(s)`} />
              </div>

              {/* ─── Aporte mensal para projeção ─── */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Aporte mensal para a projeção (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    value={monthlyAporte}
                    onChange={(e) => setMonthlyAporte(Number(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleRecalc}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Recalcular projeção
                </Button>
              </div>

              {/* ─── Blocos editáveis ─── */}
              <Section label="Sumário Executivo" value={blocks.executive_summary} onChange={(v) => update('executive_summary', v)} rows={5} />
              <Section label="Situação Patrimonial" value={blocks.patrimonial_situation} onChange={(v) => update('patrimonial_situation', v)} rows={4} />
              <Section label="Performance Mês a Mês" value={blocks.monthly_performance} onChange={(v) => update('monthly_performance', v)} rows={4} />
              <Section label="Composição & Isenção de IR" value={blocks.portfolio_composition} onChange={(v) => update('portfolio_composition', v)} rows={4} />
              <Section label="Projeção Futura" value={blocks.future_projection} onChange={(v) => update('future_projection', v)} rows={4} />
              <Section label="Comentários do Consultor" value={blocks.consultant_comments} onChange={(v) => update('consultant_comments', v)} rows={4} />
              <Section label="Próximos Passos" value={blocks.next_steps} onChange={(v) => update('next_steps', v)} rows={3} />
            </div>
          ) : null}
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGeneratePdf}
            disabled={loading || generating || !snapshot}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileDown className="w-3.5 h-3.5 mr-1" />
            {generating ? 'Gerando…' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Card({ label, value, sub, highlight, positive }: { label: string; value: string; sub?: string; highlight?: boolean; positive?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-primary/10 border-primary/30' : positive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/20 border-border'}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="text-sm" />
    </div>
  );
}
