import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowDown, ArrowUp, Minus, AlertTriangle, FileText, Lightbulb, Info } from 'lucide-react';
import type { InvestorPortfolio, PortfolioAssetItem } from './PortfoliosSection';
import type { PortfolioAsset } from '../CarteirasRecomendadas';
import type { ClientPosition } from './ClientPortfolioTab';
import jsPDF from 'jspdf';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientName: string;
  positions: ClientPosition[];
  portfolios: InvestorPortfolio[];
  portfolioAssets: PortfolioAssetItem[];
  recommendedAssets: PortfolioAsset[];
}

interface ActionItem {
  ticker: string;
  action: 'VENDER' | 'COMPRAR' | 'MANTER';
  currentQty: number;
  targetQty: number;
  deltaQty: number;
  currentPrice: number;
  avgPrice: number;
  value: number;
  isFii: boolean;
  irEstimate: number;
  netValue: number;
  hasLoss: boolean;
}

interface MissingClassSuggestion {
  className: string;
  classPct: number;
  suggestedValue: number;
  assets: Array<{ ticker: string; qty: number; price: number; value: number; isFii: boolean }>;
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CLASS_PCT_FIELDS: Record<string, string> = {
  'acoes_brasileiras': 'acoes_pct',
  'fiis': 'fiis_pct',
  'internacional': 'internacional_pct',
};

const CLASS_DISPLAY_NAMES: Record<string, string> = {
  'acoes_brasileiras': 'Ações',
  'fiis': 'Fundos Imobiliários',
  'internacional': 'Internacional',
};

const ASSET_CLASS_TO_POSITION: Record<string, string> = {
  'acoes_brasileiras': 'acoes',
  'fiis': 'fiis',
  'internacional': 'acoes',
};

export function ReadequacaoModal({ open, onOpenChange, clientName, positions, portfolios, portfolioAssets, recommendedAssets }: Props) {
  const [strategy, setStrategy] = useState<string>('Renda');
  const [profile, setProfile] = useState<string>('Moderado');
  const [consultantNote, setConsultantNote] = useState('');

  const targetPortfolio = useMemo(() => {
    return portfolios.find(p => p.profile === profile && p.strategy === strategy);
  }, [portfolios, profile, strategy]);

  const targetAssets = useMemo(() => {
    if (!targetPortfolio) return [];
    return portfolioAssets.filter(a => a.portfolio_id === targetPortfolio.id);
  }, [targetPortfolio, portfolioAssets]);

  const clientTotalValue = useMemo(() => {
    return positions.reduce((s, p) => s + p.totalValue, 0);
  }, [positions]);

  // Compute readequação plan
  const actionPlan = useMemo(() => {
    if (!targetPortfolio) return [];
    const investAmount = targetPortfolio.invest_amount || 0;
    if (investAmount <= 0) return [];

    const actions: ActionItem[] = [];

    const currentMap = new Map<string, ClientPosition>();
    positions.forEach(p => {
      if (p.assetClass === 'acoes' || p.assetClass === 'fiis') {
        const ticker = p.ativo.toUpperCase().trim();
        const existing = currentMap.get(ticker);
        if (existing) {
          existing.totalValue += p.totalValue;
          existing.qty += p.qty;
        } else {
          currentMap.set(ticker, { ...p });
        }
      }
    });

    const targetMap = new Map<string, { ticker: string; qty: number; value: number; isFii: boolean; currentPrice: number }>();
    
    targetAssets.forEach(ta => {
      const ticker = (ta.ticker || '').toUpperCase().trim();
      if (!ticker) return;
      
      const isFii = ta.asset_class === 'fiis';
      const classPctField = CLASS_PCT_FIELDS[ta.asset_class];
      if (!classPctField) return;

      const classPct = Number((targetPortfolio as any)[classPctField]) || 0;
      const allocClassPct = Number(ta.allocation_pct) || 0;
      const totalPct = classPct * (allocClassPct / 100);
      const assetValue = investAmount * (totalPct / 100);

      const source = ta.source_asset_id ? recommendedAssets.find(a => a.id === ta.source_asset_id) : null;
      const currentPrice = source?.current_price ? Number(source.current_price) : 0;
      const qty = currentPrice > 0 ? Math.floor(assetValue / currentPrice) : 0;

      targetMap.set(ticker, { ticker, qty, value: assetValue, isFii, currentPrice });
    });

    targetMap.forEach(({ ticker, qty: targetQty, isFii, currentPrice }) => {
      const current = currentMap.get(ticker);
      const currentQty = current?.qty || 0;
      const avgPrice = current?.avgPrice || 0;
      const delta = targetQty - currentQty;

      let action: ActionItem['action'] = 'MANTER';
      if (delta > 0) action = 'COMPRAR';
      else if (delta < 0) action = 'VENDER';

      const absDelta = Math.abs(delta);
      const value = absDelta * currentPrice;
      
      let irEstimate = 0;
      let hasLoss = false;
      let netValue = value;
      if (action === 'VENDER' && isFii && avgPrice > 0) {
        if (currentPrice > avgPrice) {
          const profit = (currentPrice - avgPrice) * absDelta;
          irEstimate = profit * 0.2;
          netValue = value - irEstimate;
        } else {
          hasLoss = true;
        }
      }

      actions.push({
        ticker, action, currentQty, targetQty, deltaQty: absDelta,
        currentPrice, avgPrice, value, isFii, irEstimate, netValue, hasLoss,
      });

      currentMap.delete(ticker);
    });

    currentMap.forEach((pos) => {
      const ticker = pos.ativo.toUpperCase().trim();
      const isFii = pos.assetClass === 'fiis';
      const currentPrice = pos.currentPrice || pos.totalValue / (pos.qty || 1);
      const value = pos.totalValue;

      let irEstimate = 0;
      let hasLoss = false;
      let netValue = value;
      if (isFii && pos.avgPrice > 0) {
        if (currentPrice > pos.avgPrice) {
          const profit = (currentPrice - pos.avgPrice) * pos.qty;
          irEstimate = profit * 0.2;
          netValue = value - irEstimate;
        } else {
          hasLoss = true;
        }
      }

      actions.push({
        ticker, action: 'VENDER', currentQty: pos.qty, targetQty: 0,
        deltaQty: pos.qty, currentPrice, avgPrice: pos.avgPrice, value,
        isFii, irEstimate, netValue, hasLoss,
      });
    });

    const order = { 'VENDER': 0, 'COMPRAR': 1, 'MANTER': 2 };
    actions.sort((a, b) => order[a.action] - order[b.action]);

    return actions;
  }, [targetPortfolio, targetAssets, positions, recommendedAssets]);

  // Detect missing classes
  const missingClasses = useMemo((): MissingClassSuggestion[] => {
    if (!targetPortfolio || clientTotalValue <= 0) return [];

    const suggestions: MissingClassSuggestion[] = [];
    const classKeys = Object.keys(CLASS_PCT_FIELDS);

    classKeys.forEach(classKey => {
      const pctField = CLASS_PCT_FIELDS[classKey];
      const classPct = Number((targetPortfolio as any)[pctField]) || 0;
      if (classPct <= 0) return;

      const positionClass = ASSET_CLASS_TO_POSITION[classKey];
      const clientHasClass = positions.some(p => {
        if (classKey === 'internacional') return false; // can't detect international from positions easily
        return p.assetClass === positionClass;
      });

      if (clientHasClass) return;

      const classAssets = targetAssets.filter(a => a.asset_class === classKey);
      if (classAssets.length === 0) return;

      const suggestedValue = clientTotalValue * (classPct / 100);
      const assets: MissingClassSuggestion['assets'] = [];

      classAssets.forEach(ta => {
        const ticker = (ta.ticker || '').toUpperCase().trim();
        if (!ticker) return;
        const allocPct = Number(ta.allocation_pct) || 0;
        const assetValue = suggestedValue * (allocPct / 100);
        const source = ta.source_asset_id ? recommendedAssets.find(a => a.id === ta.source_asset_id) : null;
        const price = source?.current_price ? Number(source.current_price) : 0;
        const qty = price > 0 ? Math.floor(assetValue / price) : 0;
        const isFii = classKey === 'fiis';

        assets.push({ ticker, qty, price, value: assetValue, isFii });
      });

      suggestions.push({
        className: CLASS_DISPLAY_NAMES[classKey] || classKey,
        classPct,
        suggestedValue,
        assets,
      });
    });

    return suggestions;
  }, [targetPortfolio, targetAssets, positions, recommendedAssets, clientTotalValue]);

  const totalVender = actionPlan.filter(a => a.action === 'VENDER').reduce((s, a) => s + a.value, 0);
  const totalComprar = actionPlan.filter(a => a.action === 'COMPRAR').reduce((s, a) => s + a.value, 0);
  const totalIR = actionPlan.reduce((s, a) => s + a.irEstimate, 0);
  const totalMissingSuggested = missingClasses.reduce((s, m) => s + m.suggestedValue, 0);

  const portfolioLabel = targetPortfolio
    ? `${strategy} ${profile}`
    : '';

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Plano de Readequação', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${clientName}`, 14, y); y += 6;
    doc.text(`Perfil: ${profile} | Estratégia: ${strategy}`, 14, y); y += 6;
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, y); y += 6;
    doc.text(`Patrimônio Total: R$ ${formatBRL(clientTotalValue)}`, 14, y); y += 10;

