import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PortfolioAsset, RecommendedPortfolio } from './CarteirasRecomendadas';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: PortfolioAsset | null;
  currentPortfolioId: string;
  allPortfolios: RecommendedPortfolio[];
  onMoved: () => void;
}

export function MoveAssetModal({ open, onOpenChange, asset, currentPortfolioId, allPortfolios, onMoved }: Props) {
  const [targetId, setTargetId] = useState('');
  const [subClassification, setSubClassification] = useState('Small Caps');
  const [saving, setSaving] = useState(false);

  const availablePortfolios = allPortfolios.filter(p => p.id !== currentPortfolioId);
  const targetSlug = allPortfolios.find(p => p.id === targetId)?.slug;
  const showSubClassification = targetSlug === 'crescimento';

  const handleMove = async () => {
    if (!asset || !targetId) return;
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        portfolio_id: targetId,
        is_international: targetSlug === 'internacional',
        sub_classification: showSubClassification ? subClassification : null,
      };
      await supabase.from('recommended_portfolio_assets').update(update).eq('id', asset.id);
      toast.success(`${asset.ticker} movido com sucesso`);
      onOpenChange(false);
      onMoved();
    } catch (e: any) {
      toast.error('Erro ao mover: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mover {asset?.ticker}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Carteira de destino</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {availablePortfolios.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showSubClassification && (
            <div className="space-y-1.5">
              <Label>Classificação</Label>
              <Select value={subClassification} onValueChange={setSubClassification}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Small Caps">Small Caps</SelectItem>
                  <SelectItem value="Valor">Valor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleMove} disabled={saving || !targetId}>
              {saving ? 'Movendo...' : 'Mover'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
