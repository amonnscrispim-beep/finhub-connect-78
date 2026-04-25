import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FAROL_COLORS_RGB } from './farol-colors';

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
  sector?: string | null;
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
  /** Optional brand/consultancy name shown on the cover. */
  consultancyName?: string;
}

// ── Wealth Management premium palette ──
const COLORS = {
  navy: [11, 40, 89] as [number, number, number],          // #0B2859 — primary brand navy
  navyDeep: [7, 26, 58] as [number, number, number],       // darker accent for cover gradient
  gold: [201, 168, 76] as [number, number, number],        // #c9a84c — premium accent
  white: [255, 255, 255] as [number, number, number],
  lightGray: [245, 247, 250] as [number, number, number],
  rowAlt: [248, 250, 253] as [number, number, number],
  darkText: [30, 30, 30] as [number, number, number],
  mutedText: [110, 118, 130] as [number, number, number],
  divider: [225, 230, 238] as [number, number, number],
  green: [34, 139, 84] as [number, number, number],
  red: [200, 60, 60] as [number, number, number],
};

// FAROL letter per asset class (used for category accent strip in detail pages).
const CLASS_TO_LETTER: Record<string, 'F' | 'A' | 'R' | 'O' | 'L'> = {
  fiis: 'F',
  acoes_brasileiras: 'A',
  renda_fixa: 'R',
  oportunidades: 'O',
  internacional: 'L',
};

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Thin divider line
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.2);
  doc.line(14, h - 12, w - 14, h - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.mutedText);
  doc.text(
    'Material informativo. Não constitui recomendação de investimento.',
    14,
    h - 6,
  );
  doc.text(`Página ${pageNum} de ${totalPages}`, w - 14, h - 6, { align: 'right' });
}

function pageHeaderBar(doc: jsPDF, profile: string, strategy: string) {
  const w = doc.internal.pageSize.getWidth();
  // Slim top accent bar
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, w, 6, 'F');
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 6, w, 0.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.navy);
  doc.text(`${profile} · ${strategy}`, 14, 14);
}

