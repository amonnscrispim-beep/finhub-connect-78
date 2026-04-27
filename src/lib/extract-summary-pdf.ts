/**
 * Gerador de PDF do Resumo Técnico do Extrato do Cliente.
 * Estilo institucional Gofferje (azul-marinho + branco, tipografia elegante).
 */
import jsPDF from 'jspdf';
import { GOFFERJE_LOGO_BASE64 } from '@/assets/gofferje-logo-base64';

const NAVY: [number, number, number] = [12, 36, 71];
const ACCENT: [number, number, number] = [120, 200, 240];
const TEXT: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 115, 125];
const RULE: [number, number, number] = [220, 225, 232];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

interface Opts {
  clientName: string;
  snapshotDate: string;
  technicalSummary: string;
  consultantComments: string;
  advisorName: string;
  filename: string;
}

const setFill = (d: jsPDF, c: [number, number, number]) => d.setFillColor(c[0], c[1], c[2]);
const setDraw = (d: jsPDF, c: [number, number, number]) => d.setDrawColor(c[0], c[1], c[2]);
const setText = (d: jsPDF, c: [number, number, number]) => d.setTextColor(c[0], c[1], c[2]);
const today = () =>
  new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

function drawHeader(doc: jsPDF) {
  try { doc.addImage(GOFFERJE_LOGO_BASE64, 'PNG', MARGIN_X, 8, 14, 14); } catch {}
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('GOFFERJE', MARGIN_X + 17, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setText(doc, MUTED);
  doc.text('INVESTIMENTOS', MARGIN_X + 17, 18.5);
  setDraw(doc, RULE); doc.setLineWidth(0.3);
  doc.line(MARGIN_X, 25, PAGE_W - MARGIN_X, 25);
}

function drawFooter(doc: jsPDF, advisor: string, page: number, total: number) {
  doc.setPage(page);
  setDraw(doc, RULE); doc.setLineWidth(0.3);
  doc.line(MARGIN_X, PAGE_H - 15, PAGE_W - MARGIN_X, PAGE_H - 15);
  setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(advisor ? `Consultor: ${advisor}` : 'Gofferje Investimentos', MARGIN_X, PAGE_H - 9);
  doc.text(today(), PAGE_W / 2, PAGE_H - 9, { align: 'center' });
  doc.text(`${page} / ${total}`, PAGE_W - MARGIN_X, PAGE_H - 9, { align: 'right' });
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 22) {
    doc.addPage();
    drawHeader(doc);
    return 32;
  }
  return y;
}

function writeBlock(doc: jsPDF, title: string, body: string, y: number): number {
  y = ensureSpace(doc, y, 18);
  setFill(doc, NAVY);
  doc.rect(MARGIN_X, y, 3, 6, 'F');
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(title.toUpperCase(), MARGIN_X + 6, y + 4.6);
  y += 9;

  setText(doc, TEXT); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const lines = doc.splitTextToSize(body || '—', CONTENT_W) as string[];
  for (const ln of lines) {
    y = ensureSpace(doc, y, 5.2);
    doc.text(ln, MARGIN_X, y);
    y += 5;
  }
  return y + 5;
}

export async function generateExtractSummaryPdf(opts: Opts) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Capa simples
  setFill(doc, NAVY); doc.rect(0, 0, 8, PAGE_H, 'F');
  setFill(doc, ACCENT); doc.rect(PAGE_W - 2, 0, 2, PAGE_H, 'F');
  try { doc.addImage(GOFFERJE_LOGO_BASE64, 'PNG', PAGE_W / 2 - 22, 50, 44, 44); } catch {}
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('GOFFERJE INVESTIMENTOS', PAGE_W / 2, 110, { align: 'center' });
  setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('CONSULTORIA DE INVESTIMENTOS', PAGE_W / 2, 116, { align: 'center' });
  setDraw(doc, ACCENT); doc.setLineWidth(0.6);
  doc.line(PAGE_W / 2 - 25, 122, PAGE_W / 2 + 25, 122);
  setText(doc, NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.text('RESUMO TÉCNICO DA CARTEIRA', PAGE_W / 2, 150, { align: 'center' });
  setText(doc, TEXT); doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
  doc.text(opts.clientName || '—', PAGE_W / 2, 162, { align: 'center' });
  setText(doc, MUTED); doc.setFontSize(10);
  doc.text(`Data de referência: ${opts.snapshotDate}`, PAGE_W / 2, 170, { align: 'center' });

  // Conteúdo
  doc.addPage();
  drawHeader(doc);
  let y = 32;
  y = writeBlock(doc, 'Análise Consolidada', opts.technicalSummary, y);
  if (opts.consultantComments && opts.consultantComments.trim()) {
    y = writeBlock(doc, 'Comentários do Consultor', opts.consultantComments, y);
  }

  // Rodapés
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) drawFooter(doc, opts.advisorName, p, total);

  doc.save(opts.filename);
}
