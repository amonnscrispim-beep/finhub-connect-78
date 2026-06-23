import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useContributions, fetchContributionPlan, saveContributionPlan, type ContributionPlan } from '@/hooks/useContributions';
import { AporteRegistroModal } from './AporteRegistroModal';
import { toast } from 'sonner';

const MONTHS_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

interface Props {
  clientId: string;
  clientName: string;
  defaultPlanned: number;
}

export function ClientAportesTab({ clientId, clientName, defaultPlanned }: Props) {
  const { rows, upsertContribution } = useContributions();
  const [plan, setPlan] = useState<ContributionPlan>({
    planned_monthly_contribution: 0,
    contribution_start_date: null,
    contribution_periodicity: 'Mensal',
    contribution_notes: null,
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState<null | { month: number }>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    fetchContributionPlan(clientId).then(p => {
      if (p) setPlan({
        planned_monthly_contribution: Number(p.planned_monthly_contribution) || 0,
        contribution_start_date: p.contribution_start_date || null,
        contribution_periodicity: p.contribution_periodicity || 'Mensal',
        contribution_notes: p.contribution_notes || null,
      });
    });
  }, [clientId]);

  const myRows = useMemo(() => rows.filter(r => r.client_id === clientId && r.year === year), [rows, clientId, year]);
  const byMonth = useMemo(() => {
    const m = new Map<number, typeof myRows[0]>();
    myRows.forEach(r => m.set(r.month, r));
    return m;
  }, [myRows]);

  const monthly = MONTHS_LONG.map((name, idx) => {
    const r = byMonth.get(idx + 1);
    const planned = r?.planned_amount ?? plan.planned_monthly_contribution ?? defaultPlanned ?? 0;
    const realized = r?.realized_amount ?? 0;
    return { month: idx + 1, name, planned, realized, row: r };
  });

  const totals = useMemo(() => {
    const tp = monthly.reduce((s, m) => s + m.planned, 0);
    const tr = monthly.reduce((s, m) => s + m.realized, 0);
    const max = monthly.reduce((mx, m) => m.realized > mx ? m.realized : mx, 0);
    const last = [...myRows].sort((a, b) => b.month - a.month).find(r => r.realized_amount > 0);
    return { tp, tr, pct: tp ? (tr / tp) * 100 : 0, max, last };
  }, [monthly, myRows]);

  const handleSavePlan = async () => {
    setSavingPlan(true);
    const ok = await saveContributionPlan(clientId, plan);
    setSavingPlan(false);
    if (ok) toast.success('Planejamento salvo');
  };

  return (
    <div className="space-y-6">
      {/* Planejamento */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Planejamento de Aportes</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Aporte Projetado Mensal (R$)</Label>
            <Input type="number" value={plan.planned_monthly_contribution || ''} onChange={e => setPlan({ ...plan, planned_monthly_contribution: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Data de Início</Label>
            <Input type="date" value={plan.contribution_start_date ?? ''} onChange={e => setPlan({ ...plan, contribution_start_date: e.target.value || null })} />
          </div>
          <div>
            <Label>Periodicidade</Label>
            <Select value={plan.contribution_periodicity ?? 'Mensal'} onValueChange={v => setPlan({ ...plan, contribution_periodicity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mensal">Mensal</SelectItem>
                <SelectItem value="Trimestral">Trimestral</SelectItem>
                <SelectItem value="Semestral">Semestral</SelectItem>
                <SelectItem value="Esporádico">Esporádico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={plan.contribution_notes ?? ''} onChange={e => setPlan({ ...plan, contribution_notes: e.target.value || null })} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={handleSavePlan} disabled={savingPlan}>{savingPlan ? 'Salvando...' : 'Salvar Planejamento'}</Button>
        </div>
      </Card>

      {/* Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total Planejado Ano</div><div className="font-bold">{fmt(totals.tp)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total Realizado Ano</div><div className="font-bold text-success">{fmt(totals.tr)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">% Cumprido</div><div className="font-bold">{totals.pct.toFixed(1)}%</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Maior Aporte</div><div className="font-bold">{fmt(totals.max)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Último Aporte</div><div className="font-bold text-sm">{totals.last ? `${MONTHS_LONG[totals.last.month - 1]} • ${fmt(Number(totals.last.realized_amount))}` : '—'}</div></Card>
      </div>

      {/* Yearly table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Histórico {year}</h3>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[110px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[year - 1, year, year + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Planejado</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthly.map(m => {
              const status = m.realized <= 0 ? '🔴' : m.realized >= m.planned ? '🟢' : '🟡';
              return (
                <TableRow key={m.month} className="cursor-pointer hover:bg-muted/50" onClick={() => setModal({ month: m.month })}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell className="text-right">{fmt(m.planned)}</TableCell>
                  <TableCell className="text-right">{fmt(m.realized)}</TableCell>
                  <TableCell className="text-center">{status}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {modal && (
        <AporteRegistroModal
          open={!!modal}
          onOpenChange={(o) => !o && setModal(null)}
          clientName={clientName}
          year={year}
          month={modal.month}
          planned={byMonth.get(modal.month)?.planned_amount ?? plan.planned_monthly_contribution ?? defaultPlanned ?? 0}
          initialRealized={byMonth.get(modal.month)?.realized_amount}
          initialDate={byMonth.get(modal.month)?.contribution_date}
          initialNotes={byMonth.get(modal.month)?.notes}
          onSave={async (data) => {
            await upsertContribution({
              client_id: clientId,
              year,
              month: modal.month,
              planned_amount: data.planned,
              realized_amount: data.realized,
              contribution_date: data.date,
              notes: data.notes,
            });
            toast.success('Aporte salvo');
          }}
        />
      )}
    </div>
  );
}
