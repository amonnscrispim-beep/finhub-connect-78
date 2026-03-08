import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FarolAsset } from '@/hooks/useCarteiraFarol';
import { DebouncedInput } from './DebouncedInput';

const BIAS_OPTIONS = ['COMPRAR', 'AGUARDAR', 'VENDER'];
const BIAS_COLORS: Record<string, string> = {
  COMPRAR: 'bg-green-500/15 text-green-700 border-green-500/30',
  AGUARDAR: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  VENDER: 'bg-red-500/15 text-red-700 border-red-500/30',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Props {
  asset: FarolAsset;
  isRV: boolean;
  isFixedIncome: boolean;
  pillarTotalValue: number;
  financialAssets: number;
  onUpdate: (id: string, updates: Partial<FarolAsset>) => void;
  onDelete: (id: string) => void;
}

export const FarolAssetRow = memo(function FarolAssetRow({
  asset, isRV, isFixedIncome, pillarTotalValue, financialAssets,
  onUpdate, onDelete,
}: Props) {
  const [localValue, setLocalValue] = useState(asset.ceiling_price ?? 0);
  const [lastEdited, setLastEdited] = useState<'value' | 'weight' | null>(null);

  // For fixed income: ceiling_price stores the R$ value
  const assetValue = asset.ceiling_price ?? 0;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleTickerChange = useCallback((v: string) => {
    onUpdate(asset.id, { ticker: v.toUpperCase() });
  }, [asset.id, onUpdate]);

  const handleNameChange = useCallback((v: string) => {
    onUpdate(asset.id, { name: v });
  }, [asset.id, onUpdate]);

  const handleSectorChange = useCallback((v: string) => {
    onUpdate(asset.id, { sector: v });
  }, [asset.id, onUpdate]);

  const handleAllocChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value) || 0;
    if (isFixedIncome && financialAssets > 0) {
      const val = (pct / 100) * financialAssets;
      onUpdate(asset.id, { allocation_pct: pct, ceiling_price: val });
      setLastEdited('weight');
    } else {
      onUpdate(asset.id, { allocation_pct: pct });
    }
  }, [asset.id, isFixedIncome, financialAssets, onUpdate]);

  const handleValueChange = useCallback((v: string) => {
    const val = parseFloat(v) || 0;
    onUpdate(asset.id, { ceiling_price: val });
    setLastEdited('value');
    // Weight recalculated by parent
  }, [asset.id, onUpdate]);

  const handleCeilingChange = useCallback((v: string) => {
    onUpdate(asset.id, { ceiling_price: parseFloat(v) || 0 });
  }, [asset.id, onUpdate]);

  const handleBiasChange = useCallback((v: string) => {
    onUpdate(asset.id, { bias: v });
  }, [asset.id, onUpdate]);

  return (
    <tr className="border-b border-border/50 last:border-0" onClick={stop}>
      <td className="py-2 px-2">
        <div className="flex flex-col gap-0.5">
          <DebouncedInput
            value={asset.ticker}
            onChange={handleTickerChange}
            placeholder="Ticker"
            className="h-7 text-xs font-mono w-32"
          />
          <DebouncedInput
            value={asset.name}
            onChange={handleNameChange}
            placeholder="Nome completo"
            className="h-7 text-xs w-40"
          />
        </div>
      </td>
      {isRV && (
        <>
          <td className="py-2 px-2">
            <DebouncedInput
              value={asset.sector || ''}
              onChange={handleSectorChange}
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
          <td className="py-2 px-2" onClick={stop}>
            <CurrencyInput
              value={asset.ceiling_price ?? 0}
              onChange={handleCeilingChange}
              className="h-7 text-xs w-28"
            />
          </td>
          <td className="py-2 px-2" onClick={stop}>
            <Select value={asset.bias} onValueChange={handleBiasChange}>
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
      {isFixedIncome && (
        <td className="py-2 px-2" onClick={stop}>
          <CurrencyInput
            value={assetValue}
            onChange={handleValueChange}
            className="h-7 text-xs w-28"
          />
        </td>
      )}
      <td className="py-2 px-2" onClick={stop}>
        <div className="flex items-center gap-1 justify-end">
          <Input
            type="number"
            value={asset.allocation_pct || ''}
            onChange={handleAllocChange}
            className="h-7 text-xs w-16 text-right"
            min={0}
            max={100}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </td>
      <td className="py-2 px-2" onClick={stop}>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(asset.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </td>
    </tr>
  );
});
