import { STRATEGY_CLASS, STRATEGY_COLORS } from './constants';
import { brl, pct2 } from './calculations';
import type { StrategyRow } from './types';

export function HorizontalBars({ rows, title }: { rows: StrategyRow[]; title?: string }) {
  const max = Math.max(...rows.map(r => r.pct), 1);
  return (
    <div className="space-y-2 min-w-0">
      {title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>}
      {rows.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Sem dados</p>}
      {rows.map(r => (
        <div key={r.strategy} className="grid grid-cols-[130px_1fr_56px] items-center gap-2 text-xs">
          <span className="truncate text-foreground" title={r.strategy}>{r.strategy}</span>
          <div className="h-5 rounded bg-muted/60 overflow-hidden">
            <div className="h-full rounded transition-all" style={{ width: `${(r.pct / max) * 100}%`, backgroundColor: STRATEGY_COLORS[r.strategy] ?? STRATEGY_COLORS.Outros }} />
          </div>
          <span className="text-right font-semibold tabular-nums">{r.pct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export function StrategyValueList({ rows }: { rows: StrategyRow[] }) {
  return (
    <div className="rounded-lg border border-border">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40">Valor por Estratégia</p>
      <div className="px-3">
        {rows.map(r => (
          <div key={r.strategy} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STRATEGY_COLORS[r.strategy] ?? STRATEGY_COLORS.Outros }} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.strategy}</p>
                <p className="text-[10px] tracking-wider text-muted-foreground">{STRATEGY_CLASS[r.strategy] ?? 'OUTROS'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{brl(r.value)}</p>
              <p className="text-xs text-muted-foreground">{pct2(r.pct)}</p>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum ativo</p>}
      </div>
    </div>
  );
}
