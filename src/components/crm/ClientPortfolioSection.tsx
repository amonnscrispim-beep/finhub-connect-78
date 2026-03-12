import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles } from 'lucide-react';

interface Props {
  clientId: string;
}

interface PortfolioConfig {
  id?: string;
  client_id: string;
  user_id: string;
  profile: string;
  strategy: string;
  invest_amount: number;
  is_customized: boolean;
  custom_allocations: Record<string, number>; // asset_id -> custom allocation_pct
}

interface InvestorPortfolio {
  id: string;
  profile: string;
  strategy: string;
  acoes_pct: number;
  fiis_pct: number;
  internacional_pct: number;
  renda_fixa_pct: number;
  rf_pos_pct: number;
  rf_pre_pct: number;
  rf_ipca_pct: number;
}

interface PortfolioAssetItem {
  id: string;
  portfolio_id: string;
  asset_class: string;
  ticker: string;
  name: string;
  allocation_pct: number;
  source_asset_id: string | null;
  rf_type: string | null;
  indexador: string | null;
  vencimento: string | null;
}

interface RecommendedAsset {
  id: string;
  ticker: string;
  company_name: string;
  ceiling_price: number;
  current_price: number | null;
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  acoes_brasileiras: 'Ações Brasileiras',
  fiis: 'Fundos Imobiliários',
  internacional: 'Internacional',
  renda_fixa: 'Renda Fixa',
};

