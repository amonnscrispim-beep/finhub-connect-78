import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PortfolioAsset } from './CarteirasRecomendadas';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  portfolioId: string;
  portfolioSlug: string;
  asset?: PortfolioAsset;
  nextOrder: number;
  onSaved: () => void;
}

export function AssetModal({ open, onOpenChange, portfolioId, portfolioSlug, asset, nextOrder, onSaved }: Props) {
  const { user } = useAuth();
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [ceilingPrice, setCeilingPrice] = useState('');
  const [allocationPct, setAllocationPct] = useState('');
  const [manualBias, setManualBias] = useState('auto');
  const [isInternational, setIsInternational] = useState(portfolioSlug === 'internacional');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (asset) {
      setTicker(asset.ticker);
      setCompanyName(asset.company_name);
      setSector(asset.sector || '');
      setEntryPrice(String(asset.entry_price));
      setEntryDate(asset.entry_date || new Date().toISOString().split('T')[0]);
      setCeilingPrice(String(asset.ceiling_price));
      setAllocationPct(String(asset.allocation_pct));
      setManualBias(asset.manual_bias || 'auto');
      setIsInternational(asset.is_international);
    } else {
      setTicker('');
      setCompanyName('');
      setSector('');
      setEntryPrice('');
      setEntryDate(new Date().toISOString().split('T')[0]);
      setCeilingPrice('');
      setAllocationPct('');
      setManualBias('auto');
      setIsInternational(portfolioSlug === 'internacional');
    }
  }, [asset, open, portfolioSlug]);

  const handleSave = async () => {
    if (!user || !ticker.trim()) return;
    setSaving(true);

    try {
      // Fetch current price
      let currentPrice: number | null = null;
      try {
        const { data } = await supabase.functions.invoke('fetch-stock-price', {
          body: { tickers: [{ ticker: ticker.trim().toUpperCase(), international: isInternational }] },
        });
        currentPrice = data?.prices?.[ticker.trim().toUpperCase()] ?? null;
      } catch { }

      const record = {
        portfolio_id: portfolioId,
        user_id: user.id,
        ticker: ticker.trim().toUpperCase(),
        company_name: companyName.trim(),
        sector: sector.trim(),
        entry_price: parseFloat(entryPrice) || 0,
        entry_date: entryDate,
        ceiling_price: parseFloat(ceilingPrice) || 0,
        allocation_pct: parseFloat(allocationPct) || 0,
        manual_bias: manualBias === 'auto' ? null : manualBias,
        is_international: isInternational,
        current_price: currentPrice,
        display_order: asset?.display_order ?? nextOrder,
      };

      if (asset) {
        await supabase.from('recommended_portfolio_assets').update(record).eq('id', asset.id);
        toast.success('Ativo atualizado');
      } else {
        await supabase.from('recommended_portfolio_assets').insert(record);
        toast.success('Ativo adicionado');
      }

      onSaved();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{asset ? 'Editar Ativo' : 'Adicionar Ativo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ticker</Label>
              <Input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="PETR4" />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Petrobras" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Setor</Label>
            <Input value={sector} onChange={e => setSector(e.target.value)} placeholder="Petróleo & Gás" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço de Entrada (R$)</Label>
              <Input type="number" step="0.01" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Entrada</Label>
              <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço-Teto (R$)</Label>
              <Input type="number" step="0.01" value={ceilingPrice} onChange={e => setCeilingPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alocação (%)</Label>
              <Input type="number" step="0.1" value={allocationPct} onChange={e => setAllocationPct(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Viés</Label>
              <Select value={manualBias} onValueChange={setManualBias}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  <SelectItem value="Comprar">Comprar</SelectItem>
                  <SelectItem value="Aguardar">Aguardar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={isInternational ? 'internacional' : 'nacional'} onValueChange={v => setIsInternational(v === 'internacional')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional (.SA)</SelectItem>
                  <SelectItem value="internacional">Internacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !ticker.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
