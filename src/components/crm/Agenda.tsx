import { useMemo, useState } from 'react';
import { format, isToday, isTomorrow, isThisWeek, isPast, startOfDay, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Clock, ExternalLink, CheckCircle2, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useClients } from '@/contexts/ClientContext';
import { useCrmMeetings } from '@/hooks/useCrmMeetings';
import { Client } from '@/types/client';
import { ScheduleMeetingModal } from './ScheduleMeetingModal';

type Status = 'confirmada' | 'pendente' | 'atrasada';
type Filter = 'todas' | 'pendentes' | 'confirmadas' | 'atrasadas' | 'projetadas';

interface AgendaItem {
  id: string;
  client?: Client;
  clientName: string;
  title?: string;
  description?: string | null;
  date: Date;
  time?: string;
  status: Status;
  isProjected?: boolean;
}

interface AgendaProps {
  onEditClient: (client: Client) => void;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  confirmada: { label: 'CONFIRMADA', className: 'bg-success/15 text-success border-success/30' },
  pendente: { label: 'PENDENTE', className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  atrasada: { label: 'ATRASADA', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

function classify(date: Date, client?: Client): Status {
  if (isPast(date) && !isToday(date)) return 'atrasada';
  // Confirmadas: tem horário definido e cliente não é "pendingSchedule"
  if (client?.pendingSchedule) return 'pendente';
  return 'confirmada';
}

function groupLabel(date: Date): string {
  if (isToday(date)) return `HOJE — ${format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}`;
  if (isTomorrow(date)) return `AMANHÃ — ${format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}`;
  if (isThisWeek(date, { weekStartsOn: 1 })) return `ESTA SEMANA — ${format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}`;
  if (isPast(date)) return `ATRASADAS — ${format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}`;
  return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
}

export function Agenda({ onEditClient }: AgendaProps) {
  const { clients } = useClients();
  const { meetings, isLoading: isLoadingMeetings, refetch } = useCrmMeetings();
  const [filter, setFilter] = useState<Filter>('todas');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>();
  const [scheduleClient, setScheduleClient] = useState<Client | undefined>();

  const items = useMemo<AgendaItem[]>(() => {
    const out: AgendaItem[] = [];
    const clientById = new Map(clients.map((client) => [client.id, client]));
    const persistedKeys = new Set<string>();

    meetings.forEach((meeting) => {
      const date = new Date(meeting.start_at);
      if (isNaN(date.getTime())) return;

      const client = meeting.client_id ? clientById.get(meeting.client_id) : undefined;
      // Reuniões reais com mais de 7 dias no passado não aparecem mais
      const daysPast = Math.floor((Date.now() - date.getTime()) / 86400000);
      if (daysPast > 7) return;
      const key = `${meeting.client_id ?? meeting.client_name}-${startOfDay(date).toISOString()}`;
      persistedKeys.add(key);

      out.push({
        id: meeting.id,
        client,
        clientName: client?.name ?? meeting.client_name,
        title: meeting.title,
        description: meeting.description,
        date,
        time: format(date, 'HH:mm'),
        status: classify(date, client),
      });
    });

    clients.forEach((c) => {
      if (!c.scheduledMeeting?.date) return;
      const date = new Date(c.scheduledMeeting.date);
      if (isNaN(date.getTime())) return;
      const key = `${c.id}-${startOfDay(date).toISOString()}`;
      if (persistedKeys.has(key)) return;
      out.push({
        id: `client-${c.id}-${date.toISOString()}`,
        client: c,
        clientName: c.name,
        title: 'Reunião com cliente',
        date,
        time: c.scheduledMeeting.time,
        status: classify(date, c),
      });
    });
    // Reuniões projetadas pela periodicidade de cada cliente
    const today = startOfDay(new Date());
    const hasUpcomingReal = new Set(
      out.filter((i) => i.client && i.date >= today).map((i) => i.client!.id)
    );
    clients.forEach((client) => {
      const period = client.meetingPeriodicityDays ?? 30;
      const lastMeeting = client.lastMeetingDate
        ? new Date(client.lastMeetingDate)
        : (client.lastActivityAt ? new Date(client.lastActivityAt) : null);
      if (!lastMeeting || isNaN(lastMeeting.getTime())) return;
      if (hasUpcomingReal.has(client.id)) return;
      const next = addDays(lastMeeting, period);
      const key = `${client.id}-${startOfDay(next).toISOString()}`;
      if (persistedKeys.has(key)) return;
      const daysSince = Math.floor((Date.now() - lastMeeting.getTime()) / 86400000);
      out.push({
        id: `projected_${client.id}`,
        client,
        clientName: client.name,
        title: 'Reunião periódica sugerida',
        description: `Última reunião há ${daysSince} dias (ciclo de ${period} dias)`,
        date: next,
        status: isPast(next) && !isToday(next) ? 'atrasada' : 'pendente',
        isProjected: true,
      });
    });
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [clients, meetings]);

  // Cards de resumo
  const weekItems = items.filter((i) => isThisWeek(i.date, { weekStartsOn: 1 }));
  const pendentes = items.filter((i) => i.status === 'pendente');
  const atrasadas = items.filter((i) => i.status === 'atrasada');
  const proxima = items.find((i) => !isPast(i.date) || isToday(i.date));

  // Aplica filtros
  const filtered = items.filter((i) => {
    if (calendarDate && !isSameDay(i.date, calendarDate)) return false;
    if (filter === 'todas') return true;
    if (filter === 'pendentes') return i.status === 'pendente';
    if (filter === 'confirmadas') return i.status === 'confirmada';
    if (filter === 'atrasadas') return i.status === 'atrasada';
    if (filter === 'projetadas') return !!i.isProjected;
    return true;
  });

  // Agrupa por dia
  const groups = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    filtered.forEach((i) => {
      const key = i.isProjected && i.status === 'atrasada' ? 'projected-late' : startOfDay(i.date).toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return Array.from(map.entries()).map(([key, list]) => ({
      key,
      date: key === 'projected-late' ? new Date(0) : new Date(key),
      items: key === 'projected-late' ? [...list].sort((a, b) => a.date.getTime() - b.date.getTime()) : list,
      isProjectedGroup: key === 'projected-late',
    }));
  }, [filtered]);

  // Dias com reunião (para marcar no mini calendário)
  const daysWithMeetings = useMemo(
    () => items.filter((i) => !i.isProjected && i.status !== 'atrasada').map((i) => startOfDay(i.date)),
    [items]
  );
  const daysProjected = useMemo(
    () => items.filter((i) => i.isProjected && i.status !== 'atrasada').map((i) => startOfDay(i.date)),
    [items]
  );
  const daysLate = useMemo(
    () => items.filter((i) => i.status === 'atrasada').map((i) => startOfDay(i.date)),
    [items]
  );
  const lateClients = new Set(atrasadas.map((i) => i.client?.id ?? i.clientName)).size;
  const openSchedule = (client?: Client) => {
    setScheduleClient(client);
    setScheduleOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as reuniões com seus clientes</p>
        </div>
        <Button onClick={() => openSchedule()} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Reunião
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(['todas', 'pendentes', 'confirmadas', 'atrasadas', 'projetadas'] as Filter[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
        {calendarDate && (
          <Button variant="ghost" size="sm" onClick={() => setCalendarDate(undefined)}>
            Limpar data ({format(calendarDate, 'dd/MM')})
          </Button>
        )}
      </div>

      {lateClients > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertTriangle className="w-4 h-4" />
            {lateClients} cliente{lateClients > 1 ? 's' : ''} com reunião atrasada
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Baseado na periodicidade configurada de cada cliente
          </p>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="crm-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{weekItems.length}</p>
              <p className="text-sm text-muted-foreground">Reuniões esta semana</p>
            </div>
          </div>
        </div>
        <div className="crm-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendentes.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes de confirmação</p>
            </div>
          </div>
        </div>
        <div className="crm-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{atrasadas.length}</p>
              <p className="text-sm text-muted-foreground">Reuniões em atraso</p>
            </div>
          </div>
        </div>
        <div className="crm-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {proxima ? proxima.clientName : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {proxima
                  ? `${format(proxima.date, "dd/MM", { locale: ptBR })}${proxima.time ? ` às ${proxima.time}` : ''}`
                  : 'Sem próxima reunião'}
              </p>
              <p className="text-xs text-muted-foreground">Próxima reunião</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2 space-y-6">
          {isLoadingMeetings ? (
            <div className="crm-card p-8 text-center">
              <Loader2 className="w-10 h-10 mx-auto text-primary mb-3 animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando reuniões salvas...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="crm-card p-8 text-center">
              <CalendarIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma reunião encontrada com os filtros atuais.
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.date.toISOString()} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupLabel(g.date)}
                </h3>
                <div className="crm-card divide-y divide-border overflow-hidden">
                  {g.items.map((item) => {
                    const cfg = statusConfig[item.status];
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors ${item.isProjected ? 'border-l-2 border-dashed border-l-yellow-500 cursor-pointer' : ''}`}
                        onClick={item.isProjected ? () => openSchedule(item.client) : undefined}
                        title={item.isProjected ? `${item.title ?? ''} — ${item.description ?? ''}. Clique para agendar.` : undefined}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.isProjected && <Clock className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />}
                          {item.client ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditClient(item.client!); }}
                              className="font-medium text-sm text-foreground hover:text-primary truncate text-left"
                            >
                              {item.clientName}
                            </button>
                          ) : (
                            <span className="font-medium text-sm text-foreground truncate">{item.clientName}</span>
                          )}
                          {item.time && (
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {item.time}
                            </span>
                          )}
                          {item.isProjected && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">(Sugerida)</span>
                          )}
                          <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); if (item.client) onEditClient(item.client); }}
                            disabled={!item.client}
                            className="h-8"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mini calendário */}
        <div className="lg:col-span-1">
          <div className="crm-card p-4">
            <h3 className="text-sm font-semibold mb-3">Calendário</h3>
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={setCalendarDate}
              locale={ptBR}
              modifiers={{ hasMeeting: daysWithMeetings, projected: daysProjected, late: daysLate }}
              modifiersClassNames={{
                hasMeeting: 'relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary',
                projected: 'relative before:content-[""] before:absolute before:bottom-1 before:left-[35%] before:w-1 before:h-1 before:rounded-full before:bg-yellow-500',
                late: 'relative before:content-[""] before:absolute before:bottom-1 before:right-[35%] before:w-1 before:h-1 before:rounded-full before:bg-destructive',
              }}
              className="pointer-events-auto"
            />
            <p className="text-xs text-muted-foreground mt-3">
              Clique em um dia para filtrar a lista. Azul: agendada · Amarelo: sugerida · Vermelho: atrasada.
            </p>
          </div>
        </div>
      </div>

      <ScheduleMeetingModal
        key={scheduleClient?.id ?? 'new'}
        client={scheduleClient}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
