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
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calculator, AlertTriangle, CheckCircle2, Trash2, Copy } from 'lucide-react';
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

type PctField = 'acoes_pct' | 'fiis_pct' | 'internacional_pct' | 'renda_fixa_pct' | 'rf_pos_pct' | 'rf_pre_pct' | 'rf_ipca_pct';

interface AssetCalc {
  asset: PortfolioAssetItem;
  allocClassPct: number; // % within class (editable, stored in allocation_pct)
  totalPct: number; // % of total portfolio (read-only = classPct × allocClassPct / 100)
  assetValue: number;
  cotas: number | null;
  dyInput: number;
  dvMonth: number;
  dvYear: number;
  source: PortfolioAsset | null;
  isFii: boolean;
  isRf: boolean;
}

function computeAsset(
  asset: PortfolioAssetItem,
  classPct: number,
  classCount: number,
  investAmount: number,
  recommendedAssets: PortfolioAsset[],
  classKey: string,
): AssetCalc {
  // allocation_pct stores the weight within the class (e.g. 10% of the class)
  const storedClassPct = Number(asset.allocation_pct);
  const autoClassPct = classCount > 0 ? 100 / classCount : 0;
  const allocClassPct = storedClassPct > 0 ? storedClassPct : autoClassPct;
  
  // Total portfolio % = class% × classWeight/100
  const totalPct = classPct * (allocClassPct / 100);
  const assetValue = investAmount * (totalPct / 100);
  
  const source = asset.source_asset_id ? recommendedAssets.find(a => a.id === asset.source_asset_id) || null : null;
  const currentPrice = source?.current_price ? Number(source.current_price) : null;
  const isRf = classKey === 'renda_fixa';
  const isFii = classKey === 'fiis';
  const cotas = !isRf && currentPrice && currentPrice > 0 ? Math.floor(assetValue / currentPrice) : null;

  const dyInput = Number(asset.dy_pct) || 0;
  let dvMonth: number;
  let dvYear: number;

  if (isFii) {
    dvMonth = dyInput * (cotas || 0);
    dvYear = dvMonth * 12;
  } else if (isRf) {
    dvYear = assetValue * (dyInput / 100);
    dvMonth = dvYear / 12;
  } else {
    dvYear = dyInput * (cotas || 0);
    dvMonth = dvYear / 12;
  }

  return { asset, allocClassPct, totalPct, assetValue, cotas, dyInput, dvMonth, dvYear, source, isFii, isRf };
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PortfolioStrategyView({ portfolio, assets, recommendedAssets, portfolioNameMap, onUpdatePortfolio, onRefreshAssets }: Props) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClass, setModalClass] = useState('acoes_brasileiras');
  const [investAmount, setInvestAmount] = useState(portfolio.invest_amount || 0);

  const [localPcts, setLocalPcts] = useState<Record<PctField, number>>({
    acoes_pct: Number(portfolio.acoes_pct),
    fiis_pct: Number(portfolio.fiis_pct),
    internacional_pct: Number(portfolio.internacional_pct),
    renda_fixa_pct: Number(portfolio.renda_fixa_pct),
    rf_pos_pct: Number(portfolio.rf_pos_pct),
    rf_pre_pct: Number(portfolio.rf_pre_pct),
    rf_ipca_pct: Number(portfolio.rf_ipca_pct),
  });

  const totalPct = localPcts.acoes_pct + localPcts.fiis_pct + localPcts.internacional_pct + localPcts.renda_fixa_pct;
  const isValid = Math.abs(totalPct - 100) < 0.01;
  const rfTotal = localPcts.rf_pos_pct + localPcts.rf_pre_pct + localPcts.rf_ipca_pct;
  const rfValid = localPcts.renda_fixa_pct === 0 || Math.abs(rfTotal - 100) < 0.01;

  const handlePctChange = (field: PctField, value: string) => {
    setLocalPcts(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };
  const handlePctBlur = (field: PctField) => {
    onUpdatePortfolio(portfolio.id, { [field]: localPcts[field] } as any);
  };
  const handleInvestAmountChange = (value: string) => {
    setInvestAmount(parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0);
  };
  const handleInvestAmountBlur = () => {
    onUpdatePortfolio(portfolio.id, { invest_amount: investAmount });
  };

  const openAddAsset = (assetClass: string) => { setModalClass(assetClass); setModalOpen(true); };

  const handleDeleteAsset = async (id: string) => {
    const deletedAsset = assets.find(a => a.id === id);
    await supabase.from('portfolio_assets').delete().eq('id', id);
    if (deletedAsset) {
      const remaining = assets.filter(a => a.id !== id && a.asset_class === deletedAsset.asset_class);
      for (const a of remaining) {
        await supabase.from('portfolio_assets').update({ allocation_pct: 0 }).eq('id', a.id);
      }
    }
    toast.success('Ativo removido');
    await onRefreshAssets();
  };

  const handleUpdateAssetField = async (assetId: string, field: string, value: number) => {
    await supabase.from('portfolio_assets').update({ [field]: value } as any).eq('id', assetId);
    await onRefreshAssets();
  };

  // Compute all class data
  let grandDvMonth = 0;
  let grandDvYear = 0;
  let grandValue = 0;

  const classDataMap: Record<string, { calcs: AssetCalc[]; classPct: number; classLabel: string }> = {};

  ASSET_CLASSES.forEach(cls => {
    const classAssets = assets.filter(a => a.asset_class === cls.key);
    const classPct = localPcts[cls.pctField];
    const calcs = classAssets.map(a => computeAsset(a, classPct, classAssets.length, investAmount, recommendedAssets, cls.key));
    const classDvMonth = calcs.reduce((s, c) => s + c.dvMonth, 0);
    const classDvYear = calcs.reduce((s, c) => s + c.dvYear, 0);
    const classValue = calcs.reduce((s, c) => s + c.assetValue, 0);
    grandDvMonth += classDvMonth;
    grandDvYear += classDvYear;
    grandValue += classValue;
    classDataMap[cls.key] = { calcs, classPct, classLabel: cls.label };
  });

  const dyCarteira = grandValue > 0 ? (grandDvYear / grandValue) * 100 : 0;

  // Copy helpers — format: TICKER: X cotas (R$ Y)
  const buildClassLines = (classKey: string): string => {
    const data = classDataMap[classKey];
    if (!data || data.calcs.length === 0) return '';
    return data.calcs.map(c => {
      const name = c.asset.ticker || c.asset.name;
      const valuePart = `R$ ${formatBRL(c.assetValue)}`;
      if (c.isRf) {
        return `${name}: ${valuePart}`;
      }
      return `${name}: ${c.cotas ?? 0} cotas (${valuePart})`;
    }).join('\n');
  };

  const handleCopyClass = (classKey: string) => {
    const text = buildClassLines(classKey);
    if (!text) { toast.info('Nenhum ativo nesta classe'); return; }
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const handleCopyAll = () => {
    const sections = ASSET_CLASSES.map(cls => {
      const lines = buildClassLines(cls.key);
      return lines ? `${classDataMap[cls.key].classLabel}\n${lines}` : '';
    }).filter(Boolean);
    if (sections.length === 0) { toast.info('Nenhum ativo no portfólio'); return; }
    navigator.clipboard.writeText(sections.join('\n\n'));
    toast.success('Portfólio completo copiado!');
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{portfolio.strategy}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopyAll}>
              <Copy className="w-3 h-3 mr-1" /> Copiar portfólio
            </Button>
            <Badge variant={isValid ? 'default' : 'destructive'} className={isValid ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : ''}>
              {isValid ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
              {totalPct.toFixed(1)}%
            </Badge>
          </div>
        </div>
        <Progress value={Math.min(totalPct, 100)} className="h-2" />
        {!isValid && <p className="text-xs text-destructive mt-1">A soma das alocações deve ser exatamente 100%</p>}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Class allocations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {ASSET_CLASSES.map(cls => {
            const classPctVal = localPcts[cls.pctField];
            const classValueCalc = investAmount * (classPctVal / 100);
            return (
              <div key={cls.key} className="space-y-1">
                <Label className="text-xs">{cls.label}</Label>
                <div className="flex items-center gap-1">
                  <Input type="number" step="0.1" className="h-8 text-sm w-20"
                    value={classPctVal}
                    onChange={e => handlePctChange(cls.pctField, e.target.value)}
                    onBlur={() => handlePctBlur(cls.pctField)}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input type="text" className="h-8 text-sm w-28"
                    key={`clsval-${cls.key}-${investAmount}-${classPctVal}`}
                    defaultValue={formatBRL(classValueCalc)}
                    onBlur={e => {
                      const raw = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0;
                      if (investAmount > 0) {
                        const newPct = (raw / investAmount) * 100;
                        setLocalPcts(prev => ({ ...prev, [cls.pctField]: parseFloat(newPct.toFixed(2)) }));
                        onUpdatePortfolio(portfolio.id, { [cls.pctField]: parseFloat(newPct.toFixed(2)) } as any);
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* RF subtypes */}
        {localPcts.renda_fixa_pct > 0 && (
          <div className="pl-4 border-l-2 border-muted space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Distribuição Renda Fixa {!rfValid && <span className="text-destructive">(soma: {rfTotal.toFixed(1)}% — deve ser 100%)</span>}</p>
            <div className="grid grid-cols-3 gap-3">
              {RF_SUBTYPES.map(rf => (
                <div key={rf.key} className="space-y-1">
                  <Label className="text-xs">{rf.label}</Label>
                  <div className="flex items-center gap-1">
                    <Input type="number" step="0.1" className="h-8 text-sm"
                      value={localPcts[rf.pctField]}
                      onChange={e => handlePctChange(rf.pctField, e.target.value)}
                      onBlur={() => handlePctBlur(rf.pctField)}
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
          const data = classDataMap[cls.key];
          if (!data || (data.classPct === 0 && data.calcs.length === 0)) return null;
          const isRf = cls.key === 'renda_fixa';
          const isFii = cls.key === 'fiis';
          const classDvMonth = data.calcs.reduce((s, c) => s + c.dvMonth, 0);
          const classDvYear = data.calcs.reduce((s, c) => s + c.dvYear, 0);
          const classValue = data.calcs.reduce((s, c) => s + c.assetValue, 0);
          const classAllocSum = data.calcs.reduce((s, c) => s + c.allocClassPct, 0);
          const classAllocValid = data.calcs.length === 0 || Math.abs(classAllocSum - 100) < 0.01;

          return (
            <div key={cls.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">{cls.label} ({data.classPct}%)</h4>
                  {!classAllocValid && data.calcs.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-5">
                      <AlertTriangle className="w-3 h-3 mr-0.5" />
                      Classe: {classAllocSum.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleCopyClass(cls.key)}>
                    <Copy className="w-3 h-3 mr-1" /> Copiar
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddAsset(cls.key)}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>

              {data.calcs.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Ativo</TableHead>
                        {isRf && <TableHead className="text-xs">Tipo</TableHead>}
                        {isRf && <TableHead className="text-xs">Indexador</TableHead>}
                        {isRf && <TableHead className="text-xs">Vencimento</TableHead>}
                        {!isRf && <TableHead className="text-xs text-right">Preço Teto</TableHead>}
                        {!isRf && <TableHead className="text-xs text-right">Preço Atual</TableHead>}
                        <TableHead className="text-xs text-right">Aloc. Classe %</TableHead>
                        <TableHead className="text-xs text-right">Alocação %</TableHead>
                        <TableHead className="text-xs text-right">Valor R$</TableHead>
                        {!isRf && <TableHead className="text-xs text-right">Qtd. Cotas</TableHead>}
                        <TableHead className="text-xs text-right">{isFii ? 'DY R$/cota mês' : isRf ? 'Taxa % a.a.' : 'DY R$/cota ano'}</TableHead>
                        <TableHead className="text-xs text-right">Div. Mês R$</TableHead>
                        <TableHead className="text-xs text-right">Div. Ano R$</TableHead>
                        <TableHead className="text-xs w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.calcs.map(c => (
                        <TableRow key={c.asset.id}>
                          <TableCell className="font-mono text-sm font-semibold">{c.asset.ticker || c.asset.name}</TableCell>
                          {isRf && <TableCell className="text-xs">{c.asset.rf_type || '—'}</TableCell>}
                          {isRf && <TableCell className="text-xs">{c.asset.indexador || '—'}</TableCell>}
                          {isRf && <TableCell className="text-xs">{c.asset.vencimento || '—'}</TableCell>}
                          {!isRf && (
                            <TableCell className="text-right text-sm">
                              {c.source ? `R$ ${Number(c.source.ceiling_price).toFixed(2)}` : '—'}
                            </TableCell>
                          )}
                          {!isRf && (
                            <TableCell className="text-right text-sm">
                              {c.source?.current_price != null ? `R$ ${Number(c.source.current_price).toFixed(2)}` : '...'}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <Input type="number" step="0.01" className="h-7 w-20 text-sm text-right inline-block"
                              defaultValue={c.allocClassPct.toFixed(2)}
                              key={`cls-${c.asset.id}-${data.calcs.length}-${data.classPct}`}
                              onBlur={e => {
                                const val = parseFloat(e.target.value) || 0;
                                if (Math.abs(val - c.allocClassPct) > 0.001) handleUpdateAssetField(c.asset.id, 'allocation_pct', val);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                              {c.totalPct.toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">R$ {formatBRL(c.assetValue)}</TableCell>
                          {!isRf && <TableCell className="text-right text-sm font-medium">{c.cotas !== null ? c.cotas : '—'}</TableCell>}
                          <TableCell className="text-right">
                            <Input type="number" step="0.01" className="h-7 w-20 text-sm text-right inline-block"
                              defaultValue={c.dyInput.toFixed(2)}
                              key={`dy-${c.asset.id}`}
                              onBlur={e => {
                                const val = parseFloat(e.target.value) || 0;
                                if (Math.abs(val - c.dyInput) > 0.001) handleUpdateAssetField(c.asset.id, 'dy_pct', val);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm text-emerald-600">R$ {formatBRL(c.dvMonth)}</TableCell>
                          <TableCell className="text-right text-sm text-emerald-600">R$ {formatBRL(c.dvYear)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAsset(c.asset.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/30 font-medium text-xs">
                        <TableCell colSpan={isRf ? 4 : 3}>Total {cls.label}</TableCell>
                        {!isRf && <TableCell />}
                        <TableCell className="text-right">{classAllocSum.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{data.classPct.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">R$ {formatBRL(classValue)}</TableCell>
                        {!isRf && <TableCell />}
                        <TableCell />
                        <TableCell className="text-right text-emerald-600">R$ {formatBRL(classDvMonth)}</TableCell>
                        <TableCell className="text-right text-emerald-600">R$ {formatBRL(classDvYear)}</TableCell>
                        <TableCell />
                      </TableRow>
                      {classValue > 0 && (classDvMonth > 0 || classDvYear > 0) && (
                        <TableRow className="bg-emerald-50 text-xs">
                          <TableCell colSpan={isRf ? 11 : 12}>
                            <span className="font-semibold text-emerald-700">
                              DY Mês: {((classDvMonth / classValue) * 100).toFixed(2)}% | DY Ano: {((classDvYear / classValue) * 100).toFixed(2)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableFooter>
                  </Table>
                </div>
              )}
            </div>
          );
        })}

        {/* Portfolio totals */}
        {grandValue > 0 && (
          <div className="bg-muted/40 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Valor Investido</p>
              <p className="font-semibold">R$ {formatBRL(grandValue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Dividendo Mês</p>
              <p className="font-semibold text-emerald-600">R$ {formatBRL(grandDvMonth)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Dividendo Ano</p>
              <p className="font-semibold text-emerald-600">R$ {formatBRL(grandDvYear)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">DY Carteira</p>
              <p className="font-semibold text-emerald-600">{dyCarteira.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {/* Calculator */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Calculator className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium whitespace-nowrap">Valor a investir:</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">R$</span>
            <Input type="number" className="h-8 w-48 text-sm"
              value={investAmount || ''}
              placeholder="0"
              onChange={e => handleInvestAmountChange(e.target.value)}
              onBlur={handleInvestAmountBlur}
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
