import { useMemo, useState } from 'react';
import { Search, Plus, Minus, TrendingUp, TrendingDown, Users, Target, Trophy, AlertCircle } from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { useContributions, type ContributionRow } from '@/hooks/useContributions';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AporteRegistroModal } from './AporteRegistroModal';
import { toast } from 'sonner';

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

function getStatus(planned: number, realized: number): { emoji: string; label: string; color: string } {
  if (realized <= 0) return { emoji: '🔴', label: 'Sem aporte', color: 'text-destructive' };
  if (realized >= planned) return { emoji: '🟢', label: 'Meta atingida', color: 'text-success' };
  return { emoji: '🟡', label: 'Abaixo da meta', color: 'text-warning' };
}

export function ControleAportes() {
  const { clients } = useClients();
  const { rows, upsertContribution } = useContributions();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loadedYear, setLoadedYear] = useState(now.getFullYear());
  const [loadedMonth, setLoadedMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [filterPending, setFilterPending] = useState(false);
  const [filterNone, setFilterNone] = useState(false);
  const [filterAbove, setFilterAbove] = useState(false);

  const [modalState, setModalState] = useState<null | { client: any; year: number; month: number; existing?: ContributionRow }>(null);

  const activeClients = useMemo(() => clients.filter(c => !c.consultingFinished), [clients]);

  // Map: clientId -> {y-m -> row}
  const rowByKey = useMemo(() => {
    const map = new Map<string, ContributionRow>();
    rows.forEach(r => map.set(`${r.client_id}|${r.year}|${r.month}`, r));
    return map;
  }, [rows]);

  const monthData = useMemo(() => {
    return activeClients.map(c => {
      const r = rowByKey.get(`${c.id}|${loadedYear}|${loadedMonth}`);
      const planned = r?.planned_amount ?? c.monthlyContribution ?? 0;
      const realized = r?.realized_amount ?? 0;
      return { client: c, planned, realized, diff: realized - planned, row: r };
    });
  }, [activeClients, rowByKey, loadedYear, loadedMonth]);

  const filteredMonthData = useMemo(() => {
    return monthData.filter(d => {
      if (search && !d.client.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterNone && d.realized > 0) return false;
      if (filterPending && d.realized >= d.planned) return false;
      if (filterAbove && d.realized < d.planned) return false;
      return true;
    });
  }, [monthData, search, filterPending, filterNone, filterAbove]);

  const indicators = useMemo(() => {
    const totalPlanned = monthData.reduce((s, d) => s + d.planned, 0);
    const totalRealized = monthData.reduce((s, d) => s + d.realized, 0);
    const pct = totalPlanned > 0 ? (totalRealized / totalPlanned) * 100 : 0;
    const withoutCount = monthData.filter(d => d.realized <= 0).length;
    return { totalPlanned, totalRealized, pct, withoutCount };
  }, [monthData]);

  const yearTotals = useMemo(() => {
    const planned = activeClients.reduce((s, c) => s + ((c.monthlyContribution || 0) * 12), 0);
    const realized = rows.filter(r => r.year === loadedYear).reduce((s, r) => s + Number(r.realized_amount || 0), 0);
    return { planned, realized };
  }, [activeClients, rows, loadedYear]);

  const rankings = useMemo(() => {
    const yearRows = rows.filter(r => r.year === loadedYear);
    const byClient = new Map<string, number>();
    yearRows.forEach(r => byClient.set(r.client_id, (byClient.get(r.client_id) ?? 0) + Number(r.realized_amount || 0)));
    const top = activeClients
      .map(c => ({ client: c, total: byClient.get(c.id) ?? 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const none = activeClients
      .map(c => ({ client: c, total: byClient.get(c.id) ?? 0 }))
      .filter(x => x.total === 0)
      .slice(0, 5);
    return { top, none };
  }, [rows, activeClients, loadedYear]);

  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    ys.add(now.getFullYear());
    ys.add(now.getFullYear() - 1);
    ys.add(now.getFullYear() + 1);
    rows.forEach(r => ys.add(r.year));
    return Array.from(ys).sort((a, b) => b - a);
  }, [rows]);

  const handleLoad = () => {
    setLoadedYear(year);
    setLoadedMonth(month);
  };

  const handleCellClick = (client: any, y: number, m: number) => {
    const existing = rowByKey.get(`${client.id}|${y}|${m}`);
    setModalState({ client, year: y, month: m, existing });
  };

  const handleSaveModal = async (data: { realized: number; date: string | null; notes: string | null; planned: number }) => {
    if (!modalState) return;
    await upsertContribution({
      client_id: modalState.client.id,
      year: modalState.year,
      month: modalState.month,
      planned_amount: data.planned,
      realized_amount: data.realized,
      contribution_date: data.date,
      notes: data.notes,
    });
    toast.success('Aporte registrado');
  };

  return (
    <div className="space-y-6">
      {/* Dashboard gerencial */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="w-3.5 h-3.5" />Captação Prevista (Mês)</div>
          <div className="text-xl font-bold mt-1">{formatCurrency(indicators.totalPlanned)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" />Captação Realizada (Mês)</div>
          <div className="text-xl font-bold mt-1 text-success">{formatCurrency(indicators.totalRealized)}</div>
          <div className="text-xs text-muted-foreground mt-1">{indicators.pct.toFixed(1)}% cumprido</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="w-3.5 h-3.5" />Captação Prevista (Ano)</div>
          <div className="text-xl font-bold mt-1">{formatCurrency(yearTotals.planned)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" />Clientes Sem Aporte (Mês)</div>
          <div className="text-xl font-bold mt-1 text-destructive">{indicators.withoutCount}</div>
        </Card>
      </div>

      {/* Filters top */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Ano</Label>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mês</Label>
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_LONG.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleLoad}>Carregar Mês</Button>
          <Button variant="outline" onClick={() => setShowHistory(v => !v)}>
            {showHistory ? <><Minus className="w-4 h-4 mr-1" />Ocultar Histórico</> : <><Plus className="w-4 h-4 mr-1" />Exibir Histórico</>}
          </Button>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={filterPending} onCheckedChange={v => setFilterPending(!!v)} />
            Apenas pendentes
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={filterNone} onCheckedChange={v => setFilterNone(!!v)} />
            Apenas sem aporte
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={filterAbove} onCheckedChange={v => setFilterAbove(!!v)} />
            Apenas acima da meta
          </label>
        </div>
      </Card>

      {/* Main table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold">
            {showHistory ? `Histórico Anual — ${loadedYear}` : `Aportes de ${MONTHS_LONG[loadedMonth - 1]}/${loadedYear}`}
          </h3>
        </div>
        <ScrollArea className="w-full">
          <div className={showHistory ? 'min-w-[1200px]' : ''}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  {!showHistory && <>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </>}
                  {showHistory && MONTHS_SHORT.map(m => (
                    <TableHead key={m} className="text-right">{m}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMonthData.length === 0 && (
                  <TableRow><TableCell colSpan={showHistory ? 14 : 5} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
                )}
                {filteredMonthData.map(({ client, planned, realized, diff }) => {
                  const status = getStatus(planned, realized);
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(planned)}</TableCell>
                      {!showHistory && <>
                        <TableCell
                          className="text-right cursor-pointer hover:bg-muted/50"
                          onClick={() => handleCellClick(client, loadedYear, loadedMonth)}
                          title="Clique para registrar"
                        >
                          {formatCurrency(realized)}
                        </TableCell>
                        <TableCell className={`text-right ${diff < 0 ? 'text-destructive' : diff > 0 ? 'text-success' : ''}`}>
                          {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span title={status.label}>{status.emoji}</span>
                        </TableCell>
                      </>}
                      {showHistory && MONTHS_SHORT.map((_, idx) => {
                        const m = idx + 1;
                        const r = rowByKey.get(`${client.id}|${loadedYear}|${m}`);
                        const val = r?.realized_amount ?? 0;
                        return (
                          <TableCell
                            key={m}
                            className="text-right cursor-pointer hover:bg-muted/50 text-xs"
                            onClick={() => handleCellClick(client, loadedYear, m)}
                          >
                            {val > 0 ? formatCurrency(val) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      {/* Rankings */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 font-semibold mb-3"><Trophy className="w-4 h-4 text-success" />Maiores Aportadores ({loadedYear})</div>
          <div className="space-y-1.5 text-sm">
            {rankings.top.map((r, i) => (
              <div key={r.client.id} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                <span>{i + 1}. {r.client.name}</span>
                <span className="font-medium">{formatCurrency(r.total)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 font-semibold mb-3"><AlertCircle className="w-4 h-4 text-destructive" />Clientes Sem Aporte ({loadedYear})</div>
          <div className="space-y-1.5 text-sm">
            {rankings.none.length === 0 && <div className="text-muted-foreground">Nenhum cliente sem aporte 🎉</div>}
            {rankings.none.map(r => (
              <div key={r.client.id} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                <span>{r.client.name}</span>
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {modalState && (
        <AporteRegistroModal
          open={!!modalState}
          onOpenChange={(o) => !o && setModalState(null)}
          clientName={modalState.client.name}
          year={modalState.year}
          month={modalState.month}
          planned={modalState.existing?.planned_amount ?? modalState.client.monthlyContribution ?? 0}
          initialRealized={modalState.existing?.realized_amount}
          initialDate={modalState.existing?.contribution_date}
          initialNotes={modalState.existing?.notes}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
}
