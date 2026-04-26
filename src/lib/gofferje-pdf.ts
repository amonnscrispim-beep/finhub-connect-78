/**
 * Gofferje Investimentos — gerador de PDF de alto padrão.
 *
 * Inspirado em BlackRock / Itaú Private / BTG Wealth: capa institucional dedicada,
 * logo no topo de cada página, tipografia sóbria, paleta azul-marinho + branco,
 * tabelas limpas e rodapé com nome do consultor + data.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GOFFERJE_LOGO_BASE64 } from '@/assets/gofferje-logo-base64';

// Paleta institucional sóbria
const NAVY: [number, number, number] = [12, 36, 71];      // #0C2447 — azul marinho profundo
const NAVY_SOFT: [number, number, number] = [40, 70, 110]; // tom intermediário p/ subtítulos
const ACCENT: [number, number, number] = [120, 200, 240];  // azul claro do logo (detalhes)
const TEXT: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 115, 125];
const RULE: [number, number, number] = [220, 225, 232];
const BG_SOFT: [number, number, number] = [245, 247, 250];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

export interface PdfSection {
  title: string;
  /** Bloco textual (paragrafos). */
  paragraphs?: string[];
  /** Pares rótulo/valor (campos). */
  fields?: { label: string; value: string }[];
  /** Tabela opcional. */
  table?: { head: string[]; body: (string | number)[][]; columnStyles?: Record<number, { halign?: 'left' | 'right' | 'center' }> };
  /** Destaque (caixa cinza c/ texto). */
  callout?: string;
}

export interface GofferjePdfOptions {
  /** Texto exibido na capa abaixo do título. */
  documentType: string;        // ex.: "Resumo do Cliente" / "Relatório de Performance"
  clientName: string;
  advisorName?: string;
  reportDate?: string;         // default: hoje em pt-BR
  /** Subtítulo/contexto exibido na capa (1-2 linhas). */
  subtitle?: string;
  /** Resumo executivo destacado (logo após a capa). */
  executiveSummary?: string;
  /** Seções principais. */
  sections: PdfSection[];
  /** Nome final do arquivo (sem extensão). */
  filename: string;
}

/* ───────────────────── helpers ───────────────────── */

const todayPt = () =>
  new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

function setFill(doc: jsPDF, c: [number, number, number]) { doc.setFillColor(c[0], c[1], c[2]); }
function setDraw(doc: jsPDF, c: [number, number, number]) { doc.setDrawColor(c[0], c[1], c[2]); }
function setText(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(c[0], c[1], c[2]); }

