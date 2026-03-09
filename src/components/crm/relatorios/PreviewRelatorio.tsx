import { FileText, Copy, MessageCircle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  markdown: string;
  isGenerating: boolean;
  images: string[];
  onOpenWhatsApp: () => void;
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-foreground border-b border-border pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-foreground">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
    .replace(/^---$/gm, '<hr class="my-4 border-border" />')
    .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-3 text-foreground/90">')
    .replace(/\n/g, '<br/>');

  return `<div class="prose-report"><p class="text-sm leading-relaxed mb-3 text-foreground/90">${html}</p></div>`;
}

export function PreviewRelatorio({ markdown, isGenerating, images, onOpenWhatsApp }: Props) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success('Texto copiado!');
    } catch {
      toast.error('Erro ao copiar.');
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Popup bloqueado. Permita popups.'); return; }

    const imagesHtml = images.map(src => `<img src="${src}" style="max-width:100%;margin:16px 0;border-radius:8px;border:1px solid #e5e7eb;" />`).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Relatório</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e2530; line-height: 1.7; }
        h1, h2, h3 { font-family: 'Playfair Display', serif; }
        h1 { font-size: 24px; border-bottom: 2px solid #1e2530; padding-bottom: 8px; }
        h2 { font-size: 20px; margin-top: 32px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
        h3 { font-size: 16px; margin-top: 24px; }
        p { margin-bottom: 12px; font-size: 14px; }
        li { font-size: 14px; margin-left: 20px; }
        hr { border: none; border-top: 1px solid #d1d5db; margin: 24px 0; }
        .header { text-align: center; margin-bottom: 32px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .header h2 { border: none; margin: 0; font-size: 14px; color: #6b7280; font-family: 'Inter', sans-serif; font-weight: 500; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header"><h2>Amonn Crispim — Consultor de Investimentos</h2></div>
      ${markdownToHtml(markdown).replace(/class="[^"]*"/g, '')}
      ${imagesHtml}
      <script>setTimeout(()=>{ window.print(); window.close(); }, 500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <Card className="h-full border-border flex flex-col">
      <CardHeader className="bg-primary text-primary-foreground rounded-t-lg flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Preview do Relatório
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Report Content */}
        <div className="flex-1 overflow-auto p-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
              <p className="text-sm">Gerando relatório com IA...</p>
            </div>
          ) : markdown ? (
            <div className="space-y-4">
              {/* Report Header */}
              <div className="text-center pb-4 border-b border-border">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                  Amonn Crispim — Consultor de Investimentos
                </p>
              </div>

              {/* Rendered Markdown */}
              <div
                className="report-content"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }}
              />

              {/* Embedded Images */}
              {images.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Anexos visuais</p>
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((src, i) => (
                      <img key={i} src={src} alt={`Anexo ${i + 1}`} className="rounded-lg border border-border w-full" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">O relatório aparecerá aqui após a geração.</p>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {markdown && (
          <div className="border-t border-border p-3 flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-1.5" /> Exportar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar Texto
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenWhatsApp}>
              <MessageCircle className="w-4 h-4 mr-1.5" /> Mensagem WhatsApp
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
