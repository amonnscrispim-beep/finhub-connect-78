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
import { ChevronDown, ChevronRight, Plus, Trash2, MessageSquare, ChevronUp, FileText, Link2 } from 'lucide-react';
import { generateClientPDF } from '@/utils/generateClientPDF';
import { FormLinkDialog } from '../FormLinkDialog';
import { FormSubmissionBanner } from '../FormSubmissionBanner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BirthDatePicker } from '@/components/ui/birth-date-picker';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ConhecerClienteData, ConhecerChildInfo, RealEstateCard, PatrimonioTableItem, DebtItem, DebtItemV2 } from './types';
import { syncLegacyFields } from './types';
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
  clientId?: string;
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

const CIVIL_STATUS = ['Solteiro(a)', 'Casado(a)', 'União Estável', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)'];
const MARRIAGE_REGIMES = ['Comunhão parcial de bens', 'Comunhão universal de bens', 'Separação total de bens', 'Participação final nos aquestos'];
const EDUCATION_PHASES = ['Berçário', 'Infantil', 'Fundamental', 'Médio', 'Superior', 'Formado', 'N/A'];
const EMPLOYMENT_TYPES = ['CLT', 'PJ', 'Empresário/Sócio', 'Autônomo', 'Aposentado', 'Servidor Público'];
const DEBT_TYPES = ['Financiamento imobiliário', 'Veículo', 'Crédito pessoal', 'Cartão de crédito', 'Cheque especial', 'Outro'];
const DROP_REACTIONS = ['Não me afetou', 'Fiquei preocupado', 'Vendi parte', 'Vendi tudo'];
const EXPERIENCE_LEVELS = ['Nenhuma', 'Básica (poupança/CDB)', 'Intermediária (fundos/ações)', 'Avançada (derivativos/offshore)'];
const HOBBY_OPTIONS = ['Arquitetura e Design', 'Arte', 'Gastronomia', 'Viagens', 'Vinhos', 'Esportes', 'Música', 'Cinema', 'Tecnologia', 'Moda', 'Literatura', 'Outros'];

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`space-y-1.5 ${wide ? 'md:col-span-2' : ''}`}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 bg-muted/20 rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {children}
    </div>
  );
}

function Radios({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <RadioGroup value={value || ''} onValueChange={onChange} className="flex gap-4 flex-wrap pt-1">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} /> {o}</label>
      ))}
    </RadioGroup>
  );
}

