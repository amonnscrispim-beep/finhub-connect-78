import { useState } from 'react';
import { FileDown, Copy, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { SummaryReport } from './GeradorResumos';

interface Props {
  report: SummaryReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onWhatsApp: () => void;
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-2 border-b border-border pb-1">$2</h2>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-2 border-b pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
    .replace(/^---$/gm, '<hr class="my-4 border-border" />')
    .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-2">')
    .replace(/\n/g, '<br/>');
}

export function ResumoDetailModal({ report, open, onOpenChange, onDelete, onWhatsApp }: Props) {
  const formattedDate = new Date(report.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report.markdown_content);
    toast.success('Texto copiado!');
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Popup bloqueado.'); return; }

    const imagesHtml = (report.images || []).map(src =>
      `<img src="${src}" style="max-width:100%;margin:16px 0;border-radius:8px;border:1px solid #e5e7eb;" />`
    ).join('');

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
        .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #9ca3af; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header"><h2>Amonn Crispim — Consultor de Investimentos</h2></div>
      <h1>${report.title}</h1>
      <p class="text-sm" style="color:#6b7280;font-size:12px;">${formattedDate}</p>
      ${markdownToHtml(report.markdown_content)}
      ${imagesHtml}
      <div class="footer">${formattedDate}</div>
      <script>setTimeout(()=>{ window.print(); window.close(); }, 500);</script>
      </body></html>`);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">AC</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-sm font-medium text-foreground">Amonn Crispim</span>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          <DialogTitle className="text-lg font-bold mt-2">{report.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          <div dangerouslySetInnerHTML={{ __html: `<div class="text-sm leading-relaxed">${markdownToHtml(report.markdown_content)}</div>` }} />

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
        </div>

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
                <AlertDialogTitle>Excluir resumo?</AlertDialogTitle>
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
      </DialogContent>
    </Dialog>
  );
}
