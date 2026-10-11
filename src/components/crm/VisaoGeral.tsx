import { useMemo } from 'react';
import { format, isToday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useClients } from '@/contexts/ClientContext';
import { useCrmMeetings } from '@/hooks/useCrmMeetings';
import type { Client } from '@/types/client';
import { meetingStatusOf } from './KanbanView';
import { clientPatrimony, formatCompactBRL } from './KanbanToolbar';

const STAGE_ORDER = ['Em atendimento', 'START', 'GROWTH', 'SELECT', 'PRIVATE'];

export function VisaoGeral({ onEditClient }: { onEditClient: (c: Client) => void }) {
  const { clients } = useClients();
  const { meetings } = useCrmMeetings();

  const active = clients.filter((c) => !c.consultingFinished);
  const finished = clients.length - active.length;
  const total = active.reduce((s, c) => s + clientPatrimony(c), 0);
  const overdueClients = active.filter((c) => meetingStatusOf(c) === 'overdue');

  const stages = useMemo(() => {
    const counts: Record<string, number> = {};
    active.forEach((c) => { const s = c.funnelStage || 'START'; counts[s] = (counts[s] || 0) + 1; });
    const names = [...STAGE_ORDER, ...Object.keys(counts).filter((k) => !STAGE_ORDER.includes(k))];
    return names.map((name) => ({ name, count: counts[name] || 0 })).filter((s) => s.count > 0 || STAGE_ORDER.includes(s.name));
  }, [active]);
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  const finishedIds = new Set(clients.filter((c) => c.consultingFinished).map((c) => c.id));
  const upcoming = meetings
    .filter((m) => new Date(m.start_at) >= startOfDay(new Date()) && !(m.client_id && finishedIds.has(m.client_id)))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="crm-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Clientes Ativos</p>
          <p className="text-2xl font-bold text-foreground">{active.length}</p>
          <p className="text-xs text-muted-foreground">Total: {clients.length}</p>
        </div>
        <div className="crm-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Patrimônio Financeiro Total</p>
          <p className="text-2xl font-bold text-primary">{formatCompactBRL(total)}</p>
          <p className="text-xs text-muted-foreground">Soma de todos os clientes ativos</p>
        </div>
        <div className="crm-card p-5 border-red-100">
          <p className="text-xs text-muted-foreground mb-1">Reuniões em Atraso</p>
          <p className="text-2xl font-bold text-red-600">{overdueClients.length}</p>
        </div>
        <div className="crm-card p-5 border-green-100">
          <p className="text-xs text-muted-foreground mb-1">Consultorias Finalizadas</p>
          <p className="text-2xl font-bold text-green-600">{finished}</p>
          <p className="text-xs text-muted-foreground">de {clients.length} clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="crm-card p-5">
          <h3 className="text-sm font-semibold mb-4">Clientes por Etapa do Funil</h3>
          {stages.map((stage) => (
            <div key={stage.name} className="flex items-center gap-3 mb-3">
              <span className="text-xs w-28 text-muted-foreground truncate">{stage.name}</span>
              <div className="flex-1 bg-muted rounded-full h-6">
                <div
                  className="bg-primary h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${(stage.count / maxCount) * 100}%`, minWidth: stage.count > 0 ? '30px' : '0' }}
                >
                  {stage.count > 0 && <span className="text-[10px] font-bold text-primary-foreground">{stage.count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="crm-card p-5">
          <h3 className="text-sm font-semibold mb-4">Próximas Reuniões</h3>
          {upcoming.length === 0 && overdueClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
          ) : (
            <div className="space-y-1">
              {overdueClients.slice(0, Math.max(0, 5 - upcoming.length)).map((c) => (
                <button key={c.id} type="button" onClick={() => onEditClient(c)} className="w-full flex items-center justify-between py-2 border-b border-border last:border-0 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Ciclo de reunião vencido</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">Atrasada</span>
                </button>
              ))}
              {upcoming.map((m) => {
                const d = new Date(m.start_at);
                const today = isToday(d);
                const client = clients.find((c) => c.id === m.client_id);
                return (
                  <button key={m.id} type="button" disabled={!client} onClick={() => client && onEditClient(client)} className="w-full flex items-center justify-between py-2 border-b border-border last:border-0 text-left">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${today ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm font-medium">{m.client_name}</p>
                        <p className="text-xs text-muted-foreground">{format(d, "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${today ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                      {today ? 'Hoje' : 'Confirmada'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
