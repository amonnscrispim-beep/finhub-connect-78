import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CheckCircle2, Loader2, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type R = Record<string, any>;
const genId = () => Math.random().toString(36).substring(2, 10);

const SECTIONS = ['Sobre você', 'Sua situação profissional e financeira', 'Seu patrimônio', 'Proteção e saúde', 'Seus objetivos', 'Seu perfil de investidor', 'Para te conhecer melhor'];
const HOBBIES = ['Arquitetura e Design', 'Arte', 'Gastronomia', 'Viagens', 'Vinhos', 'Esportes', 'Música', 'Cinema', 'Tecnologia', 'Moda', 'Literatura', 'Outros'];
const YN = ['Sim', 'Não'];

// Estilo isolado do formulário público (não altera o tema do CRM)
const FIELD = 'w-full bg-[#0B1929] border border-[rgba(196,164,106,0.3)] rounded-lg px-4 py-3 text-[#E8E6E1] text-sm placeholder-[#4A5568] focus:border-[rgba(196,164,106,0.6)] focus:ring-1 focus:ring-[rgba(196,164,106,0.3)] focus:outline-none transition-colors';
const MONEY = 'h-auto bg-[#0B1929] border-[rgba(196,164,106,0.3)] rounded-lg px-4 py-3 text-[#E8E6E1] text-sm placeholder:text-[#4A5568] focus-visible:ring-1 focus-visible:ring-[rgba(196,164,106,0.3)] focus-visible:ring-offset-0 focus-visible:border-[rgba(196,164,106,0.6)]';
const BTN_PRIMARY = 'bg-[#C4A46A] hover:bg-[#D4B87A] text-[#0B1929] font-semibold py-3 rounded-lg transition-colors text-sm tracking-wide disabled:opacity-60';
const BTN_GHOST = 'border border-[#1A2A3F] text-[#8B9BB4] hover:text-[#E8E6E1] py-3 rounded-lg transition-colors text-sm disabled:opacity-40';

