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
import { SharedBadge } from '@/components/ui/shared-badge';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calculator, AlertTriangle, CheckCircle2, Trash2, Copy, Share2, FileText } from 'lucide-react';
import type { PortfolioPdfData } from '@/lib/portfolio-pdf-generator';
import { InvestorPortfolio, PortfolioAssetItem } from './PortfoliosSection';
import { PortfolioAsset } from '../CarteirasRecomendadas';
import { PortfolioAssetModal } from './PortfolioAssetModal';
import { PortfolioPdfPreviewModal } from './PortfolioPdfPreviewModal';

interface Props {
  portfolio: InvestorPortfolio;
  assets: PortfolioAssetItem[];
  recommendedAssets: PortfolioAsset[];
  portfolioNameMap: Record<string, string>;
  onUpdatePortfolio: (id: string, updates: Partial<InvestorPortfolio>) => Promise<void>;
  onRefreshAssets: () => Promise<void>;
  isConservador?: boolean;
  conservadorPortfolioId?: string;
  isMaster?: boolean;
  isOwnPortfolio?: boolean;
  readOnly?: boolean;
  onToggleShareStrategy?: () => void;
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

export function PortfolioStrategyView({ portfolio, assets, recommendedAssets, portfolioNameMap, onUpdatePortfolio, onRefreshAssets, isConservador = true, conservadorPortfolioId, isMaster = false, isOwnPortfolio = true, readOnly = false, onToggleShareStrategy }: Props) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClass, setModalClass] = useState('acoes_brasileiras');
  const [investAmount, setInvestAmount] = useState(portfolio.invest_amount || 0);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState<PortfolioPdfData | null>(null);

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
    if (!isConservador) return; // Only Conservador can delete
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
    // For non-Conservador, only allow allocation_pct updates
    if (!isConservador && field !== 'allocation_pct') return;
    
    // For virtual assets (non-Conservador with no own record yet), create one
    if (assetId.startsWith('virtual-') && field === 'allocation_pct') {
      const originalId = assetId.replace('virtual-', '');
      const sourceAsset = assets.find(a => a.id === assetId);
      if (sourceAsset && user) {
        const { error } = await supabase.from('portfolio_assets').insert({
          portfolio_id: portfolio.id,
          user_id: user.id,
          asset_class: sourceAsset.asset_class,
          ticker: sourceAsset.ticker,
          name: sourceAsset.name,
          source_asset_id: sourceAsset.source_asset_id,
          rf_type: sourceAsset.rf_type,
          indexador: sourceAsset.indexador,
          vencimento: sourceAsset.vencimento,
          display_order: sourceAsset.display_order,
          allocation_pct: value,
          dy_pct: 0,
        } as any);
        if (error) console.error(error);
        await onRefreshAssets();
        return;
      }
    }
    
    await supabase.from('portfolio_assets').update({ [field]: value } as any).eq('id', assetId);
    await onRefreshAssets();
  };

  // Compute all class data — grand totals exclude RF for dividends
  let grandDvMonth = 0;
  let grandDvYear = 0;
  let grandValue = 0;
  let grandValueNonRf = 0;

  const classDataMap: Record<string, { calcs: AssetCalc[]; classPct: number; classLabel: string }> = {};

  ASSET_CLASSES.forEach(cls => {
    const classAssets = assets.filter(a => a.asset_class === cls.key);
    const classPct = localPcts[cls.pctField];
    const calcs = classAssets.map(a => computeAsset(a, classPct, classAssets.length, investAmount, recommendedAssets, cls.key));
    const classDvMonth = calcs.reduce((s, c) => s + c.dvMonth, 0);
    const classDvYear = calcs.reduce((s, c) => s + c.dvYear, 0);
    const classValue = calcs.reduce((s, c) => s + c.assetValue, 0);
    const isRf = cls.key === 'renda_fixa';
    if (!isRf) {
      grandDvMonth += classDvMonth;
      grandDvYear += classDvYear;
      grandValueNonRf += classValue;
    }
    grandValue += classValue;
    classDataMap[cls.key] = { calcs, classPct, classLabel: cls.label };
  });

  

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

  // PDF data builder
  const buildPdfData = () => ({
    profile: portfolio.profile,
    strategy: portfolio.strategy,
    investAmount: investAmount,
    grandValue,
    grandDvMonth,
    grandDvYear,
    classes: ASSET_CLASSES.map(cls => {
      const d = classDataMap[cls.key];
      return {
        label: d.classLabel,
        key: cls.key,
        pct: d.classPct,
        value: d.calcs.reduce((s, c) => s + c.assetValue, 0),
        dvMonth: d.calcs.reduce((s, c) => s + c.dvMonth, 0),
        dvYear: d.calcs.reduce((s, c) => s + c.dvYear, 0),
        assets: d.calcs.map(c => ({
          ticker: c.asset.ticker,
          name: c.asset.name,
          assetClass: cls.key,
          classLabel: d.classLabel,
          allocClassPct: c.allocClassPct,
          totalPct: c.totalPct,
          value: c.assetValue,
          cotas: c.cotas,
          dyInput: c.dyInput,
          dvMonth: c.dvMonth,
          dvYear: c.dvYear,
          ceilingPrice: c.source ? Number(c.source.ceiling_price) : null,
          currentPrice: c.source?.current_price != null ? Number(c.source.current_price) : null,
          isRf: c.isRf,
          isFii: c.isFii,
          rfType: c.asset.rf_type || undefined,
          indexador: c.asset.indexador || undefined,
          vencimento: c.asset.vencimento || undefined,
        })),
      };
    }),
  });

  const handleExportPdf = () => {
    const pdfData = buildPdfData();
    if (pdfData.classes.every(c => c.assets.length === 0)) {
      toast.info('Nenhum ativo para exportar');
      return;
    }
    setPdfPreviewData(pdfData);
    setPdfPreviewOpen(true);
  };

  const handleExportClassPdf = (classKey: string) => {
    const pdfData = buildPdfData();
    const cls = pdfData.classes.find(c => c.key === classKey);
    if (!cls || cls.assets.length === 0) {
      toast.info('Nenhum ativo nesta classe');
      return;
    }
    // Build a filtered version with just this class
    const classData: PortfolioPdfData = {
      ...pdfData,
      classes: [cls],
      grandValue: cls.value,
      grandDvMonth: cls.dvMonth,
      grandDvYear: cls.dvYear,
    };
    setPdfPreviewData(classData);
    setPdfPreviewOpen(true);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{portfolio.strategy}</CardTitle>
            {!isConservador && isOwnPortfolio && (
              <Badge variant="outline" className="text-[10px] h-5 border-muted-foreground/30 text-muted-foreground">
                Ativos do Conservador
              </Badge>
            )}
            {readOnly && <SharedBadge />}
          </div>
          <div className="flex items-center gap-2">
            {isMaster && isOwnPortfolio && onToggleShareStrategy && (
              <Button
                variant={portfolio.shared ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={onToggleShareStrategy}
              >
                <Share2 className="w-3 h-3 mr-1" />
                {portfolio.shared ? 'Compartilhado' : `Compartilhar ${portfolio.strategy}`}
              </Button>
            )}
            {!readOnly && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopyAll}>
                <Copy className="w-3 h-3 mr-1" /> Copiar portfólio
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportPdf}>
              <FileText className="w-3 h-3 mr-1" /> Gerar Relatório
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
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input type="text" className="h-6 w-28 text-xs"
                      key={`secval-${cls.key}-${investAmount}-${data.classPct}`}
                      defaultValue={formatBRL(investAmount * (data.classPct / 100))}
                      onBlur={e => {
                        const raw = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0;
                        if (investAmount > 0) {
                          const newPct = parseFloat(((raw / investAmount) * 100).toFixed(2));
                          setLocalPcts(prev => ({ ...prev, [cls.pctField]: newPct }));
                          onUpdatePortfolio(portfolio.id, { [cls.pctField]: newPct } as any);
                        }
                      }}
                    />
                  </div>
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
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleExportClassPdf(cls.key)}>
                    <FileText className="w-3 h-3 mr-1" /> PDF
                  </Button>
                  {isConservador && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddAsset(cls.key)}>
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                  )}
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
                          <TableCell className="font-mono text-sm font-semibold">
                            <span className="flex items-center gap-1.5">
                              {c.asset.ticker || c.asset.name}
                              {!c.isRf && (
                                c.source ? (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600 bg-amber-50">⭐ Recomendado</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted-foreground/30 text-muted-foreground">🔧 Manual</Badge>
                                )
                              )}
                            </span>
                          </TableCell>
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
                            {isConservador ? (
                              <Input type="number" step="0.01" className="h-7 w-20 text-sm text-right inline-block"
                                defaultValue={c.dyInput.toFixed(2)}
                                key={`dy-${c.asset.id}`}
                                onBlur={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  if (Math.abs(val - c.dyInput) > 0.001) handleUpdateAssetField(c.asset.id, 'dy_pct', val);
                                }}
                              />
                            ) : (
                              <span className="text-sm">{c.dyInput.toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-emerald-600">R$ {formatBRL(c.dvMonth)}</TableCell>
                          <TableCell className="text-right text-sm text-emerald-600">R$ {formatBRL(c.dvYear)}</TableCell>
                          <TableCell>
                            {isConservador && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAsset(c.asset.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
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
                    </TableFooter>
                  </Table>
                </div>
              )}

              {/* Class totals panel — skip for Renda Fixa */}
              {classValue > 0 && !isRf && (
                  <div className="bg-emerald-50 rounded-lg p-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-emerald-700/70 text-xs">Valor Investido</p>
                      <p className="font-semibold text-emerald-700">R$ {formatBRL(classValue)}</p>
                    </div>
                    <div>
                      <p className="text-emerald-700/70 text-xs">Dividendo Mês</p>
                      <p className="font-semibold text-emerald-700">R$ {formatBRL(classDvMonth)}</p>
                    </div>
                    <div>
                      <p className="text-emerald-700/70 text-xs">Dividendo Ano</p>
                      <p className="font-semibold text-emerald-700">R$ {formatBRL(classDvYear)}</p>
                    </div>
                    <div>
                      <p className="text-emerald-700/70 text-xs">DY Mês %</p>
                      <p className="font-semibold text-emerald-700">{(classValue > 0 ? (classDvMonth / classValue) * 100 : 0).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-emerald-700/70 text-xs">DY Ano %</p>
                      <p className="font-semibold text-emerald-700">
                        {(() => {
                          const dyMonthPct = classValue > 0 ? classDvMonth / classValue : 0;
                          return ((Math.pow(1 + dyMonthPct, 12) - 1) * 100).toFixed(2);
                        })()}%
                      </p>
                    </div>
                  </div>
              )}
            </div>
          );
        })}

        {/* Portfolio totals */}
        {grandValue > 0 && (() => {
          const grandDyMonthPct = grandValueNonRf > 0 ? grandDvMonth / grandValueNonRf : 0;
          const grandDyYearPct = (Math.pow(1 + grandDyMonthPct, 12) - 1) * 100;
          return (
            <div className="bg-emerald-50 rounded-lg p-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm border-2 border-emerald-200">
              <div>
                <p className="text-emerald-700/70 text-xs">Valor Investido Total</p>
                <p className="font-semibold text-emerald-700">R$ {formatBRL(grandValue)}</p>
              </div>
              <div>
                <p className="text-emerald-700/70 text-xs">Dividendo Mês</p>
                <p className="font-semibold text-emerald-700">R$ {formatBRL(grandDvMonth)}</p>
              </div>
              <div>
                <p className="text-emerald-700/70 text-xs">Dividendo Ano</p>
                <p className="font-semibold text-emerald-700">R$ {formatBRL(grandDvYear)}</p>
              </div>
              <div>
                <p className="text-emerald-700/70 text-xs">DY Mês %</p>
                <p className="font-semibold text-emerald-700">{(grandDyMonthPct * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-emerald-700/70 text-xs">DY Ano %</p>
                <p className="font-semibold text-emerald-700">{grandDyYearPct.toFixed(2)}%</p>
              </div>
            </div>
          );
        })()}

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

      {pdfPreviewData && (
        <PortfolioPdfPreviewModal
          open={pdfPreviewOpen}
          onOpenChange={(v) => { setPdfPreviewOpen(v); if (!v) setPdfPreviewData(null); }}
          data={pdfPreviewData}
        />
      )}
    </Card>
  );
}
