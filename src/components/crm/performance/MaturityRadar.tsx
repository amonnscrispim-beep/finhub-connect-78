import { useMemo } from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { ConsolidatedSummary, PositionWithOrigin } from './types';
import { fmt } from './utils';

interface MaturityRadarProps {
  data: ConsolidatedSummary;
}

interface RadarBucket {
  key: 'red' | 'yellow' | 'blue';
  title: string;
  range: string;
  items: (PositionWithOrigin & { daysLeft: number })[];
  toneCard: string;
  toneBadge: string;
}

export function MaturityRadar({ data }: MaturityRadarProps) {
  const buckets = useMemo<RadarBucket[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const enriched = data.positions
      .filter((p) => p.maturityDate)
      .map((p) => {
        const d = new Date(p.maturityDate!);
        const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...p, daysLeft };
      })
      .filter((p) => p.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return [
      {
        key: 'red',
        title: 'Próximos 30 dias',
        range: '0–30 dias',
        items: enriched.filter((p) => p.daysLeft <= 30),
        toneCard:
          'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200',
        toneBadge: 'bg-red-700 text-white',
      },
      {
        key: 'yellow',
        title: '31 a 60 dias',
        range: '31–60 dias',
        items: enriched.filter((p) => p.daysLeft > 30 && p.daysLeft <= 60),
        toneCard:
          'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200',
        toneBadge: 'bg-amber-600 text-white',
      },
      {
        key: 'blue',
        title: '61 a 120 dias',
        range: '61–120 dias',
        items: enriched.filter((p) => p.daysLeft > 60 && p.daysLeft <= 120),
        toneCard:
          'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200',
        toneBadge: 'bg-blue-700 text-white',
      },
    ];
  }, [data.positions]);

  const hasAny = buckets.some((b) => b.items.length > 0);

  return (
    <div className="p-5 bg-card rounded-xl border border-border shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="font-bold text-foreground text-lg">Radar de Vencimentos</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Próximos 120 dias • {buckets.reduce((s, b) => s + b.items.length, 0)} ativos
        </span>
      </div>

      {!hasAny ? (
        <p className="text-xs text-muted-foreground py-2">
          Nenhum vencimento detectado nos próximos 120 dias nos relatórios extraídos.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {buckets.map((b) => {
            const total = b.items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
            return (
              <div key={b.key} className={`rounded-md border p-3 ${b.toneCard}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {b.title}
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${b.toneBadge}`}
                  >
                    {b.items.length}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mb-2">
                  Total: <span className="font-semibold">R$ {fmt(total)}</span>
                </p>
                {b.items.length === 0 ? (
                  <p className="text-xs opacity-70">Sem vencimentos.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {b.items.map((it, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{it.name}</p>
                          <p className="opacity-70 text-[10px]">
                            {it.broker} • em {it.daysLeft} {it.daysLeft === 1 ? 'dia' : 'dias'}
                            {it.maturityDate
                              ? ` • ${new Date(it.maturityDate).toLocaleDateString('pt-BR')}`
                              : ''}
                          </p>
                        </div>
                        <p className="font-semibold whitespace-nowrap">R$ {fmt(it.grossBalance)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
