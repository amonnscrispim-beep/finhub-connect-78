import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Calendar, User, Briefcase, Plus, X, ChevronDown, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CollapsibleSection } from './CollapsibleSection';
import { CollapsibleComments } from './CollapsibleComments';
import { FUNNEL_STAGE_OPTIONS } from '@/lib/funnel-utils';
import { CONTRACTED_MEETINGS_OPTIONS, type Client, type ContractMeeting, type MeetingTask } from '@/types/client';
import { cn } from '@/lib/utils';

const uid = () => Math.random().toString(36).slice(2, 12);

export const emptyMeeting = (number: number): ContractMeeting => ({
  id: uid(), number, date: '', status: 'Pendente', workDone: '', clientTasks: [], consultantTasks: [],
});

const hasContent = (m: ContractMeeting) =>
  !!m.workDone.trim() || !!m.date || m.status !== 'Pendente' || m.clientTasks.length > 0 || m.consultantTasks.length > 0;

/** One-time migration: old "Trabalho desenvolvido" and existing tasks go into Meeting 1. */
export function buildInitialContractMeetings(client: Client): ContractMeeting[] {
  const count = client.contractedMeetings || 0;
  const hasLegacy = !!client.workDone?.trim() || (client.tasks?.length ?? 0) > 0;
  const total = Math.max(count, hasLegacy ? 1 : 0);
  const list = Array.from({ length: total }, (_, i) => emptyMeeting(i + 1));
  if (list[0] && hasLegacy) {
    list[0].workDone = client.workDone || '';
    list[0].clientTasks = (client.tasks || []).map((t) => ({ id: t.id || uid(), text: t.title || t.description, done: t.completed }));
  }
  return list;
}

const RENEWAL_OPTIONS = ['Em negociação', 'Aprovada', 'Recusada'];
export const SEGMENTATION_OPTIONS = ['Varejo', 'Alta Renda', 'Private'];
const PERIODICITY_OPTIONS = [15, 30, 45, 60, 90];

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  onConsultingFinishedChange: (value: boolean) => void;
  onRenewedChange: (value: boolean) => void;
}

