import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, Plus, Trash2, MessageSquare, ChevronUp, Calendar, FileText } from 'lucide-react';
import { generateConhecerPdf } from '@/lib/pdf-generators';
import { BirthDatePicker } from '@/components/ui/birth-date-picker';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ConhecerClienteData, ConhecerChildInfo, OtherIncomeItem, AnnualExpenseItem, StrategicPillar, OtherInstitutionItem, RealEstateCard, PatrimonioTableItem } from './types';
import { PATRIMONIO_CATEGORIES, getCategoryGroup } from './types';
import { calculateProgress, getProgressColor, getProgressBgColor } from './types';

const genId = () => Math.random().toString(36).substring(2, 10);

// FX rates (editable constant)
const FX_RATES: Record<string, { rate: number; symbol: string; label: string }> = {
  BRL: { rate: 1, symbol: 'R$', label: 'BRL (R$)' },
  USD: { rate: 5.24, symbol: '$', label: 'USD ($)' },
  EUR: { rate: 6.09, symbol: '€', label: 'EUR (€)' },
  GBP: { rate: 7.03, symbol: '£', label: 'GBP (£)' },
  ARS: { rate: 0.0037, symbol: '$', label: 'ARS ($)' },
};

interface Props {
  data: ConhecerClienteData;
  onChange: (data: ConhecerClienteData) => void;
  hasChildrenFromBloco1?: boolean;
  clientAge?: number;
  clientName?: string;
  advisorName?: string;
}

// === Shared UI helpers ===
function ConsultantNote({ children }: { children: string }) {
  return <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">{children}</p>;
}

function CommentButton({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(!!value);
  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <MessageSquare className="w-4 h-4" />
        <span>{value ? 'Ver comentário do consultor' : 'Adicionar comentário do consultor'}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Comentário do consultor..." className="crm-input min-h-[80px] mt-2" />
      )}
    </div>
  );
}

function BrlEquivalent({ value, currency }: { value: string; currency: string }) {
  if (currency === 'BRL' || !value) return null;
  const num = parseFloat(value) || 0;
  if (num === 0) return null;
  const brlValue = num * (FX_RATES[currency]?.rate || 1);
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(brlValue);
  return <p className="text-[11px] text-muted-foreground mt-0.5">≈ {fmt}</p>;
}

const REVENUE_SOURCES = ['Salário', 'Pró-labore', 'Distribuição de lucros', 'Dividendos', 'Aluguéis', 'Honorários', 'Outros'];
const PRIORITIES = ['Segurança / preservação', 'Crescimento do patrimônio', 'Renda passiva', 'Liquidez', 'Planejamento sucessório', 'Proteção patrimonial', 'Diversificação internacional'];
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#64748b', '#ef4444', '#06b6d4'];

