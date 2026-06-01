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
import { ChevronDown, ChevronRight, Plus, Trash2, MessageSquare, ChevronUp, FileText } from 'lucide-react';
import { generateConhecerPdf } from '@/lib/pdf-generators';
import { BirthDatePicker } from '@/components/ui/birth-date-picker';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ConhecerClienteData, ConhecerChildInfo, StrategicPillar, AnnualExpenseItem, RealEstateCard, PatrimonioTableItem, DebtItem } from './types';
import { PATRIMONIO_CATEGORIES, getCategoryGroup } from './types';
import { calculateProgress, getProgressColor } from './types';

const genId = () => Math.random().toString(36).substring(2, 10);

interface Props {
  data: ConhecerClienteData;
  onChange: (data: ConhecerClienteData) => void;
  hasChildrenFromBloco1?: boolean;
  clientAge?: number;
  clientName?: string;
  advisorName?: string;
}

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

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#64748b', '#ef4444', '#06b6d4'];

export function ConhecerClienteModule({ data, onChange, hasChildrenFromBloco1, clientAge = 0, clientName = '', advisorName = '' }: Props) {
  const update = (partial: Partial<ConhecerClienteData>) => onChange({ ...data, ...partial });

  const progress = useMemo(() => calculateProgress(data), [data]);
  const progressColor = getProgressColor(progress);

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

  // Patrimônio calculations
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

  const patrimonioTotal = useMemo(() => Object.values(patrimonioByGroup).reduce((s, v) => s + v, 0), [patrimonioByGroup]);

  const liquidezImediataTotal = useMemo(() => {
    return patrimonioTableItems
      .filter(item => item.liquidezImediata === 'Sim')
      .reduce((s, item) => s + (parseFloat(item.value) || 0), 0);
  }, [patrimonioTableItems]);

  // Sync legacy fields
  useEffect(() => {
    if (patrimonioTotal > 0) {
      const current = parseFloat(data.totalPatrimony) || 0;
      if (Math.abs(current - patrimonioTotal) > 0.01) update({ totalPatrimony: patrimonioTotal.toString() });
    }
  }, [patrimonioTotal]);
  useEffect(() => {
    if (patrimonioByGroup.financeiro > 0) {
      const current = parseFloat(data.patrimonioFinanceiro) || 0;
      if (Math.abs(current - patrimonioByGroup.financeiro) > 0.01) update({ patrimonioFinanceiro: patrimonioByGroup.financeiro.toString() });
    }
  }, [patrimonioByGroup.financeiro]);
  useEffect(() => {
    if (patrimonioByGroup.reserva > 0) {
      const current = parseFloat(data.emergencyReserveAmount) || 0;
      if (Math.abs(current - patrimonioByGroup.reserva) > 0.01) update({ emergencyReserveAmount: patrimonioByGroup.reserva.toString() });
    }
  }, [patrimonioByGroup.reserva]);
  useEffect(() => {
    if (patrimonioByGroup.imobiliario > 0) {
      const current = parseFloat(data.patrimonioImobiliario) || 0;
      if (Math.abs(current - patrimonioByGroup.imobiliario) > 0.01) update({ patrimonioImobiliario: patrimonioByGroup.imobiliario.toString() });
    }
  }, [patrimonioByGroup.imobiliario]);
  useEffect(() => {
    if (patrimonioByGroup.societario > 0) {
      const current = parseFloat(data.participacoesSocietarias) || 0;
      if (Math.abs(current - patrimonioByGroup.societario) > 0.01) update({ participacoesSocietarias: patrimonioByGroup.societario.toString() });
    }
  }, [patrimonioByGroup.societario]);

  // Bloco 8 allocation
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

  // Helpers
  const addChild = () => update({ children: [...data.children, { id: genId(), name: '', age: '' }] });
  const removeChild = (id: string) => update({ children: data.children.filter(c => c.id !== id) });
  const updateChild = (id: string, field: keyof ConhecerChildInfo, value: string) =>
    update({ children: data.children.map(c => c.id === id ? { ...c, [field]: value } : c) });

  const addPillar = () => update({ strategicPillars: [...data.strategicPillars, { id: genId(), name: '' }] });
  const removePillar = (id: string) => update({ strategicPillars: data.strategicPillars.filter(p => p.id !== id) });
  const updatePillar = (id: string, name: string) =>
    update({ strategicPillars: data.strategicPillars.map(p => p.id === id ? { ...p, name } : p) });

  const realEstateCards = data.realEstateCards || [];
  const addRealEstateCard = () => update({ realEstateCards: [...realEstateCards, { id: genId(), description: '', purpose: '', value: '' }] });
  const removeRealEstateCard = (id: string) => update({ realEstateCards: realEstateCards.filter(c => c.id !== id) });
  const updateRealEstateCard = (id: string, field: keyof RealEstateCard, value: string) =>
    update({ realEstateCards: realEstateCards.map(c => c.id === id ? { ...c, [field]: value } : c) });

  const addPatrimonioItem = () => {
    const newItem: PatrimonioTableItem = { id: genId(), description: '', category: '', value: '', liquidezImediata: '' };
    update({ patrimonioTableItems: [...patrimonioTableItems, newItem] });
  };
  const removePatrimonioItem = (id: string) => update({ patrimonioTableItems: patrimonioTableItems.filter(i => i.id !== id) });
  const updatePatrimonioItem = (id: string, field: keyof PatrimonioTableItem, value: string) => {
    const updated = patrimonioTableItems.map(i => {
      if (i.id !== id) return i;
      const item = { ...i, [field]: value };
      if (field === 'category') {
        const financialCategories = [...PATRIMONIO_CATEGORIES.financeiro.items, ...PATRIMONIO_CATEGORIES.reserva.items];
        item.liquidezImediata = financialCategories.includes(value) ? 'Sim' : 'Não';
      }
      return item;
    });
    update({ patrimonioTableItems: updated });
  };

  // B2 annual expenses
  const annualExpensesB2 = data.annualExpensesB2 || [];
  const addAnnualExpenseB2 = () => update({ annualExpensesB2: [...annualExpensesB2, { id: genId(), description: '', value: '' }] });
  const removeAnnualExpenseB2 = (id: string) => update({ annualExpensesB2: annualExpensesB2.filter(e => e.id !== id) });
  const updateAnnualExpenseB2 = (id: string, field: string, value: string) =>
    update({ annualExpensesB2: annualExpensesB2.map(e => e.id === id ? { ...e, [field]: value } : e) });

  // B3 debts
  const debtsListB3 = data.debtsListB3 || [];
  const addDebtB3 = () => update({ debtsListB3: [...debtsListB3, { id: genId(), description: '', balance: '', remainingInstallments: '' }] });
  const removeDebtB3 = (id: string) => update({ debtsListB3: debtsListB3.filter(d => d.id !== id) });
  const updateDebtB3 = (id: string, field: keyof DebtItem, value: string) =>
    update({ debtsListB3: debtsListB3.map(d => d.id === id ? { ...d, [field]: value } : d) });

  // B4 annual expenses
  const annualExpensesB4 = data.annualExpensesB4 || [];
  const addAnnualExpenseB4 = () => update({ annualExpensesB4: [...annualExpensesB4, { id: genId(), description: '', value: '' }] });
  const removeAnnualExpenseB4 = (id: string) => update({ annualExpensesB4: annualExpensesB4.filter(e => e.id !== id) });
  const updateAnnualExpenseB4 = (id: string, field: string, value: string) =>
    update({ annualExpensesB4: annualExpensesB4.map(e => e.id === id ? { ...e, [field]: value } : e) });

  const handleNumChildrenChange = (val: string) => {
    if (val === 'Nenhum') {
      update({ children: [], numChildren: val, hasChildren: 'Não' });
    } else {
      const count = val === '4+' ? 4 : parseInt(val) || 0;
      const current = data.children || [];
      if (current.length < count) {
        const newChildren = [...current];
        for (let i = current.length; i < count; i++) newChildren.push({ id: genId(), name: '', age: '' });
        update({ children: newChildren, numChildren: val, hasChildren: 'Sim' });
      } else {
        update({ numChildren: val, hasChildren: 'Sim' });
      }
    }
  };

  const [openBlocks, setOpenBlocks] = useState<Record<number, boolean>>({});
  const toggleBlock = (n: number) => setOpenBlocks(prev => ({ ...prev, [n]: !prev[n] }));

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

  const allPatrimonioCategories = Object.entries(PATRIMONIO_CATEGORIES).map(([, group]) => ({
    label: group.label,
    items: group.items,
  }));

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Perfil</span>
        <div className="flex-1"><Progress value={progress} className="h-2" /></div>
        <span className={`text-sm font-bold ${progressColor}`}>{progress}% completo</span>
        <Button type="button" variant="outline" size="sm" className="gap-2 ml-2" onClick={() => generateConhecerPdf(data, clientName || data.fullName, advisorName)}>
          <FileText className="w-4 h-4" />Gerar PDF Resumo
        </Button>
      </div>

      <Tabs defaultValue="reuniao1" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reuniao1">1ª Reunião</TabsTrigger>
          <TabsTrigger value="reuniao2">2ª Reunião</TabsTrigger>
        </TabsList>

        <TabsContent value="reuniao1" className="space-y-3 mt-4">

          {/* ============ BLOCO 1 — Dados Pessoais e Perfil ============ */}
          {renderBlock(1, 'Dados Pessoais e Perfil', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={data.fullName} onChange={(e) => update({ fullName: e.target.value })} className="crm-input" placeholder="Nome completo do cliente" />
              </div>

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
                    <Input type="number" value={data.manualAge} onChange={(e) => update({ manualAge: e.target.value })} className="crm-input" placeholder="Idade" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>O que você faz profissionalmente hoje?</Label>
                <Input value={data.profession} onChange={(e) => update({ profession: e.target.value })} className="crm-input" placeholder="Profissão / atividade" />
              </div>

              <div className="space-y-2">
                <Label>Conte-me um pouco sobre você.</Label>
                <Textarea value={data.aboutYourself} onChange={(e) => update({ aboutYourself: e.target.value })} className="crm-input min-h-[80px]" placeholder="Trajetória, experiências marcantes..." />
              </div>

              <div className="space-y-2">
                <Label>Fora do trabalho, o que você gosta de fazer? Quais são seus hobbies?</Label>
                <Textarea value={data.hobbies} onChange={(e) => update({ hobbies: e.target.value })} className="crm-input min-h-[60px]" placeholder="Hobbies, atividades de lazer..." />
              </div>

              {/* Casado */}
              <div className="space-y-2">
                <Label>Você é casado(a)?</Label>
                <RadioGroup value={data.isMarried} onValueChange={(v) => update({ isMarried: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
              </div>
              {data.isMarried === 'Sim' && (
                <div className="p-3 bg-card rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
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
                <div className="p-3 bg-card rounded-lg border border-border space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-xs">Observações sobre estado civil (solteiro, divorciado, viúvo...)</Label>
                  <Textarea value={data.civilStatusNotes} onChange={(e) => update({ civilStatusNotes: e.target.value })} className="crm-input min-h-[60px]" placeholder="Ex: Divorciado(a) desde 2020..." />
                </div>
              )}

              {/* Filhos */}
              <div className="space-y-2">
                <Label>Quantos filhos você tem?</Label>
                <RadioGroup value={data.numChildren || ''} onValueChange={handleNumChildrenChange} className="flex gap-3 flex-wrap">
                  {['Nenhum', '1', '2', '3', '4+'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={opt} /> {opt}</label>
                  ))}
                </RadioGroup>
              </div>
              {data.numChildren && data.numChildren !== 'Nenhum' && (
                <div className="p-3 bg-card rounded-lg border border-border space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
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

              <div className="space-y-2">
                <Label>Quem participa das decisões financeiras na sua família? Tem alguém (cônjuge, sócio, contador, advogado) que você gosta de consultar antes de decisões maiores?</Label>
                <Textarea value={data.financialDecisionMakers} onChange={(e) => update({ financialDecisionMakers: e.target.value })} className="crm-input min-h-[60px]" />
              </div>

              <div className="space-y-2">
                <Label>Como você descreveria sua relação com dinheiro ao longo da vida?</Label>
                <Textarea value={data.moneyRelationship} onChange={(e) => update({ moneyRelationship: e.target.value })} className="crm-input min-h-[60px]" />
              </div>

              <div className="space-y-2">
                <Label>Como você chegou até mim / como conheceu o escritório?</Label>
                <Input value={data.howFoundUs} onChange={(e) => update({ howFoundUs: e.target.value })} className="crm-input" placeholder="Indicação, redes sociais, evento..." />
              </div>
            </div>
            <CommentButton value={data.bloco1Comment} onChange={(v) => update({ bloco1Comment: v })} />
          </>)}

          {/* ============ BLOCO 2 — Situação Patrimonial e Investimentos ============ */}
          {renderBlock(2, 'Situação Patrimonial e Investimentos', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">

              {/* Imóveis */}
              <div className="space-y-2">
                <Label>Você possui imóveis? São para morar ou para alugar?</Label>
                <RadioGroup value={data.hasRealEstate} onValueChange={(v) => update({ hasRealEstate: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
              </div>
              {data.hasRealEstate === 'Sim' && (
                <div className="p-3 bg-card rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  {realEstateCards.map((card) => (
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

              {/* Outros bens */}
              <div className="space-y-2">
                <Label>Tem outros bens importantes? (Carros, embarcações, obras de arte...)</Label>
                <RadioGroup value={data.hasOtherAssets} onValueChange={(v) => update({ hasOtherAssets: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
                {data.hasOtherAssets === 'Sim' && (
                  <Textarea value={data.otherAssetsDetails} onChange={(e) => update({ otherAssetsDetails: e.target.value })} className="crm-input min-h-[60px] animate-in fade-in duration-300" placeholder="Descreva os bens..." />
                )}
              </div>

              {/* ── Vida Profissional ── */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Você é CLT ou PJ?</Label>
                  <RadioGroup value={data.employmentType} onValueChange={(v) => update({ employmentType: v })} className="flex gap-3 flex-wrap">
                    {['CLT', 'PJ', 'Autônomo', 'Aposentado'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={opt} /> {opt}</label>
                    ))}
                  </RadioGroup>
                </div>

                {data.employmentType === 'CLT' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1"><Label className="text-xs">Salário mensal líquido</Label><CurrencyInput value={data.cltSalary} onChange={(v) => update({ cltSalary: v })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Tem plano de crescimento / promoção?</Label><Input value={data.cltGrowthPlan} onChange={(e) => update({ cltGrowthPlan: e.target.value })} className="crm-input" placeholder="Descreva perspectivas..." /></div>
                  </div>
                )}

                {data.employmentType === 'PJ' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <Label className="text-xs">A renda é Pro-labore, Distribuição de Lucros ou Ambos?</Label>
                      <RadioGroup value={data.pjIncomeType} onValueChange={(v) => update({ pjIncomeType: v })} className="flex gap-3 flex-wrap">
                        {['Pro-labore', 'Distribuição de Lucros', 'Ambos'].map(opt => (
                          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={opt} /> {opt}</label>
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Retirada mensal aproximada (R$)</Label><CurrencyInput value={data.pjMonthlyWithdrawal} onChange={(v) => update({ pjMonthlyWithdrawal: v })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Setor / ramo de atuação</Label><Input value={data.pjSector} onChange={(e) => update({ pjSector: e.target.value })} className="crm-input" placeholder="Ex: Tecnologia, Saúde..." /></div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Tem sócios?</Label>
                      <RadioGroup value={data.hasPjPartners} onValueChange={(v) => update({ hasPjPartners: v })} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                      </RadioGroup>
                    </div>
                    {data.hasPjPartners === 'Sim' && (
                      <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-300">
                        <div className="space-y-1"><Label className="text-xs">Quem é o Sócio Majoritário?</Label><Input value={data.pjMajorityPartner} onChange={(e) => update({ pjMajorityPartner: e.target.value })} className="crm-input" /></div>
                        <div className="space-y-1"><Label className="text-xs">Nº de funcionários</Label><Input type="number" value={data.pjEmployeeCount} onChange={(e) => update({ pjEmployeeCount: e.target.value })} className="crm-input" /></div>
                        <div className="space-y-1"><Label className="text-xs">Valor aprox. da empresa (R$)</Label><CurrencyInput value={data.pjCompanyValue} onChange={(v) => update({ pjCompanyValue: v })} /></div>
                      </div>
                    )}
                    <div className="space-y-1"><Label className="text-xs">Quais são seus maiores medos ou preocupações com a empresa?</Label><Textarea value={data.pjConcerns} onChange={(e) => update({ pjConcerns: e.target.value })} className="crm-input min-h-[60px]" /></div>
                    <div className="space-y-2">
                      <Label className="text-xs">Pretende renovar maquinário ou trocar frota?</Label>
                      <RadioGroup value={data.pjRenewEquipment} onValueChange={(v) => update({ pjRenewEquipment: v })} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                      </RadioGroup>
                    </div>
                    {data.pjRenewEquipment === 'Sim' && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                        <div className="space-y-1"><Label className="text-xs">Em quanto tempo?</Label><Input value={data.pjRenewTimeline} onChange={(e) => update({ pjRenewTimeline: e.target.value })} className="crm-input" placeholder="Ex: 6 meses, 1 ano" /></div>
                        <div className="space-y-1"><Label className="text-xs">Valor estimado (R$)</Label><CurrencyInput value={data.pjRenewValue} onChange={(v) => update({ pjRenewValue: v })} /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Descrição</Label><Textarea value={data.pjRenewDescription} onChange={(e) => update({ pjRenewDescription: e.target.value })} className="crm-input min-h-[40px]" /></div>
                      </div>
                    )}
                    <MiniDRE data={data} update={update} />
                  </div>
                )}

                {data.employmentType === 'Autônomo' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Renda mensal aproximada (R$)</Label><CurrencyInput value={data.autonomoIncome} onChange={(v) => update({ autonomoIncome: v })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Área de atuação</Label><Input value={data.autonomoArea} onChange={(e) => update({ autonomoArea: e.target.value })} className="crm-input" placeholder="Ex: Advocacia, Consultoria..." /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">A renda é estável ou variável mês a mês?</Label><Textarea value={data.autonomoStability} onChange={(e) => update({ autonomoStability: e.target.value })} className="crm-input min-h-[50px]" placeholder="Descreva a estabilidade da renda..." /></div>
                    <MiniDRE data={data} update={update} />
                  </div>
                )}

                {data.employmentType === 'Aposentado' && (
                  <div className="p-3 bg-card rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1"><Label className="text-xs">Valor da aposentadoria / benefício mensal (R$)</Label><CurrencyInput value={data.aposentadoIncome} onChange={(v) => update({ aposentadoIncome: v })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Tem alguma renda complementar?</Label><Input value={data.aposentadoExtraIncome} onChange={(e) => update({ aposentadoExtraIncome: e.target.value })} className="crm-input" placeholder="Ex: Aluguéis, consultoria..." /></div>
                  </div>
                )}

                {/* Outras fontes (always visible) */}
                <div className="space-y-2">
                  <Label>Possui outras fontes de renda?</Label>
                  <RadioGroup value={data.hasOtherIncomeB2} onValueChange={(v) => update({ hasOtherIncomeB2: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.hasOtherIncomeB2 === 'Sim' && (
                    <div className="p-3 bg-card rounded-lg border border-border space-y-3 animate-in fade-in duration-300">
                      <div className="space-y-1"><Label className="text-xs">Descreva as outras fontes</Label><Textarea value={data.otherIncomeDescriptionB2} onChange={(e) => update({ otherIncomeDescriptionB2: e.target.value })} className="crm-input min-h-[50px]" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Valor mensal estimado (R$)</Label><CurrencyInput value={data.otherIncomeValueB2} onChange={(v) => update({ otherIncomeValueB2: v })} /></div>
                        <div className="space-y-1">
                          <Label className="text-xs">Essa renda é...</Label>
                          <Select value={data.otherIncomeTypeB2} onValueChange={(v) => update({ otherIncomeTypeB2: v })}>
                            <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {['Fixa', 'Variável', 'Mista'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Investimentos e Liquidez ── */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="space-y-2"><Label>Você possui investimentos em quais instituições financeiras? Quanto?</Label><Textarea value={data.investmentInstitutions} onChange={(e) => update({ investmentInstitutions: e.target.value })} className="crm-input min-h-[60px]" placeholder="Ex: BTG — R$ 500k, XP — R$ 200k..." /></div>
                <div className="space-y-2"><Label>Como foi sua experiência com esses investimentos até agora?</Label><Textarea value={data.investmentExperienceDesc} onChange={(e) => update({ investmentExperienceDesc: e.target.value })} className="crm-input min-h-[60px]" /></div>
                <div className="space-y-2"><Label>Qual é aproximadamente seu custo de vida mensal?</Label><CurrencyInput value={data.monthlyCostOfLiving} onChange={(v) => update({ monthlyCostOfLiving: v })} placeholder="R$ 0,00" /></div>
                <div className="space-y-2"><Label>Tem algo não recorrente inflando esse custo? (opcional)</Label><Textarea value={data.nonRecurrentCostB2} onChange={(e) => update({ nonRecurrentCostB2: e.target.value })} className="crm-input min-h-[50px]" /></div>
                <div className="space-y-2"><Label>Viagens — frequência e gasto aproximado</Label><Textarea value={data.travelDetailsB2} onChange={(e) => update({ travelDetailsB2: e.target.value })} className="crm-input min-h-[50px]" /></div>
                <div className="space-y-2"><Label>Gasto anual com viagens (R$)</Label><CurrencyInput value={data.travelAnnualCostB2} onChange={(v) => update({ travelAnnualCostB2: v })} /></div>

                {/* Gastos anuais relevantes */}
                <div className="space-y-2">
                  <Label>Gastos anuais relevantes (educação, saúde, etc.)</Label>
                  {annualExpensesB2.map((item) => (
                    <div key={item.id} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1"><Input value={item.description} onChange={(e) => updateAnnualExpenseB2(item.id, 'description', e.target.value)} className="crm-input" placeholder="Descrição" /></div>
                      <div className="w-40 space-y-1"><CurrencyInput value={item.value} onChange={(v) => updateAnnualExpenseB2(item.id, 'value', v)} /></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAnnualExpenseB2(item.id)} className="h-9 w-9 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addAnnualExpenseB2}><Plus className="w-4 h-4 mr-1" />Adicionar gasto</Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Quanto investe mensalmente?</Label><CurrencyInput value={data.monthlyInvestmentB2} onChange={(v) => update({ monthlyInvestmentB2: v })} /></div>
                  <div className="space-y-1">
                    <Label>Já está investindo?</Label>
                    <RadioGroup value={data.alreadyInvestingB2} onValueChange={(v) => update({ alreadyInvestingB2: v })} className="flex gap-3">
                      {['Sim', 'Parcialmente', 'Não'].map(o => <label key={o} className="flex items-center gap-1 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                    </RadioGroup>
                  </div>
                </div>
                {(data.alreadyInvestingB2 === 'Parcialmente' || data.alreadyInvestingB2 === 'Não') && (
                  <div className="space-y-1 animate-in fade-in duration-300"><Label className="text-xs">Por quê?</Label><Textarea value={data.alreadyInvestingWhyNot} onChange={(e) => update({ alreadyInvestingWhyNot: e.target.value })} className="crm-input min-h-[50px]" /></div>
                )}

                <div className="space-y-2">
                  <Label>Se parasse de trabalhar hoje, quantos meses seu padrão de vida se mantém?</Label>
                  <Input type="number" value={data.emergencyMonthsB2} onChange={(e) => update({ emergencyMonthsB2: e.target.value })} className="crm-input w-[150px]" placeholder="Ex: 6" />
                </div>

                <div className="space-y-2">
                  <Label>Você tem plano para adquirir algum bem nos próximos anos?</Label>
                  <RadioGroup value={data.hasPurchasePlan} onValueChange={(v) => update({ hasPurchasePlan: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                </div>
                {data.hasPurchasePlan === 'Sim' && (
                  <div className="p-3 bg-card rounded-lg border border-border grid grid-cols-3 gap-3 animate-in fade-in duration-300">
                    <div className="space-y-1"><Label className="text-xs">Qual bem?</Label><Input value={data.purchasePlanItem} onChange={(e) => update({ purchasePlanItem: e.target.value })} className="crm-input" placeholder="Ex: Apartamento, Carro" /></div>
                    <div className="space-y-1"><Label className="text-xs">Em quanto tempo?</Label><Input value={data.purchasePlanTimeline} onChange={(e) => update({ purchasePlanTimeline: e.target.value })} className="crm-input" placeholder="Ex: 2 anos" /></div>
                    <div className="space-y-1"><Label className="text-xs">Valor estimado (R$)</Label><CurrencyInput value={data.purchasePlanValue} onChange={(v) => update({ purchasePlanValue: v })} /></div>
                  </div>
                )}
              </div>

              {/* ── Tabela de Patrimônio ── */}
              <div className="border-t border-border pt-4 space-y-3">
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
                          <td className="p-1"><Input value={item.description} onChange={(e) => updatePatrimonioItem(item.id, 'description', e.target.value)} className="crm-input h-8 text-xs" placeholder="Descrição" /></td>
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
                          <td className="p-1"><CurrencyInput value={item.value} onChange={(v) => updatePatrimonioItem(item.id, 'value', v)} className="h-8 text-xs text-right" /></td>
                          <td className="p-1">
                            <Select value={item.liquidezImediata} onValueChange={(v) => updatePatrimonioItem(item.id, 'liquidezImediata', v)}>
                              <SelectTrigger className="crm-input h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-1"><Button type="button" variant="ghost" size="icon" onClick={() => removePatrimonioItem(item.id)} className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPatrimonioItem}><Plus className="w-4 h-4 mr-1" />Adicionar item</Button>
              </div>

              {/* ── Composição do Patrimônio ── */}
              {patrimonioTotal > 0 && (
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.reserva > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">🛡 Reserva de Emergência</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.reserva)}</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.imobiliario > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">🏠 Patrimônio Imobiliário</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.imobiliario)}</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.societario > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">🏢 Participações Societárias</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.societario)}</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${patrimonioByGroup.outros > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">🚗 Outros Bens</p>
                      <p className="text-sm font-bold text-foreground">{fmt(patrimonioByGroup.outros)}</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${liquidezImediataTotal > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                      <p className="text-xs text-muted-foreground">💧 Liquidez Imediata</p>
                      <p className="text-sm font-bold text-foreground">{fmt(liquidezImediataTotal)}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-foreground/5 rounded-lg border-2 border-foreground/20 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Patrimônio Total</span>
                    <span className="text-lg font-bold text-primary">{fmt(patrimonioTotal)}</span>
                  </div>
                </div>
              )}

              {/* Concentração */}
              <div className="space-y-2">
                <Label>Patrimônio concentrado em algo específico?</Label>
                <RadioGroup value={data.hasConcentrationB2} onValueChange={(v) => update({ hasConcentrationB2: v })} className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                </RadioGroup>
              </div>
            </div>
            <CommentButton value={data.bloco2Comment} onChange={(v) => update({ bloco2Comment: v })} />
          </>)}

          {/* ============ BLOCO 3 — Proteção e Segurança ============ */}
          {renderBlock(3, 'Proteção e Segurança', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1 — Seguro de vida */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Você tem seguro de vida? Acha que o valor é adequado para sua família?</Label>
                  <RadioGroup value={data.hasLifeInsurance} onValueChange={(v) => update({ hasLifeInsurance: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.hasLifeInsurance === 'Sim' && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-xs">Valor segurado (R$)</Label><CurrencyInput value={data.lifeInsuranceValue} onChange={(v) => update({ lifeInsuranceValue: v })} /></div>
                        <div className="space-y-1"><Label className="text-xs">Seguradora</Label><Input value={data.lifeInsuranceCompany} onChange={(e) => update({ lifeInsuranceCompany: e.target.value })} className="crm-input" /></div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Acha que o valor é adequado?</Label><Textarea value={data.lifeInsuranceAdequate} onChange={(e) => update({ lifeInsuranceAdequate: e.target.value })} className="crm-input min-h-[50px]" /></div>
                    </div>
                  )}
                </div>

                {/* Card 2 — Seguros patrimoniais */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>E seguros patrimoniais? Seus imóveis e bens estão protegidos?</Label>
                  <RadioGroup value={data.hasPropertyInsurance} onValueChange={(v) => update({ hasPropertyInsurance: v })} className="flex gap-3">
                    {['Sim', 'Não', 'Parcialmente'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                  {(data.hasPropertyInsurance === 'Sim' || data.hasPropertyInsurance === 'Parcialmente') && (
                    <Textarea value={data.propertyInsuranceDetails} onChange={(e) => update({ propertyInsuranceDetails: e.target.value })} className="crm-input min-h-[50px] animate-in fade-in duration-300" placeholder="Detalhes..." />
                  )}
                </div>

                {/* Card 3 — Dívidas */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Você possui alguma dívida ou financiamento em aberto hoje?</Label>
                  <RadioGroup value={data.hasDebtsB3} onValueChange={(v) => update({ hasDebtsB3: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.hasDebtsB3 === 'Sim' && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      {debtsListB3.map((debt) => (
                        <div key={debt.id} className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1"><Input value={debt.description} onChange={(e) => updateDebtB3(debt.id, 'description', e.target.value)} className="crm-input" placeholder="Descrição" /></div>
                          <div className="w-36 space-y-1"><CurrencyInput value={debt.balance} onChange={(v) => updateDebtB3(debt.id, 'balance', v)} /></div>
                          <div className="w-24 space-y-1"><Input value={debt.remainingInstallments} onChange={(e) => updateDebtB3(debt.id, 'remainingInstallments', e.target.value)} className="crm-input" placeholder="Parcelas" /></div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeDebtB3(debt.id)} className="h-9 w-9 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addDebtB3}><Plus className="w-4 h-4 mr-1" />Adicionar dívida</Button>
                    </div>
                  )}
                </div>

                {/* Card 4 — Reserva de emergência */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Tem uma reserva de emergência? Ela cobre quantos meses do seu custo de vida?</Label>
                  <RadioGroup value={data.hasEmergencyReserveB3} onValueChange={(v) => update({ hasEmergencyReserveB3: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.hasEmergencyReserveB3 === 'Sim' && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-xs">Valor da reserva (R$)</Label><CurrencyInput value={data.emergencyReserveValueB3} onChange={(v) => update({ emergencyReserveValueB3: v })} /></div>
                        <div className="space-y-1"><Label className="text-xs">Cobre quantos meses?</Label><Input type="number" value={data.emergencyReserveCoverageB3} onChange={(e) => update({ emergencyReserveCoverageB3: e.target.value })} className="crm-input" /></div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Onde está aplicada?</Label><Input value={data.emergencyReserveLocationB3} onChange={(e) => update({ emergencyReserveLocationB3: e.target.value })} className="crm-input" placeholder="Ex: CDB liquidez diária, Tesouro Selic..." /></div>
                    </div>
                  )}
                </div>

                {/* Card 5 — Família saberia o que fazer */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Caso algo aconteça com você amanhã, sua família saberia o que fazer?</Label>
                  <RadioGroup value={data.familyKnowsB3} onValueChange={(v) => update({ familyKnowsB3: v })} className="flex gap-3">
                    {['Sim', 'Não', 'Parcialmente'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                  <Textarea value={data.familyKnowsDetailsB3} onChange={(e) => update({ familyKnowsDetailsB3: e.target.value })} className="crm-input min-h-[50px]" placeholder="Detalhes..." />
                </div>

                {/* Card 6 — Check-up financeiro */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Você já fez um check-up financeiro completo alguma vez na vida?</Label>
                  <RadioGroup value={data.hadFinancialCheckupB3} onValueChange={(v) => update({ hadFinancialCheckupB3: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.hadFinancialCheckupB3 === 'Sim' && (
                    <Textarea value={data.financialCheckupDetailsB3} onChange={(e) => update({ financialCheckupDetailsB3: e.target.value })} className="crm-input min-h-[50px] animate-in fade-in duration-300" placeholder="Detalhes..." />
                  )}
                </div>
              </div>
            </div>
            <CommentButton value={data.bloco3Comment} onChange={(v) => update({ bloco3Comment: v })} />
          </>)}

          {/* ============ BLOCO 4 — Objetivos e Sonhos ============ */}
          {renderBlock(4, 'Objetivos e Sonhos', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1 — Objetivos financeiros */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Quais são seus principais objetivos financeiros para os próximos anos?</Label>
                  <Textarea value={data.financialGoals} onChange={(e) => update({ financialGoals: e.target.value })} className="crm-input min-h-[80px]" />
                </div>

                {/* Card 2 — Aposentadoria */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Você já pensou em se aposentar? Com que idade? Mantendo qual padrão?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Idade desejada</Label><Input type="number" value={data.retirementAge} onChange={(e) => update({ retirementAge: e.target.value })} className="crm-input" placeholder="Ex: 60" /></div>
                    <div className="space-y-1"><Label className="text-xs">Renda mensal desejada (R$)</Label><CurrencyInput value={data.retirementIncome} onChange={(v) => update({ retirementIncome: v })} /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Padrão de vida na aposentadoria</Label><Textarea value={data.retirementLifestyle} onChange={(e) => update({ retirementLifestyle: e.target.value })} className="crm-input min-h-[50px]" placeholder="Como imagina viver..." /></div>
                </div>

                {/* Card 3 — Morar fora */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Tem interesse em morar fora do país em algum momento?</Label>
                  <RadioGroup value={data.wantsToLiveAbroad} onValueChange={(v) => update({ wantsToLiveAbroad: v })} className="flex gap-3">
                    {['Sim', 'Não', 'Talvez'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                  {(data.wantsToLiveAbroad === 'Sim' || data.wantsToLiveAbroad === 'Talvez') && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-300">
                      <div className="space-y-1"><Label className="text-xs">Qual país/região?</Label><Input value={data.abroadCountry} onChange={(e) => update({ abroadCountry: e.target.value })} className="crm-input" /></div>
                      <div className="space-y-1"><Label className="text-xs">Em quanto tempo?</Label><Input value={data.abroadTimeline} onChange={(e) => update({ abroadTimeline: e.target.value })} className="crm-input" /></div>
                    </div>
                  )}
                </div>

                {/* Card 4 — Educação filhos */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Seus filhos precisam de planejamento educacional? Faculdade, intercâmbio?</Label>
                  <RadioGroup value={data.childrenEducation} onValueChange={(v) => update({ childrenEducation: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.childrenEducation === 'Sim' && (
                    <Textarea value={data.childrenEducationDetails} onChange={(e) => update({ childrenEducationDetails: e.target.value })} className="crm-input min-h-[50px] animate-in fade-in duration-300" placeholder="Detalhes do planejamento educacional..." />
                  )}
                </div>

                {/* Card 5 — Viagens */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Você costuma viajar? Com que frequência? Quanto gasta aproximadamente?</Label>
                  <Textarea value={data.travelDetailsB4} onChange={(e) => update({ travelDetailsB4: e.target.value })} className="crm-input min-h-[50px]" />
                  <div className="space-y-1"><Label className="text-xs">Gasto anual estimado com viagens (R$)</Label><CurrencyInput value={data.travelAnnualCostB4} onChange={(v) => update({ travelAnnualCostB4: v })} /></div>
                </div>

                {/* Card 6 — Gastos anuais relevantes */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Quais são seus gastos anuais relevantes? (viagens, educação, saúde)</Label>
                  {annualExpensesB4.map((item) => (
                    <div key={item.id} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1"><Input value={item.description} onChange={(e) => updateAnnualExpenseB4(item.id, 'description', e.target.value)} className="crm-input" placeholder="Descrição" /></div>
                      <div className="w-36 space-y-1"><CurrencyInput value={item.value} onChange={(v) => updateAnnualExpenseB4(item.id, 'value', v)} /></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAnnualExpenseB4(item.id)} className="h-9 w-9 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addAnnualExpenseB4}><Plus className="w-4 h-4 mr-1" />Adicionar gasto</Button>
                </div>

                {/* Card 7 — Sucessório */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Você já pensou em planejamento sucessório para seus herdeiros?</Label>
                  <RadioGroup value={data.successionThoughtB4} onValueChange={(v) => update({ successionThoughtB4: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.successionThoughtB4 === 'Sim' && (
                    <Textarea value={data.successionDetailsB4} onChange={(e) => update({ successionDetailsB4: e.target.value })} className="crm-input min-h-[50px] animate-in fade-in duration-300" placeholder="Detalhes..." />
                  )}
                </div>

                {/* Card 8 — Organização patrimônio */}
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Como você imagina deixar seu patrimônio organizado para a próxima geração?</Label>
                  <Textarea value={data.successionOrganizationB4} onChange={(e) => update({ successionOrganizationB4: e.target.value })} className="crm-input min-h-[80px]" />
                </div>
              </div>
            </div>
            <CommentButton value={data.bloco4Comment} onChange={(v) => update({ bloco4Comment: v })} />
          </>)}

          {/* ============ BLOCO 5 — Perfil Comportamental ============ */}
          {renderBlock(5, 'Perfil Comportamental', <>
            <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">

              {/* Part 1 — Grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Você já perdeu sono por causa de dinheiro ou investimentos? Me conte.</Label>
                  <Textarea value={data.lostSleepOverMoney} onChange={(e) => update({ lostSleepOverMoney: e.target.value })} className="crm-input min-h-[60px]" />
                </div>

                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Me conta uma situação que te deixou com raiva de verdade.</Label>
                  <Textarea value={data.angerSituation} onChange={(e) => update({ angerSituation: e.target.value })} className="crm-input min-h-[60px]" />
                </div>

                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Se você vê seus investimentos caindo 10–15%, o que sente? O que faz?</Label>
                  <RadioGroup value={data.dropReactionB5} onValueChange={(v) => update({ dropReactionB5: v })} className="flex gap-3 flex-wrap">
                    {['Vendo tudo', 'Aguardo', 'Compro mais'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                  <Textarea value={data.dropReactionDetailsB5} onChange={(e) => update({ dropReactionDetailsB5: e.target.value })} className="crm-input min-h-[50px]" placeholder="Detalhes..." />
                </div>

                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Prefere segurança com ganhos menores ou aceita mais risco por retorno maior?</Label>
                  <RadioGroup value={data.riskPreferenceB5} onValueChange={(v) => update({ riskPreferenceB5: v })} className="flex gap-3 flex-wrap">
                    {['Prefiro segurança', 'Equilíbrio', 'Aceito mais risco'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                  <Textarea value={data.riskPreferenceDetailsB5} onChange={(e) => update({ riskPreferenceDetailsB5: e.target.value })} className="crm-input min-h-[50px]" placeholder="Detalhes..." />
                </div>

                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>Quando vai num médico, gosta de entender o diagnóstico inteiro?</Label>
                  <RadioGroup value={data.understandsDiagnosisB5} onValueChange={(v) => update({ understandsDiagnosisB5: v })} className="flex gap-3 flex-wrap">
                    {['Sim, quero entender tudo', 'Prefiro só o essencial'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                  <Textarea value={data.understandsDiagnosisDetailsB5} onChange={(e) => update({ understandsDiagnosisDetailsB5: e.target.value })} className="crm-input min-h-[50px]" placeholder="Detalhes..." />
                </div>

                <div className="p-4 bg-card rounded-lg border border-border space-y-3">
                  <Label>O último investimento que fez, como foi a decisão?</Label>
                  <Textarea value={data.lastInvestmentDecision} onChange={(e) => update({ lastInvestmentDecision: e.target.value })} className="crm-input min-h-[60px]" />
                </div>
              </div>

              {/* Part 2 — Histórico e Expectativas */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Já investiu ou acompanha o mercado financeiro?</Label>
                  <RadioGroup value={data.hasInvestmentHistoryB5} onValueChange={(v) => update({ hasInvestmentHistoryB5: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.hasInvestmentHistoryB5 === 'Sim' && (
                    <Textarea value={data.investmentHistoryDetailsB5} onChange={(e) => update({ investmentHistoryDetailsB5: e.target.value })} className="crm-input min-h-[60px] animate-in fade-in duration-300" placeholder="Detalhes..." />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Já trabalhou com assessor ou consultor financeiro?</Label>
                  <RadioGroup value={data.hasWorkedWithAdvisorB5} onValueChange={(v) => update({ hasWorkedWithAdvisorB5: v })} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
                  </RadioGroup>
                  {data.hasWorkedWithAdvisorB5 === 'Sim' && (
                    <Textarea value={data.advisorExperienceB5} onChange={(e) => update({ advisorExperienceB5: e.target.value })} className="crm-input min-h-[60px] animate-in fade-in duration-300" placeholder="Como foi a experiência?" />
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Prefere acompanhar ou delegar?</Label>
                  <RadioGroup value={data.managementPreferenceB5} onValueChange={(v) => update({ managementPreferenceB5: v })} className="flex flex-col gap-1">
                    {['Prefiro delegar totalmente', 'Gosto de acompanhar as decisões', 'Quero participar ativamente'].map(o =>
                      <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>
                    )}
                  </RadioGroup>
                </div>

                <div className="space-y-1">
                  <Label>Frequência de acompanhamento desejada</Label>
                  <RadioGroup value={data.followUpFrequencyB5} onValueChange={(v) => update({ followUpFrequencyB5: v })} className="flex gap-4">
                    {['Mensal', 'Bimestral', 'Trimestral'].map(o => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </div>

                <div className="space-y-1">
                  <Label>O que precisa acontecer para considerar essa parceria um sucesso?</Label>
                  <Textarea value={data.successCriteriaB5} onChange={(e) => update({ successCriteriaB5: e.target.value })} className="crm-input min-h-[60px]" />
                </div>
              </div>
            </div>
            <CommentButton value={data.bloco5Comment} onChange={(v) => update({ bloco5Comment: v })} />
          </>)}

        </TabsContent>

        {/* ====== 2ª REUNIÃO ====== */}
        <TabsContent value="reuniao2" className="space-y-3 mt-4">
          {renderBlock(6, 'Arquitetura Estratégica da Carteira', <>
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

              <div className="pt-3 border-t border-border space-y-3">
                <h5 className="font-medium text-foreground">Diretrizes</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Eficiência tributária</Label>
                    <Select value={data.taxEfficiency} onValueChange={(v) => update({ taxEfficiency: v })}>
                      <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {['Alta prioridade', 'Moderada', 'Baixa prioridade'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Notas sobre tributação</Label><Input value={data.taxEfficiencyNotes} onChange={(e) => update({ taxEfficiencyNotes: e.target.value })} className="crm-input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Regra de rebalanceamento</Label>
                    <Select value={data.rebalancingRule} onValueChange={(v) => update({ rebalancingRule: v })}>
                      <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {['Trimestral fixo', 'Semestral fixo', 'Anual fixo', 'Sob demanda (desvio > X%)'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Estrutura recomendada</Label><Input value={data.recommendedStructure} onChange={(e) => update({ recommendedStructure: e.target.value })} className="crm-input" placeholder="Ex: PF + PJ + Holding" /></div>
                </div>
              </div>
            </div>
            <CommentButton value={data.bloco8Comment} onChange={(v) => update({ bloco8Comment: v })} />
          </>)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
