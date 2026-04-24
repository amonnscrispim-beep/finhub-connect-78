import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PercentInput } from '@/components/ui/percent-input';
import { Label } from '@/components/ui/label';
import { SharedBadge } from '@/components/ui/shared-badge';
import {
  ChevronDown,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Copy,
  Share2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioPdfData } from '@/lib/portfolio-pdf-generator';
import { InvestorPortfolio, PortfolioAssetItem } from './PortfoliosSection';
import { PortfolioAsset } from '../CarteirasRecomendadas';
import { PortfolioAssetModal } from './PortfolioAssetModal';
import { PortfolioPdfPreviewModal } from './PortfolioPdfPreviewModal';
import { FarolDonut, FarolSlice } from './FarolDonut';

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
  /** controlled collapse — defaults to closed */
  defaultOpen?: boolean;
}

// FAROL labels — only label/sigla/color change. Internal keys keep DB compatibility.
const ASSET_CLASSES = [
  { key: 'fiis', sigla: 'F', label: 'Fundos Imobiliários', pctField: 'fiis_pct' as const, colorVar: '--farol-f' },
  { key: 'acoes_brasileiras', sigla: 'A', label: 'Ações Brasil', pctField: 'acoes_pct' as const, colorVar: '--farol-a' },
  { key: 'renda_fixa', sigla: 'R', label: 'Renda Fixa', pctField: 'renda_fixa_pct' as const, colorVar: '--farol-r' },
  { key: 'oportunidades', sigla: 'O', label: 'Oportunidades', pctField: null as any, colorVar: '--farol-o' },
  { key: 'internacional', sigla: 'L', label: 'Lá fora', pctField: 'internacional_pct' as const, colorVar: '--farol-l' },
];

const RF_SUBTYPES = [
  { key: 'pos_fixado', label: 'Pós-fixado', pctField: 'rf_pos_pct' as const },
  { key: 'pre_fixado', label: 'Prefixado', pctField: 'rf_pre_pct' as const },
  { key: 'ipca', label: 'Indexado à Inflação', pctField: 'rf_ipca_pct' as const },
];

type PctField = 'acoes_pct' | 'fiis_pct' | 'internacional_pct' | 'renda_fixa_pct' | 'rf_pos_pct' | 'rf_pre_pct' | 'rf_ipca_pct';

interface AssetCalc {
  asset: PortfolioAssetItem;
  allocClassPct: number;
  totalPct: number;
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
  const storedClassPct = Number(asset.allocation_pct);
  const autoClassPct = classCount > 0 ? 100 / classCount : 0;
  const allocClassPct = storedClassPct > 0 ? storedClassPct : autoClassPct;
  const totalPct = classPct * (allocClassPct / 100);
  const assetValue = investAmount * (totalPct / 100);
  const source = asset.source_asset_id ? recommendedAssets.find(a => a.id === asset.source_asset_id) || null : null;
  const currentPrice = source?.current_price ? Number(source.current_price) : null;
  const isRf = classKey === 'renda_fixa';
  const isFii = classKey === 'fiis';
  const cotas = !isRf && currentPrice && currentPrice > 0 ? Math.floor(assetValue / currentPrice) : null;
  const dyInput = Number(asset.dy_pct) || 0;
  let dvMonth: number, dvYear: number;
  if (isFii) { dvMonth = dyInput * (cotas || 0); dvYear = dvMonth * 12; }
  else if (isRf) { dvYear = assetValue * (dyInput / 100); dvMonth = dvYear / 12; }
  else { dvYear = dyInput * (cotas || 0); dvMonth = dvYear / 12; }
  return { asset, allocClassPct, totalPct, assetValue, cotas, dyInput, dvMonth, dvYear, source, isFii, isRf };
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const formatNumberBR = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FarolStrategyCard({
  portfolio, assets, recommendedAssets, portfolioNameMap,
  onUpdatePortfolio, onRefreshAssets,
  isConservador = true, conservadorPortfolioId,
  isMaster = false, isOwnPortfolio = true, readOnly = false,
  onToggleShareStrategy, defaultOpen = false,
}: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(defaultOpen);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClass, setModalClass] = useState('acoes_brasileiras');
  const [investAmount, setInvestAmount] = useState(portfolio.invest_amount || 0);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState<PortfolioPdfData | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'default' | 'az' | 'za' | 'pct'>('default');

