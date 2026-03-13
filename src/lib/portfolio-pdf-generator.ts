import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AssetRow {
  ticker: string;
  name: string;
  assetClass: string;
  classLabel: string;
  allocClassPct: number;
  totalPct: number;
  value: number;
  cotas: number | null;
  dyInput: number;
  dvMonth: number;
  dvYear: number;
  ceilingPrice: number | null;
  currentPrice: number | null;
  isRf: boolean;
  isFii: boolean;
  rfType?: string;
  indexador?: string;
  vencimento?: string;
}

export interface ClassSummary {
  label: string;
  key: string;
  pct: number;
  value: number;
  dvMonth: number;
  dvYear: number;
  assets: AssetRow[];
}

export interface PortfolioPdfData {
  profile: string;
  strategy: string;
  investAmount: number;
  classes: ClassSummary[];
  grandValue: number;
  grandDvMonth: number;
  grandDvYear: number;
  clientName?: string;
  consultantNote?: string;
}

const COLORS = {
  primary: [26, 46, 74] as [number, number, number],       // #1a2e4a
  accent: [201, 168, 76] as [number, number, number],      // #c9a84c
  white: [255, 255, 255] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  darkText: [30, 30, 30] as [number, number, number],
  mutedText: [120, 120, 120] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
};

const PROFILE_COLORS: Record<string, [number, number, number]> = {
  Conservador: [34, 197, 94],
  Moderado: [234, 179, 8],
  Arrojado: [239, 68, 68],
};

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addHeader(doc: jsPDF, pageNum: number, totalPages: number, profile: string, strategy: string) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Top bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 12, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.white);
  doc.text(`${profile} — ${strategy}`, 14, 8);
  doc.text(`Página ${pageNum} de ${totalPages}`, w - 14, 8, { align: 'right' });

  // Bottom bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, h - 8, w, 8, 'F');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.mutedText);
  doc.text('Documento gerado automaticamente. Não constitui recomendação de investimento.', w / 2, h - 3, { align: 'center' });
}

