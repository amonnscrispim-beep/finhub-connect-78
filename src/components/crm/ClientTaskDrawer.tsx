import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Plus, Edit3, Phone, Calendar, FileText, ExternalLink } from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import type { Task, TaskInput } from '@/types/client';
import { toast } from 'sonner';

interface ClientTaskDrawerProps {
  clientId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreateTask: (clientId: string) => void;
  onEditTask: (clientId: string, task: Task) => void;
  onOpenClient: (clientId: string) => void;
  onCompleteAndNext?: (currentClientId: string) => void;
}

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function relativeDays(d: Date | null | undefined): string {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'ontem';
  return `há ${diff} dias`;
}

function priorityVariant(p?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (p) {
    case 'Urgente': return 'destructive';
    case 'Alta': return 'default';
    case 'Média': return 'secondary';
    default: return 'outline';
  }
}

export function ClientTaskDrawer({ clientId, open, onOpenChange, onCreateTask, onEditTask, onOpenClient, onCompleteAndNext }: ClientTaskDrawerProps) {
  const { clients, toggleTask, addTask } = useClients();
  const [registering, setRegistering] = useState(false);

  const client = useMemo(() => clients.find(c => c.id === clientId) || null, [clients, clientId]);

  if (!client) return null;

  const tasks = client.tasks || [];
  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed).sort((a, b) => {
    const ad = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bd = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bd - ad;
  });

  const handleComplete = async (taskId: string) => {
    await toggleTask(client.id, taskId);
  };

  const handleRegisterContact = async () => {
    setRegistering(true);
    try {
      const payload: TaskInput = {
        description: 'Contato registrado',
        title: 'Contato realizado',
        category: 'Ligação',
        priority: 'Baixa',
        dueDate: new Date(),
      };
      await addTask(client.id, 'Contato registrado', payload);
      // Mark it immediately as completed
      // Optimistic: just toast — will appear in pending list and user can complete
      toast.success('Contato registrado');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-2">
            <span className="truncate">{client.name}</span>
            <Button size="sm" variant="ghost" onClick={() => onOpenClient(client.id)} className="gap-1">
              <ExternalLink className="w-4 h-4" /> Ficha
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-muted-foreground text-xs">Patrimônio</div>
              <div className="font-semibold">{formatBRL(Number(client.financialAssets) || 0)}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-muted-foreground text-xs">Responsável</div>
              <div className="font-semibold truncate">{pending[0]?.assignee || '—'}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-muted-foreground text-xs">Último contato</div>
              <div className="font-semibold">{relativeDays(client.lastActivityAt)}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-muted-foreground text-xs">Próximo contato</div>
              <div className="font-semibold">{client.scheduledMeeting?.date ? new Date(client.scheduledMeeting.date).toLocaleDateString('pt-BR') : '—'}</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onCreateTask(client.id)} className="gap-1"><Plus className="w-4 h-4" /> Nova tarefa</Button>
            <Button size="sm" variant="outline" onClick={handleRegisterContact} disabled={registering} className="gap-1"><Phone className="w-4 h-4" /> Registrar contato</Button>
            {onCompleteAndNext && pending[0] && (
              <Button size="sm" variant="secondary" className="gap-1" onClick={async () => { await toggleTask(client.id, pending[0].id); onCompleteAndNext(client.id); }}>
                <CheckCircle2 className="w-4 h-4" /> Concluir e Próxima
              </Button>
            )}
          </div>

          {/* Tarefas pendentes */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tarefas Pendentes</div>
            {pending.length === 0 && (
              <div className="text-sm text-muted-foreground italic">Nenhuma tarefa pendente.</div>
            )}
            <ul className="space-y-2">
              {pending.map(t => (
                <li key={t.id} className="rounded-md border border-border bg-card p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.title || t.description}</div>
                      {t.title && t.description && t.title !== t.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {t.priority && <Badge variant={priorityVariant(t.priority)} className="text-[10px]">{t.priority}</Badge>}
                        {t.category && <Badge variant="outline" className="text-[10px]">{t.category}</Badge>}
                        {t.dueDate && <span className="text-[10px] text-muted-foreground">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditTask(client.id, t)}><Edit3 className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => handleComplete(t.id)}><CheckCircle2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Histórico */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Histórico</div>
            {completed.length === 0 && (
              <div className="text-sm text-muted-foreground italic">Sem histórico de tarefas concluídas.</div>
            )}
            <ul className="space-y-2">
              {completed.slice(0, 12).map(t => {
                const Icon = t.category === 'Reunião' ? Calendar : t.category === 'Relatório' ? FileText : t.category === 'Carteira' ? FileText : Phone;
                return (
                  <li key={t.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 text-success"><Icon className="w-4 h-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{t.title || t.description}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.completedAt ? new Date(t.completedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