/** Logo + faixa fina superior em todas as páginas (exceto capa). */
function drawHeader(doc: jsPDF, advisorName: string) {
  // Logo (proporção quadrada do PNG fornecido)
  try {
    doc.addImage(GOFFERJE_LOGO_BASE64, 'PNG', MARGIN_X, 8, 14, 14);
  } catch { /* logo opcional */ }

  setText(doc, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('GOFFERJE', MARGIN_X + 17, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, MUTED);
  doc.text('INVESTIMENTOS', MARGIN_X + 17, 18.5);

  // Filete fino
  setDraw(doc, RULE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, 25, PAGE_W - MARGIN_X, 25);
}

/** Rodapé: nome do consultor + data + número da página. */
function drawFooter(doc: jsPDF, advisorName: string, reportDate: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    setDraw(doc, RULE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, PAGE_H - 15, PAGE_W - MARGIN_X, PAGE_H - 15);

    setText(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const left = advisorName ? `Consultor: ${advisorName}` : 'Gofferje Investimentos';
    doc.text(left, MARGIN_X, PAGE_H - 9);
    doc.text(reportDate, PAGE_W / 2, PAGE_H - 9, { align: 'center' });
    doc.text(`${i} / ${total}`, PAGE_W - MARGIN_X, PAGE_H - 9, { align: 'right' });
  }
}

/** CAPA dedicada — fundo branco, faixa azul lateral, logo grande centralizada. */
function drawCover(doc: jsPDF, opts: GofferjePdfOptions, reportDate: string) {
  // Faixa lateral esquerda azul-marinho fina
  setFill(doc, NAVY);
  doc.rect(0, 0, 8, PAGE_H, 'F');
  // Faixa lateral direita azul claro accent
  setFill(doc, ACCENT);
  doc.rect(PAGE_W - 2, 0, 2, PAGE_H, 'F');

  // Logo centralizada
  try {
    doc.addImage(GOFFERJE_LOGO_BASE64, 'PNG', PAGE_W / 2 - 22, 38, 44, 44);
  } catch { /* opcional */ }

  setText(doc, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('GOFFERJE INVESTIMENTOS', PAGE_W / 2, 96, { align: 'center' });

  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('CONSULTORIA DE INVESTIMENTOS', PAGE_W / 2, 102, { align: 'center' });

  // Filete decorativo
  setDraw(doc, ACCENT);
  doc.setLineWidth(0.6);
  doc.line(PAGE_W / 2 - 25, 108, PAGE_W / 2 + 25, 108);

  // Título do documento
  setText(doc, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  const title = opts.documentType.toUpperCase();
  doc.text(title, PAGE_W / 2, 138, { align: 'center' });

  // Subtítulo
  if (opts.subtitle) {
    setText(doc, NAVY_SOFT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const sub = doc.splitTextToSize(opts.subtitle, CONTENT_W - 20);
    doc.text(sub, PAGE_W / 2, 150, { align: 'center' });
  }

  // Caixa do cliente
  const boxY = 180;
  setFill(doc, BG_SOFT);
  doc.roundedRect(MARGIN_X + 15, boxY, CONTENT_W - 30, 50, 2, 2, 'F');

  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('PREPARADO PARA', PAGE_W / 2, boxY + 12, { align: 'center' });

  setText(doc, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(opts.clientName || '—', PAGE_W / 2, boxY + 24, { align: 'center' });

  setDraw(doc, RULE);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W / 2 - 30, boxY + 30, PAGE_W / 2 + 30, boxY + 30);

  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(reportDate, PAGE_W / 2, boxY + 38, { align: 'center' });
  if (opts.advisorName) {
    doc.text(`Consultor: ${opts.advisorName}`, PAGE_W / 2, boxY + 44, { align: 'center' });
  }

  // Rodapé da capa
  setText(doc, MUTED);
  doc.setFontSize(7.5);
  doc.text(
    'Documento confidencial — uso exclusivo do cliente. Não constitui recomendação de investimento.',
    PAGE_W / 2,
    PAGE_H - 14,
    { align: 'center' }
  );
}

/** Imprime título de seção. */
function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  setText(doc, NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), MARGIN_X, y);

  setDraw(doc, ACCENT);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_X, y + 1.8, MARGIN_X + 22, y + 1.8);

  return y + 8;
}

/** Garante espaço; senão quebra página e redesenha header. */
function ensureSpace(doc: jsPDF, currentY: number, needed: number, advisorName: string): number {
  if (currentY + needed > PAGE_H - 22) {
    doc.addPage();
    drawHeader(doc, advisorName);
    return 32;
  }
  return currentY;
}

/** Caixa de destaque (executive summary / callout). */
function drawCallout(doc: jsPDF, text: string, y: number): number {
  const lines = doc.splitTextToSize(text, CONTENT_W - 12);
  const h = lines.length * 5 + 8;

  setFill(doc, BG_SOFT);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, h, 1.5, 1.5, 'F');
  // barra lateral accent
  setFill(doc, NAVY);
  doc.rect(MARGIN_X, y, 1.2, h, 'F');

  setText(doc, TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(lines, MARGIN_X + 6, y + 6);

  return y + h + 6;
}

/* ───────────────────── API pública ───────────────────── */

export function generateGofferjePdf(opts: GofferjePdfOptions): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const reportDate = opts.reportDate || todayPt();
  const advisor = opts.advisorName || '';

  // ── CAPA ──
  drawCover(doc, opts, reportDate);

  // ── PÁGINA 2: header + (executive summary opcional) + seções ──
  doc.addPage();
  drawHeader(doc, advisor);
  let y = 32;

  if (opts.executiveSummary) {
    y = drawSectionTitle(doc, 'Sumário Executivo', y);
    y = drawCallout(doc, opts.executiveSummary, y);
    y += 4;
  }

  for (const section of opts.sections) {
    // Espaço mínimo p/ título + 1 conteúdo
    y = ensureSpace(doc, y, 30, advisor);
    y = drawSectionTitle(doc, section.title, y);

    if (section.paragraphs && section.paragraphs.length) {
      for (const p of section.paragraphs) {
        if (!p) continue;
        const lines = doc.splitTextToSize(p, CONTENT_W);
        y = ensureSpace(doc, y, lines.length * 5 + 4, advisor);
        setText(doc, TEXT);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(lines, MARGIN_X, y);
        y += lines.length * 5 + 4;
      }
    }

    if (section.fields && section.fields.length) {
      const visible = section.fields.filter(f => f.value && f.value.trim() !== '' && f.value !== '—');
      if (visible.length) {
        const body = visible.map(f => [f.label, f.value]);
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN_X, right: MARGIN_X },
          body,
          theme: 'plain',
          styles: { fontSize: 9.5, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }, textColor: TEXT, lineColor: RULE, lineWidth: 0 },
          columnStyles: {
            0: { cellWidth: 65, textColor: MUTED, fontStyle: 'normal' },
            1: { cellWidth: CONTENT_W - 65, fontStyle: 'bold', textColor: NAVY },
          },
          didDrawCell: (data) => {
            // Linha sutil entre rows
            if (data.row.index < body.length - 1 && data.column.index === 1) {
              setDraw(doc, RULE);
              doc.setLineWidth(0.15);
              doc.line(MARGIN_X, data.cell.y + data.cell.height, PAGE_W - MARGIN_X, data.cell.y + data.cell.height);
            }
          },
        });
        // @ts-ignore
        y = (doc as any).lastAutoTable.finalY + 6;
      }
    }

    if (section.callout) {
      y = ensureSpace(doc, y, 30, advisor);
      y = drawCallout(doc, section.callout, y);
    }

    if (section.table) {
      y = ensureSpace(doc, y, 30, advisor);
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN_X, right: MARGIN_X },
        head: [section.table.head],
        body: section.table.body,
        theme: 'striped',
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left' },
        styles: { fontSize: 9, cellPadding: 2.2, textColor: TEXT, lineColor: RULE, lineWidth: 0.1 },
        alternateRowStyles: { fillColor: BG_SOFT },
        columnStyles: section.table.columnStyles,
      });
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    y += 2;
  }

  // ── Rodapé em todas as páginas (exceto capa) ──
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, advisor, reportDate);
  }
  // ajusta rodapé da capa (queremos texto institucional, sem nº)
  // já desenhado no drawCover

  doc.save(`${opts.filename}.pdf`);
}
