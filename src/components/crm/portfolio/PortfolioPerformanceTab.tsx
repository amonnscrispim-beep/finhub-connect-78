import { useState, useCallback } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { PortfolioPerformance } from '@/hooks/useClientPortfolio';

interface Props {
  performance: PortfolioPerformance[];
  onSave: (perf: Omit<PortfolioPerformance, 'id'> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PortfolioPerformanceTab({ performance, onSave, onDelete }: Props) {
  const [newMonth, setNewMonth] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const handleAdd = useCallback(async () => {
    if (!newMonth) return;
    if (performance.some(p => p.month === newMonth)) return;
    await onSave({ month: newMonth, initial_value: 0, final_value: 0, deposits: 0, withdrawals: 0, return_pct: null });
    setNewMonth('');
  }, [newMonth, performance, onSave]);

  const startEdit = (perf: PortfolioPerformance) => {
    setEditingId(perf.id);
    setEditData({ ...perf });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await onSave(editData);
    setEditingId(null);
  };

  const calcReturn = (p: PortfolioPerformance) => {
    if (!p.initial_value || p.initial_value === 0) return '—';
    const ret = ((p.final_value - p.deposits + p.withdrawals) / p.initial_value - 1) * 100;
    return `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`;
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          type="month"
          value={newMonth}
          onChange={e => setNewMonth(e.target.value)}
          className="w-40"
          placeholder="YYYY-MM"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newMonth}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar mês
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Mês</th>
              <th className="px-3 py-2 text-right font-medium">Patrimônio Inicial</th>
              <th className="px-3 py-2 text-right font-medium">Patrimônio Final</th>
              <th className="px-3 py-2 text-right font-medium">Aportes</th>
              <th className="px-3 py-2 text-right font-medium">Retiradas</th>
              <th className="px-3 py-2 text-right font-medium">Rentabilidade</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {performance.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                {editingId === p.id ? (
                  <>
                    <td className="px-3 py-1.5 font-mono text-xs">{editData.month}</td>
                    <td className="px-3 py-1.5"><CurrencyInput value={editData.initial_value.toString()} onChange={v => setEditData((d: any) => ({ ...d, initial_value: parseFloat(v) || 0 }))} className="h-7 text-xs" /></td>
                    <td className="px-3 py-1.5"><CurrencyInput value={editData.final_value.toString()} onChange={v => setEditData((d: any) => ({ ...d, final_value: parseFloat(v) || 0 }))} className="h-7 text-xs" /></td>
                    <td className="px-3 py-1.5"><CurrencyInput value={editData.deposits.toString()} onChange={v => setEditData((d: any) => ({ ...d, deposits: parseFloat(v) || 0 }))} className="h-7 text-xs" /></td>
                    <td className="px-3 py-1.5"><CurrencyInput value={editData.withdrawals.toString()} onChange={v => setEditData((d: any) => ({ ...d, withdrawals: parseFloat(v) || 0 }))} className="h-7 text-xs" /></td>
                    <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">—</td>
                    <td className="px-3 py-1.5 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}><Save className="w-3.5 h-3.5" /></Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 font-mono text-xs">{p.month}</td>
                    <td className="px-3 py-2 text-right text-xs cursor-pointer" onClick={() => startEdit(p)}>{formatCurrency(p.initial_value)}</td>
                    <td className="px-3 py-2 text-right text-xs cursor-pointer" onClick={() => startEdit(p)}>{formatCurrency(p.final_value)}</td>
                    <td className="px-3 py-2 text-right text-xs cursor-pointer" onClick={() => startEdit(p)}>{formatCurrency(p.deposits)}</td>
                    <td className="px-3 py-2 text-right text-xs cursor-pointer" onClick={() => startEdit(p)}>{formatCurrency(p.withdrawals)}</td>
                    <td className={`px-3 py-2 text-right text-xs font-semibold ${
                      p.return_pct != null && p.return_pct >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>{calcReturn(p)}</td>
                    <td className="px-3 py-1.5 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {performance.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum mês registrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