function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#E8E6E1] mb-1.5">{label}{req && <span className="text-[#C4A46A]"> *</span>}</label>
      {children}
    </div>
  );
}
function Radios({ name, value, onChange, options }: { name: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="w-4 h-4 accent-[#C4A46A]" />
          <span className="text-sm text-[#E8E6E1]">{o}</span>
        </label>
      ))}
    </div>
  );
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={`${FIELD} appearance-none`}>
      <option value="">Selecione...</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 ml-2 pl-4 border-l-2 border-[#C4A46A]/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">{children}</div>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}
function ItemCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#1A2A3F] bg-[#0B1929]/60 p-4 space-y-4 relative">
      <button type="button" onClick={onRemove} className="absolute top-3 right-3 text-[#F87171] hover:opacity-80" aria-label={`Remover ${title}`}><Trash2 className="w-4 h-4" /></button>
      <p className="text-xs uppercase tracking-wider text-[#8B9BB4]">{title}</p>
      {children}
    </div>
  );
}
function AddBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 border border-[rgba(196,164,106,0.3)] text-[#C4A46A] hover:bg-[#C4A46A]/10 px-4 py-2 rounded-lg text-sm transition-colors"><Plus className="w-4 h-4" />{children}</button>;
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
  const txt = (k: string, placeholder?: string) => <input type="text" className={FIELD} value={v(k)} placeholder={placeholder} onChange={(e) => u({ [k]: e.target.value })} />;
  const num = (k: string, min?: number, max?: number) => <input type="number" inputMode="numeric" min={min} max={max} className={FIELD} value={v(k)} onChange={(e) => u({ [k]: e.target.value })} />;
  const area = (k: string, placeholder?: string) => <textarea className={`${FIELD} min-h-[100px] resize-none`} value={v(k)} placeholder={placeholder} onChange={(e) => u({ [k]: e.target.value })} />;
  const money = (k: string) => <CurrencyInput className={MONEY} value={v(k)} onChange={(x) => u({ [k]: x })} placeholder="R$ 0,00" />;
  const radio = (k: string, opts = YN) => <Radios name={k} value={v(k)} onChange={(x) => u({ [k]: x })} options={opts} />;
  const sel = (k: string, opts: string[]) => <Sel value={v(k)} onChange={(x) => u({ [k]: x })} options={opts} />;

  const go = (s: number) => { setStep(s); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const saveLater = async () => {
    localStorage.setItem(storageKey, JSON.stringify(r));
    await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, responses: { ...r, _formVersion: 2 }, submit: false }) }).catch(() => null);
    toast.success('Progresso salvo. Você pode continuar depois pelo mesmo link.');
  };

  const submit = async () => {
    const income = r.cltNetSalary || r.cltSalary || r.pjProLabore || r.autonomoIncome || r.aposentadoIncome || r.servidorNetSalary;
    const missing: [string, number][] = ([
      [!r.fullName && 'nome', 0], [!r.birthDate && 'data de nascimento', 0], [!r.civilStatus && 'estado civil', 0],
      [!r.profession && 'profissão', 1], [!r.employmentType && 'regime de trabalho', 1], [!income && 'renda', 1],
    ] as [string | false, number][]).filter((x): x is [string, number] => !!x[0]);
    if (missing.length) { toast.error(`Preencha: ${missing.map((m) => m[0]).join(', ')}.`); go(missing[0][1]); return; }
    setSending(true);
    const res = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, responses: { ...r, _formVersion: 2 }, submit: true }) }).catch(() => null);
    setSending(false);
    if (!res?.ok) { toast.error('Não foi possível enviar. Tente novamente.'); return; }
    localStorage.removeItem(storageKey);
    setState('done');
  };

  const screen = (icon: React.ReactNode, title: string, text?: string, foot?: string) => (
    <div className="min-h-screen bg-[#0B1929] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {icon}
        <h1 className="text-2xl font-light text-[#C4A46A] mb-3">{title}</h1>
        {text && <p className="text-[#8B9BB4] text-sm leading-relaxed">{text}</p>}
        {foot && <p className="text-[#8B9BB4] text-xs mt-6">{foot}</p>}
      </div>
    </div>
  );
  const okIcon = <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#4ADE80]/10 flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-[#4ADE80]" /></div>;
  if (state === 'loading') return <div className="min-h-screen bg-[#0B1929] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#C4A46A]" /></div>;
  if (state === 'invalid') return screen(<div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#F87171]/10 flex items-center justify-center"><AlertTriangle className="w-8 h-8 text-[#F87171]" /></div>, 'Link expirado', 'Solicite um novo ao seu consultor.');
  if (state === 'submitted') return screen(okIcon, 'Formulário já enviado', 'Suas informações já foram recebidas pelo seu consultor. Obrigado!');
  if (state === 'done') return screen(okIcon, 'Formulário enviado com sucesso!', 'Suas informações foram recebidas pelo seu consultor. Elas serão utilizadas para preparar o seu planejamento financeiro personalizado.', 'Você pode fechar esta página.');

  const civil = v('civilStatus');
  const married = civil === 'Casado(a)' || civil === 'União Estável';
  const children: R[] = r.children || [];
  const debts: R[] = r.debtsList || [];
  const setChild = (id: string, p: R) => u({ children: children.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const setDebt = (id: string, p: R) => u({ debtsList: debts.map((d) => (d.id === id ? { ...d, ...p } : d)) });
  const emp = v('employmentType');
  const cInput = (c: R, k: string, type = 'text') => <input type={type} inputMode={type === 'number' ? 'numeric' : undefined} className={FIELD} value={c[k] || ''} onChange={(e) => setChild(c.id, { [k]: e.target.value })} />;
  const dInput = (d: R, k: string) => <input type="number" inputMode="decimal" className={FIELD} value={d[k] || ''} onChange={(e) => setDebt(d.id, { [k]: e.target.value })} />;

  const sections: React.ReactNode[] = [
    <>
      <F label="Nome completo" req>{txt('fullName', 'Seu nome completo')}</F>
      <Grid>
        <F label="Data de nascimento" req><input type="date" className={FIELD} value={v('birthDate')} onChange={(e) => u({ birthDate: e.target.value })} /></F>
        <F label="Estado civil" req>{sel('civilStatus', ['Solteiro(a)', 'Casado(a)', 'União Estável', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)'])}</F>
      </Grid>
      {married && <Sub>
        <Grid>
          <F label="Nome do cônjuge">{txt('spouseName')}</F>
          <F label="Regime matrimonial">{sel('marriageRegime', ['Comunhão parcial de bens', 'Comunhão universal de bens', 'Separação total de bens', 'Participação final nos aquestos'])}</F>
        </Grid>
        <F label="Cônjuge trabalha?">{radio('spouseWorks')}</F>
        {v('spouseWorks') === 'Sim' && <Grid>
          <F label="Profissão do cônjuge">{txt('spouseProfession')}</F>
          <F label="Renda do cônjuge">{money('spouseIncome')}</F>
        </Grid>}
      </Sub>}
      {civil === 'Viúvo(a)' && <Sub><F label="Há quanto tempo?">{txt('widowSinceYears')}</F></Sub>}
      {civil === 'Divorciado(a)' && <Sub>
        <F label="Paga pensão alimentícia?">{radio('paysSupportAlimony')}</F>
        {v('paysSupportAlimony') === 'Sim' && <F label="Valor da pensão">{money('alimonyValue')}</F>}
      </Sub>}
      <F label="Você é o provedor único da família ou a renda é dividida?">{sel('incomeProvider', ['Provedor único', 'Renda dividida'])}</F>
      {v('incomeProvider') === 'Renda dividida' && <Sub><F label="Quanto (%) da renda familiar você representa?">{num('incomeSharePct', 0, 100)}</F></Sub>}
      <F label="Tem filhos?">{radio('hasChildren')}</F>
      {v('hasChildren') === 'Sim' && <Sub>
        {children.map((c, i) => (
          <ItemCard key={c.id} title={`Filho ${i + 1}`} onRemove={() => { const next = children.filter((x) => x.id !== c.id); u({ children: next, numChildren: String(next.length) }); }}>
            <Grid>
              <F label="Nome">{cInput(c, 'name')}</F>
              <F label="Idade">{cInput(c, 'age', 'number')}</F>
              <F label="Fase escolar"><Sel value={c.educationPhase || ''} onChange={(x) => setChild(c.id, { educationPhase: x })} options={['Berçário', 'Infantil', 'Fundamental', 'Médio', 'Superior', 'Formado', 'N/A']} /></F>
              <F label="Custo mensal da educação"><CurrencyInput className={MONEY} value={c.educationMonthlyCost || ''} onChange={(x) => setChild(c.id, { educationMonthlyCost: x })} placeholder="R$ 0,00" /></F>
            </Grid>
            <F label="Mora com você?"><Radios name={`live-${c.id}`} value={c.livesWithClient || ''} onChange={(x) => setChild(c.id, { livesWithClient: x })} options={YN} /></F>
          </ItemCard>
        ))}
        <AddBtn onClick={() => u({ children: [...children, { id: genId(), name: '', age: '', educationPhase: '', educationMonthlyCost: '', livesWithClient: '' }], numChildren: String(children.length + 1) })}>Adicionar filho</AddBtn>
      </Sub>}
    </>,
    <>
      <Grid>
        <F label="Profissão" req>{txt('profession')}</F>
        <F label="Cargo">{txt('jobTitle')}</F>
      </Grid>
      <F label="Regime de trabalho" req>{sel('employmentType', ['CLT', 'PJ', 'Empresário/Sócio', 'Autônomo', 'Aposentado', 'Servidor Público'])}</F>
      {emp === 'CLT' && <Sub><Grid>
        <F label="Empresa">{txt('cltCompany')}</F>
        <F label="Salário bruto">{money('cltSalary')}</F>
        <F label="Salário líquido" req>{money('cltNetSalary')}</F>
        <F label="Benefícios (VR, VA, plano)">{txt('cltBenefits')}</F>
      </Grid></Sub>}
      {(emp === 'PJ' || emp === 'Empresário/Sócio') && <Sub><Grid>
        <F label="Nome da empresa">{txt('pjCompanyName')}</F>
        <F label="Setor de atuação">{txt('pjSector')}</F>
        <F label="Faturamento mensal">{money('pjMonthlyRevenue')}</F>
        <F label="Pró-labore" req>{money('pjProLabore')}</F>
        <F label="Distribuição de lucros">{money('pjProfitDistribution')}</F>
      </Grid></Sub>}
      {emp === 'Autônomo' && <Sub>
        <Grid>
          <F label="Área de atuação">{txt('autonomoArea')}</F>
          <F label="Renda mensal média" req>{money('autonomoIncome')}</F>
        </Grid>
        <F label="Renda é estável?">{radio('autonomoStability', ['Sim, estável', 'Varia bastante', 'Sazonal'])}</F>
      </Sub>}
      {emp === 'Aposentado' && <Sub>
        <Grid>
          <F label="Tipo de aposentadoria">{sel('aposentadoType', ['INSS', 'Previdência Privada', 'Ambas'])}</F>
          <F label="Valor mensal" req>{money('aposentadoIncome')}</F>
        </Grid>
        <F label="Tem outra fonte de renda?">{radio('aposentadoHasExtra')}</F>
        {v('aposentadoHasExtra') === 'Sim' && <Grid>
          <F label="Qual?">{txt('aposentadoExtraIncome')}</F>
          <F label="Valor mensal">{money('aposentadoExtraIncomeValue')}</F>
        </Grid>}
      </Sub>}
      {emp === 'Servidor Público' && <Sub><Grid>
        <F label="Órgão">{txt('servidorOrgao')}</F>
        <F label="Salário líquido" req>{money('servidorNetSalary')}</F>
      </Grid></Sub>}
      <Grid>
        <F label="Renda anual familiar (estimativa)">{money('annualFamilyIncome')}</F>
        <F label="Custo mensal da família (estimativa)">{money('monthlyCostOfLiving')}</F>
        <F label="Capacidade de investimento mensal">{money('monthlyInvestmentCapacity')}</F>
        <F label="Capacidade de investimento anual">{money('annualInvestmentCapacity')}</F>
      </Grid>
      <F label="Possui dívidas?">{radio('hasDebts')}</F>
      {v('hasDebts') === 'Sim' && <Sub>
        {debts.map((d, i) => (
          <ItemCard key={d.id} title={`Dívida ${i + 1}`} onRemove={() => u({ debtsList: debts.filter((x) => x.id !== d.id) })}>
            <F label="Tipo"><Sel value={d.type || ''} onChange={(x) => setDebt(d.id, { type: x })} options={['Financiamento imobiliário', 'Veículo', 'Crédito pessoal', 'Cartão de crédito', 'Cheque especial', 'Outro']} /></F>
            <Grid>
              <F label="Valor total da dívida"><CurrencyInput className={MONEY} value={d.totalValue || ''} onChange={(x) => setDebt(d.id, { totalValue: x })} placeholder="R$ 0,00" /></F>
              <F label="Parcela mensal"><CurrencyInput className={MONEY} value={d.monthlyPayment || ''} onChange={(x) => setDebt(d.id, { monthlyPayment: x })} placeholder="R$ 0,00" /></F>
              <F label="Taxa de juros (% a.m.)">{dInput(d, 'interestRate')}</F>
              <F label="Prazo restante (meses)">{dInput(d, 'remainingMonths')}</F>
            </Grid>
          </ItemCard>
        ))}
        <AddBtn onClick={() => u({ debtsList: [...debts, { id: genId(), type: '', totalValue: '', monthlyPayment: '', interestRate: '', remainingMonths: '' }] })}>Adicionar dívida</AddBtn>
      </Sub>}
      <F label="Possui previdência privada?">{radio('hasPrivatePension')}</F>
      {v('hasPrivatePension') === 'Sim' && <Sub><Grid>
        <F label="Tipo">{sel('pensionType', ['PGBL', 'VGBL'])}</F>
        <F label="Instituição">{txt('pensionInstitution')}</F>
        <F label="Valor acumulado">{money('pensionAccumulated')}</F>
        <F label="Aporte mensal">{money('pensionMonthlyContrib')}</F>
      </Grid></Sub>}
    </>,
    <>
      <Grid>
        <F label="Valor total investido no mercado financeiro">{money('totalFinancialPL')}</F>
        <F label="Patrimônio total estimado (investimentos + imóveis + veículos)">{money('totalPatrimonyEstimate')}</F>
        <F label="Banco principal">{txt('mainBank')}</F>
        <F label="Outros bancos que utiliza">{txt('otherBanks')}</F>
        <F label="Principal cartão de crédito">{txt('mainCreditCard')}</F>
        <F label="Valor do FGTS (se aplicável)">{money('fgtsValue')}</F>
      </Grid>
      <F label="Possui imóveis?">{radio('hasRealEstate')}</F>
      {v('hasRealEstate') === 'Sim' && <Sub><Grid>
        <F label="Quantos imóveis?">{num('realEstateCount', 0)}</F>
        <F label="Valor estimado total dos imóveis">{money('realEstateTotalValue')}</F>
        <F label="Finalidade principal">{sel('realEstatePurpose', ['Moradia', 'Investimento', 'Comercial', 'Veraneio'])}</F>
      </Grid></Sub>}
      <F label="Possui recursos no exterior (offshore)?">{radio('hasOffshore')}</F>
      {v('hasOffshore') === 'Sim' && <Sub><Grid>
        <F label="Instituição">{txt('offshoreInstitution')}</F>
        <F label="País">{txt('offshoreCountry')}</F>
        <F label="Valor estimado (USD)">{money('offshoreValueUSD')}</F>
      </Grid></Sub>}
      <F label="Utiliza conta internacional (Wise, Nomad, etc.)?">{radio('hasInternationalAccount')}</F>
      {v('hasInternationalAccount') === 'Sim' && <Sub><Grid>
        <F label="Qual banco/conta?">{txt('internationalAccountBank')}</F>
        <F label="Valor em conta (USD)">{money('internationalAccountValueUSD')}</F>
      </Grid></Sub>}
    </>,
    <>
      <F label="Possui seguro de vida?">{radio('hasLifeInsurance')}</F>
      {v('hasLifeInsurance') === 'Sim' && <Sub><Grid>
        <F label="Valor da cobertura">{money('lifeInsuranceValue')}</F>
        <F label="Individual ou corporativo?">{sel('lifeInsuranceType', ['Individual', 'Corporativo'])}</F>
        <F label="Seguradora">{txt('lifeInsuranceCompany')}</F>
      </Grid></Sub>}
      {v('hasLifeInsurance') === 'Não' && <Sub><F label="Tem interesse em contratar?">{radio('lifeInsuranceInterest', ['Sim', 'Não', 'Talvez'])}</F></Sub>}
      <Grid>
        <F label="Plano de saúde">{sel('healthPlanType', ['Corporativo', 'Individual', 'Não possui'])}</F>
        {v('healthPlanType') && v('healthPlanType') !== 'Não possui' && <F label="Operadora do plano">{txt('healthPlanProvider')}</F>}
      </Grid>
      <F label="Possui reserva de emergência?">{radio('hasEmergencyReserve')}</F>
      {v('hasEmergencyReserve') === 'Sim' && <Sub><Grid>
        <F label="Valor da reserva">{money('emergencyReserveValue')}</F>
        <F label="Cobre quantos meses de despesas?">{num('emergencyReserveCoverage', 0)}</F>
        <F label="Onde está alocada?">{txt('emergencyReserveLocation', 'Ex: CDB, poupança')}</F>
      </Grid></Sub>}
      <F label="Doenças graves na família (pais e irmãos)?">{radio('familyHealthHistory')}</F>
      {v('familyHealthHistory') === 'Sim' && <Sub><F label="Quais?">{txt('familyHealthDetails')}</F></Sub>}
      <F label="Toma medicamento de uso contínuo?">{radio('continuousMedication')}</F>
      {v('continuousMedication') === 'Sim' && <Sub><F label="Quais?">{txt('continuousMedicationDetails')}</F></Sub>}
      <F label="Pratica esportes radicais?">{radio('extremeSports')}</F>
      {v('extremeSports') === 'Sim' && <Sub><F label="Quais?">{txt('extremeSportsDetails')}</F></Sub>}
      <F label="Fuma?">{radio('smoker')}</F>
    </>,
    <>
      <F label="Quais são seus principais objetivos financeiros?">{area('financialGoals')}</F>
      <Grid>
        <F label="Qual valor mensal você precisa para ter liberdade financeira?">{money('successNumber')}</F>
        <F label="Em quanto tempo deseja atingir?">{txt('successTimeline')}</F>
      </Grid>
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-[#8B9BB4]">Prioridades</p>
        <F label="Prioridade nº 1">{txt('priority1')}</F>
        <F label="Prioridade nº 2">{txt('priority2')}</F>
        <F label="Prioridade nº 3">{txt('priority3')}</F>
      </div>
      <F label="Pensa em se aposentar?">{radio('wantsRetirement', ['Sim', 'Não', 'Já aposentado'])}</F>
      {v('wantsRetirement') === 'Sim' && <Sub>
        <Grid>
          <F label="Com qual idade?">{num('retirementAge', 0)}</F>
          <F label="Renda mensal desejada na aposentadoria">{money('retirementIncome')}</F>
        </Grid>
        <F label="Qual estilo de vida deseja na aposentadoria?">{area('retirementLifestyle')}</F>
      </Sub>}
      <F label="Tem interesse em morar no exterior?">{radio('wantsToLiveAbroad', ['Sim', 'Não', 'Talvez'])}</F>
      {['Sim', 'Talvez'].includes(v('wantsToLiveAbroad')) && <Sub><F label="Qual país/detalhes?">{txt('abroadDetails')}</F></Sub>}
      <F label="Tem interesse em planejamento sucessório?">{radio('successionInterest', ['Sim', 'Não', 'Já tenho'])}</F>
      {['Sim', 'Já tenho'].includes(v('successionInterest')) && <Sub><F label="Possui testamento?">{radio('hasTestament')}</F></Sub>}
      <F label="Alguma restrição para investimentos?">{area('restrictions')}</F>
    </>,
    <>
      <F label="Já perdeu o sono por causa de dinheiro?">{radio('lostSleepOverMoney')}</F>
      {v('lostSleepOverMoney') === 'Sim' && <Sub><F label="Conte brevemente">{area('lostSleepDetails')}</F></Sub>}
      <F label="Como reagiria se seus investimentos caíssem 20%?">{radio('dropReactionB5', ['Não me afetaria', 'Ficaria preocupado mas manteria', 'Venderia parte', 'Venderia tudo'])}</F>
      <F label="Preferência de risco">{radio('riskPreferenceB5', ['Prefiro segurança', 'Equilíbrio entre segurança e rentabilidade', 'Aceito mais risco para buscar mais retorno'])}</F>
      <Grid>
        <F label="Como você classifica seu perfil?">{sel('investorProfile', ['Conservador', 'Moderado', 'Arrojado', 'Agressivo'])}</F>
        <F label="Experiência com investimentos">{sel('investmentExperience', ['Nenhuma', 'Básica (poupança/CDB)', 'Intermediária (fundos/ações)', 'Avançada (derivativos/offshore)'])}</F>
      </Grid>
      <F label="Já trabalhou com assessor ou consultor financeiro?">{radio('hasWorkedWithAdvisor')}</F>
      {v('hasWorkedWithAdvisor') === 'Sim' && <Sub><F label="Como foi a experiência?">{area('advisorExperience')}</F></Sub>}
      <F label="Prefere participar das decisões de investimento ou delegar?">{radio('managementPreference', ['Quero participar', 'Prefiro delegar', 'Depende do caso'])}</F>
      <F label="O que define sucesso nessa parceria para você?">{area('successCriteria')}</F>
    </>,
    <>
      <p className="text-sm text-[#8B9BB4]">Esta seção é opcional, mas nos ajuda a te conhecer melhor como pessoa. Preencha o que quiser!</p>
      <F label="Hobbies e interesses">
        <div className="flex flex-wrap gap-2">
          {HOBBIES.map((h) => {
            const list: string[] = r.hobbiesAndInterests || [];
            const on = list.includes(h);
            return <button key={h} type="button" onClick={() => u({ hobbiesAndInterests: on ? list.filter((x) => x !== h) : [...list, h] })}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? 'bg-[#C4A46A] text-[#0B1929] border-[#C4A46A]' : 'border-[rgba(196,164,106,0.3)] text-[#8B9BB4] hover:text-[#E8E6E1]'}`}>{h}</button>;
          })}
        </div>
      </F>
      <Grid>
        <F label="Esportes que pratica">{txt('sportsActivities')}</F>
        <F label="Time de futebol">{txt('soccerTeam')}</F>
        <F label="Animais de estimação">{txt('pets', 'Ex: Cachorro - Rex')}</F>
        <F label="Bebida de preferência">{txt('favoriteDrink')}</F>
      </Grid>
      <F label="Como nos conheceu?">{txt('howFoundUs')}</F>
    </>,
  ];

  const last = step === SECTIONS.length - 1;
  const total = SECTIONS.length;
  return (
    <div className="client-form-page min-h-screen bg-[#0B1929] text-[#E8E6E1]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-40 sm:pb-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-[#C4A46A]">Onboarding</h1>
          <p className="mt-4 text-[#E8E6E1] text-sm sm:text-base leading-relaxed">É com grande satisfação que lhe damos as boas-vindas!</p>
          <p className="mt-3 text-[#8B9BB4] text-xs sm:text-sm leading-relaxed">O primeiro passo para iniciar seu planejamento financeiro personalizado é o preenchimento do formulário abaixo.</p>
        </div>
        {step === 0 && (
          <div className="mb-8 text-[#8B9BB4] text-xs leading-relaxed space-y-2">
            <p>Seus dados pessoais serão utilizados exclusivamente para a elaboração do seu planejamento financeiro. Suas informações serão armazenadas de forma totalmente segura. Temos compromisso com a segurança da informação e tratamos seus dados de acordo com as diretrizes da LGPD.</p>
            <p>Além disso, realizamos medidas de segurança técnicas e administrativas aptas a proteger suas informações de acessos não autorizados.</p>
          </div>
        )}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8B9BB4]">Progresso</span>
            <span className="text-xs text-[#C4A46A]">{step + 1} de {total}</span>
          </div>
          <div className="w-full bg-[#1A2A3F] rounded-full h-1.5">
            <div className="bg-[#C4A46A] h-1.5 rounded-full transition-all duration-500" style={{ width: `${((step + 1) / total) * 100}%` }} />
          </div>
          <div className="hidden md:flex flex-wrap gap-2 mt-4">
            {SECTIONS.map((s, i) => (
              <button key={s} type="button" onClick={() => go(i)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${i === step ? 'border-[#C4A46A] text-[#C4A46A]' : 'border-[#1A2A3F] text-[#8B9BB4] hover:text-[#E8E6E1]'}`}>{i + 1}. {s}</button>
            ))}
          </div>
        </div>

        <div key={step} className="bg-[#0F2035] rounded-xl border border-[#1A2A3F] p-6 sm:p-8 mb-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#C4A46A]/10 flex items-center justify-center shrink-0">
              <span className="text-[#C4A46A] text-sm font-semibold">{step + 1}</span>
            </div>
            <h2 className="text-lg font-medium text-[#C4A46A]">{SECTIONS[step]}{last && <span className="text-[#8B9BB4] text-sm font-normal"> (opcional)</span>}</h2>
          </div>
          <div className="space-y-5">{sections[step]}</div>
        </div>

        <div className="fixed sm:static bottom-0 left-0 right-0 p-4 sm:p-0 bg-[#0F2035] sm:bg-transparent border-t border-[#1A2A3F] sm:border-0 space-y-3 z-20">
          <div className="flex gap-3 max-w-2xl mx-auto">
            <button type="button" className={`flex-1 ${BTN_GHOST}`} disabled={step === 0} onClick={() => go(step - 1)}>← Anterior</button>
            {last
              ? <button type="button" className={`flex-1 ${BTN_PRIMARY} inline-flex items-center justify-center gap-2`} onClick={submit} disabled={sending}>{sending && <Loader2 className="w-4 h-4 animate-spin" />}Enviar Formulário</button>
              : <button type="button" className={`flex-1 ${BTN_PRIMARY}`} onClick={() => go(step + 1)}>Próximo →</button>}
          </div>
          <div className="max-w-2xl mx-auto">
            <button type="button" onClick={saveLater} className="w-full border border-[rgba(196,164,106,0.3)] text-[#C4A46A] hover:bg-[#C4A46A]/10 py-3 rounded-lg transition-colors text-sm">Salvar e continuar depois</button>
          </div>
        </div>

        <div className="text-center mt-10 pt-6 border-t border-[#1A2A3F]">
          <p className="text-[#8B9BB4] text-xs">{consultor ? `Consultor: ${consultor} • ` : ''}Documento confidencial</p>
        </div>
      </div>
    </div>
  );
}
