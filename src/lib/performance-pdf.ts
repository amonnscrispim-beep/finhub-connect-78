/**
 * Gerador de PDF do Resumo de Performance — estilo gestora internacional
 * (azul-marinho, branco, tipografia elegante, tabelas limpas).
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GOFFERJE_LOGO_BASE64 } from '@/assets/gofferje-logo-base64';
import type { PerformanceSnapshotRich } from '@/components/crm/performance/performance-calculations';
import { fmtBRL, fmtPct, fmtMonth } from '@/components/crm/performance/performance-calculations';

const NAVY: [number, number, number] = [12, 36, 71];
const NAVY_SOFT: [number, number, number] = [40, 70, 110];
const ACCENT: [number, number, number] = [120, 200, 240];
const GREEN: [number, number, number] = [22, 130, 90];
const TEXT: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 115, 125];
const RULE: [number, number, number] = [220, 225, 232];
const BG_SOFT: [number, number, number] = [245, 247, 250];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

interface Blocks {
  executive_summary: string;
  patrimonial_situation: string;
  monthly_performance: string;
  portfolio_composition: string;
  future_projection: string;
  consultant_comments: string;
  next_steps: string;
}

interface Opts {
  snapshot: PerformanceSnapshotRich;
  advisorName: string;
  blocks: Blocks;
  filename: string;
}

const todayPt = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const setFill = (d: jsPDF, c: [number, number, number]) => d.setFillColor(c[0], c[1], c[2]);
const setDraw = (d: jsPDF, c: [number, number, number]) => d.setDrawColor(c[0], c[1], c[2]);
const setText = (d: jsPDF, c: [number, number, number]) => d.setTextColor(c[0], c[1], c[2]);

function drawHeader(doc: jsPDF) {
  try { doc.addImage(GOFFERJE_LOGO_BASE64, 'PNG', MARGIN_X, 8, 14, 14); } catch {}
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('GOFFERJE', MARGIN_X + 17, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setText(doc, MUTED);
  doc.text('INVESTIMENTOS', MARGIN_X + 17, 18.5);
  setDraw(doc, RULE); doc.setLineWidth(0.3); doc.line(MARGIN_X, 25, PAGE_W - MARGIN_X, 25);
}

function drawFooter(doc: jsPDF, advisor: string, date: string, page: number, total: number) {
  doc.setPage(page);
  setDraw(doc, RULE); doc.setLineWidth(0.3); doc.line(MARGIN_X, PAGE_H - 15, PAGE_W - MARGIN_X, PAGE_H - 15);
  setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(advisor ? `Consultor: ${advisor}` : 'Gofferje Investimentos', MARGIN_X, PAGE_H - 9);
  doc.text(date, PAGE_W / 2, PAGE_H - 9, { align: 'center' });
  doc.text(`${page} / ${total}`, PAGE_W - MARGIN_X, PAGE_H - 9, { align: 'right' });
}

function drawCover(doc: jsPDF, snap: PerformanceSnapshotRich, advisor: string, date: string) {
  setFill(doc, NAVY); doc.rect(0, 0, 8, PAGE_H, 'F');
  setFill(doc, ACCENT); doc.rect(PAGE_W - 2, 0, 2, PAGE_H, 'F');
  try { doc.addImage(GOFFERJE_LOGO_BASE64, 'PNG', PAGE_W / 2 - 22, 38, 44, 44); } catch {}
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('GOFFERJE INVESTIMENTOS', PAGE_W / 2, 96, { align: 'center' });
  setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('CONSULTORIA DE INVESTIMENTOS', PAGE_W / 2, 102, { align: 'center' });
  setDraw(doc, ACCENT); doc.setLineWidth(0.6); doc.line(PAGE_W / 2 - 25, 108, PAGE_W / 2 + 25, 108);
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
  doc.text('RESUMO DE PERFORMANCE', PAGE_W / 2, 138, { align: 'center' });
  setText(doc, NAVY_SOFT); doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
  doc.text(`Período: ${snap.reportPeriodLabel}`, PAGE_W / 2, 150, { align: 'center' });

  const boxY = 180;
  setFill(doc, BG_SOFT); doc.roundedRect(MARGIN_X + 15, boxY, CONTENT_W - 30, 50, 2, 2, 'F');
  setText(doc, MUTED); doc.setFontSize(8);
  doc.text('PREPARADO PARA', PAGE_W / 2, boxY + 12, { align: 'center' });
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text(snap.clientName || '—', PAGE_W / 2, boxY + 24, { align: 'center' });
  setDraw(doc, RULE); doc.line(PAGE_W / 2 - 30, boxY + 30, PAGE_W / 2 + 30, boxY + 30);
  setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(date, PAGE_W / 2, boxY + 38, { align: 'center' });
  if (advisor) doc.text(`Consultor: ${advisor}`, PAGE_W / 2, boxY + 44, { align: 'center' });

  setText(doc, MUTED); doc.setFontSize(7.5);
  doc.text('Documento confidencial — uso exclusivo do cliente. Não constitui recomendação de investimento.',
    PAGE_W / 2, PAGE_H - 14, { align: 'center' });
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 22) { doc.addPage(); drawHeader(doc); return 32; }
  return y;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(title.toUpperCase(), MARGIN_X, y);
  setDraw(doc, ACCENT); doc.setLineWidth(0.8); doc.line(MARGIN_X, y + 1.8, MARGIN_X + 22, y + 1.8);
  return y + 8;
}

function drawParagraph(doc: jsPDF, text: string, y: number): number {
  if (!text) return y;
  const lines = doc.splitTextToSize(text, CONTENT_W);
  y = ensureSpace(doc, y, lines.length * 5 + 4);
  setText(doc, TEXT); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(lines, MARGIN_X, y);
  return y + lines.length * 5 + 4;
}

function drawSummaryCards(doc: jsPDF, snap: PerformanceSnapshotRich, y: number): number {
  // 4 cards lado a lado: Patrimônio Bruto, Ganho Líquido, % do CDI, Alpha vs CDI
  const cards = [
    { label: 'Patrimônio Bruto', value: fmtBRL(snap.totalGross), color: NAVY },
    { label: 'Ganho Líquido', value: fmtBRL(snap.netGainBRL), color: GREEN },
    { label: '% do CDI no Ano', value: snap.pctOfCdiYear != null ? `${snap.pctOfCdiYear.toFixed(0)}%` : '—', color: GREEN },
    { label: 'Alpha vs CDI', value: fmtBRL(snap.alphaVsCdiBRL), color: GREEN },
  ];
  const cardW = (CONTENT_W - 9) / 4;
  const cardH = 22;
  y = ensureSpace(doc, y, cardH + 4);
  cards.forEach((c, i) => {
    const x = MARGIN_X + i * (cardW + 3);
    setFill(doc, BG_SOFT); doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'F');
    setFill(doc, c.color); doc.rect(x, y, 1.2, cardH, 'F');
    setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(c.label.toUpperCase(), x + 4, y + 6);
    setText(doc, c.color); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(c.value, x + 4, y + 14);
  });
  return y + cardH + 6;
}

export function generatePerformancePdf(opts: Opts): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { snapshot: snap, advisorName, blocks } = opts;
  const date = todayPt();

  drawCover(doc, snap, advisorName, date);

  // Página 2: Sumário Executivo + Cards
  doc.addPage(); drawHeader(doc);
  let y = 32;
  y = drawSectionTitle(doc, 'Sumário Executivo', y);
  y = drawSummaryCards(doc, snap, y);
  y = drawParagraph(doc, blocks.executive_summary, y);
  y += 2;

  // Situação Patrimonial
  y = ensureSpace(doc, y, 30);
  y = drawSectionTitle(doc, 'Situação Patrimonial', y);
  y = drawParagraph(doc, blocks.patrimonial_situation, y);
  if (snap.brokers.length > 0) {
    autoTable(doc, {
      startY: y, margin: { left: MARGIN_X, right: MARGIN_X },
      head: [['Corretora', 'Patrimônio Bruto']],
      body: snap.brokers.map(b => [b.broker, fmtBRL(b.totalGross)]),
      theme: 'striped',
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2.2, textColor: TEXT, lineColor: RULE, lineWidth: 0.1 },
      alternateRowStyles: { fillColor: BG_SOFT },
      columnStyles: { 1: { halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Performance Mês a Mês
  y = ensureSpace(doc, y, 30);
  y = drawSectionTitle(doc, 'Rentabilidade Mês a Mês', y);
  y = drawParagraph(doc, blocks.monthly_performance, y);
  if (snap.monthlyHistory.length > 0) {
    autoTable(doc, {
      startY: y, margin: { left: MARGIN_X, right: MARGIN_X },
      head: [['Mês', 'Portfólio', 'CDI', '% do CDI', 'Ganho (R$)']],
      body: snap.monthlyHistory.map(m => [
        fmtMonth(m.month),
        fmtPct(m.portfolioPct),
        fmtPct(m.cdiPct),
        m.pctOfCdi != null ? `${m.pctOfCdi.toFixed(0)}%` : '—',
        fmtBRL(m.gainBRL),
      ]),
      theme: 'striped',
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2.2, textColor: TEXT, lineColor: RULE, lineWidth: 0.1 },
      alternateRowStyles: { fillColor: BG_SOFT },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Composição & Isenção de IR
  y = ensureSpace(doc, y, 30);
  y = drawSectionTitle(doc, 'Composição da Carteira & Isenção de IR', y);
  y = drawParagraph(doc, blocks.portfolio_composition, y);

  // Callout destacando isenção de IR
  if (snap.taxExemptValueBRL > 0) {
    const txt = `Parcela isenta de IR: ${fmtBRL(snap.taxExemptValueBRL)} (${snap.taxExemptPct.toFixed(1)}% da carteira). Esses ativos rendem mais para você porque não há desconto de imposto sobre os rendimentos.`;
    const lines = doc.splitTextToSize(txt, CONTENT_W - 12);
    const h = lines.length * 5 + 8;
    y = ensureSpace(doc, y, h + 4);
    setFill(doc, [232, 245, 238]); doc.roundedRect(MARGIN_X, y, CONTENT_W, h, 1.5, 1.5, 'F');
    setFill(doc, GREEN); doc.rect(MARGIN_X, y, 1.2, h, 'F');
    setText(doc, GREEN); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(lines, MARGIN_X + 6, y + 6);
    y += h + 6;
  }

  if (snap.composition.length > 0) {
    autoTable(doc, {
      startY: y, margin: { left: MARGIN_X, right: MARGIN_X },
      head: [['Classe', 'Valor', '% Carteira', '% Isento IR']],
      body: snap.composition.map(c => [
        c.className,
        fmtBRL(c.valueR$),
        `${c.pct.toFixed(1)}%`,
        c.taxExemptPct != null && c.taxExemptPct > 0 ? `${c.taxExemptPct.toFixed(0)}%` : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2.2, textColor: TEXT, lineColor: RULE, lineWidth: 0.1 },
      alternateRowStyles: { fillColor: BG_SOFT },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Projeção Futura
  y = ensureSpace(doc, y, 40);
  y = drawSectionTitle(doc, 'Projeção Futura', y);
  y = drawParagraph(doc, blocks.future_projection, y);
  const aporteLabel = snap.monthlyAporte > 0 ? ` (aporte mensal: ${fmtBRL(snap.monthlyAporte)})` : '';
  autoTable(doc, {
    startY: y, margin: { left: MARGIN_X, right: MARGIN_X },
    head: [['Horizonte', 'Sem aportes', `Com aportes${aporteLabel}`, 'Se ficasse no CDI', 'Alpha futuro']],
    body: snap.projections.map((p, i) => {
      const cdi = snap.projectionsCdi[i];
      const alpha = p.withAporte - (cdi?.withAporte ?? p.withAporte);
      return [
        `${p.horizonYears} ano(s)`,
        fmtBRL(p.withoutAporte),
        fmtBRL(p.withAporte),
        fmtBRL(cdi?.withAporte),
        fmtBRL(alpha),
      ];
    }),
    theme: 'striped',
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.2, textColor: TEXT, lineColor: RULE, lineWidth: 0.1 },
    alternateRowStyles: { fillColor: BG_SOFT },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Comentários do Consultor
  if (blocks.consultant_comments) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionTitle(doc, 'Comentários do Consultor', y);
    y = drawParagraph(doc, blocks.consultant_comments, y);
  }

  // Próximos Passos
  if (blocks.next_steps) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionTitle(doc, 'Próximos Passos', y);
    y = drawParagraph(doc, blocks.next_steps, y);
  }

  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) drawFooter(doc, advisorName, date, i, total);
  doc.save(`${opts.filename}.pdf`);
}
