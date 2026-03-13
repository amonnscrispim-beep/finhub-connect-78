import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Download, X, Pencil, Check, Eye, EyeOff } from 'lucide-react';
import { generatePortfolioPdf, type PortfolioPdfData } from '@/lib/portfolio-pdf-generator';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PortfolioPdfData;
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PROFILE_COLORS: Record<string, string> = {
  Conservador: 'bg-emerald-500',
  Moderado: 'bg-yellow-500',
  Arrojado: 'bg-red-500',
};

export function PortfolioPdfPreviewModal({ open, onOpenChange, data }: Props) {
  const [clientName, setClientName] = useState(data.clientName || '');
  const [consultantNote, setConsultantNote] = useState(data.consultantNote || '');
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('pt-BR'));
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hiddenClasses, setHiddenClasses] = useState<Set<string>>(new Set());

  const toggleClassVisibility = (key: string) => {
    setHiddenClasses(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDownload = () => {
    const finalData: PortfolioPdfData = {
      ...data,
      clientName: clientName || undefined,
      consultantNote: consultantNote || undefined,
      classes: data.classes.filter(c => !hiddenClasses.has(c.key)),
    };
    generatePortfolioPdf(finalData);
    toast.success('PDF gerado com sucesso!');
    onOpenChange(false);
  };

  const visibleClasses = data.classes.filter(c => !hiddenClasses.has(c.key) && (c.pct > 0 || c.assets.length > 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        {/* Fixed top bar */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-base">Pré-visualização do Relatório</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-3.5 h-3.5 mr-1" /> Fechar
            </Button>
            <Button size="sm" onClick={handleDownload} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="w-3.5 h-3.5 mr-1" /> Confirmar e Baixar PDF
            </Button>
          </div>
        </div>

        <div className="px-6 pb-8 space-y-8">
          {/* ── COVER PREVIEW ── */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#1a2e4a' }}>
            <div className="py-12 px-8 text-center space-y-4">
              <div className="h-1 w-full" style={{ background: '#c9a84c' }} />
              <h1 className="text-2xl font-bold text-white mt-6">Relatório de Carteira</h1>
              <p className="text-lg" style={{ color: '#c9a84c' }}>{data.strategy}</p>
              <Badge className={`${PROFILE_COLORS[data.profile] || 'bg-primary'} text-white text-sm px-4 py-1`}>
                {data.profile}
              </Badge>

              {/* Editable client name */}
              <div className="mt-4">
                {editingField === 'clientName' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Nome do cliente"
                      className="max-w-xs h-8 text-sm text-center bg-white/10 border-white/30 text-white placeholder:text-white/40"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => setEditingField(null)}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-white text-base">{clientName || 'Nome do Cliente'}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setEditingField('clientName')}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Editable date */}
              <div>
                {editingField === 'date' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      value={reportDate}
                      onChange={e => setReportDate(e.target.value)}
                      className="max-w-[140px] h-7 text-xs text-center bg-white/10 border-white/30 text-white"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10" onClick={() => setEditingField(null)}>
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-white/60 text-xs">Valor: R$ {fmt(data.investAmount)} | Gerado em: {reportDate}</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40 hover:text-white hover:bg-white/10" onClick={() => setEditingField('date')}>
                      <Pencil className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="h-1 w-full mt-6" style={{ background: '#c9a84c' }} />
            </div>
          </div>

          {/* ── ALLOCATION SUMMARY ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#1a2e4a' }}>Resumo de Alocação</h2>
                <div className="h-0.5 w-10 mt-1" style={{ background: '#c9a84c' }} />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow style={{ background: '#1a2e4a' }}>
                  <TableHead className="text-white text-xs font-bold">Classe</TableHead>
                  <TableHead className="text-white text-xs font-bold text-right">% Carteira</TableHead>
                  <TableHead className="text-white text-xs font-bold text-right">Valor R$</TableHead>
                  <TableHead className="text-white text-xs font-bold text-right">Div. Mês</TableHead>
                  <TableHead className="text-white text-xs font-bold text-right">Div. Ano</TableHead>
                  <TableHead className="text-white text-xs font-bold w-16 text-center">Visível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.classes.filter(c => c.pct > 0 || c.assets.length > 0).map((cls, i) => (
                  <TableRow key={cls.key} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                    <TableCell className="text-sm font-medium">{cls.label}</TableCell>
                    <TableCell className="text-sm text-right">{cls.pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-sm text-right">R$ {fmt(cls.value)}</TableCell>
                    <TableCell className="text-sm text-right">R$ {fmt(cls.dvMonth)}</TableCell>
                    <TableCell className="text-sm text-right">R$ {fmt(cls.dvYear)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleClassVisibility(cls.key)}
                      >
                        {hiddenClasses.has(cls.key)
                          ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                          : <Eye className="w-3.5 h-3.5 text-primary" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold text-xs" style={{ background: '#e6f5e6' }}>
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">R$ {fmt(data.grandValue)}</TableCell>
                  <TableCell className="text-right">R$ {fmt(data.grandDvMonth)}</TableCell>
                  <TableCell className="text-right">R$ {fmt(data.grandDvYear)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* ── CLASS DETAILS ── */}
          {visibleClasses.map(cls => {
            if (cls.assets.length === 0) return null;
            const isRf = cls.key === 'renda_fixa';
            const isFii = cls.key === 'fiis';

            return (
              <div key={cls.key} className="space-y-3">
                <div>
                  <h3 className="text-base font-bold" style={{ color: '#1a2e4a' }}>
                    {cls.label} ({cls.pct.toFixed(1)}%)
                  </h3>
                  <div className="h-0.5 w-8 mt-1" style={{ background: '#c9a84c' }} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor: R$ {fmt(cls.value)} | Div. Mês: R$ {fmt(cls.dvMonth)} | Div. Ano: R$ {fmt(cls.dvYear)}
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow style={{ background: '#1a2e4a' }}>
                      <TableHead className="text-white text-xs font-bold">Ativo</TableHead>
                      {isRf && <TableHead className="text-white text-xs font-bold">Tipo</TableHead>}
                      {isRf && <TableHead className="text-white text-xs font-bold">Indexador</TableHead>}
                      {isRf && <TableHead className="text-white text-xs font-bold">Vencimento</TableHead>}
                      {!isRf && <TableHead className="text-white text-xs font-bold text-right">Preço Teto</TableHead>}
                      {!isRf && <TableHead className="text-white text-xs font-bold text-right">Preço Atual</TableHead>}
                      <TableHead className="text-white text-xs font-bold text-right">Aloc. %</TableHead>
                      <TableHead className="text-white text-xs font-bold text-right">Valor R$</TableHead>
                      {!isRf && <TableHead className="text-white text-xs font-bold text-right">Cotas</TableHead>}
                      <TableHead className="text-white text-xs font-bold text-right">
                        {isFii ? 'DY R$/mês' : isRf ? 'Taxa %' : 'DY R$/ano'}
                      </TableHead>
                      <TableHead className="text-white text-xs font-bold text-right">Div. Mês</TableHead>
                      <TableHead className="text-white text-xs font-bold text-right">Div. Ano</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cls.assets.map((a, i) => (
                      <TableRow key={i} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                        <TableCell className="font-mono text-xs font-semibold">{a.ticker || a.name}</TableCell>
                        {isRf && <TableCell className="text-xs">{a.rfType || '—'}</TableCell>}
                        {isRf && <TableCell className="text-xs">{a.indexador || '—'}</TableCell>}
                        {isRf && <TableCell className="text-xs">{a.vencimento || '—'}</TableCell>}
                        {!isRf && <TableCell className="text-xs text-right">{a.ceilingPrice ? `R$ ${fmt(a.ceilingPrice)}` : '—'}</TableCell>}
                        {!isRf && <TableCell className="text-xs text-right">{a.currentPrice ? `R$ ${fmt(a.currentPrice)}` : '—'}</TableCell>}
                        <TableCell className="text-xs text-right">{a.allocClassPct.toFixed(1)}%</TableCell>
                        <TableCell className="text-xs text-right">R$ {fmt(a.value)}</TableCell>
                        {!isRf && <TableCell className="text-xs text-right">{a.cotas ?? '—'}</TableCell>}
                        <TableCell className="text-xs text-right">{a.dyInput.toFixed(2)}{isRf ? '%' : ''}</TableCell>
                        <TableCell className="text-xs text-right text-emerald-600">R$ {fmt(a.dvMonth)}</TableCell>
                        <TableCell className="text-xs text-right text-emerald-600">R$ {fmt(a.dvYear)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}

          {/* ── CONSULTANT NOTE ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: '#1a2e4a' }}>Nota do Consultor</h3>
                <div className="h-0.5 w-8 mt-1" style={{ background: '#c9a84c' }} />
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingField(editingField === 'note' ? null : 'note')}>
                <Pencil className="w-3 h-3 mr-1" /> {editingField === 'note' ? 'Concluir' : 'Editar'}
              </Button>
            </div>

            {editingField === 'note' ? (
              <Textarea
                value={consultantNote}
                onChange={e => setConsultantNote(e.target.value)}
                placeholder="Adicione observações para o relatório..."
                className="min-h-[100px] text-sm"
                autoFocus
              />
            ) : (
              <div className="bg-muted/20 rounded-lg p-4 text-sm text-foreground min-h-[60px]">
                {consultantNote || <span className="text-muted-foreground italic">Nenhuma nota adicionada. Clique em "Editar" para adicionar.</span>}
              </div>
            )}
          </div>

          {/* ── DISCLAIMER ── */}
          <div className="text-center text-[10px] text-muted-foreground border-t border-border pt-4">
            Documento gerado automaticamente. Não constitui recomendação de investimento.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
