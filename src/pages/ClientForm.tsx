import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

type R = Record<string, any>;
const genId = () => Math.random().toString(36).substring(2, 10);

const SECTIONS = ['Sobre você', 'Sua situação financeira', 'Seu patrimônio', 'Proteção e saúde', 'Seus objetivos', 'Seu perfil', 'Para te conhecer melhor'];
const HOBBIES = ['Arquitetura e Design', 'Arte', 'Gastronomia', 'Viagens', 'Vinhos', 'Esportes', 'Música', 'Cinema', 'Tecnologia', 'Moda', 'Literatura', 'Outros'];

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
function Radios({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <RadioGroup value={value || ''} onValueChange={onChange} className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
      {options.map((o) => <label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={o} />{o}</label>)}
    </RadioGroup>
  );
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 pl-3 border-l-2 border-primary/30 animate-in fade-in slide-in-from-top-2 duration-300">{children}</div>;
}

export default function ClientForm() {
  const { token } = useParams<{ token: string }>();
  const storageKey = `client-form-${token}`;
  const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/client-form`;

  const [state, setState] = useState<'loading' | 'form' | 'done' | 'submitted' | 'invalid'>('loading');
  const [consultor, setConsultor] = useState('');
  const [step, setStep] = useState(0);
  const [r, setR] = useState<R>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${baseUrl}?token=${encodeURIComponent(token || '')}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setState('invalid');
        if (['completed', 'updated'].includes(body.status)) return setState('submitted');
        setConsultor(body.consultorName || '');
        let saved: R = {};
        try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { /* ignore */ }
        setR({ ...(body.responses?._formVersion === 2 ? body.responses : {}), ...saved });
        setState('form');
      })
      .catch(() => setState('invalid'));
  }, [token]);

  useEffect(() => {
    if (state === 'form') localStorage.setItem(storageKey, JSON.stringify(r));
  }, [r, state]);

  const u = (p: R) => setR((prev) => ({ ...prev, ...p }));
  const v = (k: string) => r[k] ?? '';
  const progress = useMemo(() => Math.round(((step + 1) / SECTIONS.length) * 100), [step]);

  const saveLater = async () => {
    localStorage.setItem(storageKey, JSON.stringify(r));
    await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, responses: { ...r, _formVersion: 2 }, submit: false }) }).catch(() => null);
    toast.success('Progresso salvo. Você pode continuar depois pelo mesmo link.');
  };

  const submit = async () => {
    const income = r.cltNetSalary || r.pjProLabore || r.autonomoIncome || r.aposentadoIncome || r.servidorNetSalary;
    const missing = [!r.fullName && 'nome', !r.birthDate && 'data de nascimento', !r.profession && 'profissão', !income && 'renda'].filter(Boolean);
    if (missing.length) { toast.error(`Preencha: ${missing.join(', ')}.`); setStep(missing[0] === 'renda' ? 1 : 0); return; }
    setSending(true);
    const res = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, responses: { ...r, _formVersion: 2 }, submit: true }) }).catch(() => null);
    setSending(false);
    if (!res?.ok) { toast.error('Não foi possível enviar. Tente novamente.'); return; }
    localStorage.removeItem(storageKey);
    setState('done');
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center space-y-3">{children}</div>
    </div>
  );
  if (state === 'loading') return shell(<Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />);
  if (state === 'invalid') return shell(<><AlertTriangle className="w-10 h-10 mx-auto text-destructive" /><p className="font-medium">Link expirado ou inválido.</p><p className="text-sm text-muted-foreground">Solicite um novo ao seu consultor.</p></>);
  if (state === 'submitted') return shell(<><CheckCircle className="w-10 h-10 mx-auto text-primary" /><p className="font-medium">Formulário já enviado. Obrigado!</p></>);
  if (state === 'done') return shell(<><CheckCircle className="w-10 h-10 mx-auto text-primary" /><p className="font-medium">Formulário enviado com sucesso!</p><p className="text-sm text-muted-foreground">Seu consultor já recebeu suas informações.</p></>);

  const married = v('civilStatus') === 'Casado(a)' || v('civilStatus') === 'União Estável';
  const children: R[] = r.children || [];
  const debts: R[] = r.debtsList || [];
  const setChild = (id: string, p: R) => u({ children: children.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const setDebt = (id: string, p: R) => u({ debtsList: debts.map((d) => (d.id === id ? { ...d, ...p } : d)) });
  const emp = v('employmentType');

  const sections: React.ReactNode[] = [
    <>
      <F label="Nome completo *"><Input value={v('fullName')} onChange={(e) => u({ fullName: e.target.value })} /></F>
      <F label="Data de nascimento *"><Input type="date" value={v('birthDate')} onChange={(e) => u({ birthDate: e.target.value })} /></F>
      <F label="Estado civil"><Sel value={v('civilStatus')} onChange={(x) => u({ civilStatus: x })} options={['Solteiro(a)', 'Casado(a)', 'União Estável', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)']} /></F>
      {married && <Sub>
        <F label="Nome do cônjuge"><Input value={v('spouseName')} onChange={(e) => u({ spouseName: e.target.value })} /></F>
        <F label="Regime matrimonial"><Sel value={v('marriageRegime')} onChange={(x) => u({ marriageRegime: x })} options={['Comunhão parcial de bens', 'Comunhão universal de bens', 'Separação total de bens', 'Participação final nos aquestos']} /></F>
      </Sub>}
      <F label="Tem filhos?"><Radios value={v('hasChildren')} onChange={(x) => u({ hasChildren: x })} options={['Sim', 'Não']} /></F>
      {v('hasChildren') === 'Sim' && <Sub>
        {children.map((c, i) => (
          <div key={c.id} className="rounded-lg border border-border p-3 space-y-3 relative">
            <button type="button" onClick={() => u({ children: children.filter((x) => x.id !== c.id) })} className="absolute top-2 right-2 text-destructive" aria-label="Remover filho"><Trash2 className="w-4 h-4" /></button>
            <p className="text-xs text-muted-foreground">Filho {i + 1}</p>
            <F label="Nome"><Input value={c.name || ''} onChange={(e) => setChild(c.id, { name: e.target.value })} /></F>
            <F label="Idade"><Input type="number" inputMode="numeric" value={c.age || ''} onChange={(e) => setChild(c.id, { age: e.target.value })} /></F>
            <F label="Fase escolar"><Sel value={c.educationPhase || ''} onChange={(x) => setChild(c.id, { educationPhase: x })} options={['Berçário', 'Infantil', 'Fundamental', 'Médio', 'Superior', 'Formado', 'N/A']} /></F>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => u({ children: [...children, { id: genId(), name: '', age: '', educationPhase: '' }], numChildren: String(children.length + 1) })}><Plus className="w-4 h-4 mr-1" />Adicionar filho</Button>
      </Sub>}
      <F label="Profissão *"><Input value={v('profession')} onChange={(e) => u({ profession: e.target.value })} /></F>
      <F label="Cargo"><Input value={v('jobTitle')} onChange={(e) => u({ jobTitle: e.target.value })} /></F>
      <F label="Regime de trabalho"><Sel value={emp} onChange={(x) => u({ employmentType: x })} options={['CLT', 'PJ', 'Empresário/Sócio', 'Autônomo', 'Aposentado', 'Servidor Público']} /></F>
      {emp === 'CLT' && <Sub><F label="Empresa"><Input value={v('cltCompany')} onChange={(e) => u({ cltCompany: e.target.value })} /></F></Sub>}
      {(emp === 'PJ' || emp === 'Empresário/Sócio') && <Sub><F label="Nome da empresa"><Input value={v('pjCompanyName')} onChange={(e) => u({ pjCompanyName: e.target.value })} /></F></Sub>}
      {emp === 'Autônomo' && <Sub><F label="Área de atuação"><Input value={v('autonomoArea')} onChange={(e) => u({ autonomoArea: e.target.value })} /></F></Sub>}
      {emp === 'Aposentado' && <Sub><F label="Tipo de aposentadoria"><Sel value={v('aposentadoType')} onChange={(x) => u({ aposentadoType: x })} options={['INSS', 'Previdência Privada', 'Ambas']} /></F></Sub>}
      {emp === 'Servidor Público' && <Sub><F label="Órgão"><Input value={v('servidorOrgao')} onChange={(e) => u({ servidorOrgao: e.target.value })} /></F></Sub>}
    </>,
    <>
      {(emp === 'PJ' || emp === 'Empresário/Sócio')
        ? <F label="Pró-labore mensal *"><CurrencyInput value={v('pjProLabore')} onChange={(x) => u({ pjProLabore: x })} /></F>
        : emp === 'Autônomo' ? <F label="Renda mensal média *"><CurrencyInput value={v('autonomoIncome')} onChange={(x) => u({ autonomoIncome: x })} /></F>
        : emp === 'Aposentado' ? <F label="Valor mensal da aposentadoria *"><CurrencyInput value={v('aposentadoIncome')} onChange={(x) => u({ aposentadoIncome: x })} /></F>
        : emp === 'Servidor Público' ? <F label="Salário líquido *"><CurrencyInput value={v('servidorNetSalary')} onChange={(x) => u({ servidorNetSalary: x })} /></F>
        : <F label="Renda mensal líquida *"><CurrencyInput value={v('cltNetSalary')} onChange={(x) => u({ cltNetSalary: x })} /></F>}
      {married && <>
        <F label="Seu cônjuge trabalha?"><Radios value={v('spouseWorks')} onChange={(x) => u({ spouseWorks: x })} options={['Sim', 'Não']} /></F>
        {v('spouseWorks') === 'Sim' && <F label="Renda do cônjuge"><CurrencyInput value={v('spouseIncome')} onChange={(x) => u({ spouseIncome: x })} /></F>}
      </>}
      <F label="Custo mensal da família (estimativa)"><CurrencyInput value={v('monthlyCostOfLiving')} onChange={(x) => u({ monthlyCostOfLiving: x })} /></F>
      <F label="Quanto consegue investir por mês?"><CurrencyInput value={v('monthlyInvestmentCapacity')} onChange={(x) => u({ monthlyInvestmentCapacity: x })} /></F>
      <F label="Possui dívidas?"><Radios value={v('hasDebts')} onChange={(x) => u({ hasDebts: x })} options={['Sim', 'Não']} /></F>
      {v('hasDebts') === 'Sim' && <Sub>
        {debts.map((d) => (
          <div key={d.id} className="rounded-lg border border-border p-3 space-y-3 relative">
            <button type="button" onClick={() => u({ debtsList: debts.filter((x) => x.id !== d.id) })} className="absolute top-2 right-2 text-destructive" aria-label="Remover dívida"><Trash2 className="w-4 h-4" /></button>
            <F label="Tipo"><Sel value={d.type || ''} onChange={(x) => setDebt(d.id, { type: x })} options={['Financiamento imobiliário', 'Veículo', 'Crédito pessoal', 'Cartão de crédito', 'Cheque especial', 'Outro']} /></F>
            <F label="Valor total"><CurrencyInput value={d.totalValue || ''} onChange={(x) => setDebt(d.id, { totalValue: x })} /></F>
            <F label="Parcela mensal"><CurrencyInput value={d.monthlyPayment || ''} onChange={(x) => setDebt(d.id, { monthlyPayment: x })} /></F>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => u({ debtsList: [...debts, { id: genId(), type: '', totalValue: '', monthlyPayment: '', interestRate: '', remainingMonths: '' }] })}><Plus className="w-4 h-4 mr-1" />Adicionar dívida</Button>
      </Sub>}
      <F label="Possui previdência privada?"><Radios value={v('hasPrivatePension')} onChange={(x) => u({ hasPrivatePension: x })} options={['Sim', 'Não']} /></F>
      {v('hasPrivatePension') === 'Sim' && <Sub>
        <F label="Tipo"><Sel value={v('pensionType')} onChange={(x) => u({ pensionType: x })} options={['PGBL', 'VGBL', 'Não sei']} /></F>
        <F label="Instituição"><Input value={v('pensionInstitution')} onChange={(e) => u({ pensionInstitution: e.target.value })} /></F>
        <F label="Valor acumulado"><CurrencyInput value={v('pensionAccumulated')} onChange={(x) => u({ pensionAccumulated: x })} /></F>
      </Sub>}
    </>,
    <>
      <F label="Banco principal"><Input value={v('mainBank')} onChange={(e) => u({ mainBank: e.target.value })} /></F>
      <F label="Já possui investimentos? Onde?"><Textarea value={v('investmentInstitutions')} onChange={(e) => u({ investmentInstitutions: e.target.value })} placeholder="Ex: CDB no banco X, ações na corretora Y" /></F>
      <F label="Valor aproximado total investido"><CurrencyInput value={v('totalFinancialPL')} onChange={(x) => u({ totalFinancialPL: x })} /></F>
      <F label="Possui imóveis?"><Radios value={v('hasRealEstate')} onChange={(x) => u({ hasRealEstate: x })} options={['Sim', 'Não']} /></F>
      {v('hasRealEstate') === 'Sim' && <Sub>
        <F label="Quantos?"><Input type="number" inputMode="numeric" value={v('realEstateCount')} onChange={(e) => u({ realEstateCount: e.target.value })} /></F>
        <F label="Valor estimado total"><CurrencyInput value={v('realEstateTotalValue')} onChange={(x) => u({ realEstateTotalValue: x })} /></F>
      </Sub>}
      <F label="Possui recursos no exterior?"><Radios value={v('hasOffshore')} onChange={(x) => u({ hasOffshore: x })} options={['Sim', 'Não']} /></F>
      {v('hasOffshore') === 'Sim' && <Sub>
        <F label="Instituição"><Input value={v('offshoreInstitution')} onChange={(e) => u({ offshoreInstitution: e.target.value })} /></F>
        <F label="País"><Input value={v('offshoreCountry')} onChange={(e) => u({ offshoreCountry: e.target.value })} /></F>
        <F label="Valor aproximado (USD)"><CurrencyInput value={v('offshoreValueUSD')} onChange={(x) => u({ offshoreValueUSD: x })} /></F>
      </Sub>}
      <F label="Valor do FGTS (se tiver)"><CurrencyInput value={v('fgtsValue')} onChange={(x) => u({ fgtsValue: x })} /></F>
    </>,
    <>
      <F label="Possui seguro de vida?"><Radios value={v('hasLifeInsurance')} onChange={(x) => u({ hasLifeInsurance: x })} options={['Sim', 'Não']} /></F>
      {v('hasLifeInsurance') === 'Sim' && <Sub>
        <F label="Valor da cobertura"><CurrencyInput value={v('lifeInsuranceValue')} onChange={(x) => u({ lifeInsuranceValue: x })} /></F>
        <F label="Seguradora"><Input value={v('lifeInsuranceCompany')} onChange={(e) => u({ lifeInsuranceCompany: e.target.value })} /></F>
      </Sub>}
      <F label="Plano de saúde"><Sel value={v('healthPlanType')} onChange={(x) => u({ healthPlanType: x })} options={['Corporativo', 'Individual', 'Não possui']} /></F>
      <F label="Doenças graves na família (pais e irmãos)?"><Radios value={v('familyHealthHistory')} onChange={(x) => u({ familyHealthHistory: x })} options={['Sim', 'Não']} /></F>
      <F label="Toma medicamento contínuo?"><Radios value={v('continuousMedication')} onChange={(x) => u({ continuousMedication: x })} options={['Sim', 'Não']} /></F>
      <F label="Pratica esportes radicais?"><Radios value={v('extremeSports')} onChange={(x) => u({ extremeSports: x })} options={['Sim', 'Não']} /></F>
      <F label="Fuma?"><Radios value={v('smoker')} onChange={(x) => u({ smoker: x })} options={['Sim', 'Não']} /></F>
    </>,
    <>
      <F label="Quais são seus 3 principais objetivos financeiros?"><Textarea value={v('financialGoals')} onChange={(e) => u({ financialGoals: e.target.value })} rows={4} /></F>
      <F label="Pensa em se aposentar?"><Radios value={v('wantsRetirement')} onChange={(x) => u({ wantsRetirement: x })} options={['Sim', 'Não', 'Já aposentado']} /></F>
      {v('wantsRetirement') === 'Sim' && <Sub>
        <F label="Com que idade?"><Input type="number" inputMode="numeric" value={v('retirementAge')} onChange={(e) => u({ retirementAge: e.target.value })} /></F>
        <F label="Renda mensal desejada"><CurrencyInput value={v('retirementIncome')} onChange={(x) => u({ retirementIncome: x })} /></F>
      </Sub>}
      <F label="Interesse em planejamento sucessório?"><Radios value={v('successionInterest')} onChange={(x) => u({ successionInterest: x })} options={['Sim', 'Não', 'Já tenho']} /></F>
      <F label="Alguma restrição para investimentos?"><Textarea value={v('restrictions')} onChange={(e) => u({ restrictions: e.target.value })} /></F>
    </>,
    <>
      <F label="Como reagiria se seus investimentos caíssem 20%?"><Radios value={v('dropReactionB5')} onChange={(x) => u({ dropReactionB5: x })} options={['Não me afetou', 'Fiquei preocupado', 'Vendi parte', 'Vendi tudo']} /></F>
      <p className="text-xs text-muted-foreground -mt-2">Não me afetaria · Ficaria preocupado mas manteria · Venderia parte · Venderia tudo</p>
      <F label="Experiência com investimentos"><Sel value={v('investmentExperience')} onChange={(x) => u({ investmentExperience: x })} options={['Nenhuma', 'Básica (poupança/CDB)', 'Intermediária (fundos/ações)', 'Avançada (derivativos/offshore)']} /></F>
      <F label="Prefere mais segurança ou mais rentabilidade?"><Radios value={v('riskPreferenceB5')} onChange={(x) => u({ riskPreferenceB5: x })} options={['Prefiro segurança', 'Equilíbrio', 'Aceito mais risco']} /></F>
      <F label="Já trabalhou com assessor/consultor?"><Radios value={v('hasWorkedWithAdvisor')} onChange={(x) => u({ hasWorkedWithAdvisor: x })} options={['Sim', 'Não']} /></F>
      {v('hasWorkedWithAdvisor') === 'Sim' && <F label="Como foi?"><Textarea value={v('advisorExperience')} onChange={(e) => u({ advisorExperience: e.target.value })} /></F>}
    </>,
    <>
      <p className="text-sm text-muted-foreground">Opcional — pode pular se preferir.</p>
      <F label="Hobbies e interesses">
        <div className="flex flex-wrap gap-2">
          {HOBBIES.map((h) => {
            const list: string[] = r.hobbiesAndInterests || [];
            const on = list.includes(h);
            return <button key={h} type="button" onClick={() => u({ hobbiesAndInterests: on ? list.filter((x) => x !== h) : [...list, h] })}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>{h}</button>;
          })}
        </div>
      </F>
      <F label="Time de futebol"><Input value={v('soccerTeam')} onChange={(e) => u({ soccerTeam: e.target.value })} /></F>
      <F label="Animais de estimação"><Input value={v('pets')} onChange={(e) => u({ pets: e.target.value })} placeholder="Ex: Cachorro - Rex" /></F>
      <F label="O que você gosta de fazer nas férias?"><Textarea value={v('vacationPreferences')} onChange={(e) => u({ vacationPreferences: e.target.value })} /></F>
    </>,
  ];

  const last = step === SECTIONS.length - 1;
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-xl mx-auto px-4 pb-24">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-foreground">Formulário de Planejamento Financeiro</h1>
          <p className="text-muted-foreground mt-2 text-sm">Preencha com calma. Suas informações são confidenciais e serão usadas exclusivamente para o seu planejamento financeiro personalizado.</p>
          {consultor && <p className="text-sm text-muted-foreground mt-1">Consultor: {consultor}</p>}
        </div>
        <div className="sticky top-0 z-10 bg-muted/30 backdrop-blur py-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground"><span>Seção {step + 1} de {SECTIONS.length}</span><span>{progress}%</span></div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-5 mt-3">
          <h2 className="text-lg font-semibold text-foreground">{step + 1}. {SECTIONS[step]}</h2>
          {sections[step]}
        </div>
        <div className="flex items-center justify-between gap-2 mt-5">
          <Button type="button" variant="outline" disabled={step === 0} onClick={() => { setStep(step - 1); window.scrollTo({ top: 0 }); }}><ChevronLeft className="w-4 h-4 mr-1" />Voltar</Button>
          <Button type="button" variant="ghost" size="sm" onClick={saveLater}><Save className="w-4 h-4 mr-1" />Salvar e continuar depois</Button>
          {last
            ? <Button type="button" onClick={submit} disabled={sending}>{sending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Enviar</Button>
            : <Button type="button" onClick={() => { setStep(step + 1); window.scrollTo({ top: 0 }); }}>Próximo<ChevronRight className="w-4 h-4 ml-1" /></Button>}
        </div>
      </div>
    </div>
  );
}
