import { useState, useEffect } from 'react';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportMarkdown: string;
  clientName: string;
}

export function WhatsAppModal({ open, onOpenChange, reportMarkdown, clientName }: Props) {
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open && reportMarkdown) {
      generateWhatsAppMessage();
    }
  }, [open]);

  const generateWhatsAppMessage = async () => {
    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-summary-report', {
        body: {
          message: reportMarkdown,
          reportType: 'whatsapp',
        },
      });

      if (response.error) throw new Error(response.error.message);
      setMessage(response.data?.report || 'Erro ao gerar mensagem.');
    } catch (err: any) {
      console.error(err);
      // Fallback: simple strip
      const plain = reportMarkdown
        .replace(/#{1,3}\s/g, '📌 ')
        .replace(/\*\*(.+?)\*\*/g, '*$1*')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^- /gm, '• ');
      setMessage(plain);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    toast.success('Mensagem copiada!');
  };

  const handleOpenWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💬 Mensagem para WhatsApp
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Adaptando relatório para WhatsApp...</span>
          </div>
        ) : (
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[250px] text-sm"
          />
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={isGenerating}>
            <Copy className="w-4 h-4 mr-1.5" /> Copiar mensagem
          </Button>
          <Button size="sm" onClick={handleOpenWhatsApp} disabled={isGenerating} className="bg-green-600 hover:bg-green-700 text-white">
            <ExternalLink className="w-4 h-4 mr-1.5" /> Abrir no WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
