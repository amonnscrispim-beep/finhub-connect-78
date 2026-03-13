import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Star, Wrench } from 'lucide-react';
import { PortfolioAsset } from '../CarteirasRecomendadas';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  portfolioId: string;
  assetClass: string;
  recommendedAssets: PortfolioAsset[];
  portfolioNameMap: Record<string, string>;
  nextOrder: number;
  onSaved: () => void;
}

export function PortfolioAssetModal({ open, onOpenChange, portfolioId, assetClass, recommendedAssets, portfolioNameMap, nextOrder, onSaved }: Props) {
  const { user } = useAuth();
  const isRendaFixa = assetClass === 'renda_fixa';

  // Mode
  const [mode, setMode] = useState<'recommended' | 'manual'>('recommended');

  // Renda fixa fields
  const [rfName, setRfName] = useState('');
  const [rfType, setRfType] = useState('Pós-fixado');
  const [rfIndexador, setRfIndexador] = useState('');
  const [rfVencimento, setRfVencimento] = useState('');

  // Recommended asset fields
  const [selectedAssetId, setSelectedAssetId] = useState('');

  // Manual asset fields
  const [manualTicker, setManualTicker] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualCeilingPrice, setManualCeilingPrice] = useState('');

  const [saving, setSaving] = useState(false);

  const availableAssets = useMemo(() => {
    if (isRendaFixa) return [];
    return recommendedAssets;
  }, [recommendedAssets, isRendaFixa]);

  useEffect(() => {
    if (open) {
      setSelectedAssetId('');
      setManualTicker('');
      setManualName('');
      setManualCeilingPrice('');
      setRfName('');
      setRfType('Pós-fixado');
      setRfIndexador('');
      setRfVencimento('');
      setMode('recommended');
    }
  }, [open]);

  const tickerRegex = /^[A-Z0-9]{3,10}$/;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      if (isRendaFixa) {
        if (!rfName.trim()) { toast.error('Preencha o nome/emissor'); setSaving(false); return; }
        await supabase.from('portfolio_assets').insert({
          portfolio_id: portfolioId,
          user_id: user.id,
          asset_class: assetClass,
          name: rfName.trim(),
          ticker: '',
          rf_type: rfType,
          indexador: rfIndexador.trim(),
          vencimento: rfVencimento || null,
          allocation_pct: 0,
          display_order: nextOrder,
        } as any);
      } else if (mode === 'manual') {
        const ticker = manualTicker.trim().toUpperCase();
        if (!ticker) { toast.error('Preencha o ticker'); setSaving(false); return; }
        if (!tickerRegex.test(ticker)) { toast.error('Ticker inválido (use apenas letras e números, 3-10 caracteres)'); setSaving(false); return; }
        const ceilingPrice = parseFloat(manualCeilingPrice);
        if (!ceilingPrice || ceilingPrice <= 0) { toast.error('Preço teto é obrigatório para ativos manuais'); setSaving(false); return; }

        // Fetch current price
        const isInternational = assetClass === 'internacional';
        let currentPrice: number | null = null;
        try {
          const { data } = await supabase.functions.invoke('fetch-stock-price', {
            body: { tickers: [{ ticker, international: isInternational }] },
          });
          currentPrice = data?.prices?.[ticker] ?? null;
        } catch {}

        await supabase.from('portfolio_assets').insert({
          portfolio_id: portfolioId,
          user_id: user.id,
          asset_class: assetClass,
          ticker,
          name: manualName.trim() || ticker,
          allocation_pct: 0,
          source_asset_id: null,
          ceiling_price: ceilingPrice,
          current_price: currentPrice,
          display_order: nextOrder,
        } as any);
      } else {
        if (!selectedAssetId) { toast.error('Selecione um ativo'); setSaving(false); return; }
        const source = recommendedAssets.find(a => a.id === selectedAssetId);
        if (!source) { setSaving(false); return; }
        await supabase.from('portfolio_assets').insert({
          portfolio_id: portfolioId,
          user_id: user.id,
          asset_class: assetClass,
          ticker: source.ticker,
          name: source.company_name,
          allocation_pct: 0,
          source_asset_id: source.id,
          ceiling_price: Number(source.ceiling_price),
          current_price: source.current_price != null ? Number(source.current_price) : null,
          display_order: nextOrder,
        } as any);
      }

      // Reset all assets in class to 0 so the UI auto-calculates equal distribution
      const { data: classAssets } = await supabase
        .from('portfolio_assets')
        .select('id')
        .eq('portfolio_id', portfolioId)
        .eq('asset_class', assetClass);

      if (classAssets && classAssets.length > 0) {
        for (const a of classAssets) {
          await supabase.from('portfolio_assets').update({ allocation_pct: 0 }).eq('id', a.id);
        }
      }

      toast.success('Ativo adicionado ao portfólio');
      onSaved();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar {isRendaFixa ? 'Renda Fixa' : 'Ativo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isRendaFixa ? (
            <>
              <div className="space-y-1.5">
                <Label>Nome / Emissor *</Label>
                <Input value={rfName} onChange={e => setRfName(e.target.value)} placeholder="Tesouro IPCA+ 2035" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select value={rfType} onValueChange={setRfType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pós-fixado">Pós-fixado</SelectItem>
                      <SelectItem value="Prefixado">Prefixado</SelectItem>
                      <SelectItem value="IPCA+">Indexado à Inflação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Indexador</Label>
                  <Input value={rfIndexador} onChange={e => setRfIndexador(e.target.value)} placeholder="CDI+2%, IPCA+6%" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={rfVencimento} onChange={e => setRfVencimento(e.target.value)} />
              </div>
            </>
          ) : (
            <Tabs value={mode} onValueChange={v => setMode(v as 'recommended' | 'manual')}>
              <TabsList className="w-full">
                <TabsTrigger value="recommended" className="flex-1 gap-1.5 text-xs">
                  <Star className="w-3 h-3" /> Carteira Recomendada
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1 gap-1.5 text-xs">
                  <Wrench className="w-3 h-3" /> Busca Livre
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recommended" className="space-y-3 mt-3">
                <div className="space-y-1.5">
                  <Label>Ativo (das Carteiras Recomendadas) *</Label>
                  <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar ativo..." /></SelectTrigger>
                    <SelectContent>
                      {availableAssets.map(a => {
                        const pName = portfolioNameMap[a.portfolio_id] || '';
                        return (
                          <SelectItem key={a.id} value={a.id}>
                            {a.ticker} — {a.company_name} (Teto: R$ {Number(a.ceiling_price).toFixed(2)}) · {pName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-3 mt-3">
                <div className="space-y-1.5">
                  <Label>Ticker *</Label>
                  <Input
                    value={manualTicker}
                    onChange={e => setManualTicker(e.target.value.toUpperCase())}
                    placeholder="Ex: PETR4, ITUB4, KNRI11"
                    maxLength={10}
                  />
                  <p className="text-[10px] text-muted-foreground">Apenas letras e números, 3-10 caracteres</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Nome (opcional)</Label>
                  <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ex: Petrobras" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    Preço Teto (R$) *
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600">
                      definido manualmente
                    </Badge>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualCeilingPrice}
                    onChange={e => setManualCeilingPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
