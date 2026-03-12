import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const CLASS_TO_SLUGS: Record<string, string[]> = {
  acoes_brasileiras: ['crescimento', 'dividendos'],
  fiis: ['fiis'],
  internacional: ['internacional'],
};

export function PortfolioAssetModal({ open, onOpenChange, portfolioId, assetClass, recommendedAssets, portfolioNameMap, nextOrder, onSaved }: Props) {
  const { user } = useAuth();
  const isRendaFixa = assetClass === 'renda_fixa';

  // Renda fixa fields
  const [rfName, setRfName] = useState('');
  const [rfType, setRfType] = useState('Pós-fixado');
  const [rfIndexador, setRfIndexador] = useState('');
  const [rfVencimento, setRfVencimento] = useState('');
  const [rfAllocationPct, setRfAllocationPct] = useState('');

  // Standard asset fields
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [allocationPct, setAllocationPct] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter recommended assets by matching slugs
  // We need portfolio slugs but we only have assets. Let's filter by the source portfolio slugs
  const availableAssets = useMemo(() => {
    if (isRendaFixa) return [];
    // We don't have portfolio slug info on assets directly, so match by portfolio_id
    // For now, show all recommended assets (the user picks which one)
    return recommendedAssets;
  }, [recommendedAssets, isRendaFixa]);

  useEffect(() => {
    if (open) {
      setSelectedAssetId('');
      setAllocationPct('');
      setRfName('');
      setRfType('Pós-fixado');
      setRfIndexador('');
      setRfVencimento('');
      setRfAllocationPct('');
    }
  }, [open]);

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
          allocation_pct: parseFloat(rfAllocationPct) || 0,
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
          allocation_pct: parseFloat(allocationPct) || 0,
          source_asset_id: source.id,
          display_order: nextOrder,
        } as any);
      }

      // Redistribute allocation equally among all assets in this class
      const { data: classAssets } = await supabase
        .from('portfolio_assets')
        .select('id')
        .eq('portfolio_id', portfolioId)
        .eq('asset_class', assetClass);

      if (classAssets && classAssets.length > 0) {
        const equalPct = parseFloat((100 / classAssets.length).toFixed(2));
        for (const a of classAssets) {
          await supabase.from('portfolio_assets').update({ allocation_pct: equalPct }).eq('id', a.id);
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vencimento</Label>
                  <Input type="date" value={rfVencimento} onChange={e => setRfVencimento(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Alocação (%)</Label>
                  <Input type="number" step="0.1" value={rfAllocationPct} onChange={e => setRfAllocationPct(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <>
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
              <div className="space-y-1.5">
                <Label>Alocação dentro da classe (%)</Label>
                <Input type="number" step="0.1" value={allocationPct} onChange={e => setAllocationPct(e.target.value)} placeholder="Ex: 20" />
              </div>
            </>
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
