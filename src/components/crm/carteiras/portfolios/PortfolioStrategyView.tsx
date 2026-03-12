import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calculator, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { InvestorPortfolio, PortfolioAssetItem } from './PortfoliosSection';
import { PortfolioAsset } from '../CarteirasRecomendadas';
import { PortfolioAssetModal } from './PortfolioAssetModal';

interface Props {
  portfolio: InvestorPortfolio;
  assets: PortfolioAssetItem[];
  recommendedAssets: PortfolioAsset[];
  portfolioNameMap: Record<string, string>;
  onUpdatePortfolio: (id: string, updates: Partial<InvestorPortfolio>) => Promise<void>;
  onRefreshAssets: () => Promise<void>;
}

const ASSET_CLASSES = [
  { key: 'acoes_brasileiras', label: 'Ações Brasileiras', pctField: 'acoes_pct' as const, sourceSlug: ['crescimento', 'dividendos'] },
  { key: 'fiis', label: 'Fundos Imobiliários', pctField: 'fiis_pct' as const, sourceSlug: ['fiis'] },
  { key: 'internacional', label: 'Internacional', pctField: 'internacional_pct' as const, sourceSlug: ['internacional'] },
  { key: 'renda_fixa', label: 'Renda Fixa', pctField: 'renda_fixa_pct' as const, sourceSlug: [] },
];

const RF_SUBTYPES = [
  { key: 'pos_fixado', label: 'Pós-fixado', pctField: 'rf_pos_pct' as const },
  { key: 'pre_fixado', label: 'Prefixado', pctField: 'rf_pre_pct' as const },
  { key: 'ipca', label: 'Indexado à Inflação', pctField: 'rf_ipca_pct' as const },
];

