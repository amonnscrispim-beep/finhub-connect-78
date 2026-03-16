import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowDown, ArrowUp, Minus, AlertTriangle, FileText, Lightbulb, Info, Clock } from 'lucide-react';
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

type ActionType = 'VENDER' | 'COMPRAR' | 'MANTER' | 'AGUARDAR';

interface ActionItem {
  ticker: string;
  action: ActionType;
  reason: string;
  currentQty: number;
  targetQty: number;
  deltaQty: number;
  currentPrice: number;
  ceilingPrice: number | null;
  avgPrice: number;
  value: number;
  isFii: boolean;
  irEstimate: number;
  netValue: number;
  hasLoss: boolean;
  assetClass: string;
}

interface RfSummary {
  currentValue: number;
  targetValue: number;
  delta: number;
  action: 'APORTAR' | 'MANTER';
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

const POSITION_CLASS_MAP: Record<string, string> = {
  'acoes': 'acoes_brasileiras',
  'fiis': 'fiis',
};

const TOLERANCE = 0.05; // ±5%

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

  // STEP 1: Patrimônio total do cliente = soma de TODOS os ativos
  const clientTotalValue = useMemo(() => {
    return positions.reduce((s, p) => s + p.totalValue, 0);
  }, [positions]);

  // Full rebalancing computation
  const { actionPlan, rfSummary, missingClasses } = useMemo(() => {
    const actions: ActionItem[] = [];
    let rfSummary: RfSummary | null = null;
    const missingClassesList: Array<{
      className: string;
      classPct: number;
      suggestedValue: number;
      assets: Array<{ ticker: string; qty: number; price: number; value: number; isFii: boolean; ceilingPrice: number; aboveCeiling: boolean }>;
    }> = [];

    if (!targetPortfolio || clientTotalValue <= 0) {
      return { actionPlan: actions, rfSummary, missingClasses: missingClassesList };
    }

    // Build map of client positions by ticker (uppercase)
    const clientMap = new Map<string, { totalValue: number; qty: number; avgPrice: number; currentPrice: number; assetClass: string; isFii: boolean }>();
    positions.forEach(p => {
      if (p.assetClass === 'renda_fixa' || p.assetClass === 'fundos' || p.assetClass === 'outros') return;
      const ticker = p.ativo.toUpperCase().trim();
      const existing = clientMap.get(ticker);
      if (existing) {
        const totalQty = existing.qty + p.qty;
        const totalVal = existing.totalValue + p.totalValue;
        const existingCost = existing.avgPrice > 0 ? existing.avgPrice * existing.qty : 0;
        const incomingCost = p.avgPrice > 0 ? p.avgPrice * p.qty : 0;
        existing.qty = totalQty;
        existing.totalValue = totalVal;
        existing.avgPrice = totalQty > 0 && (existingCost + incomingCost) > 0 ? (existingCost + incomingCost) / totalQty : existing.avgPrice;
        existing.currentPrice = totalQty > 0 ? totalVal / totalQty : existing.currentPrice;
      } else {
        clientMap.set(ticker, {
          totalValue: p.totalValue,
          qty: p.qty,
          avgPrice: p.avgPrice,
          currentPrice: p.currentPrice,
          assetClass: p.assetClass,
          isFii: p.assetClass === 'fiis',
        });
      }
    });

    // Build model targets per class
    const classKeys = Object.keys(CLASS_PCT_FIELDS);
    const modelTickerSet = new Set<string>();

    classKeys.forEach(classKey => {
      const pctField = CLASS_PCT_FIELDS[classKey];
      const classPct = Number((targetPortfolio as any)[pctField]) || 0;
      if (classPct <= 0) return;

      // STEP 1: Target value for this class
      const classTargetValue = clientTotalValue * (classPct / 100);

      const classAssets = targetAssets.filter(a => a.asset_class === classKey);
      if (classAssets.length === 0) return;

      // STEP 1: Equal distribution among assets in the class
      const valuePerAsset = classTargetValue / classAssets.length;

      // Check if client has ANY position in this class
      const positionClassKey = classKey === 'acoes_brasileiras' ? 'acoes' : classKey === 'internacional' ? 'acoes' : classKey;
      const clientHasClass = positions.some(p => p.assetClass === positionClassKey) || 
        classAssets.some(ta => clientMap.has((ta.ticker || '').toUpperCase().trim()));

      if (!clientHasClass) {
        // Missing class entirely
        const suggestedAssets = classAssets.map(ta => {
          const ticker = (ta.ticker || '').toUpperCase().trim();
          modelTickerSet.add(ticker);
          const source = ta.source_asset_id ? recommendedAssets.find(a => a.id === ta.source_asset_id) : null;
          const currentPrice = source?.current_price ? Number(source.current_price) : 0;
          const ceilingPrice = source?.ceiling_price ? Number(source.ceiling_price) : 0;
          const qty = currentPrice > 0 ? Math.floor(valuePerAsset / currentPrice) : 0;
          const aboveCeiling = ceilingPrice > 0 && currentPrice > ceilingPrice;
          return { ticker, qty, price: currentPrice, value: valuePerAsset, isFii: classKey === 'fiis', ceilingPrice, aboveCeiling };
        });

        missingClassesList.push({
          className: CLASS_DISPLAY_NAMES[classKey] || classKey,
          classPct,
          suggestedValue: classTargetValue,
          assets: suggestedAssets,
        });
        return;
      }

      // STEP 2 & 3: Cross-reference model assets vs client
      classAssets.forEach(ta => {
        const ticker = (ta.ticker || '').toUpperCase().trim();
        if (!ticker) return;
        modelTickerSet.add(ticker);

        const source = ta.source_asset_id ? recommendedAssets.find(a => a.id === ta.source_asset_id) : null;
        const ceilingPrice = source?.ceiling_price ? Number(source.ceiling_price) : 0;
        const modelCurrentPrice = source?.current_price ? Number(source.current_price) : 0;
        const isFii = classKey === 'fiis';

        const clientPos = clientMap.get(ticker);

        if (!clientPos) {
          // Client doesn't have this model asset → BUY or AGUARDAR
          if (ceilingPrice > 0 && modelCurrentPrice > ceilingPrice) {
            actions.push({
              ticker,
              action: 'AGUARDAR',
              reason: `Preço atual R$ ${formatBRL(modelCurrentPrice)} acima do teto R$ ${formatBRL(ceilingPrice)}`,
              currentQty: 0,
              targetQty: modelCurrentPrice > 0 ? Math.floor(valuePerAsset / modelCurrentPrice) : 0,
              deltaQty: 0,
              currentPrice: modelCurrentPrice,
              ceilingPrice,
              avgPrice: 0,
              value: valuePerAsset,
              isFii,
              irEstimate: 0,
              netValue: 0,
              hasLoss: false,
              assetClass: classKey,
            });
          } else if (modelCurrentPrice > 0) {
            const qty = Math.floor(valuePerAsset / modelCurrentPrice);
            actions.push({
              ticker,
              action: 'COMPRAR',
              reason: 'Ativo da carteira modelo não presente na carteira do cliente',
              currentQty: 0,
              targetQty: qty,
              deltaQty: qty,
              currentPrice: modelCurrentPrice,
              ceilingPrice,
              avgPrice: 0,
              value: qty * modelCurrentPrice,
              isFii,
              irEstimate: 0,
              netValue: qty * modelCurrentPrice,
              hasLoss: false,
              assetClass: classKey,
            });
          }
          return;
        }

        // Client HAS this asset → compare
        const clientValue = clientPos.totalValue;
        const diff = valuePerAsset - clientValue;
        const price = modelCurrentPrice > 0 ? modelCurrentPrice : clientPos.currentPrice;

        if (diff > valuePerAsset * TOLERANCE && price > 0) {
          // Need to BUY more
          if (ceilingPrice > 0 && price > ceilingPrice) {
            actions.push({
              ticker,
              action: 'AGUARDAR',
              reason: `Preço R$ ${formatBRL(price)} acima do teto R$ ${formatBRL(ceilingPrice)} — aguardar para comprar mais`,
              currentQty: clientPos.qty,
              targetQty: price > 0 ? Math.floor(valuePerAsset / price) : clientPos.qty,
              deltaQty: 0,
              currentPrice: price,
              ceilingPrice,
              avgPrice: clientPos.avgPrice,
              value: diff,
              isFii,
              irEstimate: 0,
              netValue: 0,
              hasLoss: false,
              assetClass: classKey,
            });
          } else {
            const deltaQty = Math.floor(diff / price);
            if (deltaQty > 0) {
              actions.push({
                ticker,
                action: 'COMPRAR',
                reason: 'Posição abaixo do alvo da carteira modelo',
                currentQty: clientPos.qty,
                targetQty: clientPos.qty + deltaQty,
                deltaQty,
                currentPrice: price,
                ceilingPrice,
                avgPrice: clientPos.avgPrice,
                value: deltaQty * price,
                isFii,
                irEstimate: 0,
                netValue: deltaQty * price,
                hasLoss: false,
                assetClass: classKey,
              });
            } else {
              actions.push({
                ticker,
                action: 'MANTER',
                reason: 'Posição adequada (dentro da tolerância)',
                currentQty: clientPos.qty,
                targetQty: clientPos.qty,
                deltaQty: 0,
                currentPrice: price,
                ceilingPrice,
                avgPrice: clientPos.avgPrice,
                value: 0,
                isFii,
                irEstimate: 0,
                netValue: 0,
                hasLoss: false,
                assetClass: classKey,
              });
            }
          }
        } else if (diff < -(valuePerAsset * TOLERANCE) && price > 0) {
          // Need to SELL some
          const deltaQty = Math.floor(Math.abs(diff) / price);
          if (deltaQty > 0) {
            const value = deltaQty * price;
            let irEstimate = 0;
            let hasLoss = false;
            let netValue = value;
            if (isFii && clientPos.avgPrice > 0) {
              if (price > clientPos.avgPrice) {
                const profit = (price - clientPos.avgPrice) * deltaQty;
                irEstimate = profit * 0.2;
                netValue = value - irEstimate;
              } else {
                hasLoss = true;
              }
            }
            actions.push({
              ticker,
              action: 'VENDER',
              reason: 'Excesso de posição em relação ao alvo',
              currentQty: clientPos.qty,
              targetQty: clientPos.qty - deltaQty,
              deltaQty,
              currentPrice: price,
              ceilingPrice,
              avgPrice: clientPos.avgPrice,
              value,
              isFii,
              irEstimate,
              netValue,
              hasLoss,
              assetClass: classKey,
            });
          } else {
            actions.push({
              ticker,
              action: 'MANTER',
              reason: 'Posição adequada (dentro da tolerância)',
              currentQty: clientPos.qty,
              targetQty: clientPos.qty,
              deltaQty: 0,
              currentPrice: price,
              ceilingPrice,
              avgPrice: clientPos.avgPrice,
              value: 0,
              isFii,
              irEstimate: 0,
              netValue: 0,
              hasLoss: false,
              assetClass: classKey,
            });
          }
        } else {
          // Within tolerance → MANTER
          actions.push({
            ticker,
            action: 'MANTER',
            reason: 'Posição adequada (dentro da tolerância de ±5%)',
            currentQty: clientPos.qty,
            targetQty: clientPos.qty,
            deltaQty: 0,
            currentPrice: price,
            ceilingPrice,
            avgPrice: clientPos.avgPrice,
            value: 0,
            isFii,
            irEstimate: 0,
            netValue: 0,
            hasLoss: false,
            assetClass: classKey,
          });
        }
      });
    });

    // STEP 2B: Client assets NOT in model → SELL ALL (except RF/Fundos/Outros)
    clientMap.forEach((pos, ticker) => {
      if (modelTickerSet.has(ticker)) return; // already processed
      const price = pos.currentPrice || (pos.totalValue / Math.max(pos.qty, 1));
      const value = pos.totalValue;
      let irEstimate = 0;
      let hasLoss = false;
      let netValue = value;
      if (pos.isFii && pos.avgPrice > 0) {
        if (price > pos.avgPrice) {
          const profit = (price - pos.avgPrice) * pos.qty;
          irEstimate = profit * 0.2;
          netValue = value - irEstimate;
        } else {
          hasLoss = true;
        }
      }
      actions.push({
        ticker,
        action: 'VENDER',
        reason: 'Ativo não pertence à carteira modelo selecionada',
        currentQty: pos.qty,
        targetQty: 0,
        deltaQty: pos.qty,
        currentPrice: price,
        ceilingPrice: null,
        avgPrice: pos.avgPrice,
        value,
        isFii: pos.isFii,
        irEstimate,
        netValue,
        hasLoss,
        assetClass: pos.assetClass,
      });
    });

    // STEP 6: Renda Fixa
    const rfPct = Number((targetPortfolio as any)['renda_fixa_pct']) || 0;
    if (rfPct > 0) {
      const rfTargetValue = clientTotalValue * (rfPct / 100);
      const rfCurrentValue = positions.filter(p => p.assetClass === 'renda_fixa').reduce((s, p) => s + p.totalValue, 0);
      const delta = rfTargetValue - rfCurrentValue;
      rfSummary = {
        currentValue: rfCurrentValue,
        targetValue: rfTargetValue,
        delta,
        action: delta > 0 ? 'APORTAR' : 'MANTER',
      };
    }

    // Sort: VENDER first, then COMPRAR, AGUARDAR, MANTER
    const order: Record<ActionType, number> = { 'VENDER': 0, 'COMPRAR': 1, 'AGUARDAR': 2, 'MANTER': 3 };
    actions.sort((a, b) => order[a.action] - order[b.action]);

    return { actionPlan: actions, rfSummary, missingClasses: missingClassesList };
  }, [targetPortfolio, targetAssets, positions, recommendedAssets, clientTotalValue]);