function YN({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Radios value={value} onChange={onChange} options={['Sim', 'Não']} />;
}

function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#64748b', '#ef4444', '#06b6d4'];

export function ConhecerClienteModule({ data, onChange, hasChildrenFromBloco1, clientAge = 0, clientName = '', advisorName = '', clientId }: Props) {
  const update = (partial: Partial<ConhecerClienteData>) => onChange(syncLegacyFields({ ...data, ...partial }));
  const { user } = useAuth();
  const [linkOpen, setLinkOpen] = useState(false);
  const showEmpresaBlock = data.employmentType === 'PJ' || data.employmentType === 'Empresário/Sócio';
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const debtsList = data.debtsList || [];
  const addDebt = () => update({ debtsList: [...debtsList, { id: genId(), type: '', totalValue: '', monthlyPayment: '', interestRate: '', remainingMonths: '' }] });
  const removeDebt = (id: string) => update({ debtsList: debtsList.filter((d) => d.id !== id) });
  const updateDebt = (id: string, field: keyof DebtItemV2, value: string) =>
    update({ debtsList: debtsList.map((d) => (d.id === id ? { ...d, [field]: value } : d)) });
  const toggleHobby = (h: string) => {
    const cur = data.hobbiesAndInterests || [];
    update({ hobbiesAndInterests: cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h] });
  };
  const setNumChildren = (val: string) => {
    const count = Math.max(0, Math.min(20, parseInt(val) || 0));
    const current = data.children || [];
    const next = [...current];
    for (let i = current.length; i < count; i++) next.push({ id: genId(), name: '', age: '', educationPhase: '', educationMonthlyCost: '', livesWithClient: '' });
    update({ numChildren: val, children: next });
  };
  const handleGeneratePDF = async () => {
    let consultor = advisorName;
    if (!consultor && user) {
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
      consultor = prof?.full_name || user.email || '';
    }
    generateClientPDF(data, clientName || data.fullName || 'Cliente', consultor);
  };


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

  const patrimonioPie = useMemo(() => ([
    { name: 'Financeiro', value: patrimonioByGroup.financeiro },
    { name: 'Reserva', value: patrimonioByGroup.reserva },
    { name: 'Imobiliário', value: patrimonioByGroup.imobiliario },
    { name: 'Societário', value: patrimonioByGroup.societario },
    { name: 'Outros', value: patrimonioByGroup.outros },
  ].filter((i) => i.value > 0)), [patrimonioByGroup]);
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
        <div className="flex items-center gap-2 ml-2">
          {clientId && (
            <Button type="button" variant="outline" size="sm" onClick={() => setLinkOpen(true)} className="gap-1.5 text-xs">
              <Link2 className="w-3.5 h-3.5" />Enviar Formulário
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleGeneratePDF} className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />Gerar PDF
          </Button>
        </div>
      </div>

      {clientId && <FormSubmissionBanner clientId={clientId} data={data} onMerge={(merged) => onChange(syncLegacyFields(merged))} />}
      {clientId && <FormLinkDialog open={linkOpen} onOpenChange={setLinkOpen} clientId={clientId} clientName={clientName || data.fullName} />}

      <Tabs defaultValue="reuniao1" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reuniao1">1ª Reunião</TabsTrigger>
          <TabsTrigger value="reuniao2">2ª Reunião</TabsTrigger>
        </TabsList>

        <TabsContent value="reuniao1" className="space-y-3 mt-4">

          {/* ============ BLOCO 1 — Identificação & Família ============ */}
          {renderBlock(1, 'Identificação & Família', <>
            <ConsultantNote>Comece pela pessoa. Conheça a história, a família, os dependentes. Isso define todo o planejamento.</ConsultantNote>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Nome completo *"><Input value={data.fullName} onChange={(e) => update({ fullName: e.target.value })} className="crm-input" /></F>
              <F label={`Data de nascimento *${calculatedAge !== null ? ` — ${calculatedAge} anos` : ''}`}>
                <BirthDatePicker value={data.birthDate ? new Date(`${data.birthDate}T12:00:00`) : null} onChange={(d) => update({ birthDate: d ? toIso(d) : '' })} />
              </F>
              <F label="Estado civil *"><Sel value={data.civilStatus} onChange={(v) => update({ civilStatus: v })} options={CIVIL_STATUS} /></F>
            </div>
            {(data.civilStatus === 'Casado(a)' || data.civilStatus === 'União Estável') && (
              <Sub>
                <F label="Nome do cônjuge"><Input value={data.spouseName} onChange={(e) => update({ spouseName: e.target.value })} className="crm-input" /></F>
                <F label="Regime matrimonial"><Sel value={data.marriageRegime} onChange={(v) => update({ marriageRegime: v })} options={MARRIAGE_REGIMES} /></F>
                <F label="Cônjuge trabalha?"><YN value={data.spouseWorks} onChange={(v) => update({ spouseWorks: v })} /></F>
                {data.spouseWorks === 'Sim' && <>
                  <F label="Profissão do cônjuge"><Input value={data.spouseProfession} onChange={(e) => update({ spouseProfession: e.target.value })} className="crm-input" /></F>
                  <F label="Renda do cônjuge"><CurrencyInput value={data.spouseIncome} onChange={(v) => update({ spouseIncome: v })} /></F>
                </>}
              </Sub>
            )}
            {data.civilStatus === 'Viúvo(a)' && (
              <Sub>
                <F label="Nome do falecido(a)"><Input value={data.spouseName} onChange={(e) => update({ spouseName: e.target.value })} className="crm-input" /></F>
                <F label="Há quanto tempo"><Input value={data.widowSinceYears} onChange={(e) => update({ widowSinceYears: e.target.value })} className="crm-input" placeholder="Ex: 5 anos" /></F>
              </Sub>
            )}
            {data.civilStatus === 'Divorciado(a)' && (
              <Sub>
                <F label="Paga pensão alimentícia?"><YN value={data.paysSupportAlimony} onChange={(v) => update({ paysSupportAlimony: v })} /></F>
                {data.paysSupportAlimony === 'Sim' && <F label="Valor da pensão"><CurrencyInput value={data.alimonyValue} onChange={(v) => update({ alimonyValue: v })} /></F>}
              </Sub>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Provedor único ou renda dividida?"><Sel value={data.incomeProvider} onChange={(v) => update({ incomeProvider: v })} options={['Provedor único', 'Renda dividida']} /></F>
              {data.incomeProvider === 'Renda dividida' && <F label="Quanto (%) da renda familiar você representa?"><Input type="number" min={0} max={100} value={data.incomeSharePct} onChange={(e) => update({ incomeSharePct: e.target.value })} className="crm-input" /></F>}
              <F label="Tem filhos?"><YN value={data.hasChildren} onChange={(v) => update({ hasChildren: v, ...(v === 'Não' ? { children: [], numChildren: '' } : {}) })} /></F>
              {data.hasChildren === 'Sim' && <F label="Quantos filhos?"><Input type="number" min={0} value={data.numChildren} onChange={(e) => setNumChildren(e.target.value)} className="crm-input" /></F>}
            </div>
            {data.hasChildren === 'Sim' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {data.children.map((c, i) => (
                  <div key={c.id} className="p-3 bg-muted/20 rounded-lg border border-border relative">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeChild(c.id)} className="absolute top-2 right-2 h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Filho {i + 1}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <F label="Nome"><Input value={c.name} onChange={(e) => updateChild(c.id, 'name', e.target.value)} className="crm-input" /></F>
                      <F label="Idade"><Input type="number" value={c.age} onChange={(e) => updateChild(c.id, 'age', e.target.value)} className="crm-input" /></F>
                      <F label="Fase escolar"><Sel value={c.educationPhase || ''} onChange={(v) => updateChild(c.id, 'educationPhase', v)} options={EDUCATION_PHASES} /></F>
                      <F label="Custo mensal da educação"><CurrencyInput value={c.educationMonthlyCost || ''} onChange={(v) => updateChild(c.id, 'educationMonthlyCost', v)} /></F>
                      <F label="Mora com você?"><YN value={c.livesWithClient || ''} onChange={(v) => updateChild(c.id, 'livesWithClient', v)} /></F>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addChild}><Plus className="w-4 h-4 mr-1" />Adicionar filho</Button>
              </div>
            )}
            <CommentButton value={data.bloco1Comment} onChange={(v) => update({ bloco1Comment: v })} />
          </>)}

          {/* ============ BLOCO 2 — Renda & Custos ============ */}
          {renderBlock(2, 'Renda & Custos', <>
            <ConsultantNote>Entenda de onde vem o dinheiro e para onde vai. Sem isso, não há planejamento real.</ConsultantNote>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Regime de trabalho"><Sel value={data.employmentType} onChange={(v) => update({ employmentType: v })} options={EMPLOYMENT_TYPES} /></F>
              <F label="Profissão"><Input value={data.profession} onChange={(e) => update({ profession: e.target.value })} className="crm-input" /></F>
              <F label="Cargo"><Input value={data.jobTitle} onChange={(e) => update({ jobTitle: e.target.value })} className="crm-input" /></F>
            </div>
            {data.employmentType === 'CLT' && (
              <Sub>
                <F label="Empresa"><Input value={data.cltCompany} onChange={(e) => update({ cltCompany: e.target.value })} className="crm-input" /></F>
                <F label="Benefícios (VR, VA, plano)"><Input value={data.cltBenefits} onChange={(e) => update({ cltBenefits: e.target.value })} className="crm-input" /></F>
                <F label="Salário bruto"><CurrencyInput value={data.cltSalary} onChange={(v) => update({ cltSalary: v })} /></F>
                <F label="Salário líquido"><CurrencyInput value={data.cltNetSalary} onChange={(v) => update({ cltNetSalary: v })} /></F>
                <F label="Tem perspectiva de crescimento?" wide><Textarea value={data.cltGrowthPlan} onChange={(e) => update({ cltGrowthPlan: e.target.value })} className="crm-input min-h-[60px]" /></F>
              </Sub>
            )}
            {(data.employmentType === 'PJ' || data.employmentType === 'Empresário/Sócio') && (
              <Sub>
                {data.employmentType === 'Empresário/Sócio' && <p className="md:col-span-2 text-xs text-primary">Os detalhes da empresa serão preenchidos no Bloco 3.</p>}
                <F label="Nome da empresa"><Input value={data.pjCompanyName} onChange={(e) => update({ pjCompanyName: e.target.value })} className="crm-input" /></F>
                <F label="CNPJ"><Input value={data.pjCnpj} onChange={(e) => update({ pjCnpj: e.target.value })} className="crm-input" /></F>
                <F label="Faturamento mensal"><CurrencyInput value={data.pjMonthlyRevenue} onChange={(v) => update({ pjMonthlyRevenue: v })} /></F>
                <F label="Custo operacional mensal"><CurrencyInput value={data.pjMonthlyOpCost} onChange={(v) => update({ pjMonthlyOpCost: v })} /></F>
                <F label="Pró-labore"><CurrencyInput value={data.pjProLabore} onChange={(v) => update({ pjProLabore: v })} /></F>
                <F label="Distribuição de lucros"><CurrencyInput value={data.pjProfitDistribution} onChange={(v) => update({ pjProfitDistribution: v })} /></F>
                <F label="Regime tributário"><Sel value={data.pjTaxRegime} onChange={(v) => update({ pjTaxRegime: v })} options={['Simples Nacional', 'Lucro Presumido', 'Lucro Real']} /></F>
                <F label="Setor de atuação"><Input value={data.pjSector} onChange={(e) => update({ pjSector: e.target.value })} className="crm-input" /></F>
              </Sub>
            )}
            {data.employmentType === 'Autônomo' && (
              <Sub>
                <F label="Área de atuação"><Input value={data.autonomoArea} onChange={(e) => update({ autonomoArea: e.target.value })} className="crm-input" /></F>
                <F label="Renda mensal média"><CurrencyInput value={data.autonomoIncome} onChange={(v) => update({ autonomoIncome: v })} /></F>
                <F label="Renda é estável?" wide><Radios value={data.autonomoStability} onChange={(v) => update({ autonomoStability: v })} options={['Sim, estável', 'Varia bastante', 'Sazonal']} /></F>
              </Sub>
            )}
            {data.employmentType === 'Aposentado' && (
              <Sub>
                <F label="Tipo de aposentadoria"><Sel value={data.aposentadoType} onChange={(v) => update({ aposentadoType: v })} options={['INSS', 'Previdência Privada', 'Ambas']} /></F>
                <F label="Valor mensal"><CurrencyInput value={data.aposentadoIncome} onChange={(v) => update({ aposentadoIncome: v })} /></F>
                <F label="Tem outra fonte de renda?"><YN value={data.aposentadoExtraIncome} onChange={(v) => update({ aposentadoExtraIncome: v })} /></F>
                {data.aposentadoExtraIncome === 'Sim' && <>
                  <F label="Qual fonte?"><Input value={data.aposentadoExtraIncomeDesc} onChange={(e) => update({ aposentadoExtraIncomeDesc: e.target.value })} className="crm-input" /></F>
                  <F label="Valor mensal da outra fonte"><CurrencyInput value={data.aposentadoExtraIncomeValue} onChange={(v) => update({ aposentadoExtraIncomeValue: v })} /></F>
                </>}
              </Sub>
            )}
            {data.employmentType === 'Servidor Público' && (
              <Sub>
                <F label="Órgão"><Input value={data.servidorOrgao} onChange={(e) => update({ servidorOrgao: e.target.value })} className="crm-input" /></F>
                <F label="Cargo"><Input value={data.servidorCargo} onChange={(e) => update({ servidorCargo: e.target.value })} className="crm-input" /></F>
                <F label="Salário líquido"><CurrencyInput value={data.servidorNetSalary} onChange={(v) => update({ servidorNetSalary: v })} /></F>
                <F label="Estável desde (ano)"><Input value={data.servidorEstabilidadeDesde} onChange={(e) => update({ servidorEstabilidadeDesde: e.target.value })} className="crm-input" /></F>
              </Sub>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Renda anual familiar"><CurrencyInput value={data.annualFamilyIncome} onChange={(v) => update({ annualFamilyIncome: v })} /></F>
              <F label="Custo mensal da família"><CurrencyInput value={data.monthlyCostOfLiving} onChange={(v) => update({ monthlyCostOfLiving: v })} /></F>
              <F label="Capacidade de aporte mensal"><CurrencyInput value={data.monthlyInvestmentCapacity} onChange={(v) => update({ monthlyInvestmentCapacity: v })} /></F>
              <F label="Capacidade de aporte anual"><CurrencyInput value={data.annualInvestmentCapacity} onChange={(v) => update({ annualInvestmentCapacity: v })} /></F>
              <F label="Tem dívidas?"><YN value={data.hasDebts} onChange={(v) => update({ hasDebts: v })} /></F>
            </div>
            {data.hasDebts === 'Sim' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {debtsList.map((d) => (
                  <div key={d.id} className="p-3 bg-muted/20 rounded-lg border border-border relative grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDebt(d.id)} className="absolute top-2 right-2 h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                    <F label="Tipo"><Sel value={d.type} onChange={(v) => updateDebt(d.id, 'type', v)} options={DEBT_TYPES} /></F>
                    <F label="Valor total"><CurrencyInput value={d.totalValue} onChange={(v) => updateDebt(d.id, 'totalValue', v)} /></F>
                    <F label="Parcela mensal"><CurrencyInput value={d.monthlyPayment} onChange={(v) => updateDebt(d.id, 'monthlyPayment', v)} /></F>
                    <F label="Taxa de juros (% a.m.)"><Input type="number" step="0.01" value={d.interestRate} onChange={(e) => updateDebt(d.id, 'interestRate', e.target.value)} className="crm-input" /></F>
                    <F label="Prazo restante (meses)"><Input type="number" value={d.remainingMonths} onChange={(e) => updateDebt(d.id, 'remainingMonths', e.target.value)} className="crm-input" /></F>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addDebt}><Plus className="w-4 h-4 mr-1" />Adicionar dívida</Button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Tem previdência privada?"><YN value={data.hasPrivatePension} onChange={(v) => update({ hasPrivatePension: v })} /></F>
            </div>
            {data.hasPrivatePension === 'Sim' && (
              <Sub>
                <F label="Tipo"><Sel value={data.pensionType} onChange={(v) => update({ pensionType: v })} options={['PGBL', 'VGBL']} /></F>
                <F label="Instituição"><Input value={data.pensionInstitution} onChange={(e) => update({ pensionInstitution: e.target.value })} className="crm-input" /></F>
                <F label="Valor acumulado"><CurrencyInput value={data.pensionAccumulated} onChange={(v) => update({ pensionAccumulated: v })} /></F>
                <F label="Aporte mensal"><CurrencyInput value={data.pensionMonthlyContrib} onChange={(v) => update({ pensionMonthlyContrib: v })} /></F>
                <F label="Rendimento (% a.a.)"><Input value={data.pensionYield} onChange={(e) => update({ pensionYield: e.target.value })} className="crm-input" /></F>
              </Sub>
            )}
            <CommentButton value={data.bloco2Comment} onChange={(v) => update({ bloco2Comment: v })} />
          </>)}

          {/* ============ BLOCO 3 — Empresa (condicional) ============ */}
          {showEmpresaBlock && renderBlock(3, 'Empresa', <>
            <ConsultantNote>Se o cliente é empresário, a empresa é parte do patrimônio. Entenda a estrutura societária e os riscos.</ConsultantNote>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Tem sócios?"><YN value={data.hasPjPartners} onChange={(v) => update({ hasPjPartners: v })} /></F>
              {data.hasPjPartners === 'Sim' && <F label="Quantos sócios?"><Input type="number" value={data.pjPartnersCount} onChange={(e) => update({ pjPartnersCount: e.target.value })} className="crm-input" /></F>}
              <F label="Participação do cliente (%)"><Input type="number" value={data.pjClientShare} onChange={(e) => update({ pjClientShare: e.target.value })} className="crm-input" /></F>
              <F label="Valuation estimado da empresa"><CurrencyInput value={data.pjCompanyValue} onChange={(v) => update({ pjCompanyValue: v })} /></F>
              <F label="Tem funcionário-chave?"><YN value={data.pjHasKeyEmployee} onChange={(v) => update({ pjHasKeyEmployee: v })} /></F>
              {data.pjHasKeyEmployee === 'Sim' && <F label="Nome do funcionário-chave"><Input value={data.pjKeyEmployeeName} onChange={(e) => update({ pjKeyEmployeeName: e.target.value })} className="crm-input" /></F>}
              <F label="Número de funcionários"><Input type="number" value={data.pjEmployeeCount} onChange={(e) => update({ pjEmployeeCount: e.target.value })} className="crm-input" /></F>
              <F label="Precisa renovar equipamentos?"><YN value={data.pjRenewEquipment} onChange={(v) => update({ pjRenewEquipment: v })} /></F>
              {data.pjRenewEquipment === 'Sim' && <>
                <F label="Prazo para renovação"><Input value={data.pjRenewTimeline} onChange={(e) => update({ pjRenewTimeline: e.target.value })} className="crm-input" /></F>
                <F label="Valor estimado da renovação"><CurrencyInput value={data.pjRenewValue} onChange={(v) => update({ pjRenewValue: v })} /></F>
              </>}
              <F label="Preocupações com a empresa" wide><Textarea value={data.pjConcerns} onChange={(e) => update({ pjConcerns: e.target.value })} className="crm-input min-h-[60px]" /></F>
            </div>
            <CommentButton value={data.bloco3Comment} onChange={(v) => update({ bloco3Comment: v })} />
          </>)}

          {/* ============ BLOCO 4 — Patrimônio & Banking ============ */}
          {renderBlock(4, 'Patrimônio & Banking', <>
            <ConsultantNote>Mapeie tudo: mercado financeiro, imóveis, offshore, FGTS. O patrimônio total dá a dimensão do cliente.</ConsultantNote>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="PL total no mercado financeiro (líquido)"><CurrencyInput value={data.totalFinancialPL} onChange={(v) => update({ totalFinancialPL: v })} /></F>
              <F label="Patrimônio total estimado (imóveis + veículos + investimentos)"><CurrencyInput value={data.totalPatrimonyEstimate} onChange={(v) => update({ totalPatrimonyEstimate: v })} /></F>
              <F label="Possui imóveis como investimento?"><YN value={data.hasRealEstate} onChange={(v) => update({ hasRealEstate: v })} /></F>
            </div>
            {data.hasRealEstate === 'Sim' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {realEstateCards.map((card) => (
                  <div key={card.id} className="p-3 bg-muted/20 rounded-lg border border-border relative grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRealEstateCard(card.id)} className="absolute top-2 right-2 h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                    <F label="Descrição"><Input value={card.description} onChange={(e) => updateRealEstateCard(card.id, 'description', e.target.value)} className="crm-input" /></F>
                    <F label="Finalidade"><Sel value={card.purpose} onChange={(v) => updateRealEstateCard(card.id, 'purpose', v)} options={['Moradia', 'Investimento', 'Comercial', 'Veraneio']} /></F>
                    <F label="Valor estimado"><CurrencyInput value={card.value} onChange={(v) => updateRealEstateCard(card.id, 'value', v)} /></F>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addRealEstateCard}><Plus className="w-4 h-4 mr-1" />Adicionar imóvel</Button>
              </div>
            )}

            {/* Tabela de patrimônio */}
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="font-medium">Tabela de patrimônio</Label>
              <ConsultantNote>Adicione cada ativo do cliente. A composição será calculada automaticamente.</ConsultantNote>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 font-medium text-muted-foreground">Descrição</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Categoria</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Valor (R$)</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Liquidez imediata</th>
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
                            <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
                          </Select>
                        </td>
                        <td className="p-1"><Button type="button" variant="ghost" size="icon" onClick={() => removePatrimonioItem(item.id)} className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addPatrimonioItem}><Plus className="w-4 h-4 mr-1" />Adicionar item</Button>
              {patrimonioTotal > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      ['Patrimônio Financeiro', patrimonioByGroup.financeiro],
                      ['Reserva de Emergência', patrimonioByGroup.reserva],
                      ['Imobiliário', patrimonioByGroup.imobiliario],
                      ['Participações Societárias', patrimonioByGroup.societario],
                      ['Outros Bens', patrimonioByGroup.outros],
                      ['Liquidez Imediata', liquidezImediataTotal],
                    ].map(([label, value]) => (
                      <div key={label as string} className={`p-3 rounded-lg border ${(value as number) > 0 ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-bold text-foreground">{fmt(value as number)}</p>
                      </div>
                    ))}
                  </div>
                  {patrimonioPie.length > 0 && (
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={patrimonioPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                            {patrimonioPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => fmt(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="p-3 bg-foreground/5 rounded-lg border-2 border-foreground/20 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Patrimônio Total</span>
                    <span className="text-lg font-bold text-primary">{fmt(patrimonioTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Banco principal"><Input value={data.mainBank} onChange={(e) => update({ mainBank: e.target.value })} className="crm-input" /></F>
              <F label="Outros bancos"><Input value={data.otherBanks} onChange={(e) => update({ otherBanks: e.target.value })} className="crm-input" /></F>
              <F label="Principal cartão de crédito"><Input value={data.mainCreditCard} onChange={(e) => update({ mainCreditCard: e.target.value })} className="crm-input" /></F>
              <F label="Outro cartão"><Input value={data.otherCreditCard} onChange={(e) => update({ otherCreditCard: e.target.value })} className="crm-input" /></F>
              <F label="FGTS (valor)"><CurrencyInput value={data.fgtsValue} onChange={(v) => update({ fgtsValue: v })} /></F>
            </div>

            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Possui recursos offshore?"><YN value={data.hasOffshore} onChange={(v) => update({ hasOffshore: v })} /></F>
              <F label="Utiliza conta internacional?"><YN value={data.hasInternationalAccount} onChange={(v) => update({ hasInternationalAccount: v })} /></F>
            </div>
            {data.hasOffshore === 'Sim' && (
              <Sub>
                <F label="Instituição (offshore)"><Input value={data.offshoreInstitution} onChange={(e) => update({ offshoreInstitution: e.target.value })} className="crm-input" /></F>
                <F label="País"><Input value={data.offshoreCountry} onChange={(e) => update({ offshoreCountry: e.target.value })} className="crm-input" /></F>
                <F label="Valor em USD"><CurrencyInput value={data.offshoreValueUSD} onChange={(v) => update({ offshoreValueUSD: v })} /></F>
              </Sub>
            )}
            {data.hasInternationalAccount === 'Sim' && (
              <Sub>
                <F label="Qual conta/banco?"><Input value={data.internationalAccountBank} onChange={(e) => update({ internationalAccountBank: e.target.value })} className="crm-input" /></F>
                <F label="Valor em USD"><CurrencyInput value={data.internationalAccountValueUSD} onChange={(v) => update({ internationalAccountValueUSD: v })} /></F>
              </Sub>
            )}

            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Potencial de captação/investimento"><CurrencyInput value={data.investmentPotential} onChange={(v) => update({ investmentPotential: v })} /></F>
              <F label="Possui concentração em algum ativo?"><YN value={data.hasConcentration} onChange={(v) => update({ hasConcentration: v })} /></F>
              {data.hasConcentration === 'Sim' && <>
                <F label="Qual ativo?"><Input value={data.concentrationAsset} onChange={(e) => update({ concentrationAsset: e.target.value })} className="crm-input" /></F>
                <F label="% do patrimônio"><Input type="number" value={data.concentrationPct} onChange={(e) => update({ concentrationPct: e.target.value })} className="crm-input" /></F>
              </>}
            </div>
            <CommentButton value={data.bloco4Comment} onChange={(v) => update({ bloco4Comment: v })} />
          </>)}

          {/* ============ BLOCO 5 — Proteção & Segurança ============ */}
          {renderBlock(5, 'Proteção & Segurança', <>
            <ConsultantNote>Proteção vem antes de investimento. Entenda o que está coberto e o que está exposto.</ConsultantNote>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Possui seguro de vida?"><YN value={data.hasLifeInsurance} onChange={(v) => update({ hasLifeInsurance: v })} /></F>
            </div>
            {data.hasLifeInsurance === 'Sim' && (
              <Sub>
                <F label="Valor da cobertura"><CurrencyInput value={data.lifeInsuranceValue} onChange={(v) => update({ lifeInsuranceValue: v })} /></F>
                <F label="Individual ou corporativo?"><Sel value={data.lifeInsuranceType} onChange={(v) => update({ lifeInsuranceType: v })} options={['Individual', 'Corporativo']} /></F>
                <F label="Seguradora"><Input value={data.lifeInsuranceCompany} onChange={(e) => update({ lifeInsuranceCompany: e.target.value })} className="crm-input" /></F>
                <F label="Acha adequado?"><Radios value={data.lifeInsuranceAdequate} onChange={(v) => update({ lifeInsuranceAdequate: v })} options={['Sim', 'Não', 'Não sei']} /></F>
              </Sub>
            )}
            {data.hasLifeInsurance === 'Não' && (
              <Sub><F label="Tem interesse em contratar?"><Radios value={data.lifeInsuranceInterest} onChange={(v) => update({ lifeInsuranceInterest: v })} options={['Sim', 'Não', 'Talvez']} /></F></Sub>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Imóveis/ativos de alto valor estão segurados?"><YN value={data.hasPropertyInsurance} onChange={(v) => update({ hasPropertyInsurance: v })} /></F>
              {data.hasPropertyInsurance === 'Sim' && <F label="Detalhes"><Textarea value={data.propertyInsuranceDetails} onChange={(e) => update({ propertyInsuranceDetails: e.target.value })} className="crm-input min-h-[60px]" /></F>}
              <F label="Plano de saúde"><Sel value={data.healthPlanType} onChange={(v) => update({ healthPlanType: v })} options={['Corporativo', 'Individual', 'Não possui']} /></F>
              {data.healthPlanType && data.healthPlanType !== 'Não possui' && <F label="Operadora"><Input value={data.healthPlanProvider} onChange={(e) => update({ healthPlanProvider: e.target.value })} className="crm-input" /></F>}
            </div>
            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Possui reserva de emergência?"><YN value={data.hasEmergencyReserve} onChange={(v) => update({ hasEmergencyReserve: v })} /></F>
            </div>
            {data.hasEmergencyReserve === 'Sim' && (
              <Sub>
                <F label="Valor da reserva"><CurrencyInput value={data.emergencyReserveValue} onChange={(v) => update({ emergencyReserveValue: v })} /></F>
                <F label="Cobre quantos meses?"><Input type="number" value={data.emergencyReserveCoverage} onChange={(e) => update({ emergencyReserveCoverage: e.target.value })} className="crm-input" /></F>
                <F label="Onde está alocada?"><Input value={data.emergencyReserveLocation} onChange={(e) => update({ emergencyReserveLocation: e.target.value })} className="crm-input" /></F>
              </Sub>
            )}
            <div className="border-t border-border pt-4 space-y-1">
              <Label className="font-medium">Saúde e estilo de vida</Label>
              <ConsultantNote>Para dimensionamento de seguro.</ConsultantNote>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Doenças graves na família (pais e irmãos)?"><YN value={data.familyHealthHistory} onChange={(v) => update({ familyHealthHistory: v })} /></F>
              {data.familyHealthHistory === 'Sim' && <F label="Detalhes"><Textarea value={data.familyHealthDetails} onChange={(e) => update({ familyHealthDetails: e.target.value })} className="crm-input min-h-[60px]" /></F>}
              <F label="Diagnósticos ou medicamento de uso contínuo?"><YN value={data.continuousMedication} onChange={(v) => update({ continuousMedication: v })} /></F>
              {data.continuousMedication === 'Sim' && <F label="Detalhes"><Textarea value={data.continuousMedicationDetails} onChange={(e) => update({ continuousMedicationDetails: e.target.value })} className="crm-input min-h-[60px]" /></F>}
              <F label="Miopia acima de 5 graus ou astigmatismo?"><YN value={data.visionIssues} onChange={(v) => update({ visionIssues: v })} /></F>
              <F label="Pratica esportes radicais?"><YN value={data.extremeSports} onChange={(v) => update({ extremeSports: v })} /></F>
              {data.extremeSports === 'Sim' && <F label="Quais?"><Input value={data.extremeSportsDetails} onChange={(e) => update({ extremeSportsDetails: e.target.value })} className="crm-input" /></F>}
              <F label="Possui avião particular?"><YN value={data.privateAircraft} onChange={(v) => update({ privateAircraft: v })} /></F>
              <F label="Tabagismo?"><YN value={data.smoker} onChange={(v) => update({ smoker: v })} /></F>
            </div>
            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Família sabe onde está o patrimônio?"><Radios value={data.familyKnowsAssets} onChange={(v) => update({ familyKnowsAssets: v })} options={['Sim', 'Não', 'Parcialmente']} /></F>
              {data.familyKnowsAssets && <F label="Detalhes"><Textarea value={data.familyKnowsAssetsDetails} onChange={(e) => update({ familyKnowsAssetsDetails: e.target.value })} className="crm-input min-h-[60px]" /></F>}
              <F label="Já fez check-up financeiro antes?"><YN value={data.hadFinancialCheckup} onChange={(v) => update({ hadFinancialCheckup: v })} /></F>
              {data.hadFinancialCheckup && <F label="Detalhes"><Textarea value={data.hadFinancialCheckupDetails} onChange={(e) => update({ hadFinancialCheckupDetails: e.target.value })} className="crm-input min-h-[60px]" /></F>}
            </div>
            <CommentButton value={data.bloco5Comment} onChange={(v) => update({ bloco5Comment: v })} />
          </>)}

          {/* ============ BLOCO 6 — Objetivos & Planejamento ============ */}
          {renderBlock(6, 'Objetivos & Planejamento', <>
            <ConsultantNote>Entenda os sonhos. O planejamento financeiro é o caminho, os objetivos são o destino.</ConsultantNote>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Quais são seus principais objetivos financeiros?" wide><Textarea value={data.financialGoals} onChange={(e) => update({ financialGoals: e.target.value })} className="crm-input min-h-[70px]" /></F>
              <F label="Qual é o seu número da liberdade financeira?"><CurrencyInput value={data.successNumber} onChange={(v) => update({ successNumber: v })} /></F>
              <F label="Em quanto tempo quer atingir?"><Input value={data.successTimeline} onChange={(e) => update({ successTimeline: e.target.value })} className="crm-input" /></F>
              <F label="Pensa em se aposentar?"><Radios value={data.wantsRetirement} onChange={(v) => update({ wantsRetirement: v })} options={['Sim', 'Não', 'Já aposentado']} /></F>
            </div>
            {data.wantsRetirement === 'Sim' && (
              <Sub>
                <F label="Com qual idade?"><Input type="number" value={data.retirementAge} onChange={(e) => update({ retirementAge: e.target.value })} className="crm-input" /></F>
                <F label="Renda mensal desejada na aposentadoria"><CurrencyInput value={data.retirementIncome} onChange={(v) => update({ retirementIncome: v })} /></F>
                <F label="Estilo de vida desejado" wide><Textarea value={data.retirementLifestyle} onChange={(e) => update({ retirementLifestyle: e.target.value })} className="crm-input min-h-[60px]" /></F>
              </Sub>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Quer morar no exterior?"><Radios value={data.wantsToLiveAbroad} onChange={(v) => update({ wantsToLiveAbroad: v })} options={['Sim', 'Não', 'Talvez']} /></F>
              {(data.wantsToLiveAbroad === 'Sim' || data.wantsToLiveAbroad === 'Talvez') && <F label="País / detalhes"><Input value={data.abroadDetails} onChange={(e) => update({ abroadDetails: e.target.value })} className="crm-input" /></F>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <F label="Prioridade 1"><Input value={data.priority1} onChange={(e) => update({ priority1: e.target.value })} className="crm-input" /></F>
              <F label="Prioridade 2"><Input value={data.priority2} onChange={(e) => update({ priority2: e.target.value })} className="crm-input" /></F>
              <F label="Prioridade 3"><Input value={data.priority3} onChange={(e) => update({ priority3: e.target.value })} className="crm-input" /></F>
            </div>
            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Interesse em planejamento sucessório?"><Radios value={data.successionInterest} onChange={(v) => update({ successionInterest: v })} options={['Sim', 'Não', 'Já tenho']} /></F>
            </div>
            {(data.successionInterest === 'Sim' || data.successionInterest === 'Já tenho') && (
              <Sub>
                <F label="Detalhes" wide><Textarea value={data.successionDetails} onChange={(e) => update({ successionDetails: e.target.value })} className="crm-input min-h-[60px]" /></F>
                <F label="Possui testamento?"><YN value={data.hasTestament} onChange={(v) => update({ hasTestament: v })} /></F>
                <F label="Possui holding?"><YN value={data.hasHolding} onChange={(v) => update({ hasHolding: v })} /></F>
              </Sub>
            )}
            <F label="Restrições de investimento"><Textarea value={data.restrictions} onChange={(e) => update({ restrictions: e.target.value })} className="crm-input min-h-[60px]" /></F>
            <CommentButton value={data.bloco6Comment} onChange={(v) => update({ bloco6Comment: v })} />
          </>)}

          {/* ============ BLOCO 7 — Perfil & Comportamento ============ */}
          {renderBlock(7, 'Perfil & Comportamento', <>
            <ConsultantNote>Entenda como o cliente pensa sobre dinheiro. Isso define a estratégia e a comunicação.</ConsultantNote>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Já perdeu o sono por causa de dinheiro?"><YN value={data.lostSleepOverMoney} onChange={(v) => update({ lostSleepOverMoney: v })} /></F>
              {data.lostSleepOverMoney === 'Sim' && <F label="O que aconteceu?"><Textarea value={data.lostSleepDetails} onChange={(e) => update({ lostSleepDetails: e.target.value })} className="crm-input min-h-[60px]" /></F>}
              <F label="Conte uma situação que te irritou financeiramente" wide><Textarea value={data.angerSituation} onChange={(e) => update({ angerSituation: e.target.value })} className="crm-input min-h-[60px]" /></F>
              <F label="Como reagiu à última grande queda do mercado?" wide><Radios value={data.dropReactionB5} onChange={(v) => update({ dropReactionB5: v })} options={DROP_REACTIONS} /></F>
              <F label="Preferência de risco" wide><Radios value={data.riskPreferenceB5} onChange={(v) => update({ riskPreferenceB5: v })} options={['Prefiro segurança', 'Equilíbrio', 'Aceito mais risco']} /></F>
              <F label="Perfil investidor"><Sel value={data.investorProfile} onChange={(v) => update({ investorProfile: v })} options={['Conservador', 'Moderado', 'Arrojado', 'Agressivo']} /></F>
              <F label="Experiência com investimentos"><Sel value={data.investmentExperience} onChange={(v) => update({ investmentExperience: v })} options={EXPERIENCE_LEVELS} /></F>
            </div>
            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Já trabalhou com assessor/consultor?"><YN value={data.hasWorkedWithAdvisor} onChange={(v) => update({ hasWorkedWithAdvisor: v })} /></F>
              {data.hasWorkedWithAdvisor === 'Sim' && <F label="Como foi a experiência?"><Textarea value={data.advisorExperience} onChange={(e) => update({ advisorExperience: e.target.value })} className="crm-input min-h-[60px]" /></F>}
              <F label="Preferência de gestão" wide><Radios value={data.managementPreference} onChange={(v) => update({ managementPreference: v })} options={['Quero participar das decisões', 'Prefiro delegar', 'Depende do caso']} /></F>
              <F label="Frequência de acompanhamento desejada"><Sel value={data.followUpFrequency} onChange={(v) => update({ followUpFrequency: v })} options={['Semanal', 'Quinzenal', 'Mensal', 'Trimestral']} /></F>
              <F label="Temas de interesse no mercado financeiro"><Input value={data.financeInterestTopics} onChange={(e) => update({ financeInterestTopics: e.target.value })} className="crm-input" placeholder="Ex: dividendos, previdência, exterior" /></F>
              <F label="O que define sucesso para você nessa parceria?" wide><Textarea value={data.successCriteria} onChange={(e) => update({ successCriteria: e.target.value })} className="crm-input min-h-[60px]" /></F>
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

          {/* ============ BLOCO 9 — Relacionamento & Rapport ============ */}
          {renderBlock(9, 'Relacionamento & Rapport', <>
            <ConsultantNote>Rapport é o que diferencia um consultor de uma planilha. Anote o que importa para a pessoa.</ConsultantNote>
            <div className="space-y-2">
              <Label>Hobbies e interesses</Label>
              <div className="flex flex-wrap gap-2">
                {HOBBY_OPTIONS.map((h) => {
                  const active = (data.hobbiesAndInterests || []).includes(h);
                  return (
                    <button key={h} type="button" onClick={() => toggleHobby(h)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Esportes que pratica"><Input value={data.sportsActivities} onChange={(e) => update({ sportsActivities: e.target.value })} className="crm-input" /></F>
              <F label="Time de futebol"><Input value={data.soccerTeam} onChange={(e) => update({ soccerTeam: e.target.value })} className="crm-input" /></F>
              <F label="Animais de estimação"><Input value={data.pets} onChange={(e) => update({ pets: e.target.value })} className="crm-input" placeholder="Ex: Cachorro - Rex" /></F>
              <F label="Bebida de preferência"><Input value={data.favoriteDrink} onChange={(e) => update({ favoriteDrink: e.target.value })} className="crm-input" /></F>
              <F label="Presente ideal"><Input value={data.idealGift} onChange={(e) => update({ idealGift: e.target.value })} className="crm-input" /></F>
              <F label="Clube que frequenta"><Input value={data.socialClub} onChange={(e) => update({ socialClub: e.target.value })} className="crm-input" /></F>
              <F label="LinkedIn"><Input value={data.linkedinUrl} onChange={(e) => update({ linkedinUrl: e.target.value })} className="crm-input" placeholder="https://linkedin.com/in/..." /></F>
              <F label="Posição política"><Sel value={data.politicalPosition} onChange={(v) => update({ politicalPosition: v })} options={['Prefiro não informar', 'Esquerda', 'Centro-esquerda', 'Centro', 'Centro-direita', 'Direita']} /></F>
              <F label="Religião"><Input value={data.religion} onChange={(e) => update({ religion: e.target.value })} className="crm-input" /></F>
            </div>
            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Modelo de remuneração"><Sel value={data.remunerationModel} onChange={(v) => update({ remunerationModel: v })} options={['Comissão', 'Fee-based', 'Híbrido']} /></F>
              <F label="Periodicidade de reuniões"><Sel value={data.meetingPeriodicity} onChange={(v) => update({ meetingPeriodicity: v })} options={['Mensal (30 dias)', 'Bimestral (60 dias)', 'Trimestral (90 dias)']} /></F>
              <F label="Canal preferido de contato"><Sel value={data.preferredContactChannel} onChange={(v) => update({ preferredContactChannel: v })} options={['WhatsApp', 'Email', 'Telefone', 'Presencial']} /></F>
              <F label="Como nos conheceu?"><Input value={data.howFoundUs} onChange={(e) => update({ howFoundUs: e.target.value })} className="crm-input" /></F>
            </div>
            <F label="Observações gerais"><Textarea value={data.generalNotes} onChange={(e) => update({ generalNotes: e.target.value })} className="crm-input min-h-[110px]" rows={4} /></F>
            <CommentButton value={data.bloco9Comment} onChange={(v) => update({ bloco9Comment: v })} />
          </>)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Mini-DRE empresarial — reusable bloco for PJ / Autônomo / Empresário
function MiniDRE({ data, update }: { data: ConhecerClienteData; update: (p: Partial<ConhecerClienteData>) => void }) {
  const fmt = (v: string) => {
    const n = parseFloat(v) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
  };
  const lucro =
    (parseFloat(data.pjMonthlyRevenue) || 0) -
    (parseFloat(data.pjMonthlyOpCost) || 0) -
    (parseFloat(data.pjProLabore) || 0) -
    (parseFloat(data.pjProfitDistribution) || 0);

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3 animate-in fade-in duration-300">
      <p className="text-xs font-semibold text-foreground">Mini-DRE Empresarial (opcional)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Faturamento Bruto Mensal</Label>
          <CurrencyInput value={data.pjMonthlyRevenue} onChange={(v) => update({ pjMonthlyRevenue: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Custo Operacional Mensal</Label>
          <CurrencyInput value={data.pjMonthlyOpCost} onChange={(v) => update({ pjMonthlyOpCost: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pró-labore</Label>
          <CurrencyInput value={data.pjProLabore} onChange={(v) => update({ pjProLabore: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Distribuição de Lucros</Label>
          <CurrencyInput value={data.pjProfitDistribution} onChange={(v) => update({ pjProfitDistribution: v })} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Regime Tributário</Label>
          <Select value={data.pjTaxRegime} onValueChange={(v) => update({ pjTaxRegime: v })}>
            <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
              <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
              <SelectItem value="Lucro Real">Lucro Real</SelectItem>
              <SelectItem value="Não sei informar">Não sei informar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
        <span className="text-muted-foreground">Resultado mensal estimado</span>
        <span className={`font-semibold ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(lucro.toString())}</span>
      </div>
    </div>
  );
}