export function PortfolioStrategyView({ portfolio, assets, recommendedAssets, portfolioNameMap, onUpdatePortfolio, onRefreshAssets }: Props) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClass, setModalClass] = useState('acoes_brasileiras');
  const [investAmount, setInvestAmount] = useState(portfolio.invest_amount || 0);

  const totalPct = Number(portfolio.acoes_pct) + Number(portfolio.fiis_pct) + Number(portfolio.internacional_pct) + Number(portfolio.renda_fixa_pct);
  const isValid = Math.abs(totalPct - 100) < 0.01;

  const rfTotal = Number(portfolio.rf_pos_pct) + Number(portfolio.rf_pre_pct) + Number(portfolio.rf_ipca_pct);
  const rfValid = Number(portfolio.renda_fixa_pct) === 0 || Math.abs(rfTotal - 100) < 0.01;

  const handlePctChange = async (field: string, value: string) => {
    const num = parseFloat(value) || 0;
    await onUpdatePortfolio(portfolio.id, { [field]: num } as any);
  };

  const handleInvestAmountChange = (value: string) => {
    const num = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    setInvestAmount(num);
  };

  const handleInvestAmountBlur = () => {
    onUpdatePortfolio(portfolio.id, { invest_amount: investAmount });
  };

  const openAddAsset = (assetClass: string) => {
    setModalClass(assetClass);
    setModalOpen(true);
  };

  const handleDeleteAsset = async (id: string) => {
    await supabase.from('portfolio_assets').delete().eq('id', id);
    toast.success('Ativo removido');
    await onRefreshAssets();
  };

  const getSourceAsset = (sourceId: string | null) => {
    if (!sourceId) return null;
    return recommendedAssets.find(a => a.id === sourceId);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{portfolio.strategy}</CardTitle>
          <Badge variant={isValid ? 'default' : 'destructive'} className={isValid ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : ''}>
            {isValid ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            {totalPct.toFixed(1)}%
          </Badge>
        </div>
        <Progress value={Math.min(totalPct, 100)} className="h-2" />
        {!isValid && <p className="text-xs text-destructive mt-1">A soma das alocações deve ser exatamente 100%</p>}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Class allocations */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ASSET_CLASSES.map(cls => (
            <div key={cls.key} className="space-y-1">
              <Label className="text-xs">{cls.label}</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 text-sm"
                  value={Number(portfolio[cls.pctField])}
                  onChange={e => handlePctChange(cls.pctField, e.target.value)}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* RF subtypes */}
        {Number(portfolio.renda_fixa_pct) > 0 && (
          <div className="pl-4 border-l-2 border-muted space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Distribuição Renda Fixa {!rfValid && <span className="text-destructive">(soma: {rfTotal.toFixed(1)}% — deve ser 100%)</span>}</p>
            <div className="grid grid-cols-3 gap-3">
              {RF_SUBTYPES.map(rf => (
                <div key={rf.key} className="space-y-1">
                  <Label className="text-xs">{rf.label}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      className="h-8 text-sm"
                      value={Number(portfolio[rf.pctField])}
                      onChange={e => handlePctChange(rf.pctField, e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assets per class */}
        {ASSET_CLASSES.map(cls => {
          const classAssets = assets.filter(a => a.asset_class === cls.key);
          if (Number(portfolio[cls.pctField]) === 0 && classAssets.length === 0) return null;

          const classPct = Number(portfolio[cls.pctField]);
          const classValue = investAmount * (classPct / 100);

          return (
            <div key={cls.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{cls.label} ({classPct}%)</h4>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddAsset(cls.key)}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>

              {classAssets.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Ativo</TableHead>
                        {cls.key === 'renda_fixa' && <TableHead className="text-xs">Tipo</TableHead>}
                        {cls.key === 'renda_fixa' && <TableHead className="text-xs">Indexador</TableHead>}
                        {cls.key === 'renda_fixa' && <TableHead className="text-xs">Vencimento</TableHead>}
                        {cls.key !== 'renda_fixa' && <TableHead className="text-xs text-right">Preço Teto</TableHead>}
                        {cls.key !== 'renda_fixa' && <TableHead className="text-xs text-right">Preço Atual</TableHead>}
                        <TableHead className="text-xs text-right">Alocação %</TableHead>
                        {investAmount > 0 && <TableHead className="text-xs text-right">Valor (R$)</TableHead>}
                        {investAmount > 0 && cls.key !== 'renda_fixa' && <TableHead className="text-xs text-right">Qtd. Cotas</TableHead>}
                        <TableHead className="text-xs w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classAssets.map(asset => {
                        const source = getSourceAsset(asset.source_asset_id);
                        const assetValue = classValue * (Number(asset.allocation_pct) / 100);
                        const currentPrice = source?.current_price;
                        const cotas = currentPrice && currentPrice > 0 ? Math.floor(assetValue / currentPrice) : null;

                        return (
                          <TableRow key={asset.id}>
                            <TableCell className="font-mono text-sm font-semibold">{asset.ticker || asset.name}</TableCell>
                            {cls.key === 'renda_fixa' && <TableCell className="text-xs">{asset.rf_type || '—'}</TableCell>}
                            {cls.key === 'renda_fixa' && <TableCell className="text-xs">{asset.indexador || '—'}</TableCell>}
                            {cls.key === 'renda_fixa' && <TableCell className="text-xs">{asset.vencimento || '—'}</TableCell>}
                            {cls.key !== 'renda_fixa' && (
                              <TableCell className="text-right text-sm">
                                {source ? `R$ ${Number(source.ceiling_price).toFixed(2)}` : '—'}
                              </TableCell>
                            )}
                            {cls.key !== 'renda_fixa' && (
                              <TableCell className="text-right text-sm">
                                {source?.current_price != null ? `R$ ${Number(source.current_price).toFixed(2)}` : '...'}
                              </TableCell>
                            )}
                            <TableCell className="text-right text-sm font-medium">{Number(asset.allocation_pct).toFixed(1)}%</TableCell>
                            {investAmount > 0 && (
                              <TableCell className="text-right text-sm">R$ {assetValue.toFixed(2)}</TableCell>
                            )}
                            {investAmount > 0 && cls.key !== 'renda_fixa' && (
                              <TableCell className="text-right text-sm font-medium">{cotas !== null ? cotas : '—'}</TableCell>
                            )}
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAsset(asset.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          );
        })}

        {/* Calculator */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Calculator className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium whitespace-nowrap">Valor a investir:</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">R$</span>
            <Input
              type="number"
              className="h-8 w-48 text-sm"
              value={investAmount || ''}
              placeholder="0"
              onChange={e => handleInvestAmountChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>

      <PortfolioAssetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        portfolioId={portfolio.id}
        assetClass={modalClass}
        recommendedAssets={recommendedAssets}
        portfolioNameMap={portfolioNameMap}
        nextOrder={assets.filter(a => a.asset_class === modalClass).length}
        onSaved={async () => { setModalOpen(false); await onRefreshAssets(); }}
      />
    </Card>
  );
}