  const venderItems = actionPlan.filter(a => a.action === 'VENDER');
  const comprarItems = actionPlan.filter(a => a.action === 'COMPRAR');
  const manterItems = actionPlan.filter(a => a.action === 'MANTER');
  const aguardarItems = actionPlan.filter(a => a.action === 'AGUARDAR');

  const totalVender = venderItems.reduce((s, a) => s + a.value, 0);
  const totalComprar = comprarItems.reduce((s, a) => s + a.value, 0);
  const totalIR = actionPlan.reduce((s, a) => s + a.irEstimate, 0);
  const totalMissingSuggested = missingClasses.reduce((s, m) => s + m.suggestedValue, 0);

  const portfolioLabel = targetPortfolio ? `${strategy} ${profile}` : '';

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const checkPage = (needed = 15) => {
      if (y > 280 - needed) { doc.addPage(); y = 20; }
    };

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

    // RF detail
    const rfPositions = positions.filter(p => p.assetClass === 'renda_fixa');
    if (rfPositions.length > 0) {
      checkPage(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Renda Fixa — Detalhamento', 14, y); y += 7;

      const rfBySubclass: Record<string, typeof rfPositions> = { ipca: [], pos: [], pre: [] };
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
        checkPage(10);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${scLabels[sc]} — R$ ${formatBRL(scTotal)} (${clientTotalValue > 0 ? ((scTotal / clientTotalValue) * 100).toFixed(2) : '0'}%)`, 14, y);
        y += 6;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        scItems.forEach(p => {
          checkPage(5);
          const taxaStr = p.taxaLabel || (p.taxa ? `${p.taxa.toFixed(2)}%` : '—');
          const pctPatr = clientTotalValue > 0 ? ((p.totalValue / clientTotalValue) * 100).toFixed(2) : '0';
          doc.text(`${p.ativo} | ${p.tipo || '—'} | ${p.indexador || '—'} | ${taxaStr} | Venc: ${p.vencimento || '—'} | R$ ${formatBRL(p.totalValue)} | ${pctPatr}% | ${p.broker}`, 18, y);
          y += 4.5;
        });
        y += 4;
      });

      if (rfSummary) {
        checkPage(12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        if (rfSummary.action === 'APORTAR') {
          doc.text(`📊 Aporte sugerido de R$ ${formatBRL(rfSummary.delta)} em Renda Fixa para atingir alocação alvo`, 14, y);
        } else {
          doc.text(`📊 Renda Fixa: alocação adequada (R$ ${formatBRL(rfSummary.currentValue)} ≥ alvo R$ ${formatBRL(rfSummary.targetValue)})`, 14, y);
        }
        doc.setTextColor(0, 0, 0);
        y += 8;
      }
      y += 4;
    }

    // Sections
    const pdfSections = [
      { label: '🔴 VENDER', items: venderItems, color: [220, 38, 38] as [number, number, number] },
      { label: '🟢 COMPRAR', items: comprarItems, color: [22, 163, 74] as [number, number, number] },
      { label: '🟡 MANTER', items: manterItems, color: [100, 116, 139] as [number, number, number] },
      { label: '⏳ AGUARDAR', items: aguardarItems, color: [202, 138, 4] as [number, number, number] },
    ];

    pdfSections.forEach(section => {
      if (section.items.length === 0) return;
      checkPage(15);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(section.color[0], section.color[1], section.color[2]);
      doc.text(section.label, 14, y); y += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      section.items.forEach(item => {
        checkPage(12);
        let actionText = '';
        if (item.action === 'VENDER') {
          actionText = `${item.ticker} — Vender ${item.deltaQty} ${item.isFii ? 'cotas' : 'ações'} @ R$ ${formatBRL(item.currentPrice)} = R$ ${formatBRL(item.value)}`;
        } else if (item.action === 'COMPRAR') {
          actionText = `${item.ticker} — Comprar ${item.deltaQty} ${item.isFii ? 'cotas' : 'ações'} @ R$ ${formatBRL(item.currentPrice)} = R$ ${formatBRL(item.value)}`;
        } else if (item.action === 'AGUARDAR') {
          actionText = `${item.ticker} — Preço atual R$ ${formatBRL(item.currentPrice)} acima do teto R$ ${formatBRL(item.ceilingPrice || 0)}`;
        } else {
          actionText = `${item.ticker} — Posição adequada (atual: ${item.currentQty} | meta: ${item.targetQty})`;
        }
        doc.text(actionText, 18, y); y += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(`Motivo: ${item.reason}`, 18, y); y += 4;
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
      checkPage(15);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('CLASSES AUSENTES NA CARTEIRA DO CLIENTE', 14, y); y += 7;
      doc.setTextColor(0, 0, 0);

      missingClasses.forEach(mc => {
        checkPage(10);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${mc.className} — não possui posição`, 14, y); y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Alocação modelo: ${mc.classPct.toFixed(0)}% = R$ ${formatBRL(mc.suggestedValue)}`, 18, y); y += 5;
        mc.assets.forEach(a => {
          checkPage(5);
          if (a.aboveCeiling) {
            doc.text(`⏳ ${a.ticker} — AGUARDAR — Preço R$ ${formatBRL(a.price)} > Teto R$ ${formatBRL(a.ceilingPrice)}`, 22, y);
          } else {
            doc.text(`→ ${a.ticker} — comprar ${a.qty} ${a.isFii ? 'cotas' : 'ações'} @ R$ ${formatBRL(a.price)} = R$ ${formatBRL(a.value)}`, 22, y);
          }
          y += 4.5;
        });
        y += 4;
      });
      y += 3;
    }

    // Summary
    checkPage(25);
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro', 14, y); y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total a Vender: R$ ${formatBRL(totalVender)}`, 18, y); y += 5;
    doc.text(`Total a Comprar: R$ ${formatBRL(totalComprar)}`, 18, y); y += 5;
    if (totalMissingSuggested > 0) {
      doc.text(`Total sugerido (classes ausentes): R$ ${formatBRL(totalMissingSuggested)}`, 18, y); y += 5;
    }
    if (rfSummary && rfSummary.action === 'APORTAR') {
      doc.text(`Aporte RF sugerido: R$ ${formatBRL(rfSummary.delta)}`, 18, y); y += 5;
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
    checkPage(10);
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

  const hasContent = actionPlan.length > 0 || missingClasses.length > 0 || rfSummary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Sugestão de Readequação — {clientName}
          </DialogTitle>
          <DialogDescription>
            Compare a posição atual do cliente com a carteira recomendada. Base: patrimônio total R$ {formatBRL(clientTotalValue)}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <div className="space-y-1">
            <Label className="text-xs">Objetivo</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Renda">Renda</SelectItem>
                <SelectItem value="Crescimento">Crescimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Perfil</Label>
            <Select value={profile} onValueChange={setProfile}>
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Conservador">Conservador</SelectItem>
                <SelectItem value="Moderado">Moderado</SelectItem>
                <SelectItem value="Arrojado">Arrojado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] pr-3">
          {!hasContent && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {!targetPortfolio
                ? 'Nenhum portfólio encontrado para este perfil/estratégia.'
                : 'Nenhuma posição comparável encontrada.'}
            </p>
          )}

          {/* 🔴 VENDER */}
          {venderItems.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-destructive flex items-center gap-1 mb-2">
                <ArrowDown className="w-4 h-4" /> VENDER
              </h4>
              <div className="space-y-2">
                {venderItems.map(item => (
                  <div key={item.ticker} className="border border-destructive/20 rounded-lg p-3 bg-destructive/5 space-y-1">
                    <p className="text-sm font-medium">
                      {item.ticker} — Vender {item.deltaQty} {item.isFii ? 'cotas' : 'ações'} @ R$ {formatBRL(item.currentPrice)} = R$ {formatBRL(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Posição atual: {item.currentQty} | Meta: {item.targetQty} | Motivo: {item.reason}
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
                          <p className="text-muted-foreground">Valor líquido: R$ {formatBRL(item.netValue)}</p>
                        </div>
                      ) : null
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🟢 COMPRAR */}
          {comprarItems.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-emerald-600 flex items-center gap-1 mb-2">
                <ArrowUp className="w-4 h-4" /> COMPRAR
              </h4>
              <div className="space-y-2">
                {comprarItems.map(item => (
                  <div key={item.ticker} className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
                    <p className="text-sm font-medium">
                      {item.ticker} — Comprar {item.deltaQty} {item.isFii ? 'cotas' : 'ações'} @ R$ {formatBRL(item.currentPrice)} = R$ {formatBRL(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Posição atual: {item.currentQty} | Meta: {item.targetQty}
                      {item.ceilingPrice ? ` | Preço atual: R$ ${formatBRL(item.currentPrice)} ≤ Teto: R$ ${formatBRL(item.ceilingPrice)}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">Motivo: {item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🟡 MANTER */}
          {manterItems.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                <Minus className="w-4 h-4" /> MANTER
              </h4>
              <div className="space-y-2">
                {manterItems.map(item => (
                  <div key={item.ticker} className="border border-border rounded-lg p-3 bg-muted/30 space-y-1">
                    <p className="text-sm font-medium">
                      {item.ticker} — Posição adequada (atual: {item.currentQty} | meta: {item.targetQty})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ⏳ AGUARDAR */}
          {aguardarItems.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-1 mb-2">
                <Clock className="w-4 h-4" /> AGUARDAR
              </h4>
              <div className="space-y-2">
                {aguardarItems.map(item => (
                  <div key={item.ticker} className="border border-amber-200 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                    <p className="text-sm font-medium">
                      {item.ticker} — Preço atual R$ {formatBRL(item.currentPrice)} acima do teto R$ {formatBRL(item.ceilingPrice || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Motivo: {item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing classes */}
          {missingClasses.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-2">
                <Info className="w-4 h-4" /> CLASSES AUSENTES NA CARTEIRA DO CLIENTE
              </h4>
              <div className="space-y-3">
                {missingClasses.map(mc => (
                  <div key={mc.className} className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
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
                        <p className="text-xs text-muted-foreground font-medium">Ativos sugeridos:</p>
                        {mc.assets.map(a => (
                          <p key={a.ticker} className={`text-xs ${a.aboveCeiling ? 'text-amber-600' : ''}`}>
                            {a.aboveCeiling
                              ? `⏳ ${a.ticker} — AGUARDAR — Preço R$ ${formatBRL(a.price)} > Teto R$ ${formatBRL(a.ceilingPrice)}`
                              : `→ ${a.ticker} — comprar ${a.qty} ${a.isFii ? 'cotas' : 'ações'} @ R$ ${formatBRL(a.price)} = R$ ${formatBRL(a.value)}`
                            }
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 📊 RENDA FIXA */}
          {rfSummary && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-2">
                📊 RENDA FIXA
              </h4>
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-1">
                <p className="text-sm">
                  Saldo atual: <span className="font-semibold">R$ {formatBRL(rfSummary.currentValue)}</span> | Alvo: <span className="font-semibold">R$ {formatBRL(rfSummary.targetValue)}</span>
                </p>
                {rfSummary.action === 'APORTAR' ? (
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    → Aporte sugerido de R$ {formatBRL(rfSummary.delta)} para atingir alocação alvo
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    ✅ Alocação em Renda Fixa adequada — MANTER
                  </p>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Summary */}
        {hasContent && (
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-destructive/10 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Total a Vender</p>
                <p className="font-semibold text-destructive">R$ {formatBRL(totalVender)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Total a Comprar</p>
                <p className="font-semibold text-emerald-600">R$ {formatBRL(totalComprar + totalMissingSuggested)}</p>
              </div>
              {rfSummary && rfSummary.action === 'APORTAR' && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Aporte RF</p>
                  <p className="font-semibold text-blue-600">R$ {formatBRL(rfSummary.delta)}</p>
                </div>
              )}
              {totalIR > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 text-center">
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
