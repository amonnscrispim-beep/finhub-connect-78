import { Fragment, useMemo, useState } from 'react';
import { ArrowUpDown, Search, Pencil, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Panel, NumField } from './shared';
import { ASSET_TYPES, STRATEGIES, TIPO_COLORS, STRATEGY_COLORS } from './constants';
import { brl, pct2 } from './calculations';
import type { ConsolidatedAsset } from './types';

type SortKey = 'name' | 'type' | 'strategy' | 'value' | 'pctStrat' | 'pctTotal';

interface Props {
  assets: ConsolidatedAsset[];
  onChange: (id: string, patch: Partial<ConsolidatedAsset>) => void;
  onRemove: (id: string) => void;
}

export function PortfolioDetail({ assets, onChange, onRemove }: Props) {
  const [fType, setFType] = useState('all');
  const [fStrat, setFStrat] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'value', dir: -1 });
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [edit, setEdit] = useState(false);
  const [full, setFull] = useState(false);

  const total = assets.reduce((s, a) => s + a.value, 0);
  const stratTotals = useMemo(() => {
    const m: Record<string, number> = {};
    assets.forEach(a => { m[a.strategy] = (m[a.strategy] ?? 0) + a.value; });
    return m;
  }, [assets]);

  const groups = useMemo(() => {
    const rows = assets
      .filter(a => (fType === 'all' || a.type === fType) && (fStrat === 'all' || a.strategy === fStrat))
      .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))
      .map(a => ({ ...a, pctStrat: stratTotals[a.strategy] ? (a.value / stratTotals[a.strategy]) * 100 : 0, pctTotal: total ? (a.value / total) * 100 : 0 }));
    rows.sort((a, b) => {
      const va = a[sort.key], vb = b[sort.key];
      return (typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb), 'pt-BR')) * sort.dir;
    });
    const g: Record<string, typeof rows> = {};
    rows.forEach(r => { (g[r.strategy] ??= []).push(r); });
    return Object.entries(g).sort((a, b) => (stratTotals[b[0]] ?? 0) - (stratTotals[a[0]] ?? 0));
  }, [assets, fType, fStrat, search, sort, stratTotals, total]);

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={cn('px-3 py-2 font-semibold whitespace-nowrap', right && 'text-right')}>
      <button type="button" className="inline-flex items-center gap-1 hover:opacity-80" onClick={() => setSort(s => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}<ArrowUpDown className="w-3 h-3 opacity-70" />
      </button>
    </th>
  );

  const content = (
    <Panel
      title="Detalhamento do Portfólio"
      className={full ? 'h-full flex flex-col' : undefined}
      actions={
        <>
          <Select value={fType} onValueChange={setFType}>
            <SelectTrigger className="h-8 w-[170px] bg-card text-foreground text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fStrat} onValueChange={setFStrat}>
            <SelectTrigger className="h-8 w-[170px] bg-card text-foreground text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as estratégias</SelectItem>
              {STRATEGIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
    >
      <div className={cn('overflow-x-auto', full && 'max-h-[calc(100vh-220px)] overflow-y-auto')}>
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-muted/60 text-xs text-muted-foreground text-left">
            <tr>
              <Th k="name" label="Ativo" /><Th k="type" label="Tipo" /><Th k="strategy" label="Estratégia" />
              <Th k="value" label="Valor" right /><Th k="pctStrat" label="% Estratégia" right /><Th k="pctTotal" label="% Total" right />
              {edit && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {groups.map(([strategy, rows], gi) => (
              <Fragment key={strategy}>
                <tr className={cn(gi > 0 && 'border-t-2 border-border')}>
                  <td colSpan={edit ? 7 : 6} className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: STRATEGY_COLORS[strategy] ?? STRATEGY_COLORS.Outros }} />
                    {strategy} · {brl(stratTotals[strategy] ?? 0)}
                  </td>
                </tr>
                {rows.map((a, i) => (
                  <tr key={a.id} className={cn('border-b border-border/50', i % 2 === 1 && 'bg-muted/20')}>
                    <td className="px-3 py-2">
                      {edit ? <Input className="h-8 text-sm" defaultValue={a.name} onBlur={e => onChange(a.id, { name: e.target.value })} /> : (
                        <div><p className="font-medium">{a.name}</p>{(a.rate || a.maturity) && <p className="text-[11px] text-muted-foreground">{[a.rate, a.maturity && `venc. ${a.maturity}`].filter(Boolean).join(' · ')}</p>}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {edit ? (
                        <Select value={a.type} onValueChange={v => onChange(a.id, { type: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap', TIPO_COLORS[a.type] ?? 'bg-muted text-muted-foreground')}>{a.type}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {edit ? (
                        <Select value={a.strategy} onValueChange={v => onChange(a.id, { strategy: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{STRATEGIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : a.strategy}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {edit ? <NumField className="w-36 ml-auto" prefix="R$" value={a.value} onCommit={n => onChange(a.id, { value: n })} /> : brl(a.value)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct2(a.pctStrat)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{pct2(a.pctTotal)}</td>
                    {edit && (
                      <td className="px-1"><Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRemove(a.id)}><Trash2 className="w-4 h-4" /></Button></td>
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
            {groups.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Nenhum ativo. Importe um relatório ou adicione manualmente.</td></tr>}
          </tbody>
          {total > 0 && (
            <tfoot><tr className="border-t-2 border-border font-semibold"><td className="px-3 py-2" colSpan={3}>Total</td><td className="px-3 py-2 text-right">{brl(total)}</td><td /><td className="px-3 py-2 text-right">100,00%</td>{edit && <td />}</tr></tfoot>
          )}
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
        {showSearch && <Input autoFocus placeholder="Buscar ativo..." className="h-8 w-56 text-sm" value={search} onChange={e => setSearch(e.target.value)} />}
        <Button type="button" size="sm" variant="outline" onClick={() => { setShowSearch(s => !s); if (showSearch) setSearch(''); }}><Search className="w-4 h-4 mr-1" />Buscar</Button>
        <Button type="button" size="sm" variant={edit ? 'default' : 'outline'} onClick={() => setEdit(e => !e)}><Pencil className="w-4 h-4 mr-1" />{edit ? 'Concluir' : 'Editar'}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setFull(f => !f)}>{full ? <Minimize2 className="w-4 h-4 mr-1" /> : <Maximize2 className="w-4 h-4 mr-1" />}{full ? 'Reduzir' : 'Expandir'}</Button>
      </div>
    </Panel>
  );

  return full ? <div className="fixed inset-0 z-[60] bg-background/95 p-6 overflow-auto">{content}</div> : content;
}
