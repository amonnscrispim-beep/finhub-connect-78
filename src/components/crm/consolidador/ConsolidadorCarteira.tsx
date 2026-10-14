import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PortfolioUpload } from './PortfolioUpload';
import { AllocationComparison } from './AllocationComparison';
import { PortfolioDetail } from './PortfolioDetail';
import { MethodologyTable } from './MethodologyTable';
import { BacktestSimulator } from './BacktestSimulator';
import { DEFAULT_COMPARATIVES, DEFAULT_MODELS } from './constants';
import { brl, strategyRows } from './calculations';
import type { ConsolidatedAsset, ConsolidationState } from './types';

const defaults = (initial: number): ConsolidationState => ({
  assets: [],
  selectedModel: 'balanceado',
  models: DEFAULT_MODELS,
  methodologyName: 'Metodologia',
  methodologyLocation: 'onshore',
  comparatives: DEFAULT_COMPARATIVES,
  backtest: {
    location: 'onshore', model: 'balanceado', returnType: 'nominal', initial, monthly: 0, benchmark: 'CDI',
    startMonth: 0, startYear: 2014, endMonth: 11, endYear: 2026, passiveRate: 0.5, manualPortfolio: null, manualBenchmark: null,
  },
  importedFiles: [],
});

interface Props { clientId: string; initialPatrimony: number }

export function ConsolidadorCarteira({ clientId, initialPatrimony }: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<ConsolidationState | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<number>();
  const seq = useRef(0);
  const loaded = useRef(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('client_portfolio_consolidation').select('*')
        .eq('client_id', clientId).eq('user_id', user.id).maybeSingle();
      if (!alive) return;
      if (error) toast.error('Erro ao carregar o consolidador');
      const base = defaults(initialPatrimony || 0);
      setState(data ? {
        assets: (data.assets as any) ?? [],
        selectedModel: (data.selected_model as any) ?? 'balanceado',
        models: { ...DEFAULT_MODELS, ...((data.models as any) ?? {}) },
        methodologyName: data.methodology_name,
        methodologyLocation: data.methodology_location as any,
        comparatives: (data.comparatives as any)?.length ? data.comparatives as any : DEFAULT_COMPARATIVES,
        backtest: { ...base.backtest, ...((data.backtest as any) ?? {}) },
        importedFiles: (data.source_files as any) ?? [],
      } : base);
      loaded.current = true;
    })();
    return () => { alive = false; };
  }, [clientId, user, initialPatrimony]);

  const persist = useCallback(async (s: ConsolidationState) => {
    if (!user) return;
    const my = ++seq.current;
    setSaving('saving');
    const { error } = await supabase.from('client_portfolio_consolidation').upsert({
      client_id: clientId, user_id: user.id,
      assets: s.assets as any, selected_model: s.selectedModel, models: s.models as any,
      methodology_name: s.methodologyName, methodology_location: s.methodologyLocation,
      comparatives: s.comparatives as any, backtest: s.backtest as any, source_files: s.importedFiles as any, updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id,user_id' });
    if (my !== seq.current) return;
    if (error) { setSaving('error'); toast.error('Erro ao salvar o consolidador'); } else setSaving('saved');
  }, [clientId, user]);

  const pending = useRef<ConsolidationState | null>(null);
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    if (pending.current) persist(pending.current);
  }, [persist]);

  const update = (patch: Partial<ConsolidationState>) => {
    setState(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      window.clearTimeout(timer.current);
      pending.current = next;
      timer.current = window.setTimeout(() => { pending.current = null; persist(next); }, 2000);
      return next;
    });
  };

  const rows = useMemo(() => strategyRows(state?.assets ?? []), [state?.assets]);

  if (!state) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const total = state.assets.reduce((s, a) => s + a.value, 0);
  const patchAsset = (id: string, p: Partial<ConsolidatedAsset>) => update({ assets: state.assets.map(a => a.id === id ? { ...a, ...p } : a) });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold font-display">Consolidador de Carteira</h2>
          <p className="text-xs text-muted-foreground">{state.assets.length} ativo(s) · Patrimônio consolidado {brl(total)}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {saving === 'saving' ? 'Salvando...' : saving === 'saved' ? 'Salvo' : saving === 'error' ? 'Erro ao salvar' : ''}
        </span>
      </div>

      <PortfolioUpload
        clientId={clientId}
        importedFiles={state.importedFiles}
        onImport={(imported, fileNames) => update({
          assets: [...state.assets, ...imported],
          importedFiles: [...state.importedFiles, ...fileNames.filter(n => !state.importedFiles.includes(n))],
        })}
        onRemoveFile={name => update({
          importedFiles: state.importedFiles.filter(n => n !== name),
          assets: state.assets.filter(a => a.sourceFile !== name),
        })}
        onClearAll={() => update({ assets: [], importedFiles: [] })}
        assetCount={state.assets.length}
        onAdd={() => update({ assets: [...state.assets, { id: crypto.randomUUID(), name: 'Novo ativo', type: 'Ações', strategy: 'Ações Brasil', value: 0, maturity: null, rate: null }] })}
      />

      <AllocationComparison
        rows={rows}
        selectedModel={state.selectedModel}
        models={state.models}
        onModelChange={m => update({ selectedModel: m })}
        onModelsChange={m => update({ models: m })}
      />

      <PortfolioDetail assets={state.assets} onChange={patchAsset} onRemove={id => update({ assets: state.assets.filter(a => a.id !== id) })} />

      <MethodologyTable
        name={state.methodologyName}
        location={state.methodologyLocation}
        comparatives={state.comparatives}
        onName={n => update({ methodologyName: n })}
        onLocation={l => update({ methodologyLocation: l })}
        onComparatives={c => update({ comparatives: c })}
      />

      <BacktestSimulator params={state.backtest} models={state.models} onChange={b => update({ backtest: b })} />
    </div>
  );
}
