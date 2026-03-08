import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FarolPillar, FarolAsset, PILLAR_OPTIONS, isRendaVariavel } from '@/hooks/useCarteiraFarol';
import { FarolAssetRow } from './FarolAssetRow';

const FIXED_INCOME_PILLARS = ['Pós-Fixado', 'Pré-Fixado', 'Indexado à Inflação'];

function isFixedIncome(pillarName: string) {
  return FIXED_INCOME_PILLARS.includes(pillarName);
}

interface Props {
  profileTab: string;
  pillars: FarolPillar[];
  assets: FarolAsset[];
  financialAssets?: number;
  onAddPillar: (name: string) => void;
  onUpdatePillar: (id: string, updates: Partial<FarolPillar>) => void;
  onDeletePillar: (id: string) => void;
  onAddAsset: (pillarId: string) => void;
  onUpdateAsset: (id: string, updates: Partial<FarolAsset>) => void;
  onDeleteAsset: (id: string) => void;
  onFetchQuotes: (tickers: string[]) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function FarolProfileTab({
  profileTab, pillars, assets, financialAssets = 0,
  onAddPillar, onUpdatePillar, onDeletePillar,
  onAddAsset, onUpdateAsset, onDeleteAsset, onFetchQuotes,
}: Props) {
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [selectedPillar, setSelectedPillar] = useState('');

  const totalAlloc = useMemo(() => pillars.reduce((s, p) => s + (p.allocation_pct || 0), 0), [pillars]);
  const allocValid = totalAlloc >= 99.99 && totalAlloc <= 100.01;

  const usedPillars = useMemo(() => new Set(pillars.map(p => p.pillar_name)), [pillars]);
  const availablePillars = useMemo(() => PILLAR_OPTIONS.filter(p => !usedPillars.has(p)), [usedPillars]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedPillars(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAddPillar = useCallback(() => {
    if (!selectedPillar) return;
    onAddPillar(selectedPillar);
    setSelectedPillar('');
  }, [selectedPillar, onAddPillar]);

  const handleRefreshQuotes = useCallback((pillarId: string) => {
    const pillarAssets = assets.filter(a => a.pillar_id === pillarId && a.ticker.trim());
    const tickers = pillarAssets.map(a => a.ticker.trim().toUpperCase());
    if (tickers.length > 0) onFetchQuotes(tickers);
  }, [assets, onFetchQuotes]);

  // Recalculate weights for fixed income when values change
  const handleUpdateAsset = useCallback((id: string, updates: Partial<FarolAsset>) => {
    // If ceiling_price changed on a fixed income asset and no allocation_pct in updates,
    // recalculate allocation_pct based on total values in pillar
    const asset = assets.find(a => a.id === id);
    if (asset && isFixedIncome(pillars.find(p => p.id === asset.pillar_id)?.pillar_name || '') && 'ceiling_price' in updates && !('allocation_pct' in updates)) {
      const pillarAssets = assets.filter(a => a.pillar_id === asset.pillar_id);
      const newVal = updates.ceiling_price ?? 0;
      const totalVal = pillarAssets.reduce((s, a) => s + (a.id === id ? newVal : (a.ceiling_price ?? 0)), 0);
      if (totalVal > 0) {
        updates.allocation_pct = (newVal / totalVal) * 100;
        // Also recalc other assets' weights
        pillarAssets.forEach(a => {
          if (a.id !== id) {
            const aVal = a.ceiling_price ?? 0;
            onUpdateAsset(a.id, { allocation_pct: (aVal / totalVal) * 100 });
          }
        });
      }
    }
    onUpdateAsset(id, updates);
  }, [assets, pillars, onUpdateAsset]);

  return (
    <div className="space-y-4" onClick={e => e.stopPropagation()}>
      {/* Total allocation indicator */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${allocValid ? 'text-green-600' : 'text-red-500'}`}>
          Alocação total: {totalAlloc.toFixed(1)}%
        </span>
        {!allocValid && totalAlloc > 0 && (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> A soma deve ser exatamente 100%
          </span>
        )}
      </div>

      {/* Pillars */}
      {pillars.map(pillar => {
        const pillarAssets = assets.filter(a => a.pillar_id === pillar.id);
        const isExpanded = expandedPillars.has(pillar.id);
        const isRV = isRendaVariavel(pillar.pillar_name);
        const isFI = isFixedIncome(pillar.pillar_name);
        const assetAllocTotal = pillarAssets.reduce((s, a) => s + (a.allocation_pct || 0), 0);
        const assetValueTotal = isFI ? pillarAssets.reduce((s, a) => s + (a.ceiling_price ?? 0), 0) : 0;

        return (
          <div key={pillar.id} className="border border-border rounded-xl overflow-hidden bg-card">
            {/* Pillar Header */}
            <button
              type="button"
              onClick={() => toggleExpand(pillar.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="text-left min-w-0">
                  <p className="font-semibold text-sm text-foreground">{pillar.pillar_name}</p>
                  <p className="text-xs text-muted-foreground">{pillarAssets.length} {pillarAssets.length === 1 ? 'ativo disponível' : 'ativos disponíveis'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-32">
                  <Progress value={pillar.allocation_pct} className="h-2 [&>div]:bg-red-500" />
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Input
                    type="number"
                    value={pillar.allocation_pct || ''}
                    onChange={e => onUpdatePillar(pillar.id, { allocation_pct: parseFloat(e.target.value) || 0 })}
                    className="w-16 h-8 text-xs text-center"
                    min={0}
                    max={100}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeletePillar(pillar.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </button>

            {/* Pillar Content */}
            {isExpanded && (
              <div className="border-t border-border p-4 space-y-3" onClick={e => e.stopPropagation()}>
                {/* Refresh quotes for RV pillars */}
                {isRV && (
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleRefreshQuotes(pillar.id)}>
                      <RefreshCw className="w-3 h-3" /> Atualizar cotações
                    </Button>
                  </div>
                )}

                {/* No financial assets warning for FI */}
                {isFI && financialAssets <= 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-md">
                    Patrimônio não informado — digite o valor manualmente
                  </p>
                )}

                {/* Assets table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="text-left py-2 px-2 font-medium">ATIVO</th>
                        {isRV && (
                          <>
                            <th className="text-left py-2 px-2 font-medium">SETOR</th>
                            <th className="text-right py-2 px-2 font-medium">PREÇO ATUAL</th>
                            <th className="text-right py-2 px-2 font-medium">PREÇO TETO</th>
                            <th className="text-center py-2 px-2 font-medium">VIÉS</th>
                          </>
                        )}
                        {isFI && (
                          <th className="text-right py-2 px-2 font-medium">VALOR (R$)</th>
                        )}
                        <th className="text-right py-2 px-2 font-medium">PESO (%)</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pillarAssets.map(asset => (
                        <FarolAssetRow
                          key={asset.id}
                          asset={asset}
                          isRV={isRV}
                          isFixedIncome={isFI}
                          pillarTotalValue={assetValueTotal}
                          financialAssets={financialAssets}
                          onUpdate={handleUpdateAsset}
                          onDelete={onDeleteAsset}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Asset allocation total */}
                {pillarAssets.length > 0 && (
                  <div className={`text-xs text-right ${Math.abs(assetAllocTotal - 100) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                    {isFI && <>Total alocado: {fmt(assetValueTotal)} | </>}
                    Peso total: {assetAllocTotal.toFixed(1)}%
                    {Math.abs(assetAllocTotal - 100) >= 0.01 && ' ⚠️'}
                  </div>
                )}

                {/* Add asset button */}
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onAddAsset(pillar.id)}>
                  <Plus className="w-3 h-3" /> Adicionar Ativo
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add pillar */}
      {availablePillars.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedPillar} onValueChange={setSelectedPillar}>
            <SelectTrigger className="w-64 h-9 text-xs">
              <SelectValue placeholder="Selecionar pilar..." />
            </SelectTrigger>
            <SelectContent>
              {availablePillars.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddPillar} disabled={!selectedPillar} className="gap-1">
            <Plus className="w-4 h-4" /> Adicionar Pilar
          </Button>
        </div>
      )}

      {pillars.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum pilar configurado para esta aba. Use o seletor acima para adicionar.
        </div>
      )}
    </div>
  );
}
