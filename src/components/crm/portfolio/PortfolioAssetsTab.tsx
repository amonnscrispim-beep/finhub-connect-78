import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PortfolioAsset } from '@/hooks/useClientPortfolio';
import { PortfolioSimulator } from './PortfolioSimulator';

const ASSET_CLASSES = ['Ações', 'FII', 'RF', 'Exterior', 'Crypto'];
const RECOMMENDATIONS = ['COMPRAR', 'MANTER', 'VENDER'];

interface Props {
  assets: PortfolioAsset[];
  aporte: number;
  previousValues: Record<string, number>;
  hasManualWeights: boolean;
  onAddAsset: () => void;
  onDeleteAsset: (id: string) => void;
  onUpdateAsset: (id: string, field: keyof PortfolioAsset, value: any) => void;
  onSaveAsset: (asset: PortfolioAsset) => void;
  onSaveAporte: (val: number) => void;
  onSavePreviousValue: (ticker: string, value: number) => void;
  onRedistributeWeights: () => void;
  onSetManualWeights: (val: boolean) => void;
}

export function PortfolioAssetsTab({
  assets, aporte, previousValues, hasManualWeights,
  onAddAsset, onDeleteAsset, onUpdateAsset, onSaveAsset,
  onSaveAporte, onSavePreviousValue, onRedistributeWeights, onSetManualWeights,
}: Props) {
  const [search, setSearch] = useState('');

  const filteredAssets = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.toLowerCase();
    return assets.filter(a =>
      a.ticker.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.asset_class.toLowerCase().includes(q)
    );
  }, [assets, search]);

  const totalWeight = useMemo(() => assets.reduce((sum, a) => sum + (a.target_weight || 0), 0), [assets]);
  const weightValid = totalWeight >= 99.99 && totalWeight <= 100.01;

  const handleFieldChange = (asset: PortfolioAsset, field: keyof PortfolioAsset, value: any) => {
    if (field === 'target_weight') {
      onSetManualWeights(true);
    }
    onUpdateAsset(asset.id, field, value);
    onSaveAsset({ ...asset, [field]: value });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ativo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-medium ${weightValid ? 'text-green-500' : 'text-red-500'}`}>
            Peso total: {totalWeight.toFixed(2)}%
          </span>
          <Button size="sm" variant="outline" onClick={onRedistributeWeights} className="gap-1 text-xs">
            <RotateCcw className="w-3 h-3" /> Redistribuir
          </Button>
          <Button size="sm" onClick={onAddAsset} className="gap-1">
            <Plus className="w-4 h-4" /> Ativo
          </Button>
        </div>
      </div>

      {!weightValid && assets.length > 0 && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          ⚠️ Os pesos devem somar 100%. Ajuste antes de usar o simulador.
        </div>
      )}

      {/* Assets table */}
      <div
        className="rounded-lg border border-border scrollbar-thin"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          display: 'block',
          WebkitOverflowScrolling: 'touch',
          maxHeight: '400px',
        }}
      >
          <table className="text-sm" style={{ tableLayout: 'auto', width: 'max-content', minWidth: '1600px' }}>
            <thead className="bg-muted/80">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Ticker</th>
                <th className="px-3 py-2 text-left font-medium">Nome</th>
                <th className="px-3 py-2 text-left font-medium">Classe</th>
                <th className="px-3 py-2 text-right font-medium">Peso %</th>
                <th className="px-3 py-2 text-left font-medium">Recom.</th>
                <th className="px-3 py-2 text-left font-medium">Data Rec.</th>
                <th className="px-3 py-2 text-right font-medium">Preço Justo</th>
                <th className="px-3 py-2 text-right font-medium">Preço Atual</th>
                <th className="px-3 py-2 text-right font-medium">Upside %</th>
                <th className="px-3 py-2 text-right font-medium">TIR %</th>
                <th className="px-3 py-2 text-right font-medium">Liquidez D+</th>
                <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                <th className="px-3 py-2 text-left font-medium">Obs.</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-1.5">
                    <Input
                      value={asset.ticker}
                      onChange={e => handleFieldChange(asset, 'ticker', e.target.value.toUpperCase())}
                      className="h-8 w-20 bg-transparent border-none px-1 font-mono text-xs"
                      placeholder="XXXX11"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      value={asset.name}
                      onChange={e => handleFieldChange(asset, 'name', e.target.value)}
                      className="h-8 w-32 bg-transparent border-none px-1 text-xs"
                      placeholder="Nome"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Select value={asset.asset_class} onValueChange={v => handleFieldChange(asset, 'asset_class', v)}>
                      <SelectTrigger className="h-8 w-24 text-xs border-none bg-transparent"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASSET_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number" step="0.01" min="0" max="100"
                      value={asset.target_weight || ''}
                      onChange={e => handleFieldChange(asset, 'target_weight', parseFloat(e.target.value) || 0)}
                      className="h-8 w-16 bg-transparent border-none px-1 text-xs text-right"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Select value={asset.recommendation} onValueChange={v => handleFieldChange(asset, 'recommendation', v)}>
                      <SelectTrigger className={`h-8 w-24 text-xs border-none bg-transparent font-semibold ${
                        asset.recommendation === 'COMPRAR' ? 'text-green-500' :
                        asset.recommendation === 'VENDER' ? 'text-red-500' : 'text-muted-foreground'
                      }`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECOMMENDATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="date"
                      value={asset.recommendation_date || ''}
                      onChange={e => handleFieldChange(asset, 'recommendation_date', e.target.value)}
                      className="h-8 w-32 bg-transparent border-none px-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number" step="0.01"
                      value={asset.fair_price || ''}
                      onChange={e => handleFieldChange(asset, 'fair_price', parseFloat(e.target.value) || 0)}
                      className="h-8 w-20 bg-transparent border-none px-1 text-xs text-right"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number" step="0.01"
                      value={asset.current_price ?? ''}
                      onChange={e => handleFieldChange(asset, 'current_price', e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 w-20 bg-transparent border-none px-1 text-xs text-right"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number" step="0.01"
                      value={asset.upside_pct ?? ''}
                      onChange={e => handleFieldChange(asset, 'upside_pct', e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 w-16 bg-transparent border-none px-1 text-xs text-right"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number" step="0.01"
                      value={asset.tir_pct ?? ''}
                      onChange={e => handleFieldChange(asset, 'tir_pct', e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 w-16 bg-transparent border-none px-1 text-xs text-right"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number" step="1" min="0"
                      value={asset.liquidity_days ?? ''}
                      onChange={e => handleFieldChange(asset, 'liquidity_days', e.target.value ? parseInt(e.target.value) : null)}
                      className="h-8 w-16 bg-transparent border-none px-1 text-xs text-right"
                      placeholder="D+0"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="date"
                      value={asset.maturity_date || ''}
                      onChange={e => handleFieldChange(asset, 'maturity_date', e.target.value || null)}
                      className="h-8 w-32 bg-transparent border-none px-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      value={asset.notes || ''}
                      onChange={e => handleFieldChange(asset, 'notes', e.target.value)}
                      className="h-8 w-28 bg-transparent border-none px-1 text-xs"
                      placeholder="..."
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteAsset(asset.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr><td colSpan={14} className="text-center py-8 text-muted-foreground">Nenhum ativo cadastrado</td></tr>
              )}
            </tbody>
          </table>
      </div>

      {/* Simulator */}
      <PortfolioSimulator
        assets={assets}
        aporte={aporte}
        previousValues={previousValues}
        weightValid={weightValid}
        onSaveAporte={onSaveAporte}
        onSavePreviousValue={onSavePreviousValue}
      />
    </div>
  );
}
