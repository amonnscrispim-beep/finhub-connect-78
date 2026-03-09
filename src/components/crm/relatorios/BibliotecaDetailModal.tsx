import { useState, useEffect } from 'react';
import { FileDown, Copy, MessageCircle, Trash2, Loader2, PenLine, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { categoryConfig } from './BibliotecaResumos';
import type { SummaryReport } from './GeradorResumos';

interface Props {
  report: SummaryReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onWhatsApp: () => void;
  onUpdate?: (id: string, content: string) => void;
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-2 border-b pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
    .replace(/^---$/gm, '<hr class="my-4 border-border" />')
    .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-2">')
    .replace(/\n/g, '<br/>');
}

function FiiIndicators({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firstTicker = ticker.split(',')[0]?.trim();
    if (!firstTicker) { setLoading(false); return; }
    fetch(`https://brapi.dev/api/quote/${firstTicker}?token=demo&fundamental=true`)
      .then(r => r.json())
      .then(d => { if (d.results?.[0]) setData(d.results[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return (
    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
      <Loader2 className="w-3 h-3 animate-spin" /> Carregando indicadores...
    </div>
  );
  if (!data) return null;

  const indicators = [
    { label: 'Cotação', value: data.regularMarketPrice ? `R$ ${data.regularMarketPrice.toFixed(2)}` : '-' },
    { label: 'P/VP', value: data.priceToBook?.toFixed(2) || '-' },
    { label: 'Liquidez Média', value: data.averageDailyVolume10Day ? `R$ ${(data.averageDailyVolume10Day / 1000).toFixed(0)}k` : '-' },
    { label: 'Variação Dia', value: data.regularMarketChangePercent ? `${data.regularMarketChangePercent.toFixed(2)}%` : '-' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {indicators.map(ind => (
        <div key={ind.label} className="border border-border rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{ind.label}</p>
          <p className="text-sm font-semibold text-foreground">{ind.value}</p>
        </div>
      ))}
    </div>
  );
}

export function BibliotecaDetailModal({ report, open, onOpenChange, onDelete, onWhatsApp, onUpdate }: Props) {
  const cat = categoryConfig[(report as any).category || report.report_type] || categoryConfig.analise_ativo;
  const formattedDate = new Date(report.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const isFii = ((report as any).category || report.report_type) === 'radar_fiis';

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [currentContent, setCurrentContent] = useState(report.markdown_content);

  if (currentContent !== report.markdown_content && !isEditing) {
    setCurrentContent(report.markdown_content);
  }

  const handleStartEdit = () => { setEditContent(currentContent); setIsEditing(true); };
  const handleSaveEdit = async () => {
    setCurrentContent(editContent);
    setIsEditing(false);
    onUpdate?.(report.id, editContent);
    toast.success('Edições salvas!');
    await supabase.from('summary_reports').update({ markdown_content: editContent } as any).eq('id', report.id);
  };
  const handleCancelEdit = () => setIsEditing(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentContent);
    toast.success('Texto copiado!');
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Popup bloqueado.'); return; }
    const imagesHtml = (report.images || []).map(src =>
      `<img src="${src}" style="max-width:100%;margin:16px 0;border-radius:8px;border:1px solid #e5e7eb;" />`
    ).join('');
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${report.title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e2530; line-height: 1.7; }
        h1,h2,h3 { font-family: 'Playfair Display', serif; }
        h1 { font-size: 22px; border-bottom: 2px solid #1e2530; padding-bottom: 8px; }
        h2 { font-size: 18px; margin-top: 28px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
        p { margin-bottom: 10px; font-size: 14px; }
        li { font-size: 14px; margin-left: 20px; }
        .header { text-align: center; margin-bottom: 28px; padding: 16px; background: #f8f9fa; border-radius: 8px; }
        .header h2 { border: none; margin: 0; font-size: 13px; color: #6b7280; font-family: 'Inter', sans-serif; }
        .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #d1d5db; font-size: 11px; color: #9ca3af; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header"><h2>Amonn Crispim — Consultor de Investimentos</h2></div>
      <h1>${report.title}</h1>
      <p style="color:#6b7280;font-size:12px;">${formattedDate}</p>
      ${markdownToHtml(currentContent)}
      ${imagesHtml}
      <div class="footer">${today}</div>
      <script>setTimeout(()=>{ window.print(); window.close(); }, 500);</script>
      </body></html>`);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className="text-xs">• {formattedDate}</span>
            </div>
            {!isEditing && currentContent && (
              <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1.5">
                <PenLine className="w-4 h-4" /> Editar
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-1.5">
                <Button variant="default" size="sm" onClick={handleSaveEdit} className="gap-1">
                  <Check className="w-4 h-4" /> Salvar
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancelEdit} className="gap-1">
                  <X className="w-4 h-4" /> Cancelar
                </Button>
              </div>
            )}
          </div>
          <DialogTitle className="text-lg font-bold mt-1">{report.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[350px] resize-y font-mono text-sm"
              placeholder="Edite o conteúdo em Markdown..."
            />
          ) : (
            <>
              {isFii && report.ticker && <FiiIndicators ticker={report.ticker} />}
              <div dangerouslySetInnerHTML={{ __html: `<div class="text-sm leading-relaxed">${markdownToHtml(currentContent)}</div>` }} />
              {report.images?.length > 0 && (
                <div className="mt-4 space-y-3 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Anexos visuais</p>
                  <div className="grid grid-cols-2 gap-3">
                    {report.images.map((src, i) => (
                      <img key={i} src={src} alt={`Anexo ${i + 1}`} className="rounded-lg border border-border w-full" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="border-t border-border p-4 flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-1.5" /> Exportar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar Texto
            </Button>
            <Button variant="outline" size="sm" onClick={onWhatsApp}>
              <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-1.5" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(report.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
