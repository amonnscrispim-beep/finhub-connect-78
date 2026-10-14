import { useState } from 'react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Panel, NumField } from './shared';
import { HorizontalBars, StrategyValueList } from './AllocationChart';
import { MODEL_LABELS, STRATEGIES } from './constants';
import { opportunities } from './calculations';
import type { ModelKey, StrategyRow } from './types';

interface Props {
  rows: StrategyRow[];
  selectedModel: ModelKey;
  models: Record<ModelKey, Record<string, number>>;
  onModelChange: (m: ModelKey) => void;
  onModelsChange: (m: Record<ModelKey, Record<string, number>>) => void;
}

export function AllocationComparison({ rows, selectedModel, models, onModelChange, onModelsChange }: Props) {
  const [mode, setMode] = useState<'atual' | 'comparacao'>('atual');
  const [editModel, setEditModel] = useState(false);
  const model = models[selectedModel];
  const modelRows: StrategyRow[] = Object.entries(model)
    .filter(([, v]) => v > 0).map(([strategy, pct]) => ({ strategy, pct, value: 0 }))
    .sort((a, b) => b.pct - a.pct);
  const ops = opportunities(rows, model);
  const modelSum = Object.values(model).reduce((s, v) => s + v, 0);

  const actions = (
    <>
      <Select value={mode} onValueChange={v => setMode(v as any)}>
        <SelectTrigger className="h-8 w-[170px] bg-card text-foreground text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="atual">Distribuição Atual</SelectItem>
          <SelectItem value="comparacao">Comparação</SelectItem>
        </SelectContent>
      </Select>
      <Select value={selectedModel} onValueChange={v => onModelChange(v as ModelKey)}>
        <SelectTrigger className="h-8 w-[180px] bg-card text-foreground text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {(Object.keys(MODEL_LABELS) as ModelKey[]).map(k => <SelectItem key={k} value={k}>{MODEL_LABELS[k]}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  );

  if (mode === 'atual') {
    return (
      <Panel title="Distribuição por Estratégia" actions={actions}>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <HorizontalBars rows={rows} />
          <StrategyValueList rows={rows} />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={`Comparação: Atual vs. ${MODEL_LABELS[selectedModel]}`} actions={actions}>
      <p className="text-xs text-muted-foreground mb-4">Identifique oportunidades de otimização da carteira</p>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_320px]">
        <HorizontalBars rows={rows} title="Alocação Atual" />
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{MODEL_LABELS[selectedModel]}</p>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditModel(e => !e)}>
              <Pencil className="w-3 h-3 mr-1" />{editModel ? 'Concluir' : 'Editar modelo'}
            </Button>
          </div>
          {editModel ? (
            <div className="space-y-1.5">
              {STRATEGIES.map(s => (
                <div key={s} className="grid grid-cols-[1fr_100px] items-center gap-2 text-xs">
                  <span>{s}</span>
                  <NumField value={model[s] ?? 0} prefix="%" onCommit={n => onModelsChange({ ...models, [selectedModel]: { ...model, [s]: n } })} />
                </div>
              ))}
              <p className={`text-xs ${Math.abs(modelSum - 100) > 0.05 ? 'text-destructive' : 'text-muted-foreground'}`}>Soma: {modelSum.toFixed(1)}% {Math.abs(modelSum - 100) > 0.05 && '(deve somar 100%)'}</p>
            </div>
          ) : <HorizontalBars rows={modelRows} />}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Resumo Atual</p>
          <StrategyValueList rows={rows} />
        </div>
      </div>
      {ops.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-500">Oportunidades de Otimização Identificadas</span>
          </div>
          <ul className="text-sm space-y-1 text-foreground">
            {ops.map(op => (
              <li key={op.estrategia}>• <strong>{op.estrategia}</strong>: {op.descricao}. Recomendado: {op.recomendado}%</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