export function ConhecerClienteModule({ data, onChange, hasChildrenFromBloco1, clientAge = 0, clientName = '', advisorName = '' }: Props) {
  const update = (partial: Partial<ConhecerClienteData>) => onChange({ ...data, ...partial });

  const progress = useMemo(() => calculateProgress(data), [data]);
  const progressColor = getProgressColor(progress);

  const selectedCurrency = data.selectedCurrency || 'BRL';
  const fxRate = FX_RATES[selectedCurrency]?.rate || 1;
  const currencySymbol = FX_RATES[selectedCurrency]?.symbol || 'R$';

  // Convert foreign currency value to BRL for internal storage
  const toBRL = (foreignValue: string) => {
    const num = parseFloat(foreignValue) || 0;
    return (num * fxRate).toString();
  };

  // Auto-calculations
  const totalRevenue = useMemo(() => {
    const main = parseFloat(data.monthlyRevenue) || 0;
    const other = data.otherIncomes.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    return main + other;
  }, [data.monthlyRevenue, data.otherIncomes]);

  const monthlySurplus = useMemo(() => {
    return totalRevenue - (parseFloat(data.livingCost) || 0);
  }, [totalRevenue, data.livingCost]);

  const emergencyClass = useMemo(() => {
    const months = parseFloat(data.emergencyMonths) || 0;
    if (months < 3) return { label: '⚠️ Crítico', color: 'text-red-500 bg-red-500/10' };
    if (months <= 6) return { label: 'Regular', color: 'text-yellow-500 bg-yellow-500/10' };
    return { label: '✅ Adequado', color: 'text-green-500 bg-green-500/10' };
  }, [data.emergencyMonths]);

  // Calculate age from birthDate
  const calculatedAge = useMemo(() => {
    if (!data.birthDate) return null;
    const birth = new Date(data.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, [data.birthDate]);

  const effectiveAge = useMemo(() => calculatedAge ?? clientAge, [calculatedAge, clientAge]);

  const retirementCalc = useMemo(() => {
    const income = parseFloat(data.retirementIncome) || 0;
    const years = parseFloat(data.retirementYears) || 0;
    const rate = parseFloat(data.retirementWithdrawalRate) || 6;
    if (!income || !years) return null;
    const correctedIncome = income * Math.pow(1.045, years);
    const annualCorrected = correctedIncome * 12;
    const requiredPatrimony = annualCorrected / (rate / 100);
    const retirementAge = effectiveAge + years;
    return { correctedIncome, annualCorrected, requiredPatrimony, retirementAge };
  }, [data.retirementIncome, data.retirementYears, data.retirementWithdrawalRate, effectiveAge]);

  // Bloco 2 — Patrimônio Total from table items
  const patrimonioTableItems = data.patrimonioTableItems || [];

  const patrimonioByGroup = useMemo(() => {
    const groups: Record<string, number> = { financeiro: 0, reserva: 0, imobiliario: 0, societario: 0, outros: 0 };
    patrimonioTableItems.forEach(item => {
      const val = parseFloat(item.value) || 0;
      const group = getCategoryGroup(item.category);
      groups[group] = (groups[group] || 0) + val;
    });
    return groups;
  }, [patrimonioTableItems]);

  const patrimonioFinanceiroSubtotals = useMemo(() => {
    const rfCategories = ['Poupança', 'CDB/LCI/LCA', 'Tesouro Direto', 'Renda Fixa (outros)'];
    const rvCategories = ['Ações', 'FII', 'FIA/Fundos Multimercado', 'Criptoativos', 'Renda Variável (outros)'];
    const prevCategories = ['Previdência Privada'];
    let rf = 0, rv = 0, prev = 0;
    patrimonioTableItems.forEach(item => {
      const val = parseFloat(item.value) || 0;
      if (rfCategories.includes(item.category)) rf += val;
      else if (rvCategories.includes(item.category)) rv += val;
      else if (prevCategories.includes(item.category)) prev += val;
    });
    return { rendaFixa: rf, rendaVariavel: rv, previdencia: prev };
  }, [patrimonioTableItems]);

  const patrimonioTotal = useMemo(() => {
    return Object.values(patrimonioByGroup).reduce((s, v) => s + v, 0);
  }, [patrimonioByGroup]);

  const liquidezImediataTotal = useMemo(() => {
    return patrimonioTableItems
      .filter(item => item.liquidezImediata === 'Sim')
      .reduce((s, item) => s + (parseFloat(item.value) || 0), 0);
  }, [patrimonioTableItems]);

  // Auto-update legacy totalPatrimony field
  useEffect(() => {
    if (patrimonioTotal > 0) {
      const current = parseFloat(data.totalPatrimony) || 0;
      if (Math.abs(current - patrimonioTotal) > 0.01) {
        update({ totalPatrimony: patrimonioTotal.toString() });
      }
    }
  }, [patrimonioTotal]);

  // Sync patrimônio financeiro legacy field
  useEffect(() => {
    if (patrimonioByGroup.financeiro > 0) {
      const current = parseFloat(data.patrimonioFinanceiro) || 0;
      if (Math.abs(current - patrimonioByGroup.financeiro) > 0.01) {
        update({ patrimonioFinanceiro: patrimonioByGroup.financeiro.toString() });
      }
    }
  }, [patrimonioByGroup.financeiro]);

  // Sync reserva de emergência legacy field
  useEffect(() => {
    if (patrimonioByGroup.reserva > 0) {
      const current = parseFloat(data.emergencyReserveAmount) || 0;
      if (Math.abs(current - patrimonioByGroup.reserva) > 0.01) {
        update({ emergencyReserveAmount: patrimonioByGroup.reserva.toString() });
      }
    }
  }, [patrimonioByGroup.reserva]);

  // Sync patrimônio imobiliário legacy field
  useEffect(() => {
    if (patrimonioByGroup.imobiliario > 0) {
      const current = parseFloat(data.patrimonioImobiliario) || 0;
      if (Math.abs(current - patrimonioByGroup.imobiliario) > 0.01) {
        update({ patrimonioImobiliario: patrimonioByGroup.imobiliario.toString() });
      }
    }
  }, [patrimonioByGroup.imobiliario]);

  // Sync participações societárias legacy field
  useEffect(() => {
    if (patrimonioByGroup.societario > 0) {
      const current = parseFloat(data.participacoesSocietarias) || 0;
      if (Math.abs(current - patrimonioByGroup.societario) > 0.01) {
        update({ participacoesSocietarias: patrimonioByGroup.societario.toString() });
      }
    }
  }, [patrimonioByGroup.societario]);

  // Bloco 8 allocation total — now with 3 subcategories instead of rendaFixa
  const allocationTotal = useMemo(() => {
    return [data.posFixadoPct, data.preFixadoPct, data.indexadoInflacaoPct, data.rendaVariavelPct, data.rendaPassivaPct, data.internacionalPct, data.alternativosPct, data.caixaPct]
      .reduce((s, v) => s + (parseFloat(v) || 0), 0);
  }, [data.posFixadoPct, data.preFixadoPct, data.indexadoInflacaoPct, data.rendaVariavelPct, data.rendaPassivaPct, data.internacionalPct, data.alternativosPct, data.caixaPct]);

  const pieData = useMemo(() => {
    const items = [
      { name: 'Pós-Fixado', value: parseFloat(data.posFixadoPct) || 0 },
      { name: 'Pré-Fixado', value: parseFloat(data.preFixadoPct) || 0 },
      { name: 'Inflação', value: parseFloat(data.indexadoInflacaoPct) || 0 },
      { name: 'Renda Variável', value: parseFloat(data.rendaVariavelPct) || 0 },
      { name: 'Renda Passiva', value: parseFloat(data.rendaPassivaPct) || 0 },
      { name: 'Internacional', value: parseFloat(data.internacionalPct) || 0 },
      { name: 'Alternativos', value: parseFloat(data.alternativosPct) || 0 },
      { name: 'Caixa', value: parseFloat(data.caixaPct) || 0 },
    ];
    return items.filter(i => i.value > 0);
  }, [data.posFixadoPct, data.preFixadoPct, data.indexadoInflacaoPct, data.rendaVariavelPct, data.rendaPassivaPct, data.internacionalPct, data.alternativosPct, data.caixaPct]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Helper for repeatable items
  const addChild = () => update({ children: [...data.children, { id: genId(), name: '', age: '' }] });
  const removeChild = (id: string) => update({ children: data.children.filter(c => c.id !== id) });
  const updateChild = (id: string, field: keyof ConhecerChildInfo, value: string) =>
    update({ children: data.children.map(c => c.id === id ? { ...c, [field]: value } : c) });

  const addOtherIncome = () => update({ otherIncomes: [...data.otherIncomes, { id: genId(), description: '', value: '' }] });
  const removeOtherIncome = (id: string) => update({ otherIncomes: data.otherIncomes.filter(i => i.id !== id) });
  const updateOtherIncome = (id: string, field: string, value: string) =>
    update({ otherIncomes: data.otherIncomes.map(i => i.id === id ? { ...i, [field]: value } : i) });

  const addAnnualExpense = () => update({ annualExpenses: [...data.annualExpenses, { id: genId(), description: '', value: '' }] });
  const removeAnnualExpense = (id: string) => update({ annualExpenses: data.annualExpenses.filter(e => e.id !== id) });
  const updateAnnualExpense = (id: string, field: string, value: string) =>
    update({ annualExpenses: data.annualExpenses.map(e => e.id === id ? { ...e, [field]: value } : e) });

  const addPillar = () => update({ strategicPillars: [...data.strategicPillars, { id: genId(), name: '' }] });
  const removePillar = (id: string) => update({ strategicPillars: data.strategicPillars.filter(p => p.id !== id) });
  const updatePillar = (id: string, name: string) =>
    update({ strategicPillars: data.strategicPillars.map(p => p.id === id ? { ...p, name } : p) });

  // Multi-institution helpers
  const institutionsList = data.otherInstitutionsList || [];
  const addInstitution = () => update({ otherInstitutionsList: [...institutionsList, { id: genId(), institution: '', value: '' }] });
  const removeInstitution = (id: string) => update({ otherInstitutionsList: institutionsList.filter(i => i.id !== id) });
  const updateInstitution = (id: string, field: keyof OtherInstitutionItem, value: string) =>
    update({ otherInstitutionsList: institutionsList.map(i => i.id === id ? { ...i, [field]: value } : i) });

  // Real estate cards helpers
  const realEstateCards = data.realEstateCards || [];
  const addRealEstateCard = () => update({ realEstateCards: [...realEstateCards, { id: genId(), description: '', purpose: '', value: '' }] });
  const removeRealEstateCard = (id: string) => update({ realEstateCards: realEstateCards.filter(c => c.id !== id) });
  const updateRealEstateCard = (id: string, field: keyof RealEstateCard, value: string) =>
    update({ realEstateCards: realEstateCards.map(c => c.id === id ? { ...c, [field]: value } : c) });

  // Patrimônio table helpers
  const addPatrimonioItem = () => {
    const newItem: PatrimonioTableItem = { id: genId(), description: '', category: '', value: '', liquidezImediata: '' };
    update({ patrimonioTableItems: [...patrimonioTableItems, newItem] });
  };
  const removePatrimonioItem = (id: string) => update({ patrimonioTableItems: patrimonioTableItems.filter(i => i.id !== id) });
  const updatePatrimonioItem = (id: string, field: keyof PatrimonioTableItem, value: string) => {
    const updated = patrimonioTableItems.map(i => {
      if (i.id !== id) return i;
      const item = { ...i, [field]: value };
      // Auto-set liquidez based on category
      if (field === 'category') {
        const financialCategories = [...PATRIMONIO_CATEGORIES.financeiro.items, ...PATRIMONIO_CATEGORIES.reserva.items];
        item.liquidezImediata = financialCategories.includes(value) ? 'Sim' : 'Não';
      }
      return item;
    });
    update({ patrimonioTableItems: updated });
  };

  // NumChildren change handler
  const handleNumChildrenChange = (val: string) => {
    update({ numChildren: val, hasChildren: val === 'Nenhum' ? 'Não' : 'Sim' });
    if (val === 'Nenhum') {
      update({ children: [], numChildren: val, hasChildren: 'Não' });
    } else {
      const count = val === '4+' ? 4 : parseInt(val) || 0;
      const current = data.children || [];
      if (current.length < count) {
        const newChildren = [...current];
        for (let i = current.length; i < count; i++) {
          newChildren.push({ id: genId(), name: '', age: '' });
        }
        update({ children: newChildren, numChildren: val, hasChildren: 'Sim' });
      } else {
        update({ numChildren: val, hasChildren: 'Sim' });
      }
    }
  };

  // Collapsible state per block
  const [openBlocks, setOpenBlocks] = useState<Record<number, boolean>>({});
  const toggleBlock = (n: number) => setOpenBlocks(prev => ({ ...prev, [n]: !prev[n] }));

  // Auto-open Bloco 6 when succession = Sim in Bloco 3
  useEffect(() => {
    if (data.successionThought === 'Sim') {
      setOpenBlocks(prev => ({ ...prev, 6: true }));
    }
  }, [data.successionThought]);

  const renderBlock = (num: number, title: string, content: React.ReactNode) => (
    <Collapsible open={!!openBlocks[num]} onOpenChange={() => toggleBlock(num)}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        <span className="font-semibold text-foreground text-sm">{`BLOCO ${num} — ${title}`}</span>
        {openBlocks[num] ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pt-4 space-y-4">{content}</div>
      </CollapsibleContent>
    </Collapsible>
  );

  const showBloco6 = data.successionThought === 'Sim';

  // All patrimônio categories flattened for select
  const allPatrimonioCategories = Object.entries(PATRIMONIO_CATEGORIES).map(([, group]) => ({
    label: group.label,
    items: group.items,
  }));

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Perfil</span>
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <span className={`text-sm font-bold ${progressColor}`}>{progress}% completo</span>
        <Button type="button" variant="outline" size="sm" className="gap-2 ml-2" onClick={() => generateConhecerPdf(data, clientName || data.fullName, advisorName)}>
          <FileText className="w-4 h-4" />
          Gerar PDF Resumo
        </Button>
      </div>

      <Tabs defaultValue="reuniao1" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reuniao1">1ª Reunião</TabsTrigger>
          <TabsTrigger value="reuniao2">2ª Reunião</TabsTrigger>
        </TabsList>

        <TabsContent value="reuniao1" className="space-y-3 mt-4">
          {/* === BLOCO 1 — Dados Pessoais e Perfil === */}
          {renderBlock(1, 'Dados Pessoais e Perfil', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={data.fullName} onChange={(e) => update({ fullName: e.target.value })} className="crm-input" placeholder="Nome completo do cliente" />
              </div>

              {/* Data nascimento + Idade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de nascimento</Label>
                  <BirthDatePicker
                    value={data.birthDate ? new Date(data.birthDate + 'T00:00:00') : null}
                    onChange={(date) => update({ birthDate: date ? date.toISOString().split('T')[0] : '' })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Idade</Label>
                  {calculatedAge !== null ? (
                    <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/50 text-sm">
                      <span className="font-medium">{calculatedAge} anos</span>
                    </div>
                  ) : (
                    <Input
                      type="number"
                      value={data.manualAge}
                      onChange={(e) => update({ manualAge: e.target.value })}
                      className="crm-input"
                      placeholder="Idade"
                    />
                  )}
                </div>
              </div>

              {/* Profissão */}
              <div className="space-y-2">
                <Label>O que você faz profissionalmente hoje?</Label>
                <Input value={data.profession} onChange={(e) => update({ profession: e.target.value })} className="crm-input" placeholder="Profissão / atividade" />
              </div>

              {/* Sobre você */}
              <div className="space-y-2">
                <Label>Conte-me um pouco sobre você.</Label>
                <Textarea value={data.aboutYourself} onChange={(e) => update({ aboutYourself: e.target.value })} className="crm-input min-h-[80px]" placeholder="Trajetória, experiências marcantes..." />
              </div>

              {/* Hobbies */}
              <div className="space-y-2">
                <Label>Fora do trabalho, o que você gosta de fazer? Quais são seus hobbies?</Label>
                <Textarea value={data.hobbies} onChange={(e) => update({ hobbies: e.target.value })} className="crm-input min-h-[60px]" placeholder="Hobbies, atividades de lazer..." />
              </div>

              {/* === Seção: Estrutura Familiar === */}
              <div className="border-t border-border pt-4 space-y-4">
                <h5 className="text-sm font-medium text-foreground">Estrutura Familiar</h5>

                {/* Casado? */}
                <div className="space-y-2">
                  <Label>Você é casado(a)?</Label>
                  <RadioGroup value={data.isMarried} onValueChange={(v) => update({ isMarried: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                </div>

                {data.isMarried === 'Sim' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Regime de bens</Label>
                        <Select value={data.marriageRegime} onValueChange={(v) => update({ marriageRegime: v })}>
                          <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {['Comunhão Parcial', 'Comunhão Universal', 'Separação Total', 'Participação Final nos Aquestos'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Nome do cônjuge</Label>
                        <Input value={data.spouseName} onChange={(e) => update({ spouseName: e.target.value })} className="crm-input" placeholder="Nome do cônjuge" />
                      </div>
                    </div>
                  </div>
                )}

                {data.isMarried === 'Não' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-2">
                    <Label className="text-xs">Observações sobre estado civil (solteiro, divorciado, viúvo...)</Label>
                    <Textarea value={data.civilStatusNotes} onChange={(e) => update({ civilStatusNotes: e.target.value })} className="crm-input min-h-[60px]" placeholder="Ex: Divorciado(a) desde 2020..." />
                  </div>
                )}

                {/* Filhos */}
                <div className="space-y-2">
                  <Label>Quantos filhos você tem?</Label>
                  <RadioGroup value={data.numChildren || ''} onValueChange={handleNumChildrenChange} className="flex gap-3 flex-wrap">
                    {['Nenhum', '1', '2', '3', '4+'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <RadioGroupItem value={opt} /> {opt}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {data.numChildren && data.numChildren !== 'Nenhum' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-2">
                    {data.children.map((child, i) => (
                      <div key={child.id} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Nome do filho(a) {i + 1}</Label>
                          <Input value={child.name} onChange={(e) => updateChild(child.id, 'name', e.target.value)} className="crm-input" placeholder="Nome" />
                        </div>
                        <div className="w-32 space-y-1">
                          <Label className="text-xs">Idade / ano nasc.</Label>
                          <Input value={child.age} onChange={(e) => updateChild(child.id, 'age', e.target.value)} className="crm-input" placeholder="Ex: 12 ou 2012" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeChild(child.id)} className="h-9 w-9 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    {data.numChildren === '4+' && (
                      <Button type="button" variant="outline" size="sm" onClick={addChild}><Plus className="w-4 h-4 mr-1" />Adicionar filho</Button>
                    )}
                  </div>
                )}
              </div>

              {/* === Seção: Perfil Financeiro Familiar === */}
              <div className="border-t border-border pt-4 space-y-4">
                <h5 className="text-sm font-medium text-foreground">Perfil Financeiro Familiar</h5>
                <div className="space-y-2">
                  <Label>Quem participa das decisões financeiras na sua família? Tem alguém (cônjuge, sócio, contador, advogado) que você gosta de consultar antes de decisões maiores?</Label>
                  <Textarea value={data.financialDecisionMakers} onChange={(e) => update({ financialDecisionMakers: e.target.value })} className="crm-input min-h-[60px]" />
                </div>
                <div className="space-y-2">
                  <Label>Como você descreveria sua relação com dinheiro ao longo da vida?</Label>
                  <Textarea value={data.moneyRelationship} onChange={(e) => update({ moneyRelationship: e.target.value })} className="crm-input min-h-[60px]" />
                </div>
              </div>

              {/* === Seção: Como nos Encontrou === */}
              <div className="border-t border-border pt-4 space-y-2">
                <h5 className="text-sm font-medium text-foreground">Como nos Encontrou</h5>
                <div className="space-y-2">
                  <Label>Como você chegou até mim / como conheceu o escritório?</Label>
                  <Input value={data.howFoundUs} onChange={(e) => update({ howFoundUs: e.target.value })} className="crm-input" placeholder="Indicação, redes sociais, evento..." />
                </div>
              </div>
            </div>
            <CommentButton value={data.bloco1Comment} onChange={(v) => update({ bloco1Comment: v })} />
          </>)}

          {/* === BLOCO 2 — Situação Patrimonial e Investimentos === */}
          {renderBlock(2, 'Situação Patrimonial e Investimentos', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">

              {/* === Seção: Bens e Patrimônio === */}
              <h5 className="text-sm font-medium text-foreground">Bens e Patrimônio</h5>

              <div className="space-y-2">
                <Label>Você possui imóveis? São para morar ou para alugar?</Label>
                <RadioGroup value={data.hasRealEstate} onValueChange={(v) => update({ hasRealEstate: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
              </div>
              {data.hasRealEstate === 'Sim' && (
                <div className="p-3 bg-card rounded-lg border border-border space-y-3">
                  {realEstateCards.map((card, i) => (
                    <div key={card.id} className="p-3 bg-muted/20 rounded-lg border border-border space-y-2 relative">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRealEstateCard(card.id)} className="absolute top-2 right-2 h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                      <div className="space-y-1">
                        <Label className="text-xs">Descrição do imóvel</Label>
                        <Input value={card.description} onChange={(e) => updateRealEstateCard(card.id, 'description', e.target.value)} className="crm-input" placeholder="Ex: Apartamento 3 quartos em SP" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Finalidade</Label>
                          <Select value={card.purpose} onValueChange={(v) => updateRealEstateCard(card.id, 'purpose', v)}>
                            <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {['Moradia própria', 'Aluguel', 'Veraneio', 'Terreno'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor aproximado (R$)</Label>
                          <CurrencyInput value={card.value} onChange={(v) => updateRealEstateCard(card.id, 'value', v)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addRealEstateCard}><Plus className="w-4 h-4 mr-1" />Adicionar imóvel</Button>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tem outros bens importantes? (Carros, embarcações, obras de arte...)</Label>
                <RadioGroup value={data.hasOtherAssets} onValueChange={(v) => update({ hasOtherAssets: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.hasOtherAssets === 'Sim' && (
                  <Textarea value={data.otherAssetsDetails} onChange={(e) => update({ otherAssetsDetails: e.target.value })} className="crm-input min-h-[60px]" placeholder="Descreva os bens..." />
                )}
              </div>

              {/* === Seção: Vida Profissional e Empresarial === */}
              <div className="border-t border-border pt-4 space-y-4">
                <h5 className="text-sm font-medium text-foreground">Vida Profissional e Empresarial</h5>
                <div className="space-y-2">
                  <Label>Você é CLT ou PJ?</Label>
                  <RadioGroup value={data.employmentType} onValueChange={(v) => update({ employmentType: v })} className="flex gap-3 flex-wrap">
                    {['CLT', 'PJ', 'Autônomo', 'Aposentado'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={opt} /> {opt}</label>
                    ))}
                  </RadioGroup>
                </div>

                {data.employmentType === 'CLT' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Salário mensal líquido</Label>
                      <CurrencyInput value={data.cltSalary} onChange={(v) => update({ cltSalary: v })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tem plano de crescimento / promoção?</Label>
                      <Input value={data.cltGrowthPlan} onChange={(e) => update({ cltGrowthPlan: e.target.value })} className="crm-input" placeholder="Descreva perspectivas..." />
                    </div>
                  </div>
                )}

                {data.employmentType === 'PJ' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">A renda é Pro-labore, Distribuição de Lucros ou Ambos?</Label>
                      <RadioGroup value={data.pjIncomeType} onValueChange={(v) => update({ pjIncomeType: v })} className="flex gap-3 flex-wrap">
                        {['Pro-labore', 'Distribuição de Lucros', 'Ambos'].map(opt => (
                          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={opt} /> {opt}</label>
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Retirada mensal aproximada (R$)</Label>
                        <CurrencyInput value={data.pjMonthlyWithdrawal} onChange={(v) => update({ pjMonthlyWithdrawal: v })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Setor / ramo de atuação</Label>
                        <Input value={data.pjSector} onChange={(e) => update({ pjSector: e.target.value })} className="crm-input" placeholder="Ex: Tecnologia, Saúde..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Tem sócios?</Label>
                      <RadioGroup value={data.hasPjPartners} onValueChange={(v) => update({ hasPjPartners: v })} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                      </RadioGroup>
                    </div>
                    {data.hasPjPartners === 'Sim' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Quem é o Sócio Majoritário?</Label>
                          <Input value={data.pjMajorityPartner} onChange={(e) => update({ pjMajorityPartner: e.target.value })} className="crm-input" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nº de funcionários</Label>
                          <Input type="number" value={data.pjEmployeeCount} onChange={(e) => update({ pjEmployeeCount: e.target.value })} className="crm-input" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor aprox. da empresa (R$)</Label>
                          <CurrencyInput value={data.pjCompanyValue} onChange={(v) => update({ pjCompanyValue: v })} />
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Quais são seus maiores medos ou preocupações com a empresa?</Label>
                      <Textarea value={data.pjConcerns} onChange={(e) => update({ pjConcerns: e.target.value })} className="crm-input min-h-[60px]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Pretende renovar maquinário ou trocar frota?</Label>
                      <RadioGroup value={data.pjRenewEquipment} onValueChange={(v) => update({ pjRenewEquipment: v })} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                      </RadioGroup>
                    </div>
                    {data.pjRenewEquipment === 'Sim' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Em quanto tempo?</Label>
                          <Input value={data.pjRenewTimeline} onChange={(e) => update({ pjRenewTimeline: e.target.value })} className="crm-input" placeholder="Ex: 6 meses, 1 ano" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor estimado (R$)</Label>
                          <CurrencyInput value={data.pjRenewValue} onChange={(v) => update({ pjRenewValue: v })} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Descrição</Label>
                          <Textarea value={data.pjRenewDescription} onChange={(e) => update({ pjRenewDescription: e.target.value })} className="crm-input min-h-[40px]" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* === Seção: Investimentos e Liquidez === */}
              <div className="border-t border-border pt-4 space-y-4">
                <h5 className="text-sm font-medium text-foreground">Investimentos e Liquidez</h5>
                <div className="space-y-2">
                  <Label>Você possui investimentos em quais instituições financeiras? Quanto?</Label>
                  <Textarea value={data.investmentInstitutions} onChange={(e) => update({ investmentInstitutions: e.target.value })} className="crm-input min-h-[60px]" placeholder="Ex: BTG — R$ 500k, XP — R$ 200k..." />
                </div>
                <div className="space-y-2">
                  <Label>Como foi sua experiência com esses investimentos até agora?</Label>
                  <Textarea value={data.investmentExperienceDesc} onChange={(e) => update({ investmentExperienceDesc: e.target.value })} className="crm-input min-h-[60px]" />
                </div>
                <div className="space-y-2">
                  <Label>Qual é aproximadamente seu custo de vida mensal?</Label>
                  <CurrencyInput value={data.monthlyCostOfLiving} onChange={(v) => update({ monthlyCostOfLiving: v })} placeholder="R$ 0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Você tem plano para adquirir algum bem nos próximos anos?</Label>
                  <RadioGroup value={data.hasPurchasePlan} onValueChange={(v) => update({ hasPurchasePlan: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                </div>
                {data.hasPurchasePlan === 'Sim' && (
                  <div className="p-3 bg-card rounded-lg border border-border grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Qual bem?</Label>
                      <Input value={data.purchasePlanItem} onChange={(e) => update({ purchasePlanItem: e.target.value })} className="crm-input" placeholder="Ex: Apartamento, Carro" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Em quanto tempo?</Label>
                      <Input value={data.purchasePlanTimeline} onChange={(e) => update({ purchasePlanTimeline: e.target.value })} className="crm-input" placeholder="Ex: 2 anos" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor estimado (R$)</Label>
                      <CurrencyInput value={data.purchasePlanValue} onChange={(v) => update({ purchasePlanValue: v })} />
                    </div>
                  </div>
                )}
              </div>

              {/* === Seção: Tabela de Patrimônio === */}
              <div className="border-t border-border pt-4 space-y-3">
                <h5 className="text-sm font-medium text-foreground">Tabela de Patrimônio</h5>
                <ConsultantNote>Adicione cada ativo do cliente. A composição será calculada automaticamente.</ConsultantNote>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-medium text-muted-foreground">Descrição / Ativo</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Categoria</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Valor (R$)</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Liquidez</th>
                        <th className="w-10 p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {patrimonioTableItems.map((item) => (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="p-1">
                            <Input value={item.description} onChange={(e) => updatePatrimonioItem(item.id, 'description', e.target.value)} className="crm-input h-8 text-xs" placeholder="Descrição" />
                          </td>
                          <td className="p-1">
                            <Select value={item.category} onValueChange={(v) => updatePatrimonioItem(item.id, 'category', v)}>
                              <SelectTrigger className="crm-input h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {allPatrimonioCategories.map(group => (
                                  <div key={group.label}>
                                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{group.label}</div>
                                    {group.items.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-1">
                            <CurrencyInput value={item.value} onChange={(v) => updatePatrimonioItem(item.id, 'value', v)} className="h-8 text-xs text-right" />
                          </td>
                          <td className="p-1">
                            <Select value={item.liquidezImediata} onValueChange={(v) => updatePatrimonioItem(item.id, 'liquidezImediata', v)}>
                              <SelectTrigger className="crm-input h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePatrimonioItem(item.id)} className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPatrimonioItem}><Plus className="w-4 h-4 mr-1" />Adicionar item</Button>
              </div>

              {/* === Seção: Composição do Patrimônio (calculada) === */}
              {patrimonioTotal > 0 && (
                <div className="border-t border-border pt-4 space-y-3">
                  <h5 className="text-sm font-medium text-foreground">Composição do Patrimônio</h5>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Financeiro */}
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.financeiro > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">💰 Patrimônio Financeiro</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.financeiro)}</p>
                      {patrimonioByGroup.financeiro > 0 && (
                        <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                          <p>RF: {fmt(patrimonioFinanceiroSubtotals.rendaFixa)}</p>
                          <p>RV: {fmt(patrimonioFinanceiroSubtotals.rendaVariavel)}</p>
                          <p>Prev: {fmt(patrimonioFinanceiroSubtotals.previdencia)}</p>
                        </div>
                      )}
                    </div>
                    {/* Reserva */}
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.reserva > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">🛡 Reserva de Emergência</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.reserva)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Sincroniza com Situação Financeira</p>
                    </div>
                    {/* Imobiliário */}
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.imobiliario > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">🏠 Patrimônio Imobiliário</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.imobiliario)}</p>
                    </div>
                    {/* Societário */}
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.societario > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">🏢 Participações Societárias</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.societario)}</p>
                    </div>
                    {/* Outros */}
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.outros > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">🚗 Outros Bens</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.outros)}</p>
                    </div>
                    {/* Liquidez */}
                    <div className={`p-3 rounded-lg border ${liquidezImediataTotal > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">💧 Liquidez Imediata</p>
                      <p className="text-sm font-bold text-foreground">{fmt(liquidezImediataTotal)}</p>
                    </div>
                  </div>

                  {/* Total destaque */}
                  <div className="p-3 bg-foreground/5 rounded-lg border-2 border-foreground/20 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Patrimônio Total</span>
                    <span className="text-lg font-bold text-primary">{fmt(patrimonioTotal)}</span>
                  </div>
                </div>
              )}
            </div>
            <CommentButton value={data.bloco2Comment} onChange={(v) => update({ bloco2Comment: v })} />
          </>)}

          {/* === BLOCO 3 === */}
          {renderBlock(3, 'Fluxo de Caixa e Estilo de Vida', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              {/* === MELHORIA 3: Currency selector === */}
              <div className="flex items-center gap-3 p-2 bg-card rounded-lg border border-border">
                <Label className="text-xs font-medium whitespace-nowrap">Moeda dos campos abaixo:</Label>
                <Select value={selectedCurrency} onValueChange={(v) => update({ selectedCurrency: v })}>
                  <SelectTrigger className="crm-input w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FX_RATES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCurrency !== 'BRL' && (
                  <span className="text-[11px] text-muted-foreground">Taxa: 1 {selectedCurrency} = R$ {fxRate.toFixed(4)}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Receita média mensal (últimos 12 meses)</Label>
                  <CurrencyInput value={data.monthlyRevenue} onChange={(v) => update({ monthlyRevenue: v })} placeholder={`${currencySymbol} 0,00`} />
                  <BrlEquivalent value={data.monthlyRevenue} currency={selectedCurrency} />
                </div>
                <div className="space-y-1">
                  <Label>Fonte principal</Label>
                  <Select value={data.revenueSource} onValueChange={(v) => update({ revenueSource: v })}>
                    <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{REVENUE_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Possui outras fontes de renda?</Label>
                <RadioGroup value={data.hasOtherIncome} onValueChange={(v) => update({ hasOtherIncome: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.hasOtherIncome === 'Sim' && (
                  <div className="space-y-2">
                    {data.otherIncomes.map((item, i) => (
                      <div key={item.id} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1"><Label className="text-xs">Descrição</Label><Input value={item.description} onChange={(e) => updateOtherIncome(item.id, 'description', e.target.value)} className="crm-input" /></div>
                        <div className="w-40 space-y-1">
                          <Label className="text-xs">Valor ({currencySymbol})</Label>
                          <CurrencyInput value={item.value} onChange={(v) => updateOtherIncome(item.id, 'value', v)} />
                          <BrlEquivalent value={item.value} currency={selectedCurrency} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOtherIncome(item.id)} className="h-9 w-9 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addOtherIncome}><Plus className="w-4 h-4 mr-1" />Adicionar fonte</Button>
                  </div>
                )}
              </div>

              {totalRevenue > 0 && (
                <div className="p-2 bg-primary/5 rounded text-sm font-medium text-primary">Receita Total: {fmt(totalRevenue)}</div>
              )}

              <div className="space-y-1">
                <Label>Sua receita é previsível ou varia ao longo do ano?</Label>
                <RadioGroup value={data.revenueStability} onValueChange={(v) => update({ revenueStability: v })} className="flex gap-4">
                  {['Fixa', 'Variável', 'Mista'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                </RadioGroup>
              </div>

              <div className="space-y-1">
                <Label>Custo de vida mensal médio</Label>
                <CurrencyInput value={data.livingCost} onChange={(v) => update({ livingCost: v })} />
                <BrlEquivalent value={data.livingCost} currency={selectedCurrency} />
              </div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Algo não recorrente inflando esse custo? (opcional)</Label><Textarea value={data.nonRecurrentCost} onChange={(e) => update({ nonRecurrentCost: e.target.value })} className="crm-input min-h-[50px]" /></div>

              {monthlySurplus !== 0 && totalRevenue > 0 && (
                <div className={`p-2 rounded text-sm font-medium ${monthlySurplus >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  Sobra mensal: {fmt(monthlySurplus)}
                </div>
              )}

              <div className="space-y-1">
                <Label>Viagens — frequência e gasto aproximado</Label>
                <Textarea value={data.travelDetails} onChange={(e) => update({ travelDetails: e.target.value })} className="crm-input min-h-[50px]" />
              </div>
              <div className="space-y-1">
                <Label>Gasto anual com viagens ({currencySymbol})</Label>
                <CurrencyInput value={data.travelAnnualCost} onChange={(v) => update({ travelAnnualCost: v })} />
                <BrlEquivalent value={data.travelAnnualCost} currency={selectedCurrency} />
              </div>

              <div className="space-y-2">
                <Label>Gastos anuais relevantes (educação, saúde, etc.)</Label>
                {data.annualExpenses.map((item) => (
                  <div key={item.id} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1"><Input value={item.description} onChange={(e) => updateAnnualExpense(item.id, 'description', e.target.value)} className="crm-input" placeholder="Descrição" /></div>
                    <div className="w-40 space-y-1"><CurrencyInput value={item.value} onChange={(v) => updateAnnualExpense(item.id, 'value', v)} /></div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAnnualExpense(item.id)} className="h-9 w-9 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addAnnualExpense}><Plus className="w-4 h-4 mr-1" />Adicionar gasto</Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Quanto investe mensalmente?</Label>
                  <CurrencyInput value={data.monthlyInvestment} onChange={(v) => update({ monthlyInvestment: v })} />
                  <BrlEquivalent value={data.monthlyInvestment} currency={selectedCurrency} />
                </div>
                <div className="space-y-1">
                  <Label>Já está investindo?</Label>
                  <RadioGroup value={data.alreadyInvesting} onValueChange={(v) => update({ alreadyInvesting: v })} className="flex gap-3">
                    {['Sim', 'Parcialmente', 'Não'].map(o => <label key={o} className="flex items-center gap-1 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Se parasse de trabalhar hoje, quantos meses seu padrão de vida se mantém?</Label>
                <Input type="number" value={data.emergencyMonths} onChange={(e) => update({ emergencyMonths: e.target.value })} className="crm-input w-[150px]" placeholder="Ex: 6" />
                {data.emergencyMonths && (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${emergencyClass.color}`}>{emergencyClass.label}</span>
                )}
              </div>

              {/* Proteção e Sucessão — abertura natural */}
              <div className="pt-3 border-t border-border space-y-3">
                <h5 className="text-sm font-medium text-foreground">Proteção e Sucessão</h5>
                <div className="space-y-2">
                  <Label>Já pensou em planejamento sucessório?</Label>
                  <RadioGroup value={data.successionThought} onValueChange={(v) => update({ successionThought: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                </div>
                {/* === MELHORIA 4: Conditional succession field === */}
                {data.successionThought === 'Sim' && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-xs">Como imagina organizar o patrimônio para a próxima geração?</Label>
                    <Textarea value={data.successionOrganization} onChange={(e) => update({ successionOrganization: e.target.value })} className="crm-input min-h-[60px]" />
                  </div>
                )}
                {data.successionThought === 'Sim' && (
                  <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1"><Label className="text-xs">Tem testamento?</Label>
                      <RadioGroup value={data.hasTestament} onValueChange={(v) => update({ hasTestament: v })} className="flex gap-3">
                        <label className="flex items-center gap-1 text-xs cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                      </RadioGroup>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Tem holding?</Label>
                      <RadioGroup value={data.hasHolding} onValueChange={(v) => update({ hasHolding: v })} className="flex gap-3">
                        <label className="flex items-center gap-1 text-xs cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                      </RadioGroup>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Seguro de vida?</Label>
                      <RadioGroup value={data.hasLifeInsuranceB3} onValueChange={(v) => update({ hasLifeInsuranceB3: v })} className="flex gap-3">
                        <label className="flex items-center gap-1 text-xs cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                      </RadioGroup>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <CommentButton value={data.bloco3Comment} onChange={(v) => update({ bloco3Comment: v })} />
          </>)}

          {/* === BLOCO 4 === */}
          {renderBlock(4, 'Objetivos e Sonhos', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              <div className="space-y-1"><Label>Quais são seus principais objetivos financeiros?</Label><Textarea value={data.financialGoals} onChange={(e) => update({ financialGoals: e.target.value })} className="crm-input min-h-[80px]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>"Deu certo" = qual número? (R$ ou R$/mês)</Label><CurrencyInput value={data.successNumber} onChange={(v) => update({ successNumber: v })} /></div>
                <div className="space-y-1"><Label>Em quanto tempo?</Label><Input value={data.successTimeline} onChange={(e) => update({ successTimeline: e.target.value })} className="crm-input" placeholder="Ex: 5 anos" /></div>
              </div>
              <div className="space-y-1"><Label>Data alvo (opcional)</Label><Input type="date" value={data.successTargetDate} onChange={(e) => update({ successTargetDate: e.target.value })} className="crm-input w-[200px]" /></div>

              {/* Aposentadoria */}
              <div className="pt-3 border-t border-border space-y-3">
                <Label className="font-medium">Aposentadoria</Label>
                <div className="space-y-2">
                  <Label>Quer se aposentar?</Label>
                  <RadioGroup value={data.wantsRetirement} onValueChange={(v) => update({ wantsRetirement: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                </div>
                {data.wantsRetirement === 'Sim' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Renda desejada (R$/mês)</Label><CurrencyInput value={data.retirementIncome} onChange={(v) => update({ retirementIncome: v })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Em quantos anos?</Label><Input type="number" value={data.retirementYears} onChange={(e) => update({ retirementYears: e.target.value })} className="crm-input" /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">Taxa de retirada (%)</Label>
                        <Select value={data.retirementWithdrawalRate} onValueChange={(v) => update({ retirementWithdrawalRate: v })}>
                          <SelectTrigger className="crm-input"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">4% (conservador)</SelectItem>
                            <SelectItem value="5">5% (moderado)</SelectItem>
                            <SelectItem value="6">6% (agressivo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {retirementCalc && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-1 text-sm">
                        <p>🎯 Idade de aposentadoria: <strong>{retirementCalc.retirementAge} anos</strong></p>
                        <p>📈 Renda corrigida (inflação 4,5% a.a.): <strong>{fmt(retirementCalc.correctedIncome)}/mês</strong></p>
                        <p>💰 Patrimônio necessário: <strong>{fmt(retirementCalc.requiredPatrimony)}</strong></p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Quer morar fora do Brasil?</Label>
                <RadioGroup value={data.wantsToLiveAbroad} onValueChange={(v) => update({ wantsToLiveAbroad: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.wantsToLiveAbroad === 'Sim' && <Textarea value={data.abroadDetails} onChange={(e) => update({ abroadDetails: e.target.value })} className="crm-input min-h-[50px]" placeholder="Onde? Quando?" />}
              </div>

              {(hasChildrenFromBloco1 || data.hasChildren === 'Sim') && (
                <div className="space-y-1"><Label>Educação dos filhos — plano e custos estimados</Label><Textarea value={data.childrenEducation} onChange={(e) => update({ childrenEducation: e.target.value })} className="crm-input min-h-[60px]" /></div>
              )}

              <div className="space-y-1"><Label>Restrições ou preferências (ESG, religião, setores...)</Label><Textarea value={data.restrictions} onChange={(e) => update({ restrictions: e.target.value })} className="crm-input min-h-[50px]" /></div>

              <div className="pt-3 border-t border-border space-y-3">
                <Label className="font-medium">Top 3 prioridades</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="space-y-1">
                      <Label className="text-xs">Prioridade {n}</Label>
                      <Select value={(data as any)[`priority${n}`]} onValueChange={(v) => update({ [`priority${n}`]: v } as any)}>
                        <SelectTrigger className="crm-input"><SelectValue placeholder={`${n}ª`} /></SelectTrigger>
                        <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <CommentButton value={data.bloco4Comment} onChange={(v) => update({ bloco4Comment: v })} />
          </>)}

          {/* === BLOCO 5 === */}
          {renderBlock(5, 'Perfil de Risco e Comportamento', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              <div className="space-y-2">
                <Label>Já passou por períodos de queda relevante nos investimentos?</Label>
                <RadioGroup value={data.hasExperiencedDrops} onValueChange={(v) => update({ hasExperiencedDrops: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.hasExperiencedDrops === 'Sim' && <Textarea value={data.dropReaction} onChange={(e) => update({ dropReaction: e.target.value })} className="crm-input min-h-[60px]" placeholder="Como reagiu?" />}
                {data.hasExperiencedDrops === 'Não' && <Textarea value={data.hypotheticalReaction} onChange={(e) => update({ hypotheticalReaction: e.target.value })} className="crm-input min-h-[60px]" placeholder="Se caísse 20%, o que faria?" />}
              </div>

              <div className="space-y-1">
                <Label>Qual queda % te faria questionar a estratégia?</Label>
                <RadioGroup value={data.maxAcceptableDrop} onValueChange={(v) => update({ maxAcceptableDrop: v })} className="flex flex-wrap gap-3">
                  {['5%', '10%', '20%', '30%', 'Não me incomodaria'].map(o => <label key={o} className="flex items-center gap-1 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                </RadioGroup>
              </div>

              <div className="space-y-1">
                <Label>Em momentos de incerteza, você prefere:</Label>
                <RadioGroup value={data.uncertaintyPreference} onValueChange={(v) => update({ uncertaintyPreference: v })} className="flex flex-col gap-1">
                  {['Reduzir risco imediatamente', 'Manter posição e aguardar', 'Aumentar posição aproveitando a oportunidade', 'Depende do cenário'].map(o =>
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>
                  )}
                </RadioGroup>
              </div>

              <div className="space-y-1">
                <Label>Prefere liquidez rápida, mesmo rendendo menos?</Label>
                <RadioGroup value={data.liquidityPreference} onValueChange={(v) => update({ liquidityPreference: v })} className="flex gap-4">
                  {['Sim', 'Não', 'Depende'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Já tomou decisão financeira por impulso que se arrependeu?</Label>
                <RadioGroup value={data.impulseDecision} onValueChange={(v) => update({ impulseDecision: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.impulseDecision === 'Sim' && <Textarea value={data.impulseDetails} onChange={(e) => update({ impulseDetails: e.target.value })} className="crm-input min-h-[60px]" placeholder="Descreva..." />}
              </div>
            </div>
            <CommentButton value={data.bloco5Comment} onChange={(v) => update({ bloco5Comment: v })} />
          </>)}

          {/* === BLOCO 6 === */}
          {renderBlock(6, 'Proteção, Sucessão e Blindagem Patrimonial', <>
            <div className={`p-4 bg-muted/20 rounded-lg border border-border space-y-4 ${!showBloco6 && data.successionThought !== '' ? 'opacity-60' : ''}`}>
              {!showBloco6 && data.successionThought === 'Não' && <p className="text-xs text-muted-foreground italic">Cliente não indicou interesse em sucessão no Bloco 3. Seção opcional.</p>}
              <div className="space-y-1">
                <Label>Já estruturou planejamento sucessório?</Label>
                <RadioGroup value={data.hasSuccessionPlan} onValueChange={(v) => update({ hasSuccessionPlan: v })} className="flex gap-4">
                  {['Sim', 'Não', 'Parcialmente'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Patrimônio sob estrutura jurídica? (holding, offshore, acordo societário)</Label>
                <RadioGroup value={data.hasLegalStructure} onValueChange={(v) => update({ hasLegalStructure: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.hasLegalStructure === 'Sim' && <Textarea value={data.legalStructureDetails} onChange={(e) => update({ legalStructureDetails: e.target.value })} className="crm-input min-h-[60px]" placeholder="Qual estrutura?" />}
              </div>
              <div className="space-y-1">
                <Label>Patrimônio protegido contra riscos empresariais/profissionais?</Label>
                <RadioGroup value={data.isProtected} onValueChange={(v) => update({ isProtected: v })} className="flex gap-4">
                  {['Sim', 'Não', 'Não sei'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                </RadioGroup>
              </div>
              <div className="space-y-1">
                <Label>Seguro de vida proporcional ao patrimônio?</Label>
                <RadioGroup value={data.hasLifeInsuranceB6} onValueChange={(v) => update({ hasLifeInsuranceB6: v })} className="flex gap-4">
                  {['Sim', 'Não', 'Parcialmente'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Patrimônio alocado fora do Brasil?</Label>
                <RadioGroup value={data.hasInternationalAssets} onValueChange={(v) => update({ hasInternationalAssets: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.hasInternationalAssets === 'Sim' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Valor aproximado</Label><CurrencyInput value={data.internationalValue} onChange={(v) => update({ internationalValue: v })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Onde?</Label><Textarea value={data.internationalDetails} onChange={(e) => update({ internationalDetails: e.target.value })} className="crm-input min-h-[50px]" /></div>
                  </div>
                )}
              </div>
            </div>
            <CommentButton value={data.bloco6Comment} onChange={(v) => update({ bloco6Comment: v })} />
          </>)}

          {/* === BLOCO 7 === */}
          {renderBlock(7, 'Histórico e Expectativas', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              <div className="space-y-2">
                <Label>Já investiu ou acompanha o mercado financeiro?</Label>
                <RadioGroup value={data.hasInvestmentHistory} onValueChange={(v) => update({ hasInvestmentHistory: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.hasInvestmentHistory === 'Sim' && (
                  <>
                    <div className="space-y-1"><Label className="text-xs">Há quanto tempo?</Label>
                      <Select value={data.investmentDuration} onValueChange={(v) => update({ investmentDuration: v })}>
                        <SelectTrigger className="crm-input w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {['Menos de 1 ano', '1–3 anos', '3–10 anos', 'Mais de 10 anos'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Quais tipos de ativos já utilizou?</Label><Textarea value={data.assetTypes} onChange={(e) => update({ assetTypes: e.target.value })} className="crm-input min-h-[60px]" /></div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label>Já trabalhou com assessor/consultor financeiro?</Label>
                <RadioGroup value={data.hasWorkedWithAdvisor} onValueChange={(v) => update({ hasWorkedWithAdvisor: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.hasWorkedWithAdvisor === 'Sim' && <Textarea value={data.advisorExperience} onChange={(e) => update({ advisorExperience: e.target.value })} className="crm-input min-h-[60px]" placeholder="Como foi a experiência?" />}
              </div>
              <div className="space-y-1">
                <Label>Prefere acompanhar ou delegar?</Label>
                <RadioGroup value={data.managementPreference} onValueChange={(v) => update({ managementPreference: v })} className="flex flex-col gap-1">
                  {['Prefiro delegar totalmente', 'Gosto de acompanhar as decisões', 'Quero participar ativamente'].map(o =>
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>
                  )}
                </RadioGroup>
              </div>
              <div className="space-y-1">
                <Label>Frequência de acompanhamento desejada</Label>
                <RadioGroup value={data.followUpFrequency} onValueChange={(v) => update({ followUpFrequency: v })} className="flex gap-4">
                  {['Mensal', 'Trimestral', 'Semestral', 'Sob demanda'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                </RadioGroup>
              </div>
              <div className="space-y-1"><Label>O que precisa acontecer para considerar essa parceria um sucesso?</Label><Textarea value={data.successCriteria} onChange={(e) => update({ successCriteria: e.target.value })} className="crm-input min-h-[60px]" /></div>
            </div>
            <CommentButton value={data.bloco7Comment} onChange={(v) => update({ bloco7Comment: v })} />
          </>)}
        </TabsContent>

        {/* ====== 2ª REUNIÃO ====== */}
        <TabsContent value="reuniao2" className="space-y-3 mt-4">
          {renderBlock(8, 'Arquitetura Estratégica da Carteira', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              <h5 className="font-medium text-foreground">Diagnóstico Estratégico</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Prioridade estratégica principal</Label>
                  <Select value={data.strategicPriority} onValueChange={(v) => update({ strategicPriority: v })}>
                    <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {['Acumulação', 'Proteção', 'Geração de renda', 'Diversificação', 'Sucessão'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Grau de complexidade</Label>
                  <Select value={data.complexityLevel} onValueChange={(v) => update({ complexityLevel: v })}>
                    <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {['Simples', 'Moderado', 'Complexo'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Principais riscos identificados</Label><Textarea value={data.identifiedRisks} onChange={(e) => update({ identifiedRisks: e.target.value })} className="crm-input min-h-[60px]" /></div>

              <h5 className="font-medium text-foreground pt-3 border-t border-border">Arquitetura da Carteira</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Objetivo dominante</Label>
                  <Select value={data.portfolioObjective} onValueChange={(v) => update({ portfolioObjective: v })}>
                    <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {['Preservação', 'Renda', 'Crescimento', 'Balanceado'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Nível de risco recomendado</Label>
                  <Select value={data.recommendedRisk} onValueChange={(v) => update({ recommendedRisk: v })}>
                    <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {['Conservador', 'Moderado', 'Arrojado'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Liquidez mínima necessária (%)</Label><Input type="number" value={data.minLiquidityPct} onChange={(e) => update({ minLiquidityPct: e.target.value })} className="crm-input" /></div>
                <div className="space-y-1"><Label>Justificativa</Label><Input value={data.minLiquidityJustification} onChange={(e) => update({ minLiquidityJustification: e.target.value })} className="crm-input" /></div>
              </div>

              {/* === MELHORIA 6: Distribuição macro — 8 campos === */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Distribuição macro por pilares (soma = 100%)</Label>
                  <span className={`text-sm font-bold ${allocationTotal === 100 ? 'text-green-500' : 'text-red-500'}`}>{allocationTotal}%</span>
                </div>
                {allocationTotal !== 100 && <p className="text-xs text-red-500">⚠️ A soma deve ser exatamente 100% (atual: {allocationTotal}%)</p>}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'posFixadoPct', label: 'Pós-Fixado (%)' },
                    { key: 'preFixadoPct', label: 'Pré-Fixado (%)' },
                    { key: 'indexadoInflacaoPct', label: 'Indexado à Inflação (%)' },
                    { key: 'rendaVariavelPct', label: 'Renda Variável (%)' },
                    { key: 'rendaPassivaPct', label: 'Renda Passiva / FIIs (%)' },
                    { key: 'internacionalPct', label: 'Internacional (%)' },
                    { key: 'alternativosPct', label: 'Alternativos (%)' },
                    { key: 'caixaPct', label: 'Caixa / Oportunidade (%)' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input type="number" min="0" max="100" value={(data as any)[key]} onChange={(e) => update({ [key]: e.target.value } as any)} className="crm-input" />
                    </div>
                  ))}
                </div>

                {/* Donut chart */}
                {pieData.length > 0 && (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Pilares estratégicos */}
              <div className="pt-3 border-t border-border space-y-2">
                <Label className="font-medium">Pilares estratégicos (até 5)</Label>
                {data.strategicPillars.map((p) => (
                  <div key={p.id} className="flex gap-2 items-center">
                    <Input value={p.name} onChange={(e) => updatePillar(p.id, e.target.value)} className="crm-input" placeholder="Ex: Diversificação financeira" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePillar(p.id)} className="h-9 w-9 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                {data.strategicPillars.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={addPillar}><Plus className="w-4 h-4 mr-1" />Adicionar pilar</Button>
                )}
              </div>

              {/* Diretrizes */}
              <div className="pt-3 border-t border-border space-y-3">
                <h5 className="font-medium text-foreground">Diretrizes</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Eficiência tributária</Label>
                    <Select value={data.taxEfficiency} onValueChange={(v) => update({ taxEfficiency: v })}>
                      <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {['Prioridade alta', 'Moderada', 'Não prioriza'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Regra de rebalanceamento</Label>
                    <Select value={data.rebalancingRule} onValueChange={(v) => update({ rebalancingRule: v })}>
                      <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {['Trimestral', 'Semestral', 'Anual', 'Por desvio (>5%)', 'Sob demanda'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1"><Label>Observações sobre tributação</Label><Textarea value={data.taxEfficiencyNotes} onChange={(e) => update({ taxEfficiencyNotes: e.target.value })} className="crm-input min-h-[50px]" /></div>
                <div className="space-y-1"><Label>Estrutura patrimonial recomendada (visão macro)</Label><Textarea value={data.recommendedStructure} onChange={(e) => update({ recommendedStructure: e.target.value })} className="crm-input min-h-[80px]" /></div>
              </div>
            </div>
            <CommentButton value={data.bloco8Comment} onChange={(v) => update({ bloco8Comment: v })} />
          </>)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