export function generatePortfolioPdf(data: PortfolioPdfData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('pt-BR');
  const consultancy = data.consultancyName || 'Wealth Advisory';

  // ════════════════════════════════════════════════
  // PAGE 1 — COVER (premium dark navy + gold)
  // ════════════════════════════════════════════════
  // Solid dark navy background
  doc.setFillColor(...COLORS.navyDeep);
  doc.rect(0, 0, w, h, 'F');

  // Subtle inner navy panel
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 70, w, 175, 'F');

  // Gold accent strips
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 67, w, 1.2, 'F');
  doc.rect(0, 244, w, 1.2, 'F');

  // Consultancy mark (top)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.gold);
  doc.text(consultancy.toUpperCase(), w / 2, 35, { align: 'center', charSpace: 2 });

  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.3);
  doc.line(w / 2 - 18, 40, w / 2 + 18, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('WEALTH MANAGEMENT', w / 2, 47, { align: 'center', charSpace: 1.5 });

  // Main title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...COLORS.white);
  doc.text('Relatório de Carteira', w / 2, 110, { align: 'center' });

  // Strategy + profile inline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.gold);
  doc.text(`${data.strategy}  ·  ${data.profile}`, w / 2, 122, { align: 'center' });

  // Hairline
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.2);
  doc.line(w / 2 - 30, 130, w / 2 + 30, 130);

  // Client block
  if (data.clientName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 190, 210);
    doc.text('PREPARADO PARA', w / 2, 148, { align: 'center', charSpace: 1.5 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.white);
    doc.text(data.clientName, w / 2, 158, { align: 'center' });
  }

  // Highlighted total invested
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text('VALOR TOTAL INVESTIDO', w / 2, 188, { align: 'center', charSpace: 1.5 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...COLORS.gold);
  doc.text(`R$ ${fmt(data.investAmount)}`, w / 2, 202, { align: 'center' });

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 210, 225);
  doc.text(`Gerado em ${today}`, w / 2, 230, { align: 'center' });

  // Bottom note
  doc.setFontSize(7);
  doc.setTextColor(150, 160, 180);
  doc.text(
    'Material informativo. Não constitui recomendação de investimento.',
    w / 2,
    h - 10,
    { align: 'center' },
  );

  // ════════════════════════════════════════════════
  // PAGE 2 — VISÃO GERAL (FAROL summary table)
  // ════════════════════════════════════════════════
  doc.addPage();
  pageHeaderBar(doc, data.profile, data.strategy);
  let y = 26;

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.navy);
  doc.text('Visão Geral', 14, y);
  doc.setFillColor(...COLORS.gold);
  doc.rect(14, y + 2, 28, 1, 'F');
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mutedText);
  doc.text(
    'Distribuição estratégica da carteira segundo o Método FAROL.',
    14,
    y,
  );
  y += 8;

  // FAROL summary table — only categories with allocation
  const activeClasses = data.classes.filter(c => c.value > 0 || c.assets.length > 0);
  const summaryRows = activeClasses.map(c => {
    const letter = CLASS_TO_LETTER[c.key] || '';
    return [
      `${letter}  ${c.label}`,
      `${c.pct.toFixed(1)}%`,
      `R$ ${fmt(c.value)}`,
      `R$ ${fmt(c.dvMonth)}`,
      `R$ ${fmt(c.dvYear)}`,
    ];
  });

  // TOTAL row
  summaryRows.push([
    'TOTAL CONSOLIDADO',
    '100%',
    `R$ ${fmt(data.grandValue)}`,
    `R$ ${fmt(data.grandDvMonth)}`,
    `R$ ${fmt(data.grandDvYear)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Categoria FAROL', '% Carteira', 'Valor R$', 'Div. Mês', 'Div. Ano']],
    body: summaryRows,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: { fontSize: 9, textColor: COLORS.darkText, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: COLORS.rowAlt },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (cell) => {
      const isLast = cell.row.index === summaryRows.length - 1;
      if (isLast && cell.section === 'body') {
        cell.cell.styles.fillColor = COLORS.navy;
        cell.cell.styles.textColor = COLORS.white;
        cell.cell.styles.fontStyle = 'bold';
      }
      // Color the category letter cell with the FAROL accent
      if (!isLast && cell.section === 'body' && cell.column.index === 0) {
        const cls = activeClasses[cell.row.index];
        const letter = cls ? CLASS_TO_LETTER[cls.key] : null;
        if (letter && FAROL_COLORS_RGB[letter]) {
          cell.cell.styles.textColor = FAROL_COLORS_RGB[letter];
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ════════════════════════════════════════════════
  // PAGE 3+ — DETAIL PER CATEGORY
  // ════════════════════════════════════════════════
  for (const cls of activeClasses) {
    if (cls.assets.length === 0) continue;

    // Each category starts on its own page for clarity
    doc.addPage();
    pageHeaderBar(doc, data.profile, data.strategy);
    y = 26;

    const letter = CLASS_TO_LETTER[cls.key];
    const accent = letter && FAROL_COLORS_RGB[letter] ? FAROL_COLORS_RGB[letter] : COLORS.navy;

    // Category accent block
    doc.setFillColor(...accent);
    doc.rect(14, y - 5, 6, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.navy);
    doc.text(`${letter ? letter + '  ·  ' : ''}${cls.label}`, 24, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.mutedText);
    doc.text(
      `${cls.pct.toFixed(1)}% da carteira  ·  Valor alocado R$ ${fmt(cls.value)}`,
      24,
      y + 9,
    );
    y += 18;

    const isRf = cls.key === 'renda_fixa';
    const isFii = cls.key === 'fiis';

    // Class-level metrics row (DY)
    if (cls.value > 0) {
      const dyMonthPct = !isRf ? (cls.dvMonth / cls.value) * 100 : 0;
      const dyYearPct = !isRf
        ? (Math.pow(1 + cls.dvMonth / cls.value, 12) - 1) * 100
        : 0;

      const boxes: { label: string; value: string }[] = [
        { label: 'Valor Alocado', value: `R$ ${fmt(cls.value)}` },
        { label: 'Div. Mês', value: `R$ ${fmt(cls.dvMonth)}` },
        { label: 'Div. Ano', value: `R$ ${fmt(cls.dvYear)}` },
      ];
      if (!isRf) {
        boxes.push({ label: 'DY Mês', value: `${dyMonthPct.toFixed(2)}%` });
        boxes.push({ label: 'DY Ano', value: `${dyYearPct.toFixed(2)}%` });
      }

      const boxW = (w - 28 - (boxes.length - 1) * 3) / boxes.length;
      boxes.forEach((b, i) => {
        const x = 14 + i * (boxW + 3);
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(x, y, boxW, 14, 1.5, 1.5, 'F');
        doc.setDrawColor(...COLORS.divider);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, boxW, 14, 1.5, 1.5, 'S');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.mutedText);
        doc.text(b.label.toUpperCase(), x + 3, y + 5, { charSpace: 0.5 });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.navy);
        doc.text(b.value, x + 3, y + 11);
      });
      y += 19;
    }

    // ── Renda Fixa: distribution by indexador type ──
    if (isRf) {
      const groups: Record<string, { value: number; count: number }> = {
        'Pós-fixado': { value: 0, count: 0 },
        'Prefixado': { value: 0, count: 0 },
        'Indexado à Inflação': { value: 0, count: 0 },
      };
      for (const a of cls.assets) {
        const t = (a.rfType || '').toLowerCase();
        let key = 'Pós-fixado';
        if (t.includes('pre')) key = 'Prefixado';
        else if (t.includes('ipca') || t.includes('infla')) key = 'Indexado à Inflação';
        else if (t.includes('pos') || t.includes('pós')) key = 'Pós-fixado';
        groups[key].value += a.value;
        groups[key].count += 1;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.navy);
      doc.text('Distribuição por Indexador', 14, y);
      y += 4;

      const distRows = Object.entries(groups)
        .filter(([, v]) => v.value > 0 || v.count > 0)
        .map(([k, v]) => [
          k,
          String(v.count),
          `R$ ${fmt(v.value)}`,
          cls.value > 0 ? `${((v.value / cls.value) * 100).toFixed(1)}%` : '0%',
        ]);

      autoTable(doc, {
        startY: y + 2,
        head: [['Tipo', 'Qtde Ativos', 'Valor R$', '% da Classe']],
        body: distRows,
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.navy,
          textColor: COLORS.white,
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 8, textColor: COLORS.darkText, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: COLORS.rowAlt },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Asset detail table ──
    let head: string[];
    let body: string[][];
    let columnStyles: Record<number, any> = {};

    if (isRf) {
      head = ['Ativo', 'Tipo', 'Indexador', 'Vencimento', '% Classe', 'Valor R$', 'Taxa % a.a.', 'Renda Mês', 'Renda Ano'];
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
      columnStyles = {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
      };
    } else {
      head = [
        'Ativo',
        'Setor',
        'Preço Teto',
        'Preço Atual',
        'Status',
        'Cotas',
        'Valor R$',
        isFii ? 'DY R$/mês' : 'DY R$/ano',
        'Div. Mês',
        'Div. Ano',
      ];
      body = cls.assets.map(a => {
        const status =
          a.ceilingPrice && a.currentPrice
            ? a.currentPrice <= a.ceilingPrice
              ? 'Abaixo do teto'
              : 'Acima do teto'
            : '—';
        return [
          a.ticker || a.name,
          a.sector || '—',
          a.ceilingPrice ? `R$ ${fmt(a.ceilingPrice)}` : '—',
          a.currentPrice ? `R$ ${fmt(a.currentPrice)}` : '—',
          status,
          a.cotas !== null ? String(a.cotas) : '—',
          `R$ ${fmt(a.value)}`,
          a.dyInput.toFixed(2),
          `R$ ${fmt(a.dvMonth)}`,
          `R$ ${fmt(a.dvYear)}`,
        ];
      });
      columnStyles = {
        2: { halign: 'right' },
        3: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
      };
    }

    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.navy,
        textColor: COLORS.white,
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 7.5, textColor: COLORS.darkText, cellPadding: 2.2 },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
      columnStyles,
      margin: { left: 14, right: 14 },
      didParseCell: (cell) => {
        // Color-code the Status column for non-RF
        if (!isRf && cell.section === 'body' && cell.column.index === 4) {
          const txt = String(cell.cell.raw || '');
          if (txt.includes('Abaixo')) cell.cell.styles.textColor = COLORS.green;
          else if (txt.includes('Acima')) cell.cell.styles.textColor = COLORS.red;
        }
      },
    });
  }

  // ── CONSULTANT NOTE (optional, last page) ──
  if (data.consultantNote) {
    doc.addPage();
    pageHeaderBar(doc, data.profile, data.strategy);
    let ny = 26;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.navy);
    doc.text('Nota do Consultor', 14, ny);
    doc.setFillColor(...COLORS.gold);
    doc.rect(14, ny + 2, 28, 1, 'F');
    ny += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.darkText);
    const lines = doc.splitTextToSize(data.consultantNote, w - 28);
    doc.text(lines, 14, ny);
  }

  // ── Footers on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    pageFooter(doc, i, totalPages);
  }

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
