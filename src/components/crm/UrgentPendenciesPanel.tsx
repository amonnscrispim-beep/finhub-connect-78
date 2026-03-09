import { useState } from 'react';
import { Plus, Check, X, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useClients } from '@/contexts/ClientContext';
import { UrgentPendency } from '@/hooks/useUrgentPendencies';

interface UrgentPendenciesPanelProps {
  pendencies: UrgentPendency[];
  isLoading: boolean;
  onAdd: (data: { client_id: string; description: string; deadline: string; priority: string }) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const PRIORITY_CONFIG = {
  alta: { label: 'Alta', emoji: '🔴', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  media: { label: 'Média', emoji: '🟡', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  baixa: { label: 'Baixa', emoji: '🟢', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
};

function formatRelativeDeadline(deadline: string): string {
  const date = new Date(deadline + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Vencida há ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? 's' : ''}`;
  if (diff === 0) return 'Vence hoje';
  if (diff === 1) return 'Vence amanhã';
  return `Vence em ${diff} dias`;
}

export function UrgentPendenciesPanel({ pendencies, isLoading, onAdd, onComplete, onRemove }: UrgentPendenciesPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const { clients } = useClients();

  // Form state
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState('media');
  const [clientSearch, setClientSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activeClients = clients.filter(c => !c.consultingFinished);
  const filteredClients = clientSearch
    ? activeClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : activeClients;

  const handleSave = async () => {
    if (!clientId || !description.trim() || !deadline) return;
    setIsSaving(true);
    await onAdd({
      client_id: clientId,
      description: description.trim(),
      deadline: format(deadline, 'yyyy-MM-dd'),
      priority,
    });
    setIsSaving(false);
    setModalOpen(false);
    setClientId('');
    setDescription('');
    setDeadline(undefined);
    setPriority('media');
    setClientSearch('');
  };

  const handleComplete = async (id: string) => {
    setAnimatingId(id);
    setTimeout(async () => {
      await onComplete(id);
      setAnimatingId(null);
    }, 300);
  };

  const isOverdue = (deadline: string) => {
    const d = new Date(deadline + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  return (
    <div className="w-80 flex-shrink-0 rounded-2xl border-2 border-destructive/30 bg-destructive/5 overflow-hidden">
      {/* Header */}
      <div className="bg-destructive/90 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive-foreground" />
          <h3 className="font-bold text-sm text-destructive-foreground tracking-wide">
            PENDÊNCIAS URGENTES ({pendencies.length})
          </h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-destructive-foreground hover:bg-destructive-foreground/20"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova
        </Button>
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : pendencies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma pendência ativa
          </div>
        ) : (
          pendencies.map(p => {
            const overdue = isOverdue(p.deadline);
            const priorityCfg = PRIORITY_CONFIG[p.priority];
            return (
              <div
                key={p.id}
                className={cn(
                  "bg-card rounded-xl p-3 border shadow-sm transition-all duration-300",
                  overdue && "bg-destructive/5 border-destructive/30",
                  animatingId === p.id && "opacity-0 scale-95 -translate-x-4"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">{p.client_name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{p.client_profession}</p>
                  </div>
                  <Badge className={cn("text-[10px] px-1.5 py-0 border", priorityCfg.className)}>
                    {priorityCfg.emoji} {priorityCfg.label}
                  </Badge>
                </div>

                <p className="text-xs text-foreground mb-2 line-clamp-2">{p.description}</p>

                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[11px] font-medium",
                    overdue ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {formatRelativeDeadline(p.deadline)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleComplete(p.id)}
                      className="p-1 rounded hover:bg-success/20 transition-colors"
                      title="Concluir"
                    >
                      <Check className="w-4 h-4 text-success" />
                    </button>
                    <button
                      onClick={() => onRemove(p.id)}
                      className="p-1 rounded hover:bg-destructive/20 transition-colors"
                      title="Remover"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Pendency Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Pendência Urgente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Client Select with Search */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setClientId(''); }}
              />
              {clientSearch && !clientId && (
                <div className="max-h-32 overflow-y-auto border rounded-md bg-popover">
                  {filteredClients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                  ) : (
                    filteredClients.slice(0, 8).map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => { setClientId(c.id); setClientSearch(c.name); }}
                      >
                        {c.name} <span className="text-muted-foreground">— {c.profession}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Pendência</Label>
              <Textarea
                placeholder="Ex: Investir 20 mil na liquidez diária"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Data limite</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!clientId || !description.trim() || !deadline || isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Pendência'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
