import { useState, useEffect } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportMarkdown: string;
  clientName: string;
}

function formatForWhatsApp(md: string): string {
  return md
    // Headers → WhatsApp bold
    .replace(/^#{1,3}\s+(.+)$/gm, '*$1*')
    // Bold markdown → WhatsApp bold
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // Italic markdown → plain
    .replace(/_(.+?)_/g, '$1')
    // Bullet points
    .replace(/^[-*]\s+/gm, '• ')
    // Horizontal rules
    .replace(/^---+$/gm, '')
    // Collapse 3+ newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function WhatsAppModal({ open, onOpenChange, reportMarkdown, clientName }: Props) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open && reportMarkdown) {
      setMessage(formatForWhatsApp(reportMarkdown));
    }
  }, [open, reportMarkdown]);

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

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[250px] text-sm"
        />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1.5" /> Copiar mensagem
          </Button>
          <Button size="sm" onClick={handleOpenWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
            <ExternalLink className="w-4 h-4 mr-1.5" /> Abrir no WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