export function ClientPortfolioSection({ clientId }: Props) {
  const { user } = useAuth();
  const [config, setConfig] = useState<PortfolioConfig | null>(null);
  const [portfolio, setPortfolio] = useState<InvestorPortfolio | null>(null);
  const [assets, setAssets] = useState<PortfolioAssetItem[]>([]);
  const [recommendedAssets, setRecommendedAssets] = useState<RecommendedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState('Conservador');
  const [strategy, setStrategy] = useState('Renda');
  const [investAmount, setInvestAmount] = useState(0);
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({});
  const [isCustomized, setIsCustomized] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Load client config
    const { data: configData } = await supabase
      .from('client_portfolio_config')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (configData) {
      const c = configData as any;
      setConfig(c);
      setProfile(c.profile);
      setStrategy(c.strategy);
      setInvestAmount(Number(c.invest_amount) || 0);
      setCustomAllocations(c.custom_allocations || {});
      setIsCustomized(c.is_customized || false);
    }

    // Load recommended assets for price references
    const { data: recAssets } = await supabase
      .from('recommended_portfolio_assets')
      .select('id, ticker, company_name, ceiling_price, current_price')
      .eq('user_id', user.id);
    setRecommendedAssets((recAssets || []) as unknown as RecommendedAsset[]);

    setLoading(false);
  }, [user, clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load matching portfolio when profile/strategy changes
  useEffect(() => {
    if (!user) return;
    const loadPortfolio = async () => {
      const { data: p } = await supabase
        .from('investor_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .eq('profile', profile)
        .eq('strategy', strategy)
        .single();

      if (p) {
        setPortfolio(p as unknown as InvestorPortfolio);
        const { data: a } = await supabase
          .from('portfolio_assets')
          .select('*')
          .eq('portfolio_id', p.id)
          .order('display_order');
        setAssets((a || []) as unknown as PortfolioAssetItem[]);
      } else {
        setPortfolio(null);
        setAssets([]);
      }
    };
    loadPortfolio();
  }, [user, profile, strategy]);

  const saveConfig = async (updates: Partial<PortfolioConfig>) => {
    if (!user) return;
    const newConfig = {
      client_id: clientId,
      user_id: user.id,
      profile,
      strategy,
      invest_amount: investAmount,
      is_customized: isCustomized,
      custom_allocations: customAllocations,
      ...updates,
    };

    if (config?.id) {
      await supabase.from('client_portfolio_config').update(newConfig as any).eq('id', config.id);
      setConfig({ ...config, ...newConfig });
    } else {
      const { data } = await supabase.from('client_portfolio_config').insert(newConfig as any).select().single();
      if (data) setConfig(data as any);
    }
  };

  const handleProfileChange = (v: string) => {
    setProfile(v);
    setCustomAllocations({});
    setIsCustomized(false);
    saveConfig({ profile: v, custom_allocations: {}, is_customized: false });
  };

  const handleStrategyChange = (v: string) => {
    setStrategy(v);
    setCustomAllocations({});
    setIsCustomized(false);
    saveConfig({ strategy: v, custom_allocations: {}, is_customized: false });
  };

  const handleInvestAmountChange = (val: string) => {
    const num = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    setInvestAmount(num);
    saveConfig({ invest_amount: num });
  };

  const handleCustomAllocation = (assetId: string, value: number) => {
    const updated = { ...customAllocations, [assetId]: value };
    setCustomAllocations(updated);
    setIsCustomized(true);
    saveConfig({ custom_allocations: updated, is_customized: true });
  };

  const getSourceAsset = (sourceId: string | null) => {
    if (!sourceId) return null;
    return recommendedAssets.find(a => a.id === sourceId);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  // Build allocation rows
  const classOrder = ['acoes_brasileiras', 'fiis', 'internacional', 'renda_fixa'];
  const classPcts: Record<string, number> = portfolio ? {
    acoes_brasileiras: Number(portfolio.acoes_pct),
    fiis: Number(portfolio.fiis_pct),
    internacional: Number(portfolio.internacional_pct),
    renda_fixa: Number(portfolio.renda_fixa_pct),
  } : {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-foreground">Arquitetura da Carteira</h4>
        {isCustomized && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">Customizado</Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Perfil de Risco</Label>
          <Select value={profile} onValueChange={handleProfileChange}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Conservador">Conservador</SelectItem>
              <SelectItem value="Moderado">Moderado</SelectItem>
              <SelectItem value="Arrojado">Arrojado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Estratégia</Label>
          <Select value={strategy} onValueChange={handleStrategyChange}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Renda">Renda</SelectItem>
              <SelectItem value="Crescimento">Crescimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor a Investir</Label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">R$</span>
            <Input
              type="number"
              className="h-8 text-sm"
              value={investAmount || ''}
              placeholder="0"
              onChange={e => handleInvestAmountChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {portfolio && assets.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Classe</TableHead>
                <TableHead className="text-xs">Ativo</TableHead>
                <TableHead className="text-xs text-right">Alocação %</TableHead>
                <TableHead className="text-xs text-right">Valor (R$)</TableHead>
                <TableHead className="text-xs text-right">Qtd. Cotas</TableHead>
                <TableHead className="text-xs text-right">Preço Teto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classOrder.map(cls => {
                const classPct = classPcts[cls] || 0;
                if (classPct === 0) return null;
                const classAssets = assets.filter(a => a.asset_class === cls);
                const classValue = investAmount * (classPct / 100);
                const isRF = cls === 'renda_fixa';

                if (classAssets.length === 0) {
                  return (
                    <TableRow key={cls}>
                      <TableCell className="text-xs font-medium">{ASSET_CLASS_LABELS[cls]}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="text-right text-xs">{classPct.toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-xs">{investAmount > 0 ? `R$ ${classValue.toFixed(2)}` : '—'}</TableCell>
                      <TableCell className="text-right text-xs">—</TableCell>
                      <TableCell className="text-right text-xs">—</TableCell>
                    </TableRow>
                  );
                }

                return classAssets.map((asset, i) => {
                  const source = getSourceAsset(asset.source_asset_id);
                  const effectivePct = customAllocations[asset.id] !== undefined
                    ? customAllocations[asset.id]
                    : Number(asset.allocation_pct);
                  const assetValue = classValue * (effectivePct / 100);
                  const currentPrice = source?.current_price;
                  const cotas = !isRF && currentPrice && currentPrice > 0 ? Math.floor(assetValue / currentPrice) : null;
                  const ceilingPrice = source?.ceiling_price;

                  return (
                    <TableRow key={asset.id}>
                      <TableCell className="text-xs font-medium">{i === 0 ? ASSET_CLASS_LABELS[cls] : ''}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        {asset.ticker || asset.name}
                        {isRF && asset.rf_type && <span className="text-muted-foreground ml-1">({asset.rf_type})</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.1"
                          className="h-6 w-16 text-xs text-right ml-auto"
                          value={effectivePct}
                          onChange={e => handleCustomAllocation(asset.id, parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {investAmount > 0 ? `R$ ${assetValue.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {!isRF && cotas !== null ? cotas : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {!isRF && ceilingPrice ? `R$ ${Number(ceilingPrice).toFixed(2)}` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {portfolio && assets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nenhum ativo configurado para o portfólio {profile} — {strategy}. Configure os ativos na aba "Carteiras Recomendadas" → Portfólios.
          </CardContent>
        </Card>
      )}

      {!portfolio && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Portfólio não encontrado. Configure os portfólios na aba "Carteiras Recomendadas".
          </CardContent>
        </Card>
      )}
    </div>
  );
}