    // RF detail by subclass
    const rfPositions = positions.filter(p => p.assetClass === 'renda_fixa');
    if (rfPositions.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Renda Fixa — Detalhamento', 14, y); y += 7;

      const rfBySubclass: Record<string, ClientPosition[]> = { ipca: [], pos: [], pre: [] };
      rfPositions.forEach(p => {
        const sc = p.rfSubclass || 'pos';
        if (!rfBySubclass[sc]) rfBySubclass[sc] = [];
        rfBySubclass[sc].push(p);
      });
      Object.values(rfBySubclass).forEach(arr => arr.sort((a, b) => (b.taxa || 0) - (a.taxa || 0)));

      const scLabels: Record<string, string> = { ipca: 'Indexado à Inflação', pos: 'Pós-Fixado', pre: 'Pré-Fixado' };
      ['ipca', 'pos', 'pre'].forEach(sc => {
        const scItems = rfBySubclass[sc];
        if (!scItems || scItems.length === 0) return;
        const scTotal = scItems.reduce((s, p) => s + p.totalValue, 0);

        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${scLabels[sc]} — R$ ${formatBRL(scTotal)} (${clientTotalValue > 0 ? ((scTotal / clientTotalValue) * 100).toFixed(2) : '0'}%)`, 14, y);
        y += 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        scItems.forEach(p => {
          if (y > 272) { doc.addPage(); y = 20; }
          const taxaStr = p.taxa ? `${p.taxa.toFixed(2)}%` : '—';
          const pctPatr = clientTotalValue > 0 ? ((p.totalValue / clientTotalValue) * 100).toFixed(2) : '0';
          doc.text(`${p.ativo} | ${p.tipo || '—'} | ${p.indexador || '—'} | ${taxaStr} | Venc: ${p.vencimento || '—'} | R$ ${formatBRL(p.totalValue)} | ${pctPatr}% | ${p.broker}`, 18, y);
          y += 4.5;
        });
        y += 4;
      });
      y += 4;
    }

    // Actions table
    const sections = [
      { label: 'VENDER', items: actionPlan.filter(a => a.action === 'VENDER'), color: [220, 38, 38] },
      { label: 'COMPRAR', items: actionPlan.filter(a => a.action === 'COMPRAR'), color: [22, 163, 74] },
      { label: 'MANTER', items: actionPlan.filter(a => a.action === 'MANTER'), color: [100, 116, 139] },
    ];

    sections.forEach(section => {
      if (section.items.length === 0) return;
      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(section.color[0], section.color[1], section.color[2]);
      doc.text(section.label, 14, y); y += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      section.items.forEach(item => {
        if (y > 270) { doc.addPage(); y = 20; }
        const actionText = item.action === 'VENDER'
          ? `${item.ticker} — Vender ${item.deltaQty} ${item.isFii ? 'cotas' : 'ações'} @ R$ ${formatBRL(item.currentPrice)} = R$ ${formatBRL(item.value)}`
          : item.action === 'COMPRAR'
            ? `${item.ticker} — Comprar ${item.deltaQty} ${item.isFii ? 'cotas' : 'ações'} @ R$ ${formatBRL(item.currentPrice)} = R$ ${formatBRL(item.value)}`
            : `${item.ticker} — Posição adequada (atual: ${item.currentQty} | meta: ${item.targetQty})`;

        doc.text(actionText, 18, y); y += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(`Posição atual: ${item.currentQty} | Meta carteira: ${item.targetQty}`, 18, y); y += 4;

        if (item.isFii && item.action === 'VENDER') {
          if (item.hasLoss) {
            doc.text('Operação com prejuízo — IR não incide', 18, y);
          } else if (item.irEstimate > 0) {
            doc.text(`⚠ IR estimado (20%): R$ ${formatBRL(item.irEstimate)} | Valor líquido: R$ ${formatBRL(item.netValue)}`, 18, y);
          }
          y += 4;
        }
        doc.setTextColor(0, 0, 0);
        y += 3;
      });
      y += 5;
    });

    // Missing classes
    if (missingClasses.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('CLASSES AUSENTES NA CARTEIRA DO CLIENTE', 14, y); y += 7;
      doc.setTextColor(0, 0, 0);

      missingClasses.forEach(mc => {
        if (y > 255) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${mc.className} — não possui posição`, 14, y); y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`A carteira ${portfolioLabel} recomenda ${mc.classPct.toFixed(0)}% em ${mc.className}`, 18, y); y += 5;
        doc.text(`Valor sugerido: R$ ${formatBRL(mc.suggestedValue)} (${mc.classPct.toFixed(0)}% do patrimônio)`, 18, y); y += 5;

        mc.assets.forEach(a => {
          if (y > 272) { doc.addPage(); y = 20; }
          doc.text(`→ ${a.ticker} — comprar ${a.qty} ${a.isFii ? 'cotas' : 'ações'} @ R$ ${formatBRL(a.price)} = R$ ${formatBRL(a.value)}`, 22, y);
          y += 4.5;
        });
        y += 4;
      });
      y += 3;
    }

    // Summary
    if (y > 240) { doc.addPage(); y = 20; }
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Resumo Financeiro', 14, y); y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total a Vender: R$ ${formatBRL(totalVender)}`, 18, y); y += 5;
    doc.text(`Total a Comprar: R$ ${formatBRL(totalComprar)}`, 18, y); y += 5;
    if (totalMissingSuggested > 0) {
      doc.text(`Total sugerido (classes ausentes): R$ ${formatBRL(totalMissingSuggested)}`, 18, y); y += 5;
    }
    if (totalIR > 0) {
      doc.text(`IR estimado total (FIIs): R$ ${formatBRL(totalIR)}`, 18, y); y += 5;
    }

    if (consultantNote.trim()) {
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Nota do Consultor:', 14, y); y += 6;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(consultantNote, pageWidth - 28);
      doc.text(lines, 18, y);
      y += lines.length * 4.5;
    }

    y += 10;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('IR calculado para fins estimativos. Verifique as condições de isenção com seu contador.', 14, y); y += 4;
    doc.text('Este documento não constitui recomendação de investimento. Consulte seu assessor antes de tomar decisões.', 14, y);

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `readequacao-${clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Sugestão de Readequação — {clientName}
          </DialogTitle>
          <DialogDescription>
            Compare a posição atual do cliente com a carteira recomendada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <div className="space-y-1">
            <Label className="text-xs">Objetivo</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Renda">Renda</SelectItem>
                <SelectItem value="Crescimento">Crescimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Perfil</Label>
            <Select value={profile} onValueChange={setProfile}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Conservador">Conservador</SelectItem>
                <SelectItem value="Moderado">Moderado</SelectItem>
                <SelectItem value="Arrojado">Arrojado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] pr-3">
          {actionPlan.length === 0 && missingClasses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {!targetPortfolio
                ? 'Nenhum portfólio encontrado para este perfil/estratégia.'
                : targetPortfolio.invest_amount <= 0
                  ? 'Defina o valor a investir no portfólio selecionado.'
                  : 'Nenhuma posição comparável encontrada.'}
            </p>
          )}

          {/* VENDER */}
          {actionPlan.filter(a => a.action === 'VENDER').length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-destructive flex items-center gap-1 mb-2">
                <ArrowDown className="w-4 h-4" /> VENDER
              </h4>
              <div className="space-y-2">
                {actionPlan.filter(a => a.action === 'VENDER').map(item => (
                  <div key={item.ticker} className="border border-destructive/20 rounded-lg p-3 bg-destructive/5 space-y-1">
                    <p className="text-sm font-medium">
                      {item.ticker} — Vender {item.deltaQty} {item.isFii ? 'cotas' : 'ações'} @ R$ {formatBRL(item.currentPrice)} = R$ {formatBRL(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Posição atual: {item.currentQty} | Meta carteira: {item.targetQty}
                    </p>
                    {item.isFii && (
                      item.hasLoss ? (
                        <p className="text-xs text-muted-foreground">Operação com prejuízo — IR não incide</p>
                      ) : item.irEstimate > 0 ? (
                        <div className="text-xs space-y-0.5">
                          <p className="text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            IR estimado (20%): R$ {formatBRL(item.irEstimate)}
                          </p>
                          <p className="text-muted-foreground">Valor líquido recebido: R$ {formatBRL(item.netValue)}</p>
                        </div>
                      ) : null
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMPRAR */}
          {actionPlan.filter(a => a.action === 'COMPRAR').length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-emerald-600 flex items-center gap-1 mb-2">
                <ArrowUp className="w-4 h-4" /> COMPRAR
              </h4>
              <div className="space-y-2">
                {actionPlan.filter(a => a.action === 'COMPRAR').map(item => (
                  <div key={item.ticker} className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 space-y-1">
                    <p className="text-sm font-medium">
                      {item.ticker} — Comprar {item.deltaQty} {item.isFii ? 'cotas' : 'ações'} @ R$ {formatBRL(item.currentPrice)} = R$ {formatBRL(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Posição atual: {item.currentQty} | Meta carteira: {item.targetQty}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MANTER */}
          {actionPlan.filter(a => a.action === 'MANTER').length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                <Minus className="w-4 h-4" /> MANTER
              </h4>
              <div className="space-y-2">
                {actionPlan.filter(a => a.action === 'MANTER').map(item => (
                  <div key={item.ticker} className="border border-border rounded-lg p-3 bg-muted/30 space-y-1">
                    <p className="text-sm font-medium">
                      {item.ticker} — Posição adequada (atual: {item.currentQty} | meta: {item.targetQty})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing classes suggestions */}
          {missingClasses.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-2">
                <Info className="w-4 h-4" /> CLASSES AUSENTES NA CARTEIRA DO CLIENTE
              </h4>
              <div className="space-y-3">
                {missingClasses.map(mc => (
                  <div key={mc.className} className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-2">
                    <p className="text-sm font-semibold text-blue-700">
                      💡 {mc.className} — não possui posição
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A carteira {portfolioLabel} recomenda {mc.classPct.toFixed(0)}% em {mc.className}
                    </p>
                    <p className="text-xs font-medium">
                      Valor sugerido: R$ {formatBRL(mc.suggestedValue)} ({mc.classPct.toFixed(0)}% do patrimônio)
                    </p>
                    {mc.assets.length > 0 && (
                      <div className="space-y-1 pl-2 border-l-2 border-blue-200">
                        <p className="text-xs text-muted-foreground font-medium">Ativos sugeridos para compra:</p>
                        {mc.assets.map(a => (
                          <p key={a.ticker} className="text-xs">
                            → {a.ticker} — comprar {a.qty} {a.isFii ? 'cotas' : 'ações'} @ R$ {formatBRL(a.price)} = R$ {formatBRL(a.value)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Summary */}
        {(actionPlan.length > 0 || missingClasses.length > 0) && (
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-destructive/10 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Total a Vender</p>
                <p className="font-semibold text-destructive">R$ {formatBRL(totalVender)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Total a Comprar</p>
                <p className="font-semibold text-emerald-600">R$ {formatBRL(totalComprar + totalMissingSuggested)}</p>
              </div>
              {totalIR > 0 && (
                <div className="bg-amber-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">IR Estimado (FIIs)</p>
                  <p className="font-semibold text-amber-600">R$ {formatBRL(totalIR)}</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nota do Consultor (opcional)</Label>
              <Textarea
                value={consultantNote}
                onChange={e => setConsultantNote(e.target.value)}
                placeholder="Adicione observações para o plano de readequação..."
                className="h-20 text-sm"
              />
            </div>

            <p className="text-[10px] text-muted-foreground">
              IR calculado para fins estimativos. Verifique as condições de isenção com seu contador.
            </p>

            <Button onClick={handleExportPdf} className="w-full">
              <FileText className="w-4 h-4 mr-1.5" />
              Exportar Plano em PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
