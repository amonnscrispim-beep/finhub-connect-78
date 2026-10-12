import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QUESTIONS, PRODUCTS, OCCUPATIONS, SOURCES, PROFILE_DESC, ALLOCATIONS } from '@/lib/suitability';

const NAVY: [number, number, number] = [13, 34, 64];
const GOLD: [number, number, number] = [196, 164, 106];
const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '-');
const brl = (v: unknown) => { const n = parseFloat(String(v ?? '')); return isNaN(n) ? '-' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
const lab = (list: [string, string][], v: string) => list.find((x) => x[0] === v)?.[1] || v || '-';
const s = (v: unknown) => (v === undefined || v === null || v === '' ? '-' : String(v));

export interface SuitabilityRecord { person_type: string; investor_profile: string; score: number; form_data: any; completed_at: string; valid_until: string; }

export function generateSuitabilityPDF(rec: SuitabilityRecord, clientName: string) {
  const doc = new jsPDF();
  const f = rec.form_data || {};
  const isPF = rec.person_type === 'PF';
  const profile = rec.investor_profile;
  const table = (startY: number, body: string[][]) => autoTable(doc, {
    startY, body, theme: 'striped', styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }, margin: { left: 20, right: 20, bottom: 20 },
  });
  const title = (t: string) => { doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(t, 20, 25); doc.setFont('helvetica', 'normal'); };

  // Capa
  doc.setFillColor(...NAVY); doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(...GOLD); doc.setFontSize(12); doc.text('GOFFERJÉ INVESTIMENTOS', 105, 60, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(30);
  doc.text('Análise de Perfil', 105, 110, { align: 'center' }); doc.text('do Investidor', 105, 126, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(232, 230, 225); doc.setFontSize(13);
  doc.text('Suitability — Regulamentação CVM', 105, 150, { align: 'center' });
  doc.setFontSize(18); doc.text(doc.splitTextToSize(clientName || 'Cliente', 170), 105, 180, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(170, 170, 170);
  doc.text(isPF ? 'Pessoa Física' : 'Pessoa Jurídica', 105, 198, { align: 'center' });
  doc.text(`Realizado em: ${d(rec.completed_at)}`, 105, 218, { align: 'center' });
  doc.text(`Válido até: ${d(rec.valid_until)}`, 105, 228, { align: 'center' });

  // Resultado
  doc.addPage(); title('Resultado da Análise');
  const colors: Record<string, [number, number, number]> = { conservador: [34, 197, 94], moderado: [59, 130, 246], arrojado: [245, 158, 11], agressivo: [239, 68, 68] };
  doc.setFillColor(...(colors[profile] || [100, 100, 100])); doc.roundedRect(20, 35, 170, 35, 3, 3, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text(profile.toUpperCase(), 105, 51, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.text(`Score: ${rec.score}/100`, 105, 63, { align: 'center' });
  doc.setTextColor(60, 60, 60); doc.setFontSize(10); doc.text(doc.splitTextToSize(PROFILE_DESC[profile] || '', 170), 20, 85);
  doc.setTextColor(...NAVY); doc.setFontSize(12); doc.text('Alocação Sugerida', 20, 108);
  autoTable(doc, { startY: 112, head: [['Classe', 'Faixa recomendada']], body: ALLOCATIONS[profile] || [], styles: { fontSize: 10 }, headStyles: { fillColor: NAVY }, columnStyles: { 1: { halign: 'center' } }, margin: { left: 20, right: 20 } });

  // Cadastro
  doc.addPage(); title(isPF ? 'Dados Cadastrais' : 'Dados da Empresa');
  const addr = [f.street, f.number].filter(Boolean).join(', ') + (f.complement ? ` - ${f.complement}` : '');
  table(32, isPF ? [
    ['Nome', s([f.firstName, f.lastName].filter(Boolean).join(' '))], ['CPF', s(f.cpf)], ['Email', s(f.email)], ['Telefone', s(f.phone)],
    ['Data de nascimento', f.birthDate ? d(`${f.birthDate}T12:00:00`) : '-'], ['Endereço', s(addr)], ['Cidade/UF', s([f.city, f.state].filter(Boolean).join(' - '))],
    ['CEP', s(f.cep)], ['Pessoa Politicamente Exposta', f.isPEP === 'Sim' ? 'Sim' : 'Não'],
  ] : [
    ['Razão Social', s(f.companyName)], ['CNPJ', s(f.cnpj)], ['Setor', s(f.sector)], ['Colaboradores', s(f.employeeCount)],
    ['Endereço', s(addr)], ['Cidade/UF', s([f.city, f.state].filter(Boolean).join(' - '))],
    ['Representante', s([f.repFirstName, f.repLastName].filter(Boolean).join(' '))], ['Email do representante', s(f.repEmail)],
    ['Tipo', f.repType === 'procurador' ? 'Procurador Legal' : f.repType ? 'Proprietário' : '-'],
  ]);

  // Finanças
  const y = (doc as any).lastAutoTable.finalY + 14;
  doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(isPF ? 'Ocupação e Finanças' : 'Finanças da Empresa', 20, y); doc.setFont('helvetica', 'normal');
  table(y + 5, isPF ? [
    ['Ocupação', lab(OCCUPATIONS, f.occupation)], ['Profissão', s(f.profession)], ['Renda mensal', brl(f.monthlyIncome)],
    ['Total em investimentos', brl(f.totalInvestments)], ['Outros patrimônios', f.hasOtherAssets === 'Sim' ? brl(f.otherAssetsValue) : 'Não'],
    ['Fontes de recursos', (f.incomeSources || []).map((x: string) => lab(SOURCES, x)).join(', ') || '-'],
  ] : [
    ['Faturamento mensal', brl(f.monthlyRevenue)], ['Caixa disponível', brl(f.availableCash)], ['Lucro líquido (12 meses)', brl(f.netProfit12m)], ['Dívida líquida', brl(f.currentNetDebt)],
  ]);

  // Respostas
  doc.addPage(); title('Respostas — Perfil de Investimento');
  autoTable(doc, {
    startY: 32, head: [['Pergunta', 'Resposta']], headStyles: { fillColor: NAVY }, styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75 } }, margin: { left: 20, right: 20, bottom: 20 },
    body: [
      ['Produtos que conhece', (f.knownProducts || []).map((p: string) => lab(PRODUCTS, p)).join(', ') || 'Nenhum'],
      ...QUESTIONS.map((q) => [q.title, q.opts.find((o) => o[0] === f[q.key])?.[1] || '-']),
    ],
  });

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`Gofferjé Investimentos — Suitability gerado em ${new Date().toLocaleDateString('pt-BR')} — Página ${i} de ${n}`, 105, 288, { align: 'center' });
  }
  const url = URL.createObjectURL(doc.output('blob'));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Suitability_${(clientName || 'Cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
