import { useState, useEffect, useRef } from 'react';
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
import { Plus, Calculator, AlertTriangle, CheckCircle2, Trash2, Copy, Share2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import type { PortfolioPdfData } from '@/lib/portfolio-pdf-generator';
import { InvestorPortfolio, PortfolioAssetItem } from './PortfoliosSection';
import { PortfolioAsset } from '../CarteirasRecomendadas';
import { PortfolioAssetModal } from './PortfolioAssetModal';
import { PortfolioPdfPreviewModal } from './PortfolioPdfPreviewModal';
import { FAROL_COLORS } from '@/lib/farol-colors';

interface Props {
  portfolio: InvestorPortfolio;
  assets: PortfolioAssetItem[];
  recommendedAssets: PortfolioAsset[];
  portfolioNameMap: Record<string, string>;
  portfolioSlugMap?: Record<string, string>;
  onUpdatePortfolio: (id: string, updates: Partial<InvestorPortfolio>) => Promise<void>;
  onRefreshAssets: () => Promise<void>;
  onRefreshRecommended?: () => Promise<void>;
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
  isManualAlloc: boolean; // true when user manually overrode allocation_pct
}

// Local-state numeric input — avoids reset-while-typing bug; persists onBlur.
// Critical: while the input is focused, NEVER sync from the `value` prop, otherwise
// re-renders triggered by sibling inputs reset the user's typing.
function LocalNumberInput({
  value,
  onSave,
  className,
  step = '0.01',
  min,
  max,
}: {
  value: number;
  onSave: (v: number) => void;
  className?: string;
  step?: string;
  min?: number;
  max?: number;
}) {
  const [local, setLocal] = useState<string>(value.toFixed(2));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return; // don't fight the user
    setLocal(value.toFixed(2));
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onFocus={e => {
        focusedRef.current = true;
        e.target.select();
      }}
      onBlur={e => {
        focusedRef.current = false;
        const raw = e.target.value.replace(',', '.');
        const v = parseFloat(raw);
        const safe = Number.isFinite(v) ? v : 0;
        if (min != null && safe < min) return setLocal(value.toFixed(2));
        if (max != null && safe > max) return setLocal(value.toFixed(2));
        if (Math.abs(safe - value) > 0.001) onSave(safe);
        else setLocal(value.toFixed(2));
      }}
      className={className}
    />
  );
}

