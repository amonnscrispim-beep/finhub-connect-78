import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  className 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border border-border rounded-xl overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 bg-card">
          {children}
        </div>
      )}
    </div>
  );
}
