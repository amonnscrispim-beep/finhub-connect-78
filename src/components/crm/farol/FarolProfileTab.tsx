import { useState, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FarolPillar, FarolAsset, PILLAR_OPTIONS, isRendaVariavel } from '@/hooks/useCarteiraFarol';

interface Props {
  profileTab: string;
  pillars: FarolPillar[];
  assets: FarolAsset[];
  onAddPillar: (name: string) => void;
  onUpdatePillar: (id: string, updates: Partial<FarolPillar>) => void;
  onDeletePillar: (id: string) => void;
  onAddAsset: (pillarId: string) => void;
  onUpdateAsset: (id: string, updates: Partial<FarolAsset>) => void;
  onDeleteAsset: (id: string) => void;
  onFetchQuotes: (tickers: string[]) => void;
}

const BIAS_OPTIONS = ['COMPRAR', 'AGUARDAR', 'VENDER'];
const BIAS_COLORS: Record<string, string> = {
  COMPRAR: 'bg-green-500/15 text-green-700 border-green-500/30',
  AGUARDAR: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  VENDER: 'bg-red-500/15 text-red-700 border-red-500/30',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function FarolProfileTab({
  profileTab, pillars, assets,
  onAddPillar, onUpdatePillar, onDeletePillar,
  onAddAsset, onUpdateAsset, onDeleteAsset, onFetchQuotes,
}: Props) {
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [selectedPillar, setSelectedPillar] = useState('');

  const totalAlloc = useMemo(() => pillars.reduce((s, p) => s + (p.allocation_pct || 0), 0), [pillars]);
  const allocValid = totalAlloc >= 99.99 && totalAlloc <= 100.01;

  const usedPillars = useMemo(() => new Set(pillars.map(p => p.pillar_name)), [pillars]);
  const availablePillars = PILLAR_OPTIONS.filter(p => !usedPillars.has(p));

  const toggleExpand = (id: string) => {
    setExpandedPillars(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddPillar = () => {
    if (!selectedPillar) return;
    onAddPillar(selectedPillar);
    setSelectedPillar('');
  };

  const handleRefreshQuotes = (pillarId: string) => {
    const pillarAssets = assets.filter(a => a.pillar_id === pillarId && a.ticker.trim());
    const tickers = pillarAssets.map(a => a.ticker.trim().toUpperCase());
    if (tickers.length > 0) onFetchQuotes(tickers);
  };

  return (
    <div className="space-y-4">
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
        const assetAllocTotal = pillarAssets.reduce((s, a) => s + (a.allocation_pct || 0), 0);

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
              <div className="border-t border-border p-4 space-y-3">
                {/* Refresh quotes for RV pillars */}
                {isRV && (
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleRefreshQuotes(pillar.id)}>
                      <RefreshCw className="w-3 h-3" /> Atualizar cotações
                    </Button>
                  </div>
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
                        <th className="text-right py-2 px-2 font-medium">ALOCAÇÃO</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pillarAssets.map(asset => (
                        <tr key={asset.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 px-2">
                            <div className="flex flex-col gap-0.5">
                              <Input
                                value={asset.ticker}
                                onChange={e => onUpdateAsset(asset.id, { ticker: e.target.value.toUpperCase() })}
                                placeholder="Ticker"
                                className="h-7 text-xs font-mono w-32"
                              />
                              <Input
                                value={asset.name}
                                onChange={e => onUpdateAsset(asset.id, { name: e.target.value })}
                                placeholder="Nome completo"
                                className="h-7 text-xs w-40"
                              />
                            </div>
                          </td>
                          {isRV && (
                            <>
                              <td className="py-2 px-2">
                                <Input
                                  value={asset.sector || ''}
                                  onChange={e => onUpdateAsset(asset.id, { sector: e.target.value })}
                                  placeholder="Setor"
                                  className="h-7 text-xs w-28"
                                />
                              </td>
                              <td className="py-2 px-2 text-right">
                                {asset.current_price != null ? (
                                  <span className="text-xs font-medium">{fmt(asset.current_price)}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <CurrencyInput
                                  value={asset.ceiling_price ?? 0}
                                  onChange={v => onUpdateAsset(asset.id, { ceiling_price: parseFloat(v) || 0 })}
                                  className="h-7 text-xs w-28"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Select value={asset.bias} onValueChange={v => onUpdateAsset(asset.id, { bias: v })}>
                                  <SelectTrigger className="h-7 text-xs w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BIAS_OPTIONS.map(b => (
                                      <SelectItem key={b} value={b}>
                                        <Badge variant="outline" className={`text-[10px] ${BIAS_COLORS[b]}`}>{b}</Badge>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </>
                          )}
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1 justify-end">
                              <Input
                                type="number"
                                value={asset.allocation_pct || ''}
                                onChange={e => onUpdateAsset(asset.id, { allocation_pct: Number(parseFloat(e.target.value) || 0) })}
                                className="h-7 text-xs w-16 text-right"
                                min={0}
                                max={100}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeleteAsset(asset.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Asset allocation total */}
                {pillarAssets.length > 0 && (
                  <div className={`text-xs text-right ${Math.abs(assetAllocTotal - 100) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                    Soma dos ativos: {assetAllocTotal.toFixed(1)}%
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