function computeAsset(
  asset: PortfolioAssetItem,
  classPct: number,
  classCount: number,
  investAmount: number,
  recommendedAssets: PortfolioAsset[],
  classKey: string,
): AssetCalc {
  // allocation_pct stores the weight within the class (e.g. 10% of the class).
  // Sentinel: < 0 (e.g. -1) means "auto-distribute"; >= 0 (including 0) means manual override.
  const storedClassPct = Number(asset.allocation_pct);
  const isManual = Number.isFinite(storedClassPct) && storedClassPct >= 0;
  const autoClassPct = classCount > 0 ? 100 / classCount : 0;
  const allocClassPct = isManual ? storedClassPct : autoClassPct;
  
  // Total portfolio % = class% × classWeight/100
  const totalPct = classPct * (allocClassPct / 100);
  const assetValue = investAmount * (totalPct / 100);
  
  const source = asset.source_asset_id ? recommendedAssets.find(a => a.id === asset.source_asset_id) || null : null;
  const currentPrice = source?.current_price ? Number(source.current_price) : null;
  const isRf = classKey === 'renda_fixa';
  const isFii = classKey === 'fiis';
  // Quantidade de cotas/ações:
  // - Ações brasileiras e Internacionais (não FII, não RF): número INTEIRO (Math.floor)
  //   e o valor investido real é recalculado como Qtd × Preço Atual.
  // - FIIs: aceitam frações (mantém Math.floor mas valor real = qtd × preço também).
  // - RF: sem cotas.
  let cotas: number | null = null;
  let realValue = assetValue;
  if (!isRf && currentPrice && currentPrice > 0) {
    cotas = Math.floor(assetValue / currentPrice);
    realValue = cotas * currentPrice;
  }

  const dyInput = Number(asset.dy_pct) || 0;
  let dvMonth: number;
  let dvYear: number;

  if (isFii) {
    dvMonth = dyInput * (cotas || 0);
    dvYear = dvMonth * 12;
  } else if (isRf) {
    dvYear = realValue * (dyInput / 100);
    dvMonth = dvYear / 12;
  } else {
    dvYear = dyInput * (cotas || 0);
    dvMonth = dvYear / 12;
  }

  return { asset, allocClassPct, totalPct, assetValue: realValue, cotas, dyInput, dvMonth, dvYear, source, isFii, isRf, isManualAlloc: isManual };
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PortfolioStrategyView({ portfolio, assets, recommendedAssets, portfolioNameMap, portfolioSlugMap = {}, onUpdatePortfolio, onRefreshAssets, onRefreshRecommended, isConservador = true, conservadorPortfolioId, isMaster = false, isOwnPortfolio = true, readOnly = false, onToggleShareStrategy }: Props) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClass, setModalClass] = useState('acoes_brasileiras');
  const [investAmount, setInvestAmount] = useState(portfolio.invest_amount || 0);
  const [investAmountDraft, setInvestAmountDraft] = useState<string | undefined>(undefined);
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
  // String drafts for in-progress typing — prevents "010" leading zero and value jitter
  const [pctDrafts, setPctDrafts] = useState<Partial<Record<PctField, string>>>({});

  // Active FAROL tab, persisted in localStorage. Default: 'A' (Ações Brasil).
  const farolTabStorageKey = `portfolio-farol-tab:${portfolio.id}`;
  const [activeFarolTab, setActiveFarolTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'A';
    try {
      const raw = window.localStorage.getItem(farolTabStorageKey);
      if (raw) return raw;
    } catch {}
    return 'A';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(farolTabStorageKey, activeFarolTab);
    } catch {}
  }, [activeFarolTab, farolTabStorageKey]);

  const totalPct = localPcts.acoes_pct + localPcts.fiis_pct + localPcts.internacional_pct + localPcts.renda_fixa_pct;
  const isValid = Math.abs(totalPct - 100) < 0.01;
  const rfTotal = localPcts.rf_pos_pct + localPcts.rf_pre_pct + localPcts.rf_ipca_pct;
  // RF subtype %s are now % of TOTAL portfolio (not % of RF). Sum must equal renda_fixa_pct.
  const rfValid = localPcts.renda_fixa_pct === 0 || Math.abs(rfTotal - localPcts.renda_fixa_pct) < 0.01;
  const rfOver = rfTotal > localPcts.renda_fixa_pct + 0.01;

  // Display value for a % field: draft string if user is typing, else formatted number (no leading zero)
  const pctDisplay = (field: PctField): string => {
    if (pctDrafts[field] !== undefined) return pctDrafts[field]!;
    const n = localPcts[field];
    return Number.isFinite(n) ? String(n) : '';
  };
  const handlePctChange = (field: PctField, raw: string) => {
    // Strip leading zeros (but allow "0.x" and empty)
    let cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
    if (/^0\d/.test(cleaned)) cleaned = cleaned.replace(/^0+/, '');
    setPctDrafts(prev => ({ ...prev, [field]: cleaned }));
    const parsed = parseFloat(cleaned);
    setLocalPcts(prev => ({ ...prev, [field]: Number.isFinite(parsed) ? parsed : 0 }));
  };
  const handlePctBlur = (field: PctField) => {
    setPctDrafts(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    onUpdatePortfolio(portfolio.id, { [field]: localPcts[field] } as any);
  };
  const handleInvestAmountChange = (raw: string) => {
    let cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
    if (/^0\d/.test(cleaned)) cleaned = cleaned.replace(/^0+/, '');
    setInvestAmountDraft(cleaned);
    const parsed = parseFloat(cleaned);
    setInvestAmount(Number.isFinite(parsed) ? parsed : 0);
  };
  const handleInvestAmountBlur = () => {
    setInvestAmountDraft(undefined);
    onUpdatePortfolio(portfolio.id, { invest_amount: investAmount });
  };
  const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();


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

  // Edit Preço Teto inline — syncs to recommended_portfolio_assets (by ticker)
  // so changes propagate everywhere the asset appears.
  const handleUpdateCeilingPrice = async (calc: AssetCalc, value: number) => {
    if (readOnly) return;
    const ticker = (calc.asset.ticker || '').trim().toUpperCase();
    let synced = false;

    if (calc.source?.id) {
      // Update the recommended source so all derived portfolios reflect the new ceiling.
      const { error } = await supabase
        .from('recommended_portfolio_assets')
        .update({ ceiling_price: value } as any)
        .eq('id', calc.source.id);
      if (!error) synced = true;
    } else if (ticker) {
      // No source linked — try to find any recommended asset with the same ticker (own or shared).
      const { data: matches } = await supabase
        .from('recommended_portfolio_assets')
        .select('id')
        .eq('ticker', ticker);
      if (matches && matches.length > 0) {
        await supabase
          .from('recommended_portfolio_assets')
          .update({ ceiling_price: value } as any)
          .in('id', matches.map((m: any) => m.id));
        synced = true;
      }
    }

    // Always persist locally on the portfolio asset row too (covers virtual/no-source cases).
    if (!calc.asset.id.startsWith('virtual-')) {
      await supabase.from('portfolio_assets').update({ ceiling_price: value } as any).eq('id', calc.asset.id);
    }

    await onRefreshAssets();
    if (synced && onRefreshRecommended) await onRefreshRecommended();
    toast.success('Preço Teto atualizado');
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

    // Step 1: distribute Aloc. Classe % respecting manual overrides.
    // - Manual (allocation_pct >= 0, including 0): keep stored value.
    // - Auto (allocation_pct < 0, sentinel -1): split the REMAINING % equally among auto assets.
    const isManualA = (a: PortfolioAssetItem) => {
      const v = Number(a.allocation_pct);
      return Number.isFinite(v) && v >= 0;
    };
    const manualSum = classAssets.reduce((s, a) => s + (isManualA(a) ? Number(a.allocation_pct) : 0), 0);
    const autoCount = classAssets.filter(a => !isManualA(a)).length;
    const remaining = Math.max(0, 100 - manualSum);
    const autoShare = autoCount > 0 ? remaining / autoCount : 0;

    // Build effective allocations per asset, then run computeAsset with synthetic classCount
    // so the internal auto fallback matches our distribution.
    const calcs = classAssets.map(a => {
      const isManual = isManualA(a);
      const effectivePct = isManual ? Number(a.allocation_pct) : autoShare;
      // Inject synthetic asset with allocation_pct set so computeAsset uses it as stored.
      const synthetic = { ...a, allocation_pct: effectivePct } as PortfolioAssetItem;
      const c = computeAsset(synthetic, classPct, classAssets.length, investAmount, recommendedAssets, cls.key);
      // Preserve the original manual flag (computeAsset will mark synthetic as manual since pct>=0)
      c.isManualAlloc = isManual;
      return c;
    });

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

  

  // Copy helpers
  // Ações brasileiras: "TICKER[F]: X ações (R$ Y)" + total no topo. Sufixo "F" se qtd < 100.
  // FIIs e Internacional: "TICKER: X cotas (R$ Y)"
  // RF: "NOME: R$ Y"
  const buildClassLines = (classKey: string): string => {
    const data = classDataMap[classKey];
    if (!data || data.calcs.length === 0) return '';
    const isAcoesBR = classKey === 'acoes_brasileiras';
    const lines = data.calcs.map(c => {
      const baseTicker = c.asset.ticker || c.asset.name;
      const valuePart = `R$ ${formatBRL(c.assetValue)}`;
      if (c.isRf) {
        return `${baseTicker}: ${valuePart}`;
      }
      const qtd = c.cotas ?? 0;
      if (isAcoesBR) {
        const ticker = qtd < 100 ? `${baseTicker}F` : baseTicker;
        return `${ticker}: ${qtd} ações (${valuePart})`;
      }
      return `${baseTicker}: ${qtd} cotas (${valuePart})`;
    }).join('\n');
    if (isAcoesBR) {
      const total = data.calcs.reduce((s, c) => s + c.assetValue, 0);
      return `Total em ações: ~R$ ${formatBRL(total)}\n\n${lines}`;
    }
    return lines;
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
          ceilingPrice: c.source ? Number(c.source.ceiling_price) : ((c.asset as any).ceiling_price != null ? Number((c.asset as any).ceiling_price) : null),
          currentPrice: c.source?.current_price != null ? Number(c.source.current_price) : ((c.asset as any).current_price != null ? Number((c.asset as any).current_price) : null),
          isRf: c.isRf,
          isFii: c.isFii,
          rfType: c.asset.rf_type || undefined,
          indexador: c.asset.indexador || undefined,
          vencimento: c.asset.vencimento || undefined,
          sector: c.source?.sector ?? null,
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
        {/* Valor a investir — destaque no topo */}
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Calculator className="w-5 h-5 text-primary" />
          <Label className="text-base font-semibold whitespace-nowrap">Valor a Investir:</Label>
          <div className="flex items-center gap-1 flex-1 max-w-xs">
            <span className="text-base font-semibold text-muted-foreground">R$</span>
            <Input type="text" inputMode="decimal" className="h-10 text-lg font-bold"
              value={investAmountDraft !== undefined ? investAmountDraft : (investAmount ? String(investAmount) : '')}
              placeholder="0"
              onFocus={selectAllOnFocus}
              onChange={e => handleInvestAmountChange(e.target.value)}
              onBlur={handleInvestAmountBlur}
            />
          </div>
        </div>

        {/* Class allocations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {ASSET_CLASSES.map(cls => {
            const classPctVal = localPcts[cls.pctField];
            const classValueCalc = investAmount * (classPctVal / 100);
            return (
              <div key={cls.key} className="space-y-1">
                <Label className="text-xs flex items-center flex-wrap gap-1">
                  <span>{cls.label} ({(classPctVal || 0).toFixed(1)}%) —</span>
                  <span className="inline-flex items-center gap-1 font-normal">
                    <span className="text-muted-foreground">R$</span>
                    <input
                      type="text"
                      key={`clsval-${cls.key}-${investAmount}-${classPctVal}`}
                      defaultValue={formatBRL(classValueCalc)}
                      onFocus={selectAllOnFocus}
                      onBlur={e => {
                        const raw = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0;
                        if (investAmount > 0) {
                          const newPct = (raw / investAmount) * 100;
                          setLocalPcts(prev => ({ ...prev, [cls.pctField]: parseFloat(newPct.toFixed(2)) }));
                          onUpdatePortfolio(portfolio.id, { [cls.pctField]: parseFloat(newPct.toFixed(2)) } as any);
                        }
                        e.target.value = formatBRL(investAmount > 0 ? raw : classValueCalc);
                      }}
                      className="w-24 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-0.5 text-xs text-foreground transition-colors"
                    />
                  </span>
                </Label>
                <div className="flex items-center gap-1">
                  <Input type="text" inputMode="decimal" className="h-8 text-sm w-20"
                    value={pctDisplay(cls.pctField)}
                    onFocus={selectAllOnFocus}
                    onChange={e => handlePctChange(cls.pctField, e.target.value)}
                    onBlur={() => handlePctBlur(cls.pctField)}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RF subtypes — % são sobre o TOTAL do portfólio (devem somar = renda_fixa_pct) */}
        {localPcts.renda_fixa_pct > 0 && (
          <div className="pl-4 border-l-2 border-muted space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              Distribuição Renda Fixa
              <span className="text-muted-foreground/70">
                (alvo: {localPcts.renda_fixa_pct.toFixed(1)}% do portfólio)
              </span>
              {rfValid ? (
                <span className="text-emerald-600 inline-flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> {rfTotal.toFixed(1)}%
                </span>
              ) : (
                <span className="text-destructive inline-flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  soma: {rfTotal.toFixed(1)}% {rfOver ? '(excede)' : '(faltam)'} {rfOver ? '' : `→ ${(localPcts.renda_fixa_pct - rfTotal).toFixed(1)}% restantes`}
                </span>
              )}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {RF_SUBTYPES.map(rf => {
                const subPct = localPcts[rf.pctField];
                const subValue = investAmount * (subPct / 100);
                return (
                  <div key={rf.key} className="space-y-1">
                    <Label className="text-xs">{rf.label}</Label>
                    <div className="flex items-center gap-1">
                      <Input type="text" inputMode="decimal" className="h-8 text-sm w-20"
                        value={pctDisplay(rf.pctField)}
                        onFocus={selectAllOnFocus}
                        onChange={e => handlePctChange(rf.pctField, e.target.value)}
                        onBlur={() => handlePctBlur(rf.pctField)}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        R$ {formatBRL(subValue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* FAROL Method — pill tabs */}
        {(() => {
          // Pill colors come from the shared FAROL palette so donut and tabs always match.
          const FAROL_TABS = [
            { code: 'F', label: 'F — Fundos Imobiliários', classKey: 'fiis', color: FAROL_COLORS.F },
            { code: 'A', label: 'A — Ações Brasil', classKey: 'acoes_brasileiras', color: FAROL_COLORS.A },
            { code: 'R', label: 'R — Renda Fixa', classKey: 'renda_fixa', color: FAROL_COLORS.R },
            { code: 'O', label: 'O — Oportunidades', classKey: null as string | null, color: FAROL_COLORS.O },
            { code: 'L', label: 'L — Lá Fora', classKey: 'internacional', color: FAROL_COLORS.L },
          ];

          const renderClassContent = (classKey: string) => {
            const cls = ASSET_CLASSES.find(c => c.key === classKey);
            if (!cls) return null;
            const data = classDataMap[cls.key];
            if (!data) return null;
            const isRf = cls.key === 'renda_fixa';
            const isFii = cls.key === 'fiis';
            const classDvMonth = data.calcs.reduce((s, c) => s + c.dvMonth, 0);
            const classDvYear = data.calcs.reduce((s, c) => s + c.dvYear, 0);
            const classValue = data.calcs.reduce((s, c) => s + c.assetValue, 0);
            const classAllocSum = data.calcs.reduce((s, c) => s + c.allocClassPct, 0);
            const classAllocValid = data.calcs.length === 0 || Math.abs(classAllocSum - 100) < 0.01;

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium inline-flex items-center gap-1">
                      <span>{cls.label} ({data.classPct}%) —</span>
                      <span className="text-muted-foreground">R$</span>
                      <input
                        type="text"
                        key={`tabval-${cls.key}-${investAmount}-${data.classPct}`}
                        defaultValue={formatBRL(classValue)}
                        onFocus={selectAllOnFocus}
                        onBlur={e => {
                          const raw = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0;
                          if (investAmount > 0) {
                            const newPct = (raw / investAmount) * 100;
                            setLocalPcts(prev => ({ ...prev, [cls.pctField]: parseFloat(newPct.toFixed(2)) }));
                            onUpdatePortfolio(portfolio.id, { [cls.pctField]: parseFloat(newPct.toFixed(2)) } as any);
                          }
                          e.target.value = formatBRL(investAmount > 0 ? raw : classValue);
                        }}
                        className="w-28 text-left bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-0.5 text-sm font-medium text-foreground transition-colors"
                      />
                    </span>
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

                {data.calcs.length > 0 ? (
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
                                  c.source && c.source.sector ? (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-300 text-blue-600 bg-blue-50">{c.source.sector}</Badge>
                                  ) : !c.source ? (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted-foreground/30 text-muted-foreground">Setor não informado</Badge>
                                  ) : null
                                )}
                              </span>
                            </TableCell>
                            {isRf && <TableCell className="text-xs">{c.asset.rf_type || '—'}</TableCell>}
                            {isRf && <TableCell className="text-xs">{c.asset.indexador || '—'}</TableCell>}
                            {isRf && <TableCell className="text-xs">{c.asset.vencimento || '—'}</TableCell>}
                            {!isRf && (
                              <TableCell className="text-right">
                                {(() => {
                                  const currentCeiling = c.source
                                    ? Number(c.source.ceiling_price) || 0
                                    : Number((c.asset as any).ceiling_price) || 0;
                                  return (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      disabled={readOnly}
                                      className="no-spinner h-7 w-24 text-sm text-right inline-block focus:ring-2 focus:ring-primary focus:border-primary"
                                      defaultValue={currentCeiling > 0 ? currentCeiling.toFixed(2) : ''}
                                      key={`ceil-${c.asset.id}-${currentCeiling}`}
                                      onFocus={e => e.target.select()}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                      }}
                                      onBlur={e => {
                                        const val = parseFloat(e.target.value) || 0;
                                        if (Math.abs(val - currentCeiling) > 0.001) {
                                          handleUpdateCeilingPrice(c, val);
                                        }
                                      }}
                                    />
                                  );
                                })()}
                              </TableCell>
                            )}
                            {!isRf && (
                              <TableCell className="text-right text-sm">
                                {c.source?.current_price != null
                                  ? `R$ ${Number(c.source.current_price).toFixed(2)}`
                                  : (c.asset as any).current_price != null
                                    ? `R$ ${Number((c.asset as any).current_price).toFixed(2)}`
                                    : '...'}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              {readOnly ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c.isManualAlloc ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-foreground'}`}>
                                  {c.allocClassPct.toFixed(2)}%
                                </span>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <LocalNumberInput
                                    value={c.allocClassPct}
                                    min={0}
                                    max={100}
                                    className={`no-spinner h-7 w-20 text-sm text-right inline-block ${c.isManualAlloc ? 'border-primary/50' : ''}`}
                                    onSave={(v) => handleUpdateAssetField(c.asset.id, 'allocation_pct', v)}
                                  />
                                  {c.isManualAlloc && (
                                    <button
                                      type="button"
                                      title="Restaurar cálculo automático"
                                      className="text-[10px] text-muted-foreground hover:text-primary px-1"
                                      onClick={() => handleUpdateAssetField(c.asset.id, 'allocation_pct', 0)}
                                    >
                                      ↺
                                    </button>
                                  )}
                                </div>
                              )}
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
                                <Input type="number" step="0.01" className="no-spinner h-7 w-20 text-sm text-right inline-block"
                                  defaultValue={c.dyInput.toFixed(2)}
                                  key={`dy-${c.asset.id}`}
                                  {...((cls.key === 'fiis' || cls.key === 'acoes_brasileiras') && {
                                    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
                                  })}
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
                    </Table>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                    Nenhum ativo nesta classe.
                  </div>
                )}

                {/* Unified class totals row — BTG navy style */}
                {classValue > 0 && (() => {
                  const dyMonthPct = classValue > 0 ? (classDvMonth / classValue) * 100 : 0;
                  const dyYearPct = (Math.pow(1 + dyMonthPct / 100, 12) - 1) * 100;
                  const items: Array<{ label?: string; value: string; emphasis?: boolean; strong?: boolean }> = [
                    { value: `Total ${cls.label}`, strong: true },
                    { value: `${classAllocSum.toFixed(2)}%` },
                    { label: '% carteira', value: `${data.classPct.toFixed(2)}%` },
                    { label: 'Valor Investido', value: `R$ ${formatBRL(classValue)}` },
                    ...(!isRf ? [
                      { label: 'Div. Mês', value: `R$ ${formatBRL(classDvMonth)}`, emphasis: true },
                      { label: 'Div. Ano', value: `R$ ${formatBRL(classDvYear)}`, emphasis: true },
                      { label: 'DY Mês', value: `${dyMonthPct.toFixed(2)}%` },
                      { label: 'DY Ano', value: `${dyYearPct.toFixed(2)}%`, emphasis: true },
                    ] : []),
                  ];
                  return (
                    <div
                      className="rounded-lg flex items-center gap-1 overflow-x-auto"
                      style={{ backgroundColor: '#0B2859', padding: '12px 20px' }}
                    >
                      {items.map((it, i) => (
                        <div key={i} className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex flex-col leading-tight">
                            {it.label && (
                              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{it.label}</span>
                            )}
                            <span
                              className={`font-bold ${it.emphasis ? 'text-base' : it.strong ? 'text-sm' : 'text-sm'}`}
                              style={{ color: '#ffffff' }}
                            >
                              {it.value}
                            </span>
                          </div>
                          {i < items.length - 1 && (
                            <span className="mx-2 select-none" style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          };

          const activeTab = FAROL_TABS.find(t => t.code === activeFarolTab) || FAROL_TABS[1];

          return (
            <div className="space-y-3">
              {/* FAROL pill tabs */}
              <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                {FAROL_TABS.map(tab => {
                  const isActive = tab.code === activeFarolTab;
                  const tabClassValue = tab.classKey
                    ? (classDataMap[tab.classKey]?.calcs.reduce((s, c) => s + c.assetValue, 0) ?? 0)
                    : 0;
                  return (
                    <button
                      key={tab.code}
                      type="button"
                      onClick={() => setActiveFarolTab(tab.code)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: tab.color }}
                      >
                        {tab.code}
                      </span>
                      <span className="hidden sm:inline">{tab.label.split(' — ')[1]}</span>
                      {tab.classKey && (
                        <span className={`hidden md:inline text-[11px] ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          — R$ {formatBRL(tabClassValue)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active tab content */}
              {activeTab.classKey ? (
                renderClassContent(activeTab.classKey)
              ) : (
                <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Oportunidades</p>
                  <p>Categoria reservada para alocações táticas e oportunidades pontuais. Em breve.</p>
                </div>
              )}
            </div>
          );
        })()}



      </CardContent>

      <PortfolioAssetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        portfolioId={portfolio.id}
        assetClass={modalClass}
        recommendedAssets={recommendedAssets}
        portfolioNameMap={portfolioNameMap}
        portfolioSlugMap={portfolioSlugMap}
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
