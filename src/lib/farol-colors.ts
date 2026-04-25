// Shared FAROL palette — BTG Pactual inspired (navy → light blue gradient).
// Use this single source of truth in donut, legend, pills/tabs, and PDF.
export const FAROL_COLORS = {
  F: '#0B2859', // Fundos Imobiliários — azul marinho escuro
  A: '#1A4A9C', // Ações Brasil — azul médio-escuro
  R: '#2E6FD8', // Renda Fixa — azul médio
  O: '#6B9FEF', // Oportunidades — azul claro
  L: '#A8C8F8', // Lá Fora / Internacional — azul bem claro
} as const;

export type FarolLetter = keyof typeof FAROL_COLORS;

// Hex -> [r, g, b] for libraries (e.g. jsPDF) that need RGB tuples.
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export const FAROL_COLORS_RGB: Record<FarolLetter, [number, number, number]> = {
  F: hexToRgb(FAROL_COLORS.F),
  A: hexToRgb(FAROL_COLORS.A),
  R: hexToRgb(FAROL_COLORS.R),
  O: hexToRgb(FAROL_COLORS.O),
  L: hexToRgb(FAROL_COLORS.L),
};
