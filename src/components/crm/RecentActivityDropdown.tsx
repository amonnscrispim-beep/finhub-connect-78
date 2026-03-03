import { useState } from 'react';
import { History, User, CheckCircle, FileText, ListChecks, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useActivityLog } from '@/hooks/useActivityLog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_ICONS: Record<string, React.ElementType> = {
  client_opened: Eye,
  follow_up: CheckCircle,
  financial_edit: FileText,
  task_created: ListChecks,
  task_completed: CheckCircle,
};

export function RecentActivityDropdown() {
  const { activities, isLoading } = useActivityLog();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground">
          <History className="w-4 h-4 mr-1.5" />
          Últimas Alterações
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 max-h-[480px] overflow-y-auto" align="start">
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-semibold">Últimas Alterações</h4>
          <p className="text-xs text-muted-foreground">Últimas 20 ações registradas</p>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Carregando...</p>
        ) : activities.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma atividade registrada</p>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((a) => {
              const Icon = ACTION_ICONS[a.action_type] || User;
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
                  <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {a.client_name && (
                      <p className="text-xs font-semibold text-foreground truncate">{a.client_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
