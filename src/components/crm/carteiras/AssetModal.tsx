import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PortfolioAsset, RecommendedPortfolio } from './CarteirasRecomendadas';

const SECTORS = [
  'Financeiro e Outros',
  'Bens Industriais',
  'Materiais Básicos',
  'Consumo Não Cíclico',
  'Consumo Cíclico',
  'Petróleo Gás e Biocombustíveis',
  'Utilidade Pública',
  'Saúde',
  'Tecnologia da Informação',
  'Telecomunicações',
  'Outros',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  portfolioId: string;
  portfolioSlug: string;
  asset?: PortfolioAsset;
  nextOrder: number;
  onSaved: () => void;
  allPortfolios: RecommendedPortfolio[];
}

export function AssetModal({ open, onOpenChange, portfolioId, portfolioSlug, asset, nextOrder, onSaved, allPortfolios }: Props) {
  const { user } = useAuth();
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [ceilingPrice, setCeilingPrice] = useState('');
  
  const [subClassification, setSubClassification] = useState<string>('Small Caps');
  const [destinationPortfolioId, setDestinationPortfolioId] = useState(portfolioId);
  const [saving, setSaving] = useState(false);

  const isEditing = !!asset;
  const targetSlug = allPortfolios.find(p => p.id === destinationPortfolioId)?.slug || portfolioSlug;
  const showSubClassification = targetSlug === 'crescimento';

  useEffect(() => {
    if (asset) {
      setTicker(asset.ticker);
      setCompanyName(asset.company_name);
      setSector(asset.sector || '');
      setCeilingPrice(String(asset.ceiling_price));
      
      setSubClassification(asset.sub_classification || 'Small Caps');
      setDestinationPortfolioId(asset.portfolio_id);
    } else {
      setTicker('');
      setCompanyName('');
      setSector('');
      setCeilingPrice('');
      
      setSubClassification('Small Caps');
      setDestinationPortfolioId(portfolioId);
    }
  }, [asset, open, portfolioId]);

  const handleSave = async () => {
    if (!user || !ticker.trim()) return;
    setSaving(true);

    try {
      // Fetch current price
      const isInternational = targetSlug === 'internacional';
      let currentPrice: number | null = null;
      try {
        const { data } = await supabase.functions.invoke('fetch-stock-price', {
          body: { tickers: [{ ticker: ticker.trim().toUpperCase(), international: isInternational }] },
        });
        currentPrice = data?.prices?.[ticker.trim().toUpperCase()] ?? null;
      } catch { }

      const record: Record<string, unknown> = {
        portfolio_id: destinationPortfolioId,
        user_id: user.id,
        ticker: ticker.trim().toUpperCase(),
        company_name: companyName.trim(),
        sector: sector,
        ceiling_price: parseFloat(ceilingPrice) || 0,
        manual_bias: bias,
        is_international: isInternational,
        current_price: currentPrice,
        display_order: asset?.display_order ?? nextOrder,
        sub_classification: showSubClassification ? subClassification : null,
        entry_price: asset?.entry_price ?? 0,
        allocation_pct: asset?.allocation_pct ?? 0,
      };

      if (asset) {
        await supabase.from('recommended_portfolio_assets').update(record).eq('id', asset.id);
        toast.success('Ativo atualizado');
      } else {
        await supabase.from('recommended_portfolio_assets').insert(record as any);
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
          <DialogTitle>{isEditing ? 'Editar Ativo' : 'Adicionar Ativo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ticker *</Label>
              <Input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="PETR4" />
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Petrobras" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Setor</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
              <SelectContent>
                {SECTORS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Preço Teto (R$) *</Label>
            <Input type="number" step="0.01" value={ceilingPrice} onChange={e => setCeilingPrice(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">O viés (Comprar/Aguardar) é calculado automaticamente comparando o preço atual com o preço teto.</p>
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label>Carteira de Destino</Label>
              <Select value={destinationPortfolioId} onValueChange={setDestinationPortfolioId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allPortfolios.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showSubClassification && (
            <div className="space-y-1.5">
              <Label>Classificação *</Label>
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
            <Button onClick={handleSave} disabled={saving || !ticker.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
