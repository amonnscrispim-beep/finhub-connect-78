import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/contexts/ClientContext';
import { useAuth } from '@/hooks/useAuth';
import type { TaskInput, TaskPriority } from '@/types/client';
import { toast } from 'sonner';

interface NewTaskModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultClientId?: string | null;
  // When provided, edits an existing task instead of creating
  editing?: {
    clientId: string;
    taskId: string;
    initial: TaskInput;
  } | null;
}

const PRIORITIES: TaskPriority[] = ['Baixa', 'Média', 'Alta', 'Urgente'];
const CATEGORIES = ['Ligação', 'Reunião', 'Carteira', 'Relatório', 'Follow-up', 'Renovação', 'Outro'];

export function NewTaskModal({ open, onOpenChange, defaultClientId = null, editing = null }: NewTaskModalProps) {
  const { clients, addTask, updateTask } = useClients();
  const { user } = useAuth();

  const [clientId, setClientId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Média');
  const [category, setCategory] = useState<string>('Ligação');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setClientId(editing.clientId);
      setTitle(editing.initial.title ?? '');
      setDescription(editing.initial.description ?? '');
      setAssignee(editing.initial.assignee ?? '');
      const d = editing.initial.dueDate ? new Date(editing.initial.dueDate) : null;
      if (d) {
        setDate(d.toISOString().slice(0, 10));
        setTime(d.toTimeString().slice(0, 5));
      } else {
        setDate('');
        setTime('');
      }
      setPriority((editing.initial.priority as TaskPriority) ?? 'Média');
      setCategory(editing.initial.category ?? 'Ligação');
      setNotes(editing.initial.notes ?? '');
    } else {
      setClientId(defaultClientId ?? '');
      setTitle('');
      setDescription('');
      setAssignee(user?.email?.split('@')[0] ?? '');
      setDate(new Date().toISOString().slice(0, 10));
      setTime('09:00');
      setPriority('Média');
      setCategory('Ligação');
      setNotes('');
    }
  }, [open, editing, defaultClientId, user]);

  const handleSave = async () => {
    if (!clientId) {
      toast.error('Selecione um cliente');
      return;
    }
    const finalDescription = (description || title).trim();
    if (!finalDescription) {
      toast.error('Informe o título ou descrição da tarefa');
      return;
    }
    let dueDate: Date | null = null;
    if (date) {
      const iso = `${date}T${time || '09:00'}:00`;
      dueDate = new Date(iso);
    }
    const payload: TaskInput = {
      description: finalDescription,
      title: title.trim() || null,
      dueDate,
      priority,
      category,
      assignee: assignee.trim() || null,
      notes: notes.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) {
        await updateTask(editing.clientId, editing.taskId, payload);
        toast.success('Tarefa atualizada');
      } else {
        await addTask(clientId, finalDescription, payload);
        toast.success('Tarefa criada');
      }
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Ligar para revisar carteira" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes da tarefa" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável</Label>
              <Input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Consultor" />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Hora</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas internas" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
