import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateGofferjePdf, type PdfSection } from '@/lib/gofferje-pdf';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

interface Block {
  id: string;
  title: string;
  paragraphs: string[];      // editável (textarea por parágrafo)
  fields: { label: string; value: string }[];
}

interface GoalRow {
  name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  deadline_months: number;
}

const fmtBRL = (v: number | null | undefined) =>
  v != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))
    : '—';

export function ClientSummaryModal({ open, onOpenChange, clientId, clientName }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [advisorName, setAdvisorName] = useState('');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [consultantNote, setConsultantNote] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [portfolioRows, setPortfolioRows] = useState<{ ticker: string; name: string; cls: string; weight: number }[]>([]);
  const [patrimony, setPatrimony] = useState<{ financial: number; material: number; business: number; emergency: number }>({
    financial: 0, material: 0, business: 0, emergency: 0,
  });

  useEffect(() => {
    if (!open || !clientId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [clientRes, goalsRes, assetsRes, profileRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
          supabase.from('financial_goals').select('*').eq('client_id', clientId).order('created_at'),
          supabase.from('client_portfolio_assets').select('ticker,name,asset_class,target_weight').eq('client_id', clientId).order('display_order'),
          supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
        ]);

        if (cancelled) return;
        const c: any = clientRes.data || {};
        setAdvisorName(profileRes.data?.full_name || '');

        // Patrimônio
        setPatrimony({
          financial: Number(c.financial_assets || 0),
          material: Number(c.material_assets || 0),
          business: Number(c.business_assets || 0),
          emergency: Number(c.emergency_reserve || 0),
        });

        // Metas
        setGoals(
          (goalsRes.data || []).map((g: any) => ({
            name: g.name || '',
            goal_type: g.goal_type || '',
            target_amount: Number(g.target_amount || 0),
            current_amount: Number(g.current_amount || 0),
            monthly_contribution: Number(g.monthly_contribution || 0),
            deadline_months: Number(g.deadline_months || 0),
          }))
        );

        // Carteira recomendada
        setPortfolioRows(
          (assetsRes.data || []).map((a: any) => ({
            ticker: a.ticker || '',
            name: a.name || '',
            cls: a.asset_class || '',
            weight: Number(a.target_weight || 0),
          }))
        );

        // Sumário executivo automático
        const totalPatr =
          Number(c.financial_assets || 0) +
          Number(c.material_assets || 0) +
          Number(c.business_assets || 0);
        setExecutiveSummary(
          `${c.name || clientName} é um cliente${c.investor_profile ? ` de perfil ${c.investor_profile}` : ''}` +
            `${c.profession ? `, ${c.profession}` : ''}${c.age ? `, ${c.age} anos` : ''}. ` +
            `Patrimônio total estimado de ${fmtBRL(totalPatr)}, com renda mensal de ${fmtBRL(c.monthly_revenue)}. ` +
            `Este resumo consolida informações pessoais, situação financeira, objetivos, perfil de risco e arquitetura de carteira.`
        );

        setConsultantNote(c.observations || '');

        // Blocos editáveis
        setBlocks([
          {
            id: 'pessoal',
            title: 'Perfil Pessoal',
            paragraphs: [
              c.observations ? '' : '',
            ].filter(Boolean),
            fields: [
              { label: 'Nome', value: c.name || '' },
              { label: 'Idade', value: c.age ? String(c.age) : '' },
              { label: 'Profissão', value: c.profession || '' },
              { label: 'Cidade / Estado', value: [c.city, c.state].filter(Boolean).join(' / ') },
              { label: 'Estado Civil', value: c.married ? 'Casado(a)' : 'Solteiro(a)' },
              { label: 'Filhos', value: c.has_children ? 'Sim' : 'Não' },
              { label: 'E-mail', value: c.email || '' },
              { label: 'Telefone', value: c.phone || '' },
            ],
          },
          {
            id: 'financeira',
            title: 'Situação Financeira',
            paragraphs: [],
            fields: [
              { label: 'Renda mensal', value: fmtBRL(c.monthly_revenue) },
              { label: 'Renda do cônjuge', value: fmtBRL(c.partner_monthly_revenue) },
              { label: 'Custo de vida mensal', value: fmtBRL(c.monthly_living_cost) },
              { label: 'Aporte mensal', value: fmtBRL(c.monthly_contribution) },
              { label: 'Patrimônio financeiro', value: fmtBRL(c.financial_assets) },
              { label: 'Patrimônio material', value: fmtBRL(c.material_assets) },
              { label: 'Patrimônio empresarial', value: fmtBRL(c.business_assets) },
              { label: 'Reserva de emergência', value: fmtBRL(c.emergency_reserve) },
              { label: 'Renda passiva atual', value: fmtBRL(c.passive_income) },
              { label: 'Finanças organizadas', value: c.organized_finances || '' },
            ],
          },
          {
            id: 'objetivos',
            title: 'Objetivos e Metas',
            paragraphs: [
              c.short_term_goals ? `Curto prazo: ${c.short_term_goals}` : '',
              c.medium_term_goals ? `Médio prazo: ${c.medium_term_goals}` : '',
              c.long_term_goals ? `Longo prazo: ${c.long_term_goals}` : '',
            ].filter(Boolean),
            fields: [
              { label: 'Objetivo principal', value: c.objective || '' },
              { label: 'Horizonte de investimento', value: c.investment_term || '' },
            ],
          },
          {
            id: 'risco',
            title: 'Perfil de Risco',
            paragraphs: [],
            fields: [
              { label: 'Perfil de investidor', value: c.investor_profile || '' },
              { label: 'Já investe?', value: c.already_invests ? 'Sim' : 'Não' },
              { label: 'Origem dos investimentos', value: c.investing_origin || '' },
              { label: 'Instituições financeiras', value: c.financial_institutions || '' },
              { label: 'Previdência', value: c.private_pension_status || '' },
              { label: 'Tipo previdência', value: c.private_pension_type || '' },
            ],
          },
          {
            id: 'arquitetura',
            title: 'Arquitetura da Carteira',
            paragraphs: [
              c.current_wealth_notes ? c.current_wealth_notes : '',
            ].filter(Boolean),
            fields: [],
          },
          {
            id: 'observacoes',
            title: 'Observações do Consultor',
            paragraphs: c.observations ? [c.observations] : [''],
            fields: [],
          },
        ]);
      } catch (e) {
        console.error('Erro ao carregar resumo do cliente', e);
        toast.error('Erro ao carregar dados do cliente');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, clientId, user, clientName]);

  const updateBlockField = (blockId: string, idx: number, value: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId
      ? { ...b, fields: b.fields.map((f, i) => i === idx ? { ...f, value } : f) }
      : b));
  };

  const updateBlockParagraph = (blockId: string, idx: number, value: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId
      ? { ...b, paragraphs: b.paragraphs.map((p, i) => i === idx ? value : p) }
      : b));
  };

  const addBlockParagraph = (blockId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId
      ? { ...b, paragraphs: [...b.paragraphs, ''] }
      : b));
  };

  const totalPatrimony = useMemo(
    () => patrimony.financial + patrimony.material + patrimony.business,
    [patrimony]
  );

  const handleGenerate = () => {
    setGenerating(true);
    try {
      const sections: PdfSection[] = blocks.map(b => {
        const section: PdfSection = {
          title: b.title,
          paragraphs: b.paragraphs.filter(p => p.trim()),
          fields: b.fields.filter(f => f.value && f.value.trim() && f.value !== '—'),
        };

        // Snapshot patrimonial integrado em "Situação Financeira"
        if (b.id === 'financeira' && totalPatrimony > 0) {
          section.callout = `Patrimônio total consolidado: ${fmtBRL(totalPatrimony)} (financeiro ${fmtBRL(patrimony.financial)} + material ${fmtBRL(patrimony.material)} + empresarial ${fmtBRL(patrimony.business)}). Reserva de emergência: ${fmtBRL(patrimony.emergency)}.`;
        }

        // Tabela de metas em "Objetivos e Metas"
        if (b.id === 'objetivos' && goals.length) {
          section.table = {
            head: ['Meta', 'Tipo', 'Alvo', 'Atual', 'Aporte/mês', 'Prazo (m)'],
            body: goals.map(g => [
              g.name || '—',
              g.goal_type || '—',
              fmtBRL(g.target_amount),
              fmtBRL(g.current_amount),
              fmtBRL(g.monthly_contribution),
              g.deadline_months || '—',
            ]),
            columnStyles: {
              2: { halign: 'right' }, 3: { halign: 'right' },
              4: { halign: 'right' }, 5: { halign: 'right' },
            },
          };
        }

        // Tabela de carteira recomendada em "Arquitetura da Carteira"
        if (b.id === 'arquitetura' && portfolioRows.length) {
          section.table = {
            head: ['Ticker', 'Nome', 'Classe', '% Alvo'],
            body: portfolioRows.map(a => [
              a.ticker, a.name || '—', a.cls || '—', `${a.weight.toFixed(2)}%`,
            ]),
            columnStyles: { 3: { halign: 'right' } },
          };
        }

        return section;
      });

      generateGofferjePdf({
        documentType: 'Resumo do Cliente',
        clientName,
        advisorName,
        subtitle: 'Visão consolidada de perfil, situação financeira, objetivos e estratégia',
        executiveSummary,
        sections,
        filename: `Resumo_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`,
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
        className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base">Revisar Resumo do Cliente</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Edite cada bloco antes de gerar o PDF institucional Gofferje Investimentos.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-12">Carregando dados…</div>
          ) : (
            <div className="space-y-6">
              {/* Sumário executivo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Sumário Executivo
                </Label>
                <Textarea
                  value={executiveSummary}
                  onChange={e => setExecutiveSummary(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* Blocos */}
              {blocks.map(block => (
                <div key={block.id} className="border border-border rounded-lg p-4 space-y-3 bg-card">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wide">
                    {block.title}
                  </h3>

                  {block.fields.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {block.fields.map((f, idx) => (
                        <div key={idx} className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
                          <Input
                            value={f.value}
                            onChange={e => updateBlockField(block.id, idx, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {block.paragraphs.map((p, idx) => (
                    <Textarea
                      key={idx}
                      value={p}
                      onChange={e => updateBlockParagraph(block.id, idx, e.target.value)}
                      placeholder="Texto livre…"
                      className="min-h-[60px] text-sm"
                    />
                  ))}

                  <Button
                    type="button" variant="ghost" size="sm"
                    className="text-xs h-7"
                    onClick={() => addBlockParagraph(block.id)}
                  >
                    + Adicionar parágrafo
                  </Button>
                </div>
              ))}

              {/* Resumo patrimônio (somente leitura) */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h4 className="text-xs font-bold uppercase text-primary mb-2">Snapshot Patrimonial</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Financeiro:</span> <strong>{fmtBRL(patrimony.financial)}</strong></div>
                  <div><span className="text-muted-foreground">Material:</span> <strong>{fmtBRL(patrimony.material)}</strong></div>
                  <div><span className="text-muted-foreground">Empresarial:</span> <strong>{fmtBRL(patrimony.business)}</strong></div>
                  <div><span className="text-muted-foreground">Reserva:</span> <strong>{fmtBRL(patrimony.emergency)}</strong></div>
                </div>
                <div className="mt-2 pt-2 border-t border-primary/20 text-sm">
                  <strong className="text-primary">Total: {fmtBRL(totalPatrimony)}</strong>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {goals.length} meta(s) e {portfolioRows.length} ativo(s) recomendado(s) serão incluídos como tabelas no PDF.
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancelar
          </Button>
          <Button
            size="sm" onClick={handleGenerate} disabled={loading || generating}
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