  const [localPcts, setLocalPcts] = useState<Record<PctField, number>>({
    acoes_pct: Number(portfolio.acoes_pct),
    fiis_pct: Number(portfolio.fiis_pct),
    internacional_pct: Number(portfolio.internacional_pct),
    renda_fixa_pct: Number(portfolio.renda_fixa_pct),
    rf_pos_pct: Number(portfolio.rf_pos_pct),
    rf_pre_pct: Number(portfolio.rf_pre_pct),
    rf_ipca_pct: Number(portfolio.rf_ipca_pct),
  });

  const totalPct =
    localPcts.acoes_pct + localPcts.fiis_pct + localPcts.internacional_pct + localPcts.renda_fixa_pct;
  const isValid = Math.abs(totalPct - 100) < 0.01;
  const rfTotal = localPcts.rf_pos_pct + localPcts.rf_pre_pct + localPcts.rf_ipca_pct;
  const rfValid = localPcts.renda_fixa_pct === 0
    ? Math.abs(rfTotal) < 0.01
    : Math.abs(rfTotal - localPcts.renda_fixa_pct) < 0.01;

  const handlePctLive = (field: PctField, value: number) =>
    setLocalPcts(prev => ({ ...prev, [field]: value }));
  const handlePctCommit = (field: PctField, value: number) => {
    setLocalPcts(prev => ({ ...prev, [field]: value }));
    onUpdatePortfolio(portfolio.id, { [field]: value } as any);
  };

  const openAddAsset = (assetClass: string) => { setModalClass(assetClass); setModalOpen(true); };

  const handleDeleteAsset = async (id: string) => {
    if (!isConservador) return;
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
    if (!isConservador && field !== 'allocation_pct') return;
    if (assetId.startsWith('virtual-') && field === 'allocation_pct') {
      const originalId = assetId.replace('virtual-', '');
      const sourceAsset = assets.find(a => a.id === assetId);
      if (sourceAsset && user) {
        await supabase.from('portfolio_assets').insert({
          portfolio_id: portfolio.id, user_id: user.id,
          asset_class: sourceAsset.asset_class, ticker: sourceAsset.ticker, name: sourceAsset.name,
          source_asset_id: sourceAsset.source_asset_id, rf_type: sourceAsset.rf_type,
          indexador: sourceAsset.indexador, vencimento: sourceAsset.vencimento,
          display_order: sourceAsset.display_order, allocation_pct: value, dy_pct: 0,
        } as any);
        await onRefreshAssets();
        return;
      }
    }
    await supabase.from('portfolio_assets').update({ [field]: value } as any).eq('id', assetId);
    await onRefreshAssets();
  };

  let grandDvMonth = 0, grandDvYear = 0, grandValue = 0, grandValueNonRf = 0;
  const classDataMap: Record<string, { calcs: AssetCalc[]; classPct: number; classLabel: string; sigla: string; colorVar: string }> = {};

  ASSET_CLASSES.forEach(cls => {
    const classAssets = assets.filter(a => a.asset_class === cls.key);
    const classPct = cls.pctField ? localPcts[cls.pctField] : 0;
    const calcs = classAssets.map(a => computeAsset(a, classPct, classAssets.length, investAmount, recommendedAssets, cls.key));
    const classDvMonth = calcs.reduce((s, c) => s + c.dvMonth, 0);
    const classDvYear = calcs.reduce((s, c) => s + c.dvYear, 0);
    const classValue = calcs.reduce((s, c) => s + c.assetValue, 0);
    const isRf = cls.key === 'renda_fixa';
    if (!isRf) { grandDvMonth += classDvMonth; grandDvYear += classDvYear; grandValueNonRf += classValue; }
    grandValue += classValue;
    classDataMap[cls.key] = { calcs, classPct, classLabel: cls.label, sigla: cls.sigla, colorVar: cls.colorVar };
  });

  const grandDyMonthPct = grandValueNonRf > 0 ? grandDvMonth / grandValueNonRf : 0;
  const grandDyYearPct = (Math.pow(1 + grandDyMonthPct, 12) - 1) * 100;

  const farolSlices: FarolSlice[] = useMemo(() => {
    return ASSET_CLASSES.map(cls => {
      const d = classDataMap[cls.key];
      return {
        key: cls.sigla,
        label: `${cls.sigla} - ${cls.label}`,
        pct: d?.classPct ?? 0,
        value: d?.calcs.reduce((s, c) => s + c.assetValue, 0) ?? 0,
        color: `hsl(var(${cls.colorVar}))`,
      };
    });
  }, [classDataMap]);

