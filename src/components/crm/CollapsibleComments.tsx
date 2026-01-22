import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CollapsibleCommentsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CollapsibleComments({ 
  value, 
  onChange, 
  placeholder = "Escreva observações importantes, contexto, decisões, próximos passos, pontos de atenção…" 
}: CollapsibleCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>{value ? 'Ver comentários' : 'Adicionar comentários'}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      
      {isOpen && (
        <div className="mt-3 space-y-2">
          <Label>Comentários (do consultor)</Label>
          <Textarea 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder={placeholder}
            className="crm-input min-h-[100px]"
          />
        </div>
      )}
    </div>
  );
}
