import { Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SharedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 px-1.5 py-0 border-blue-300 text-blue-600 bg-blue-50 ${className || ''}`}>
      <Share2 className="w-3 h-3" />
      Compartilhado
    </Badge>
  );
}
