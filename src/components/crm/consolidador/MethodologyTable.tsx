import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Panel, NumField } from './shared';
import { BENCHMARK_OPTIONS } from './constants';
import type { Comparative } from './types';

const METRICS: { key: keyof Omit<Comparative, 'name'>; label: string; better: 'max' | 'min'; suffix: string }[] = [
  { key: 'retorno_total', label: 'Retorno Total Acumulado', better: 'max', suffix: '%' },
  { key: 'retorno_anual', label: 'Retorno Anual', better: 'max', suffix: '%' },
  { key: 'retorno_real', label: 'Retorno Real', better: 'max', suffix: '%' },
  { key: 'desvio_padrao', label: 'Desvio Padrão', better: 'min', suffix: '%' },
  { key: 'sharpe', label: 'Índice de Sharpe', better: 'max', suffix: '' },
];

interface Props {
  name: string;
  location: 'onshore' | 'offshore';
  comparatives: Comparative[];
  onName: (n: string) => void;
  onLocation: (l: 'onshore' | 'offshore') => void;
  onComparatives: (c: Comparative[]) => void;
}

export function MethodologyTable({ name, location, comparatives, onName, onLocation, onComparatives }: Props) {
  const set = (i: number, patch: Partial<Comparative>) => onComparatives(comparatives.map((c, j) => j === i ? { ...c, ...patch } : c));
  return (
    <Panel
      title={<Input defaultValue={name} onBlur={e => onName(e.target.value || 'Metodologia')} className="h-8 w-64 bg-transparent border-primary-foreground/30 text-primary-foreground font-semibold" />}
      actions={
        <Select value={location} onValueChange={v => onLocation(v as any)}>
          <SelectTrigger className="h-8 w-[130px] bg-card text-foreground text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="onshore">Onshore</SelectItem><SelectItem value="offshore">Offshore</SelectItem></SelectContent>
        </Select>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-2 py-2 w-48">Métrica</th>
              {comparatives.map((c, i) => (
                <th key={i} className="px-2 py-2">
                  <Select value={BENCHMARK_OPTIONS.includes(c.name) ? c.name : 'Personalizado'} onValueChange={v => set(i, { name: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{BENCHMARK_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m, ri) => {
              const vals = comparatives.map(c => c[m.key]);
              const best = m.better === 'max' ? Math.max(...vals) : Math.min(...vals);
              return (
                <tr key={m.key} className={cn('border-t border-border/60', ri % 2 === 1 && 'bg-muted/20')}>
                  <td className="px-2 py-2 font-medium">{m.label}</td>
                  {comparatives.map((c, i) => (
                    <td key={i} className="px-2 py-1.5">
                      <div className={cn('rounded-md', c[m.key] === best && 'ring-1 ring-success/50 bg-success/10 [&_input]:text-success [&_input]:font-semibold')}>
                        <NumField value={c[m.key]} prefix={m.suffix || undefined} onCommit={n => set(i, { [m.key]: n })} />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Destaque verde: melhor valor da linha (maior retorno e Sharpe, menor desvio padrão). Todos os valores são editáveis.</p>
    </Panel>
  );
}
