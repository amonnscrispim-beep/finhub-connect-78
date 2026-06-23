import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  year: number;
  month: number;
  planned: number;
  initialRealized?: number;
  initialDate?: string | null;
  initialNotes?: string | null;
  onSave: (data: { realized: number; date: string | null; notes: string | null; planned: number }) => Promise<void>;
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function AporteRegistroModal({ open, onOpenChange, clientName, year, month, planned, initialRealized, initialDate, initialNotes, onSave }: Props) {
  const [realized, setRealized] = useState('');
  const [plannedEdit, setPlannedEdit] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRealized(initialRealized ? String(initialRealized) : '');
      setPlannedEdit(planned ? String(planned) : '');
      setDate(initialDate ?? '');
      setNotes(initialNotes ?? '');
    }
  }, [open, initialRealized, initialDate, initialNotes, planned]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      realized: Number(realized) || 0,
      planned: Number(plannedEdit) || 0,
      date: date || null,
      notes: notes || null,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Aporte</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <div><strong className="text-foreground">Cliente:</strong> {clientName}</div>
            <div><strong className="text-foreground">Mês:</strong> {MONTHS[month - 1]}/{year}</div>
          </div>
          <div>
            <Label>Planejado (R$)</Label>
            <Input type="number" value={plannedEdit} onChange={e => setPlannedEdit(e.target.value)} />
          </div>
          <div>
            <Label>Realizado (R$)</Label>
            <Input type="number" value={realized} onChange={e => setRealized(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Data do aporte</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