  const buildClassLines = (classKey: string): string => {
    const data = classDataMap[classKey];
    if (!data || data.calcs.length === 0) return '';
    return data.calcs.map(c => {
      const name = c.asset.ticker || c.asset.name;
      const valuePart = formatBRL(c.assetValue);
      return c.isRf ? `${name}: ${valuePart}` : `${name}: ${c.cotas ?? 0} cotas (${valuePart})`;
    }).join('\n');
  };

  const handleCopyAll = () => {
    const sections = ASSET_CLASSES.map(cls => {
      const lines = buildClassLines(cls.key);
      return lines ? `${cls.sigla} - ${cls.label}\n${lines}` : '';
    }).filter(Boolean);
    if (sections.length === 0) { toast.info('Nenhum ativo no portfólio'); return; }
    navigator.clipboard.writeText(sections.join('\n\n'));
    toast.success('Portfólio copiado!');
  };

  const handleCopyClass = (classKey: string) => {
    const text = buildClassLines(classKey);
    if (!text) { toast.info('Nenhum ativo nesta classe'); return; }
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const buildPdfData = (): PortfolioPdfData => ({
    profile: portfolio.profile, strategy: portfolio.strategy, investAmount,
    grandValue, grandDvMonth, grandDvYear,
    classes: ASSET_CLASSES.map(cls => {
      const d = classDataMap[cls.key];
      return {
        label: d.classLabel, key: cls.key, pct: d.classPct,
        value: d.calcs.reduce((s, c) => s + c.assetValue, 0),
        dvMonth: d.calcs.reduce((s, c) => s + c.dvMonth, 0),
        dvYear: d.calcs.reduce((s, c) => s + c.dvYear, 0),
        assets: d.calcs.map(c => ({
          ticker: c.asset.ticker, name: c.asset.name, assetClass: cls.key, classLabel: d.classLabel,
          allocClassPct: c.allocClassPct, totalPct: c.totalPct, value: c.assetValue, cotas: c.cotas,
          dyInput: c.dyInput, dvMonth: c.dvMonth, dvYear: c.dvYear,
          ceilingPrice: c.source ? Number(c.source.ceiling_price) : null,
          currentPrice: c.source?.current_price != null ? Number(c.source.current_price) : null,
          isRf: c.isRf, isFii: c.isFii,
          rfType: c.asset.rf_type || undefined, indexador: c.asset.indexador || undefined,
          vencimento: c.asset.vencimento || undefined,
        })),
      };
    }),
  });

  const handleExportPdf = () => {
    const pdfData = buildPdfData();
    if (pdfData.classes.every(c => c.assets.length === 0)) { toast.info('Nenhum ativo'); return; }
    setPdfPreviewData(pdfData);
    setPdfPreviewOpen(true);
  };

  const handleExportClassPdf = (classKey: string) => {
    const pdfData = buildPdfData();
    const cls = pdfData.classes.find(c => c.key === classKey);
    if (!cls || cls.assets.length === 0) { toast.info('Nenhum ativo nesta classe'); return; }
    setPdfPreviewData({ ...pdfData, classes: [cls], grandValue: cls.value, grandDvMonth: cls.dvMonth, grandDvYear: cls.dvYear });
    setPdfPreviewOpen(true);
  };

  const visibleClasses = activeFilter === 'all'
    ? ASSET_CLASSES
    : ASSET_CLASSES.filter(c => c.key === activeFilter);

  const sortCalcs = (calcs: AssetCalc[]): AssetCalc[] => {
    const arr = [...calcs];
    if (sortMode === 'az') arr.sort((a, b) => (a.asset.ticker || a.asset.name).localeCompare(b.asset.ticker || b.asset.name));
    else if (sortMode === 'za') arr.sort((a, b) => (b.asset.ticker || b.asset.name).localeCompare(a.asset.ticker || a.asset.name));
    else if (sortMode === 'pct') arr.sort((a, b) => b.totalPct - a.totalPct);
    return arr;
  };

  const headerSummary = (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span>Total: <span className="text-foreground font-semibold">{formatBRL(grandValue)}</span></span>
      <span className="hidden md:inline">Div. Mês: <span className="text-foreground font-semibold">{formatBRL(grandDvMonth)}</span></span>
      <span className="hidden md:inline">DY Ano: <span className="text-foreground font-semibold">{grandDyYearPct.toFixed(2)}%</span></span>
    </div>
  );

  return (
    <Card className="border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={cn('w-5 h-5 text-muted-foreground transition-transform duration-300', !open && '-rotate-90')}
          />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{portfolio.strategy}</h3>
              {!isConservador && isOwnPortfolio && (
                <Badge variant="outline" className="text-[10px] h-5 border-muted-foreground/30 text-muted-foreground">
                  Ativos do Conservador
                </Badge>
              )}
              {readOnly && <SharedBadge />}
            </div>
            <div className="mt-0.5">{headerSummary}</div>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isMaster && isOwnPortfolio && onToggleShareStrategy && (
            <Button variant={portfolio.shared ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={onToggleShareStrategy}>
              <Share2 className="w-3 h-3 mr-1" />
              {portfolio.shared ? 'Compartilhado' : 'Compartilhar'}
            </Button>
          )}
          {!readOnly && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCopyAll}>
              <Copy className="w-3 h-3 mr-1" /> Copiar
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportPdf}>
            <FileText className="w-3 h-3 mr-1" /> PDF
          </Button>
          <Badge variant={isValid ? 'default' : 'destructive'} className={cn('text-xs', isValid && 'bg-primary/15 text-primary border-primary/30')}>
            {isValid ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            {totalPct.toFixed(1)}%
          </Badge>
        </div>
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 space-y-6 border-t border-border">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-center pt-4">
              <FarolDonut slices={farolSlices} total={grandValue || investAmount} />
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">FAROL {portfolio.strategy}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatBRL(investAmount)}</p>
                  <p className="text-xs text-muted-foreground">Valor a investir</p>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Editar:</Label>
                  <CurrencyInput
                    className="h-9 w-44 text-sm font-semibold"
                    value={investAmount}
                    onChange={(v) => setInvestAmount(parseFloat(v) || 0)}
                    onBlur={() => onUpdatePortfolio(portfolio.id, { invest_amount: investAmount })}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-border">
                  {ASSET_CLASSES.map(cls => {
                    const d = classDataMap[cls.key];
                    return (
                      <div key={cls.key} className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: `hsl(var(${cls.colorVar}))` }} />
                          <span className="text-muted-foreground truncate">
                            <span className="font-bold text-foreground">{cls.sigla}</span> - {cls.label}
                          </span>
                        </div>
                        <span className="text-foreground font-semibold tabular-nums">{(d?.classPct ?? 0).toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {ASSET_CLASSES.map(cls => {
                const classPctVal = cls.pctField ? localPcts[cls.pctField] : 0;
                const classValueCalc = investAmount * (classPctVal / 100);
                const editable = !!cls.pctField && !readOnly;
                return (
                  <div key={cls.key} className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-background" style={{ backgroundColor: `hsl(var(${cls.colorVar}))` }}>
                        {cls.sigla}
                      </span>
                      <Label className="text-[11px] text-muted-foreground truncate">{cls.label}</Label>
                    </div>
                    {editable ? (
                      <PercentInput
                        className="h-8 text-sm"
                        value={classPctVal}
                        onChange={(v) => handlePctLive(cls.pctField!, v)}
                        onCommit={(v) => handlePctCommit(cls.pctField!, v)}
                      />
                    ) : (
                      <div className="h-8 flex items-center text-sm text-muted-foreground">—</div>
                    )}
                    <p className="text-xs text-foreground font-semibold tabular-nums">{formatBRL(classValueCalc)}</p>
                  </div>
                );
              })}
            </div>

            {localPcts.renda_fixa_pct > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Distribuição Renda Fixa (% do total da carteira)</p>
                  {rfValid ? (
                    <span className="text-xs text-primary font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {rfTotal.toFixed(1)}% / {localPcts.renda_fixa_pct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-destructive font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {rfTotal.toFixed(1)}% / {localPcts.renda_fixa_pct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RF_SUBTYPES.map(rf => {
                    const subPct = localPcts[rf.pctField];
                    const subValue = investAmount * (subPct / 100);
                    const fillPct = localPcts.renda_fixa_pct > 0 ? Math.min(100, (subPct / localPcts.renda_fixa_pct) * 100) : 0;
                    return (
                      <div key={rf.key} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                        <Label className="text-xs text-muted-foreground">{rf.label}</Label>
                        <PercentInput
                          className={cn('h-8 text-sm', !rfValid && 'border-destructive')}
                          value={subPct}
                          onChange={(v) => handlePctLive(rf.pctField, v)}
                          onCommit={(v) => handlePctCommit(rf.pctField, v)}
                        />
                        <p className="text-xs text-foreground font-semibold tabular-nums">{formatBRL(subValue)}</p>
                        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                          <div
                            className={cn('h-full transition-all', rfValid ? 'bg-primary' : 'bg-destructive')}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                    activeFilter === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/70',
                  )}
                >
                  Todos
                </button>
                {ASSET_CLASSES.map(cls => (
                  <button
                    key={cls.key}
                    onClick={() => setActiveFilter(cls.key)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5',
                      activeFilter === cls.key
                        ? 'text-background border-transparent'
                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/70',
                    )}
                    style={activeFilter === cls.key ? { backgroundColor: `hsl(var(${cls.colorVar}))` } : undefined}
                  >
                    <span className="font-bold">{cls.sigla}</span>
                    <span className="hidden sm:inline">{cls.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {(['default', 'az', 'za', 'pct'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setSortMode(m)}
                    className={cn(
                      'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                      sortMode === m ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {m === 'default' ? 'Padrão' : m === 'az' ? 'A-Z' : m === 'za' ? 'Z-A' : '% Carteira'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {visibleClasses.map(cls => {
                const data = classDataMap[cls.key];
                if (!data || (data.classPct === 0 && data.calcs.length === 0)) return null;
                const isRf = cls.key === 'renda_fixa';
                const isFii = cls.key === 'fiis';
                const sortedCalcs = sortCalcs(data.calcs);
                const classValue = data.calcs.reduce((s, c) => s + c.assetValue, 0);
                const classDvMonth = data.calcs.reduce((s, c) => s + c.dvMonth, 0);
                const classDvYear = data.calcs.reduce((s, c) => s + c.dvYear, 0);
                const classAllocSum = data.calcs.reduce((s, c) => s + c.allocClassPct, 0);
                const classAllocValid = data.calcs.length === 0 || Math.abs(classAllocSum - 100) < 0.01;

                return (
                  <div key={cls.key} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold text-background" style={{ backgroundColor: `hsl(var(${cls.colorVar}))` }}>
                          {cls.sigla}
                        </span>
                        <h4 className="text-sm font-semibold text-foreground">{cls.label}</h4>
                        <Badge variant="outline" className="text-[10px] h-5 border-border text-muted-foreground">
                          {data.classPct.toFixed(1)}% · {formatBRL(classValue)}
                        </Badge>
                        {!classAllocValid && data.calcs.length > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-5">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Classe: {classAllocSum.toFixed(1)}%
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
                        {isConservador && !readOnly && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => openAddAsset(cls.key)}>
                            <Plus className="w-3 h-3 mr-1" /> Adicionar
                          </Button>
                        )}
                      </div>
                    </div>

                    {sortedCalcs.length > 0 ? (
                      <div className="overflow-x-auto -mx-1 px-1">
                        <div className="min-w-[640px] border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
                          {sortedCalcs.map(c => (
                            <div key={c.asset.id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30 transition-colors">
                              <div className="min-w-[140px]">
                                <p className="text-base font-bold text-foreground tabular-nums">{c.totalPct.toFixed(2)}%</p>
                                <p className="text-xs text-muted-foreground tabular-nums">{formatBRL(c.assetValue)}</p>
                                {!isRf && c.cotas !== null && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{c.cotas} cotas</p>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-sm font-semibold text-foreground truncate">
                                  {c.asset.ticker || c.asset.name}
                                </p>
                                {c.source?.company_name && (
                                  <p className="text-[11px] text-muted-foreground truncate">{c.source.company_name}</p>
                                )}
                                {isRf && (
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {[c.asset.rf_type, c.asset.indexador, c.asset.vencimento].filter(Boolean).join(' · ') || '—'}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-right text-xs">
                                {!isRf && (
                                  <div className="hidden md:block">
                                    <p className="text-[10px] text-muted-foreground">Preço teto</p>
                                    <p className="text-sm font-medium text-foreground tabular-nums">
                                      {c.source ? `R$ ${formatNumberBR(Number(c.source.ceiling_price))}` : '—'}
                                    </p>
                                  </div>
                                )}
                                <div className="w-24">
                                  <p className="text-[10px] text-muted-foreground">Aloc. classe</p>
                                  {isConservador && !readOnly ? (
                                    <PercentInput
                                      className="h-7 text-xs text-right"
                                      value={c.allocClassPct}
                                      onChange={() => {}}
                                      onCommit={(v) => { if (Math.abs(v - c.allocClassPct) > 0.001) handleUpdateAssetField(c.asset.id, 'allocation_pct', v); }}
                                    />
                                  ) : (
                                    <p className="text-sm font-medium text-foreground tabular-nums">{c.allocClassPct.toFixed(2)}%</p>
                                  )}
                                </div>
                                <div className="w-28">
                                  <p className="text-[10px] text-muted-foreground">
                                    {isFii ? 'DY R$/cota mês' : isRf ? 'Taxa % a.a.' : 'DY R$/cota ano'}
                                  </p>
                                  {isConservador && !readOnly ? (
                                    isRf ? (
                                      <PercentInput
                                        className="h-7 text-xs text-right"
                                        value={c.dyInput}
                                        onChange={() => {}}
                                        onCommit={(v) => { if (Math.abs(v - c.dyInput) > 0.001) handleUpdateAssetField(c.asset.id, 'dy_pct', v); }}
                                      />
                                    ) : (
                                      <CurrencyInput
                                        className="h-7 text-xs text-right"
                                        value={c.dyInput}
                                        onChange={(v) => {
                                          const num = parseFloat(v) || 0;
                                          if (Math.abs(num - c.dyInput) > 0.001) handleUpdateAssetField(c.asset.id, 'dy_pct', num);
                                        }}
                                      />
                                    )
                                  ) : (
                                    <p className="text-sm font-medium text-foreground tabular-nums">
                                      {isRf ? `${c.dyInput.toFixed(2)}%` : `R$ ${formatNumberBR(c.dyInput)}`}
                                    </p>
                                  )}
                                </div>
                                <div className="hidden lg:block w-24">
                                  <p className="text-[10px] text-muted-foreground">Div. mês</p>
                                  <p className="text-sm font-medium text-primary tabular-nums">{formatBRL(c.dvMonth)}</p>
                                </div>
                                <div className="hidden lg:block w-24">
                                  <p className="text-[10px] text-muted-foreground">Div. ano</p>
                                  <p className="text-sm font-medium text-primary tabular-nums">{formatBRL(c.dvYear)}</p>
                                </div>
                                {isConservador && !readOnly && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDeleteAsset(c.asset.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                        Nenhum ativo nesta classe
                      </div>
                    )}

                    {classValue > 0 && !isRf && (
                      <div className="rounded-lg p-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs bg-primary/5 border border-primary/20">
                        <div><p className="text-muted-foreground">Investido</p><p className="font-semibold text-foreground">{formatBRL(classValue)}</p></div>
                        <div><p className="text-muted-foreground">Div. Mês</p><p className="font-semibold text-primary">{formatBRL(classDvMonth)}</p></div>
                        <div><p className="text-muted-foreground">Div. Ano</p><p className="font-semibold text-primary">{formatBRL(classDvYear)}</p></div>
                        <div><p className="text-muted-foreground">DY Mês</p><p className="font-semibold text-foreground">{(classValue > 0 ? (classDvMonth / classValue) * 100 : 0).toFixed(2)}%</p></div>
                        <div><p className="text-muted-foreground">DY Ano</p><p className="font-semibold text-foreground">{((Math.pow(1 + (classValue > 0 ? classDvMonth / classValue : 0), 12) - 1) * 100).toFixed(2)}%</p></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {grandValue > 0 && (
              <div className="rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm bg-primary/10 border border-primary/30">
                <div><p className="text-xs text-muted-foreground">Total Investido</p><p className="font-bold text-foreground tabular-nums">{formatBRL(grandValue)}</p></div>
                <div><p className="text-xs text-muted-foreground">Div. Mês</p><p className="font-bold text-primary tabular-nums">{formatBRL(grandDvMonth)}</p></div>
                <div><p className="text-xs text-muted-foreground">Div. Ano</p><p className="font-bold text-primary tabular-nums">{formatBRL(grandDvYear)}</p></div>
                <div><p className="text-xs text-muted-foreground">DY Mês</p><p className="font-bold text-foreground tabular-nums">{(grandDyMonthPct * 100).toFixed(2)}%</p></div>
                <div><p className="text-xs text-muted-foreground">DY Ano</p><p className="font-bold text-foreground tabular-nums">{grandDyYearPct.toFixed(2)}%</p></div>
              </div>
            )}

            {!isValid && <p className="text-xs text-destructive">A soma das alocações deve ser exatamente 100%</p>}
          </div>
        </div>
      </div>

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
