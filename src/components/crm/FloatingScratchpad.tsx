import { useState, useEffect } from 'react';
import { StickyNote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

const STORAGE_KEY = 'crm-scratchpad-notes';

export function FloatingScratchpad() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setText(saved);
    } catch {}
  }, []);

  // Persist in real-time so notes survive tab navigation
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {}
  }, [text]);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {}
    toast.success('Anotações salvas temporariamente');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Anotações rápidas"
        >
          <StickyNote className="w-6 h-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-80 p-0 mr-2 mb-2"
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Anotações rápidas</h4>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma nota rápida..."
            className="min-h-[160px] resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave}>
              Salvar Anotações
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
