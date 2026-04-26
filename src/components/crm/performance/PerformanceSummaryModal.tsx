import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateGofferjePdf, type PdfSection } from '@/lib/gofferje-pdf';
import { toast } from 'sonner';

export interface PerformanceSnapshot {
  clientName: string;
  totalGross: number;
  totalNet: number | null;
  netCoverage: { available: number; total: number };
  brokers: { broker: string; totalGross: number }[];
  liquidityBands: { label: string; valueR$: number; pct: number }[];
  alerts: string[];
  reportsCount: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: PerformanceSnapshot | null;
}

interface SummaryBlocks {
  executive_summary: string;
  patrimonial_situation: string;
  portfolio_liquidity: string;
  consultant_comments: string;
  next_steps: string;
}

const EMPTY: SummaryBlocks = {
  executive_summary: '',
  patrimonial_situation: '',
  portfolio_liquidity: '',
  consultant_comments: '',
  next_steps: '',
};

const fmtBRL = (v: number | null | undefined) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));

export function PerformanceSummaryModal({ open, onOpenChange, snapshot }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [advisorName, setAdvisorName] = useState('');
  const [blocks, setBlocks] = useState<SummaryBlocks>(EMPTY);

  useEffect(() => {
    if (!open || !snapshot || !user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setBlocks(EMPTY);

      try {
        // Carrega nome do consultor em paralelo
        const profilePromise = supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const aiPromise = supabase.functions.invoke('generate-performance-summary', {
          body: { snapshot },
        });

        const [profileRes, aiRes] = await Promise.all([profilePromise, aiPromise]);
        if (cancelled) return;

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
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, snapshot, user]);

  const update = (key: keyof SummaryBlocks, value: string) =>
    setBlocks((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = () => {
    if (!snapshot) return;
    setGenerating(true);
    try {
      const sections: PdfSection[] = [
        {
          title: 'Situação Patrimonial',
          paragraphs: [blocks.patrimonial_situation].filter(Boolean),
          callout:
            `Patrimônio Bruto: ${fmtBRL(snapshot.totalGross)} • ` +
            `Patrimônio Líquido: ${snapshot.totalNet != null ? fmtBRL(snapshot.totalNet) : 'não informado'} • ` +
            `${snapshot.reportsCount} relatório(s) analisado(s)`,
          ...(snapshot.brokers.length > 0
            ? {
                table: {
                  head: ['Corretora', 'Patrimônio Bruto'],
                  body: snapshot.brokers.map((b) => [b.broker, fmtBRL(b.totalGross)]),
                  columnStyles: { 1: { halign: 'right' } },
                },
              }
            : {}),
        },
        {
          title: 'Liquidez da Carteira',
          paragraphs: [blocks.portfolio_liquidity].filter(Boolean),
          ...(snapshot.liquidityBands.length > 0
            ? {
                table: {
                  head: ['Faixa de Prazo', 'Valor', '%'],
                  body: snapshot.liquidityBands.map((b) => [
                    b.label,
                    fmtBRL(b.valueR$),
                    `${b.pct.toFixed(1)}%`,
                  ]),
                  columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
                },
              }
            : {}),
        },
        {
          title: 'Comentários do Consultor',
          paragraphs: [blocks.consultant_comments].filter(Boolean),
        },
        {
          title: 'Próximos Passos',
          paragraphs: [blocks.next_steps].filter(Boolean),
        },
      ];

      generateGofferjePdf({
        documentType: 'Resumo do Relatório de Performance',
        clientName: snapshot.clientName,
        advisorName,
        subtitle: 'Análise consolidada da carteira e diretrizes para os próximos passos',
        executiveSummary: blocks.executive_summary,
        sections,
        filename: `Resumo_Performance_${snapshot.clientName.replace(/\s+/g, '_')}_${new Date()
          .toISOString()
          .slice(0, 10)}`,
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
        className="max-w-3xl h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base">Resumo do Relatório de Performance</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Gerado por IA com base no dashboard. Edite cada bloco antes de exportar o PDF Gofferje Investimentos.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              Analisando dados do dashboard…
            </div>
          ) : (
            <div className="space-y-5">
              <Section
                label="Sumário Executivo"
                value={blocks.executive_summary}
                onChange={(v) => update('executive_summary', v)}
                rows={5}
              />
              <Section
                label="Situação Patrimonial"
                value={blocks.patrimonial_situation}
                onChange={(v) => update('patrimonial_situation', v)}
                rows={5}
              />
              <Section
                label="Liquidez da Carteira"
                value={blocks.portfolio_liquidity}
                onChange={(v) => update('portfolio_liquidity', v)}
                rows={5}
              />
              <Section
                label="Comentários do Consultor"
                value={blocks.consultant_comments}
                onChange={(v) => update('consultant_comments', v)}
                rows={4}
              />
              <Section
                label="Próximos Passos"
                value={blocks.next_steps}
                onChange={(v) => update('next_steps', v)}
                rows={4}
              />
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading || generating}
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

function Section({
  label, value, onChange, rows = 4,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="text-sm"
      />
    </div>
  );
}