export function ContratoAcompanhamento({ formData, setFormData, onConsultingFinishedChange, onRenewedChange }: Props) {
  const meetings: ContractMeeting[] = formData.contractMeetings || [];
  const contracted: number = formData.contractedMeetings || 0;
  const done = meetings.filter((m) => m.status === 'Realizada').length;
  const set = (field: string, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));
  const setMeetings = (fn: (list: ContractMeeting[]) => ContractMeeting[]) =>
    setFormData((prev) => ({ ...prev, contractMeetings: fn(prev.contractMeetings || []) }));

  // Ajusta o número de blocos sem apagar reuniões com conteúdo
  useEffect(() => {
    if (!contracted) return;
    setMeetings((list) => {
      if (list.length < contracted) {
        return [...list, ...Array.from({ length: contracted - list.length }, (_, i) => emptyMeeting(list.length + i + 1))];
      }
      if (list.length > contracted) {
        const kept = list.slice(0, contracted);
        list.slice(contracted).forEach((m) => { if (hasContent(m)) kept.push(m); });
        return kept.length === list.length ? list : kept;
      }
      return list;
    });
  }, [contracted]);

  const updateMeeting = (id: string, patch: Partial<ContractMeeting>) =>
    setMeetings((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const updateTasks = (id: string, key: 'clientTasks' | 'consultantTasks', fn: (t: MeetingTask[]) => MeetingTask[]) =>
    setMeetings((list) => list.map((m) => (m.id === id ? { ...m, [key]: fn(m[key]) } : m)));

  const denominator = Math.max(contracted, meetings.length, 1);
  const pct = Math.min(100, (done / denominator) * 100);

  return (
    <div className="space-y-4">
      <CollapsibleSection title="Status do Contrato" defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Etapa do Funil</Label>
            <Select value={formData.funnelStage} onValueChange={(v) => set('funnelStage', v)}>
              <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
              <SelectContent>{FUNNEL_STAGE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reuniões Contratadas</Label>
            <Select value={contracted ? String(contracted) : ''} onValueChange={(v) => set('contractedMeetings', parseInt(v))}>
              <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{CONTRACTED_MEETINGS_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Periodicidade</Label>
            <Select value={String(formData.meetingPeriodicityDays ?? 30)} onValueChange={(v) => set('meetingPeriodicityDays', parseInt(v))}>
              <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
              <SelectContent>{PERIODICITY_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Segmentação</Label>
            <Select value={formData.segmentation || 'Varejo'} onValueChange={(v) => set('segmentation', v)}>
              <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
              <SelectContent>{SEGMENTATION_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Consultoria Finalizada?</Label>
            <Select value={formData.consultingFinished ? 'sim' : 'não'} onValueChange={(v) => onConsultingFinishedChange(v === 'sim')}>
              <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="não">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Progresso da Consultoria</span>
            <span className="text-sm text-muted-foreground">{done} de {contracted || meetings.length} reuniões realizadas</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {formData.consultingFinished && (
          <p className="text-xs text-muted-foreground">Cliente não contado no total de ativos e não gera alertas de reunião.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Reuniões" defaultOpen>
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Selecione o número de reuniões contratadas para gerar os blocos.</p>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} onChange={(p) => updateMeeting(m.id, p)} onTasks={(k, fn) => updateTasks(m.id, k, fn)} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Renovação" defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Status de Renovação</Label>
            <Select value={formData.renewalStatus || ''} onValueChange={(v) => set('renewalStatus', v)}>
              <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {[...RENEWAL_OPTIONS, ...(formData.renewalStatus && !RENEWAL_OPTIONS.includes(formData.renewalStatus) ? [formData.renewalStatus] : [])]
                  .map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de Renovação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className={cn('w-full justify-start text-left font-normal crm-input', !formData.renewalDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.renewalDate ? format(new Date(formData.renewalDate), 'dd/MM/yyyy', { locale: ptBR }) : <span>Selecione</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={formData.renewalDate ? new Date(formData.renewalDate) : undefined} onSelect={(d) => set('renewalDate', d || null)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Renovado?</Label>
            <Select value={formData.renewed ? 'sim' : 'não'} onValueChange={(v) => onRenewedChange(v === 'sim')}>
              <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="não">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Potencial Renovação?</Label>
            <Select value={formData.renewalPotential ? 'sim' : 'não'} onValueChange={(v) => set('renewalPotential', v === 'sim')}>
              <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="não">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Observações Gerais" defaultOpen>
        <Textarea value={formData.observations || ''} onChange={(e) => set('observations', e.target.value)} placeholder="Observações gerais sobre o cliente..." className="min-h-[100px]" />
        <CollapsibleComments
          value={formData.moduleNotes?.contract || ''}
          onChange={(value) => setFormData((prev) => ({ ...prev, moduleNotes: { ...prev.moduleNotes, contract: value } }))}
        />
      </CollapsibleSection>
    </div>
  );
}

function MeetingCard({ meeting, onChange, onTasks }: {
  meeting: ContractMeeting;
  onChange: (p: Partial<ContractMeeting>) => void;
  onTasks: (key: 'clientTasks' | 'consultantTasks', fn: (t: MeetingTask[]) => MeetingTask[]) => void;
}) {
  const [open, setOpen] = useState(meeting.status !== 'Realizada');
  const border = meeting.status === 'Realizada' ? 'border-success/40' : meeting.status === 'Agendada' ? 'border-primary/40' : 'border-border';

  const TaskList = ({ k, label, icon: Icon, placeholder }: { k: 'clientTasks' | 'consultantTasks'; label: string; icon: any; placeholder: string }) => (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</label>
      {meeting[k].map((task) => (
        <div key={task.id} className="flex items-center gap-2">
          <Checkbox checked={task.done} onCheckedChange={(c) => onTasks(k, (l) => l.map((t) => (t.id === task.id ? { ...t, done: !!c } : t)))} />
          <Input
            defaultValue={task.text}
            onBlur={(e) => onTasks(k, (l) => l.map((t) => (t.id === task.id ? { ...t, text: e.target.value } : t)))}
            placeholder={placeholder}
            className={`h-7 text-xs flex-1 ${task.done ? 'line-through text-muted-foreground' : ''}`}
          />
          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => onTasks(k, (l) => l.filter((t) => t.id !== task.id))}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="text-xs h-6" onClick={() => onTasks(k, (l) => [...l, { id: uid(), text: '', done: false }])}>
        <Plus className="w-3 h-3 mr-1" /> Adicionar tarefa
      </Button>
    </div>
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`border rounded-lg p-4 space-y-3 ${border}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CollapsibleTrigger asChild>
            <button type="button" className="text-sm font-semibold flex items-center gap-2">
              {meeting.status === 'Realizada' ? <CheckCircle2 className="w-4 h-4 text-success" />
                : meeting.status === 'Agendada' ? <Calendar className="w-4 h-4 text-primary" />
                : <Circle className="w-4 h-4 text-muted-foreground" />}
              Reunião {meeting.number}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-3">
            <input type="date" value={meeting.date} onChange={(e) => onChange({ date: e.target.value })} className="text-xs border border-border bg-background rounded px-2 py-1" />
            <Select value={meeting.status} onValueChange={(v) => { onChange({ status: v as any }); if (v === 'Realizada') setOpen(false); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Agendada">Agendada</SelectItem>
                <SelectItem value="Realizada">Realizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CollapsibleContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Trabalho Realizado</label>
            <Textarea value={meeting.workDone} onChange={(e) => onChange({ workDone: e.target.value })} placeholder="Cole aqui o resumo da reunião..." className="mt-1 min-h-[80px] text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TaskList k="clientTasks" label="Tarefas do Cliente" icon={User} placeholder="Tarefa do cliente..." />
            <TaskList k="consultantTasks" label="Tarefas do Consultor" icon={Briefcase} placeholder="Tarefa do consultor..." />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