export function generatePortfolioPdf(data: PortfolioPdfData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const profileColor = PROFILE_COLORS[data.profile] || COLORS.primary;
  const today = new Date().toLocaleDateString('pt-BR');

  // ── PAGE 1: COVER ──
  // Background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 297, 'F');

  // Accent line
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 90, w, 3, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...COLORS.white);
  doc.text('Relatório de Carteira', w / 2, 115, { align: 'center' });

  // Strategy
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.accent);
  doc.text(`${data.strategy}`, w / 2, 128, { align: 'center' });

  // Profile badge
  doc.setFillColor(...profileColor);
  const badgeW = 60;
  doc.roundedRect((w - badgeW) / 2, 140, badgeW, 12, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.white);
  doc.text(data.profile, w / 2, 148, { align: 'center' });

  // Client name
  if (data.clientName) {
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.white);
    doc.text(data.clientName, w / 2, 170, { align: 'center' });
  }

  // Value & date
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.mutedText);
  doc.text(`Valor Total: R$ ${fmt(data.investAmount)}`, w / 2, 190, { align: 'center' });
  doc.text(`Gerado em: ${today}`, w / 2, 198, { align: 'center' });

  // Bottom accent
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 285, w, 3, 'F');

  // ── PAGE 2: ALLOCATION SUMMARY ──
  doc.addPage();
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.primary);
  doc.text('Resumo de Alocação', 14, y);
  y += 3;
  doc.setFillColor(...COLORS.accent);
  doc.rect(14, y, 40, 1.5, 'F');
  y += 10;

  // Summary table
  const summaryRows = data.classes
    .filter(c => c.pct > 0 || c.assets.length > 0)
    .map(c => [
      c.label,
      `${c.pct.toFixed(1)}%`,
      `R$ ${fmt(c.value)}`,
      `R$ ${fmt(c.dvMonth)}`,
      `R$ ${fmt(c.dvYear)}`,
    ]);

  summaryRows.push([
    'TOTAL',
    '100%',
    `R$ ${fmt(data.grandValue)}`,
    '—',
    '—',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Classe', '% Carteira', 'Valor R$', 'Div. Mês', 'Div. Ano']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: COLORS.darkText },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    styles: { cellPadding: 3 },
    didParseCell: (data) => {
      if (data.row.index === summaryRows.length - 1 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [230, 245, 230];
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ── PAGES 3+: DETAIL PER CLASS ──
  for (const cls of data.classes) {
    if (cls.assets.length === 0) continue;

    // Check if we need a new page
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    // Class header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${cls.label} (${cls.pct.toFixed(1)}%)`, 14, y);
    y += 2;
    doc.setFillColor(...COLORS.accent);
    doc.rect(14, y, 30, 1, 'F');
    y += 5;

    // Class summary line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mutedText);
    doc.text(`Valor: R$ ${fmt(cls.value)} | Div. Mês: R$ ${fmt(cls.dvMonth)} | Div. Ano: R$ ${fmt(cls.dvYear)}`, 14, y);
    y += 6;

    const isRf = cls.key === 'renda_fixa';
    const isFii = cls.key === 'fiis';

    let head: string[];
    let body: string[][];

    if (isRf) {
      head = ['Ativo', 'Tipo', 'Indexador', 'Vencimento', 'Aloc. %', 'Valor R$', 'Taxa %', 'Renda Mês', 'Renda Ano'];
      body = cls.assets.map(a => [
        a.ticker || a.name,
        a.rfType || '—',
        a.indexador || '—',
        a.vencimento || '—',
        `${a.allocClassPct.toFixed(1)}%`,
        `R$ ${fmt(a.value)}`,
        `${a.dyInput.toFixed(2)}%`,
        `R$ ${fmt(a.dvMonth)}`,
        `R$ ${fmt(a.dvYear)}`,
      ]);
    } else {
      head = ['Ativo', 'Preço Teto', 'Preço Atual', 'Aloc. %', 'Valor R$', 'Cotas', isFii ? 'DY R$/mês' : 'DY R$/ano', 'Div. Mês', 'Div. Ano'];
      body = cls.assets.map(a => [
        a.ticker || a.name,
        a.ceilingPrice ? `R$ ${fmt(a.ceilingPrice)}` : '—',
        a.currentPrice ? `R$ ${fmt(a.currentPrice)}` : '—',
        `${a.allocClassPct.toFixed(1)}%`,
        `R$ ${fmt(a.value)}`,
        a.cotas !== null ? String(a.cotas) : '—',
        a.dyInput.toFixed(2),
        `R$ ${fmt(a.dvMonth)}`,
        `R$ ${fmt(a.dvYear)}`,
      ]);
    }

    autoTable(doc, {
      startY: y,
      head: [head],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: COLORS.darkText },
      alternateRowStyles: { fillColor: COLORS.lightGray },
      styles: { cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // DY % metrics box for non-RF classes
    if (!isRf && cls.value > 0) {
      const dyMonthPct = cls.dvMonth / cls.value * 100;
      const dyYearPct = (Math.pow(1 + cls.dvMonth / cls.value, 12) - 1) * 100;
      
      doc.setFillColor(230, 245, 230);
      doc.roundedRect(14, y, w - 28, 10, 2, 2, 'F');
      doc.setDrawColor(180, 220, 180);
      doc.roundedRect(14, y, w - 28, 10, 2, 2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.primary);
      const midX = w / 2;
      doc.text(`DY Mês: ${dyMonthPct.toFixed(2)}%`, midX - 20, y + 6.5, { align: 'right' });
      doc.text('|', midX, y + 6.5, { align: 'center' });
      doc.text(`DY Ano: ${dyYearPct.toFixed(2)}%`, midX + 20, y + 6.5, { align: 'left' });
      y += 14;
    } else {
      y += 6;
    }
  }

  // ── CONSULTANT NOTE ──
  if (data.consultantNote) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text('Nota do Consultor', 14, y);
    y += 2;
    doc.setFillColor(...COLORS.accent);
    doc.rect(14, y, 30, 1, 'F');
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.darkText);
    const lines = doc.splitTextToSize(data.consultantNote, w - 28);
    doc.text(lines, 14, y);
  }

  // Add headers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i - 1, totalPages - 1, data.profile, data.strategy);
  }

  // Download
  const fileName = `Carteira_${data.profile}_${data.strategy}_${today.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}

export function generateClassPdf(data: PortfolioPdfData, classKey: string): void {
  const cls = data.classes.find(c => c.key === classKey);
  if (!cls || cls.assets.length === 0) return;

  const singleClassData: PortfolioPdfData = {
    ...data,
    classes: [cls],
    grandValue: cls.value,
    grandDvMonth: cls.dvMonth,
    grandDvYear: cls.dvYear,
  };

  generatePortfolioPdf(singleClassData);
}
