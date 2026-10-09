import { Plus, Trash2, AlertTriangle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { ConhecerClienteData, BudgetItem } from './types';

export const BUDGET_CATEGORIES = [
  'Moradia (aluguel/financiamento)', 'Condomínio e IPTU', 'Contas da casa (luz, água, gás, internet)',
  'Alimentação', 'Saúde (plano, medicamentos)', 'Educação', 'Transporte', 'Seguros',
  'Lazer e entretenimento', 'Viagens', 'Vestuário', 'Empregados domésticos', 'Pensão alimentícia',
  'Dívidas/Financiamentos', 'Assinaturas/Streaming', 'Outros',
];

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#84cc16', '#d946ef', '#64748b'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n = (v: unknown) => parseFloat(String(v ?? '')) || 0;
const genId = () => Math.random().toString(36).substring(2, 10);

export function monthlyIncomeOf(d: ConhecerClienteData): number {
  const v = incomeByType(d);
  return v > 0 ? v : n(d.annualFamilyIncome) / 12;
}

function incomeByType(d: ConhecerClienteData): number {
  switch (d.employmentType) {
    case 'CLT': return n(d.cltNetSalary);
    case 'PJ': case 'Empresário/Sócio': return n(d.pjProLabore) + n(d.pjProfitDistribution);
    case 'Autônomo': return n(d.autonomoIncome);
    case 'Aposentado': return n(d.aposentadoIncome);
    case 'Servidor Público': return n(d.servidorNetSalary);
    default: return 0;
  }
}

interface Props { data: ConhecerClienteData; update: (p: Partial<ConhecerClienteData>) => void }

export function BudgetPanel({ data, update }: Props) {
  const items = data.budgetItems ?? [];
  const setItems = (next: BudgetItem[]) => {
    const total = next.reduce((s, i) => s + n(i.value), 0);
    update({ budgetItems: next, ...(next.length > 0 ? { monthlyCostOfLiving: total ? String(total) : '' } : {}) });
  };
  const edit = (id: string, field: keyof BudgetItem, value: string) => setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const renda = monthlyIncomeOf(data);
  const total = items.reduce((s, i) => s + n(i.value), 0);
  const sobra = renda - total;
  const aporte = n(data.monthlyInvestmentCapacity);
  const pct = (v: number) => (renda > 0 ? Math.round((v / renda) * 100) : 0);
  const pctDesp = pct(total), pctSobra = pct(sobra), pctAporte = pct(aporte);

  const byCat = items.reduce((acc, i) => { if (i.category && n(i.value)) acc[i.category] = (acc[i.category] || 0) + n(i.value); return acc; }, {} as Record<string, number>);
  const pieData = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const barData = [{ name: 'Renda', despesas: Math.min(pctDesp, 100), aporte: pctAporte, sobra: Math.max(0, 100 - pctDesp - pctAporte) }];

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Receipt className="w-4 h-4" />Tabela de Orçamento</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-xs text-muted-foreground">
            <th className="w-[35%] p-1">Categoria</th><th className="w-[25%] p-1">Descrição</th><th className="w-[25%] p-1">Valor mensal</th><th className="w-[12%] p-1">% renda</th><th />
          </tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td className="p-1"><Select value={i.category} onValueChange={(v) => edit(i.id, 'category', v)}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{BUDGET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></td>
                <td className="p-1"><Input value={i.description} onChange={(e) => edit(i.id, 'description', e.target.value)} className="crm-input" /></td>
                <td className="p-1"><CurrencyInput value={i.value} onChange={(v) => edit(i.id, 'value', v)} /></td>
                <td className="p-1 text-muted-foreground">{renda > 0 ? `${pct(n(i.value))}%` : '—'}</td>
                <td className="p-1"><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setItems(items.filter((x) => x.id !== i.id))}><Trash2 className="w-3 h-3" /></Button></td>
              </tr>
            ))}
            {items.length > 0 && (
              <tr className="bg-muted/40 font-semibold"><td className="p-2">TOTAL DE DESPESAS</td><td /><td className="p-2">{fmt(total)}</td><td className="p-2">{renda > 0 ? `${pctDesp}%` : '—'}</td><td /></tr>
            )}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { id: genId(), category: '', description: '', value: '' }])}><Plus className="w-3 h-3 mr-1" />Adicionar despesa</Button>

      {renda > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Renda mensal" value={fmt(renda)} cls="text-primary" />
            <Card label="Despesas" value={fmt(total)} sub={`${pctDesp}% da renda`} cls="text-destructive" />
            <Card label="Sobra mensal" value={fmt(sobra)} sub={`${pctSobra}% da renda`} cls={sobra >= 0 ? 'text-green-600' : 'text-destructive'} />
            <Card label="Aporte mensal" value={fmt(aporte)} sub={`${pctAporte}% da renda`} cls="text-blue-600" />
          </div>
          <ResponsiveContainer width="100%" height={50}>
            <BarChart data={barData} layout="vertical" barSize={28}>
              <XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="name" hide />
              <Tooltip formatter={(v: number, k: string) => [`${v}%`, k === 'despesas' ? 'Despesas' : k === 'aporte' ? 'Aporte' : 'Sobra livre']} />
              <Bar dataKey="despesas" stackId="a" fill="#ef4444" /><Bar dataKey="aporte" stackId="a" fill="#3b82f6" /><Bar dataKey="sobra" stackId="a" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-[#ef4444]" />Despesas ({pctDesp}%)</span>
            <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-[#3b82f6]" />Aporte ({pctAporte}%)</span>
            <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-[#22c55e]" />Sobra ({pctSobra}%)</span>
          </div>
          {pctDesp > 100 && <Alert cls="bg-destructive/10 border-destructive/20 text-destructive">As despesas ({pctDesp}%) ultrapassam a renda mensal. O cliente está em déficit.</Alert>}
          {aporte > sobra && sobra >= 0 && <Alert cls="bg-amber-500/10 border-amber-500/20 text-amber-700">A capacidade de aporte informada ({fmt(aporte)}) é maior que a sobra disponível ({fmt(sobra)}).</Alert>}
        </>
      )}
      {pieData.length >= 2 && (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmt(v)} />
          </PieChart>
        </ResponsiveContainer>
      )}
      <p className="text-xs text-muted-foreground/70 italic">Entenda de onde vem o dinheiro e para onde vai. A tabela de orçamento mostra onde o cliente pode otimizar.</p>
    </div>
  );
}

function Card({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls: string }) {
  return <div className="p-3 bg-card rounded-lg border"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p><p className={`text-lg font-bold ${cls}`}>{value}</p>{sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}</div>;
}
function Alert({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <div className={`border rounded-lg p-3 flex items-center gap-2 text-sm ${cls}`}><AlertTriangle className="w-4 h-4 shrink-0" />{children}</div>;
}
