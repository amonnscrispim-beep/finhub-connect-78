import { useState, useEffect } from 'react';
import { Briefcase, Download, Plus, Search, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMHeaderProps {
  onExportCSV: () => void;
  onNewClient: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function CRMHeader({ onExportCSV, onNewClient, searchQuery, onSearchChange }: CRMHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);

  // Format date in PT-BR: "Sábado, 10 de Janeiro de 2026 • 14:37"
  const formattedDate = format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedTime = format(currentTime, "HH:mm", { locale: ptBR });
  
  // Capitalize first letter
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <header className="crm-header sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        {/* Main Header Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CRM Financeiro</h1>
              <p className="text-sm text-primary-foreground/70">Gestão de Clientes</p>
            </div>
          </div>

          {/* Date & Time Display */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
            <Calendar className="w-4 h-4 text-primary-foreground/80" />
            <span className="text-sm font-medium text-primary-foreground/90">
              {capitalizedDate}
            </span>
            <div className="w-px h-4 bg-primary-foreground/30" />
            <Clock className="w-4 h-4 text-primary-foreground/80" />
            <span className="text-sm font-bold text-primary-foreground">
              {formattedTime}
            </span>
          </div>

          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
            <Input
              type="text"
              placeholder="Pesquisar cliente, profissão, objetivo..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:bg-primary-foreground/15 focus:border-primary-foreground/40"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportCSV}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
            <Button
              onClick={onNewClient}
              className="crm-btn-accent shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Novo Cliente</span>
            </Button>
          </div>
        </div>

        {/* Mobile Date/Time - shown on smaller screens */}
        <div className="flex lg:hidden items-center justify-center gap-2 mt-3 text-xs text-primary-foreground/70">
          <Calendar className="w-3 h-3" />
          <span>{capitalizedDate}</span>
          <span>•</span>
          <span className="font-bold">{formattedTime}</span>
        </div>
      </div>
    </header>
  );
}
