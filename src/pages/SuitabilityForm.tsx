import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CheckCircle2, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { QUESTIONS, PRODUCTS, OCCUPATIONS, SOURCES } from '@/lib/suitability';

type R = Record<string, any>;
// Estilo isolado do formulário público (mesmo visual do formulário de planejamento)
const FIELD = 'w-full bg-[#0B1929] border border-[rgba(196,164,106,0.3)] rounded-lg px-4 py-3 text-[#E8E6E1] text-sm placeholder-[#4A5568] focus:border-[rgba(196,164,106,0.6)] focus:outline-none';
const MONEY = 'h-auto bg-[#0B1929] border-[rgba(196,164,106,0.3)] rounded-lg px-4 py-3 text-[#E8E6E1] text-sm focus-visible:ring-0 focus-visible:ring-offset-0';
const BTN = 'flex-1 bg-[#C4A46A] hover:bg-[#D4B87A] text-[#0B1929] font-semibold py-3 rounded-lg text-sm disabled:opacity-50';
const GHOST = 'flex-1 border border-[#1A2A3F] text-[#8B9BB4] hover:text-[#E8E6E1] py-3 rounded-lg text-sm disabled:opacity-40';

function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-[#E8E6E1] mb-1.5">{label}{req && <span className="text-[#C4A46A]"> *</span>}</label>{children}</div>;
}
function Choice({ value, onChange, opts, multi }: { value: any; onChange: (v: any) => void; opts: [string, string][]; multi?: boolean }) {
  const sel = (k: string) => (multi ? (value || []).includes(k) : value === k);
  return (
    <div className="space-y-2">
      {opts.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(multi ? (sel(k) ? value.filter((x: string) => x !== k) : [...(value || []), k]) : k)}
          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${sel(k) ? 'border-[#C4A46A] bg-[#C4A46A]/10 text-[#E8E6E1]' : 'border-[#1A2A3F] text-[#8B9BB4] hover:border-[#C4A46A]/40'}`}>{l}</button>
      ))}
    </div>
  );
}

export default function SuitabilityForm() {
  const { code = '' } = useParams<{ code: string }>();
  const base = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/suitability-form`;
  const key = `suitability-${code.toUpperCase()}`;
  const [state, setState] = useState<'loading' | 'form' | 'done' | 'invalid'>('loading');
  const [err, setErr] = useState('');
  const [step, setStep] = useState(0);
  const [type, setType] = useState<'PF' | 'PJ' | ''>('');
  const [f, setF] = useState<R>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${base}?code=${encodeURIComponent(code)}`).then(async (r) => {
      const b = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(b.error || 'Link inválido'); return setState('invalid'); }
      if (b.status === 'submitted') return setState('done');
      try { const s = JSON.parse(localStorage.getItem(key) || '{}'); setType(s.type || ''); setF(s.f || {}); setStep(s.step || 0); } catch { /* ignore */ }
      setState('form');
    }).catch(() => { setErr('Não foi possível carregar.'); setState('invalid'); });
  }, [code]);

  const u = (p: R) => setF((x) => ({ ...x, ...p }));
  const t = (k: string, ph?: string, inputType = 'text') => <input type={inputType} className={FIELD} value={f[k] || ''} placeholder={ph} onChange={(e) => u({ [k]: e.target.value })} />;
  const m = (k: string) => <CurrencyInput className={MONEY} value={f[k] || ''} onChange={(x) => u({ [k]: x })} placeholder="R$ 0,00" />;
  const yn = (k: string) => <div className="flex gap-2">{['Sim', 'Não'].map((o) => <button key={o} type="button" onClick={() => u({ [k]: o })} className={`px-5 py-2 rounded-lg border text-sm ${f[k] === o ? 'border-[#C4A46A] bg-[#C4A46A]/10 text-[#E8E6E1]' : 'border-[#1A2A3F] text-[#8B9BB4]'}`}>{o}</button>)}</div>;
  const g = (c: React.ReactNode) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{c}</div>;

  const steps: { title: string; valid: boolean; body: React.ReactNode }[] = [
    { title: 'Tipo de cadastro', valid: !!type, body: <Choice value={type} onChange={setType} opts={[['PF', 'Pessoa Física'], ['PJ', 'Pessoa Jurídica']]} /> },
    type === 'PJ' ? { title: 'Dados da empresa', valid: !!(f.companyName && f.cnpj && f.repFirstName), body: <div className="space-y-4">
      {g(<><F label="Razão Social" req>{t('companyName')}</F><F label="CNPJ" req>{t('cnpj', '00.000.000/0000-00')}</F><F label="Setor">{t('sector')}</F><F label="Colaboradores">{t('employeeCount', '', 'number')}</F>
        <F label="Rua">{t('street')}</F><F label="Número">{t('number')}</F><F label="Cidade">{t('city')}</F><F label="UF">{t('state')}</F>
        <F label="Nome do representante" req>{t('repFirstName')}</F><F label="Sobrenome">{t('repLastName')}</F><F label="Email do representante">{t('repEmail', '', 'email')}</F></>)}
      <F label="O representante é:"><Choice value={f.repType} onChange={(x) => u({ repType: x })} opts={[['proprietario', 'Proprietário'], ['procurador', 'Procurador Legal']]} /></F>
    </div> } : { title: 'Dados pessoais', valid: !!(f.firstName && f.cpf && f.birthDate), body: <div className="space-y-4">
      {g(<><F label="Nome" req>{t('firstName')}</F><F label="Sobrenome">{t('lastName')}</F><F label="CPF" req>{t('cpf', '000.000.000-00')}</F><F label="Data de nascimento" req>{t('birthDate', '', 'date')}</F>
        <F label="Email">{t('email', '', 'email')}</F><F label="Telefone">{t('phone', '(00) 00000-0000')}</F><F label="CEP">{t('cep')}</F><F label="Rua">{t('street')}</F>
        <F label="Número">{t('number')}</F><F label="Complemento">{t('complement')}</F><F label="Cidade">{t('city')}</F><F label="UF">{t('state')}</F></>)}
      <F label="É Pessoa Politicamente Exposta (PEP)?">{yn('isPEP')}</F>
    </div> },
    type === 'PJ' ? { title: 'Finanças da empresa', valid: !!f.monthlyRevenue, body: g(<>
      <F label="Faturamento mensal" req>{m('monthlyRevenue')}</F><F label="Caixa disponível">{m('availableCash')}</F><F label="Lucro líquido (12 meses)">{m('netProfit12m')}</F><F label="Dívida líquida atual">{m('currentNetDebt')}</F></>) }
      : { title: 'Ocupação e finanças', valid: !!(f.occupation && f.monthlyIncome), body: <div className="space-y-4">
      <F label="Ocupação" req><Choice value={f.occupation} onChange={(x) => u({ occupation: x })} opts={OCCUPATIONS} /></F>
      {g(<><F label="Profissão">{t('profession')}</F><F label="Renda mensal" req>{m('monthlyIncome')}</F><F label="Total em investimentos">{m('totalInvestments')}</F></>)}
      <F label="Possui outros patrimônios (imóveis, veículos)?">{yn('hasOtherAssets')}</F>
      {f.hasOtherAssets === 'Sim' && <F label="Valor estimado dos outros patrimônios">{m('otherAssetsValue')}</F>}
      <F label="Origem dos seus recursos"><Choice multi value={f.incomeSources || []} onChange={(x) => u({ incomeSources: x })} opts={SOURCES} /></F>
    </div> },
    { title: 'Conhecimento', valid: true, body: <F label="Quais destes produtos você conhece ou já investiu?"><Choice multi value={f.knownProducts || []} onChange={(x) => u({ knownProducts: x })} opts={PRODUCTS} /></F> },
    ...QUESTIONS.map((q) => ({ title: 'Perfil de investimento', valid: !!f[q.key], body: <F label={q.title} req><Choice value={f[q.key]} onChange={(x) => u({ [q.key]: x })} opts={q.opts.map((o) => [o[0], o[1]] as [string, string])} /></F> })),
  ];

  const go = (s: number) => { setStep(s); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const save = () => { localStorage.setItem(key, JSON.stringify({ type, f, step })); toast.success('Progresso salvo neste aparelho. Abra o mesmo link para continuar.'); };
  const submit = async () => {
    setSending(true);
    const r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, personType: type, formData: f }) }).catch(() => null);
    setSending(false);
    if (!r || !r.ok) { toast.error('Não foi possível enviar. Tente novamente.'); return; }
    localStorage.removeItem(key); setState('done');
  };

  const shell = (c: React.ReactNode) => <div className="min-h-screen bg-[#0B1929] text-[#E8E6E1]"><div className="max-w-lg mx-auto px-4 py-8">{c}</div></div>;
  if (state === 'loading') return shell(<div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#C4A46A]" /></div>);
  if (state === 'invalid') return shell(<div className="text-center py-20 space-y-3"><AlertTriangle className="w-10 h-10 mx-auto text-[#C4A46A]" /><p>{err}</p><p className="text-sm text-[#8B9BB4]">Peça um novo link ao seu consultor.</p></div>);
  if (state === 'done') return shell(<div className="text-center py-20 space-y-3"><CheckCircle2 className="w-14 h-14 mx-auto text-[#4ADE80]" /><h1 className="text-xl font-semibold">Questionário enviado</h1><p className="text-sm text-[#8B9BB4]">Obrigado! Seu consultor já recebeu suas respostas.</p></div>);

  const cur = steps[step];
  const last = step === steps.length - 1;
  return shell(<>
    <div className="text-center mb-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#C4A46A] to-[#A68B4B] flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-[#0B1929]" /></div>
      <h1 className="text-xl font-semibold">Perfil do Investidor</h1>
      <p className="text-sm text-[#8B9BB4] mt-1">Questionário de adequação ao perfil — exigência CVM</p>
    </div>
    <div className="mb-6">
      <div className="flex justify-between text-xs text-[#8B9BB4] mb-1"><span>{cur.title}</span><span>{step + 1} de {steps.length}</span></div>
      <div className="h-1 bg-[#1A2A3F] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#C4A46A] to-[#D4B47A] transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
    </div>
    <div className="rounded-xl border border-[#1A2A3F] bg-[#0F2236] p-5 space-y-4">{cur.body}</div>
    <div className="flex gap-3 mt-6">
      <button className={GHOST} onClick={() => go(step - 1)} disabled={step === 0}>← Anterior</button>
      {last ? <button className={BTN} onClick={submit} disabled={!cur.valid || sending}>{sending ? 'Enviando...' : 'Enviar'}</button>
        : <button className={BTN} onClick={() => go(step + 1)} disabled={!cur.valid}>Próximo →</button>}
    </div>
    <button onClick={save} className="w-full mt-4 py-3 text-sm text-[#8B9BB4] hover:text-[#C4A46A]">Salvar e continuar depois</button>
    <p className="text-center text-xs text-[#4A5568] mt-6">Consultor: Gofferjé Investimentos • Documento confidencial</p>
  </>);
}
