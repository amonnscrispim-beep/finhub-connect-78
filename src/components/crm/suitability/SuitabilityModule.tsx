import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, User, Building2, ChevronLeft, ChevronRight, Loader2, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { calculateInvestorProfile, PROFILE_LABEL, PROFILE_TEXT, type InvestorProfileKey } from './scoring';

type Data = Record<string, any>;
interface Row { id: string; person_type: 'PF' | 'PJ'; investor_profile: InvestorProfileKey; score: number; form_data: Data; completed_at: string; valid_until: string; status: string; }

const PRODUCTS = [
  ['poupanca', 'Poupança'], ['previdencia', 'Previdência privada'], ['tesouro_direto', 'Tesouro Direto'],
  ['renda_fixa_privada', 'Renda fixa privada (CDB, LCI, LCA, CRI, CRA, debêntures)'], ['fundos_multimercado', 'Fundos multimercado'],
  ['fundos_acoes', 'Fundos de ações'], ['fiis', 'Fundos imobiliários (FIIs)'], ['acoes', 'Ações'],
  ['derivativos', 'Derivativos (opções, futuros, swaps)'], ['commodities', 'Commodities'], ['cambio', 'Câmbio / Moedas'],
  ['coe', 'COE (Certificado de Operações Estruturadas)'], ['criptoativos', 'Criptoativos'],
];
const QUESTIONS: [string, string, [string, string][]][] = [
  ['percentInvested', 'Qual percentual da renda/receita é investido regularmente?', [['up_to_10', 'Até 10%'], ['11_to_20', 'De 11% a 20%'], ['21_to_30', 'De 21% a 30%'], ['over_30', 'Acima de 30%']]],
  ['needIn12Months', 'Quanto do total investido precisará ser resgatado nos próximos 12 meses?', [['nothing', 'Não pretendo resgatar'], ['up_to_25', 'Até 25%'], ['25_to_50', 'De 25% a 50%'], ['over_50', 'Mais de 50%']]],
  ['investmentBehavior', 'Qual frase melhor descreve o comportamento com investimentos?', [['avoid_loss', 'Prefiro evitar qualquer perda, mesmo com ganhos menores'], ['accept_small', 'Aceito pequenas perdas em busca de ganhos maiores no longo prazo'], ['accept_losses', 'Aceito perdas significativas por potencial de ganhos muito maiores']]],
  ['acceptableLoss', 'Qual perda seria aceitável no curto prazo (até 6 meses)?', [['none', 'Não aceitaria perda'], ['up_to_5', 'Até 5%'], ['5_to_10', 'De 5% a 10%'], ['over_10', 'Mais de 10%']]],
  ['gainReaction', 'Se os investimentos subissem cerca de 12,5% em pouco tempo, o que faria?', [['invest_more', 'Investiria mais'], ['pleased_no_change', 'Ficaria satisfeito e não mudaria nada'], ['move_part_safer', 'Moveria parte para algo mais seguro'], ['redeem_all', 'Resgataria tudo']]],
  ['lossReaction', 'Se os investimentos caíssem cerca de 12,5% em pouco tempo, o que faria?', [['invest_more', 'Aproveitaria para investir mais'], ['worried_no_change', 'Ficaria preocupado, mas não mudaria nada'], ['move_part_safer', 'Moveria parte para algo mais seguro'], ['redeem_all', 'Resgataria tudo']]],
  ['belowCDITolerance', 'Por quanto tempo aceitaria rentabilidade abaixo do CDI esperando ganhos maiores?', [['none', 'Não aceitaria'], ['1_to_3_years', 'De 1 a 3 anos'], ['3_to_5_years', 'De 3 a 5 anos'], ['5_to_10_years', 'De 5 a 10 anos']]],
];
const OCCUPATIONS = [['clt', 'Assalariado (CLT)'], ['empresario', 'Empresário'], ['liberal', 'Profissional liberal / autônomo'], ['servidor', 'Servidor público'], ['aposentado', 'Aposentado'], ['investidor', 'Investidor / vive de renda']];
const ASSETS = [['veiculos', 'Veículos'], ['imoveis', 'Imóveis'], ['outros', 'Outros']];
const SOURCES = [['trabalho', 'Trabalho'], ['renda_passiva', 'Renda passiva'], ['heranca', 'Herança'], ['venda_bens', 'Venda de bens'], ['aluguel', 'Aluguel'], ['aposentadoria', 'Aposentadoria'], ['outros', 'Outros']];
const SECTORS = ['Agronegócio', 'Comércio', 'Construção civil', 'Educação', 'Energia', 'Financeiro', 'Imobiliário', 'Indústria', 'Logística e transporte', 'Saúde', 'Serviços', 'Tecnologia', 'Telecomunicações', 'Turismo e hotelaria', 'Outro'];

const PF_STEPS = ['Dados cadastrais', 'Ocupação e finanças', 'Perfil de investimento'];
const PJ_STEPS = ['Dados da empresa', 'Representante legal', 'Finanças da empresa', 'Perfil de investimento'];
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const PROFILE_TONE: Record<InvestorProfileKey, string> = { conservador: 'bg-primary/10 text-primary', moderado: 'bg-primary/15 text-primary', arrojado: 'bg-accent text-accent-foreground', agressivo: 'bg-destructive/10 text-destructive' };

interface Props { clientId: string; clientName: string; clientEmail?: string; clientPhone?: string; birthDate?: Date | null; onProfileChange?: (label: string) => void; }

export function SuitabilityModule({ clientId, clientName, clientEmail, clientPhone, birthDate, onProfileChange }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'view' | 'choose' | 'form'>('view');
  const [type, setType] = useState<'PF' | 'PJ'>('PF');
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Data>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('client_suitability').select('*').eq('client_id', clientId).eq('user_id', user.id).order('completed_at', { ascending: false });
    setRows((data || []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [clientId, user?.id]);

  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));
  const toggle = (k: string, v: string) => setData((d) => { const a: string[] = d[k] || []; return { ...d, [k]: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] }; });

  const start = (t: 'PF' | 'PJ') => {
    const [first, ...rest] = clientName.split(' ');
    setType(t); setStep(0); setMode('form');
    setData(t === 'PF'
      ? { firstName: first || '', lastName: rest.join(' '), email: clientEmail || '', phone: clientPhone || '', birthDate: birthDate ? new Date(birthDate).toISOString().slice(0, 10) : '', knownProducts: [], otherAssetTypes: [], incomeSources: [] }
      : { knownProducts: [], otherAssetTypes: [] });
  };

  const lookupCep = async (cep: string) => {
    const c = cep.replace(/\D/g, '');
    if (c.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`).then((x) => x.json());
      if (!r.erro) setData((d) => ({ ...d, city: r.localidade, state: r.uf, neighborhood: r.bairro, street: r.logradouro }));
    } catch { /* manual */ }
  };

  const steps = type === 'PF' ? PF_STEPS : PJ_STEPS;
  const isProfileStep = step === steps.length - 1;
  const required: Record<string, string[]> = type === 'PF'
    ? { 0: ['cpf', 'firstName', 'lastName', 'email', 'birthDate'], 1: ['occupation'] }
    : { 0: ['cnpj', 'companyName', 'sector'], 1: ['repFirstName', 'repLastName', 'repEmail', 'repType'] };
  const stepValid = () => {
    if (isProfileStep) return QUESTIONS.every(([k]) => data[k]) && (data.knownProducts || []).length > 0;
    return (required[step] || []).every((k) => String(data[k] ?? '').trim());
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const { profile, score } = calculateInvestorProfile(data as any);
    const now = new Date(); const valid = new Date(now); valid.setMonth(valid.getMonth() + 24);
    await supabase.from('client_suitability').update({ status: 'superseded' }).eq('client_id', clientId).eq('user_id', user.id).eq('status', 'active');
    const { error } = await supabase.from('client_suitability').insert({ client_id: clientId, user_id: user.id, person_type: type, investor_profile: profile, score, form_data: data, completed_at: now.toISOString(), valid_until: valid.toISOString(), status: 'active' });
    setSaving(false);
    if (error) { toast.error('Não foi possível salvar o suitability.'); return; }
    toast.success(`Perfil calculado: ${PROFILE_LABEL[profile]}`);
    onProfileChange?.(PROFILE_LABEL[profile]);
    setMode('view'); load();
  };

  const exportPdf = async (row: Row) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const d = row.form_data;
    let y = 20;
    const line = (t: string, size = 10, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.splitTextToSize(t, 180).forEach((l: string) => { if (y > 280) { doc.addPage(); y = 20; } doc.text(l, 15, y); y += size * 0.5 + 1; }); };
    line('Gofferjé Investimentos', 9); line('Suitability — Análise de Perfil do Investidor', 16, true); y += 2;
    line(`Cliente: ${clientName} (${row.person_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'})`);
    line(`Perfil: ${PROFILE_LABEL[row.investor_profile]} — Pontuação ${row.score}/100`, 12, true);
    line(PROFILE_TEXT[row.investor_profile]);
    line(`Realizado em ${new Date(row.completed_at).toLocaleDateString('pt-BR')} · Válido até ${new Date(row.valid_until).toLocaleDateString('pt-BR')}`); y += 4;
    line('Respostas', 12, true);
    QUESTIONS.forEach(([k, q, opts]) => { line(q, 10, true); line(opts.find(([v]) => v === d[k])?.[1] || '—'); y += 1; });
    line('Produtos conhecidos', 10, true);
    line((d.knownProducts || []).map((p: string) => PRODUCTS.find(([v]) => v === p)?.[1]).join(', ') || '—');
    y += 10; line('_______________________________          _______________________________');
    line('Assinatura do cliente                                   Assinatura do consultor', 9);
    const blob = doc.output('blob');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `suitability_${clientName.normalize('NFD').replace(/[^\w]/g, '_')}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const active = rows.find((r) => r.status === 'active');
  const expired = active && new Date(active.valid_until) < new Date();
  const daysLeft = active ? Math.ceil((new Date(active.valid_until).getTime() - Date.now()) / 86400000) : 0;

  const field = (k: string, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input value={data[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...props} /></div>
  );
  const money = (k: string, label: string) => (
    <div className="space-y-1.5"><Label className="text-xs">{label}</Label><CurrencyInput value={String(data[k] ?? '')} onChange={(v) => set(k, parseFloat(v) || 0)} /></div>
  );
  const radio = (k: string, label: string, opts: (string[] | [string, string])[]) => (
    <div className="space-y-2"><Label className="text-sm">{label}</Label>
      <div className="grid gap-2">{opts.map(([v, l]) => (
        <button key={v} type="button" onClick={() => set(k, v)} className={`text-left text-sm rounded-lg border px-3 py-2 transition-colors ${data[k] === v ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted/50'}`}>{l}</button>
      ))}</div></div>
  );
  const checks = (k: string, label: string, opts: string[][]) => (
    <div className="space-y-2"><Label className="text-sm">{label}</Label>
      <div className="grid sm:grid-cols-2 gap-1">{opts.map(([v, l]) => (
        <label key={v} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"><Checkbox checked={(data[k] || []).includes(v)} onCheckedChange={() => toggle(k, v)} />{l}</label>
      ))}</div></div>
  );
  const address = (
    <div className="grid sm:grid-cols-3 gap-3">
      {field('cep', 'CEP', { onBlur: (e: React.FocusEvent<HTMLInputElement>) => lookupCep(e.target.value) })}
      {field('city', 'Cidade')}{field('state', 'UF')}{field('neighborhood', 'Bairro')}{field('street', 'Rua')}{field('number', 'Número')}{field('complement', 'Complemento')}
    </div>
  );
  const otherAssets = (
    <>
      {radio('hasOtherAssets', 'Possui outros bens?', [['yes', 'Sim'], ['no', 'Não']])}
      {data.hasOtherAssets === 'yes' && <>{checks('otherAssetTypes', 'Quais?', ASSETS)}{money('otherAssetsValue', 'Valor estimado dos outros bens')}</>}
    </>
  );

  const renderStep = () => {
    if (isProfileStep) return (
      <div className="space-y-6">
        {radio(...QUESTIONS[0])}
        {checks('knownProducts', 'Com quais tipos de investimento tem familiaridade?', PRODUCTS)}
        {QUESTIONS.slice(1).map((q) => <div key={q[0]}>{radio(...q)}</div>)}
      </div>
    );
    if (type === 'PF') {
      if (step === 0) return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">{field('cpf', 'CPF *')}{field('birthDate', 'Data de nascimento *', { type: 'date' })}{field('firstName', 'Nome *')}{field('lastName', 'Sobrenome *')}{field('email', 'E-mail *', { type: 'email' })}{field('phone', 'Telefone')}</div>
          {address}
          {radio('isPEP', 'É Pessoa Politicamente Exposta (PEP)?', [['yes', 'Sim'], ['no', 'Não']])}
        </div>
      );
      return (
        <div className="space-y-5">
          {radio('occupation', 'Ocupação *', OCCUPATIONS)}
          <div className="grid sm:grid-cols-2 gap-3">{field('profession', 'Profissão')}{field('segment', 'Segmento de atuação')}{money('monthlyIncome', 'Renda mensal')}{money('totalInvestments', 'Total em investimentos')}</div>
          {otherAssets}
          {checks('incomeSources', 'Origem dos recursos', SOURCES)}
          {(data.incomeSources || []).includes('outros') && field('otherIncomeDetail', 'Detalhe a outra origem')}
        </div>
      );
    }
    if (step === 0) return (
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {field('cnpj', 'CNPJ *')}{field('companyName', 'Razão social *')}
          <div className="space-y-1.5"><Label className="text-xs">Setor de atuação *</Label>
            <select value={data.sector || ''} onChange={(e) => set('sector', e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Selecione</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
            </select></div>
          {field('employeeCount', 'Nº de funcionários')}{field('website', 'Site')}
        </div>
        {address}
      </div>
    );
    if (step === 1) return (
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">{field('repFirstName', 'Nome *')}{field('repLastName', 'Sobrenome *')}{field('repEmail', 'E-mail *', { type: 'email' })}{field('repPhone', 'Telefone')}</div>
        {radio('repType', 'Tipo de representante *', [['proprietario', 'Proprietário / sócio'], ['procurador', 'Procurador']])}
      </div>
    );
    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">{money('monthlyRevenue', 'Faturamento mensal')}{money('availableCash', 'Caixa disponível')}{money('netProfit12m', 'Lucro líquido (12 meses)')}{money('currentNetDebt', 'Dívida líquida atual')}</div>
        {otherAssets}
      </div>
    );
  };

  if (mode === 'choose') return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Novo suitability — tipo de investidor</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {([['PF', User, 'Pessoa Física', '3 etapas: cadastro, finanças e perfil'], ['PJ', Building2, 'Pessoa Jurídica', '4 etapas: empresa, representante, finanças e perfil']] as const).map(([t, Icon, l, d]) => (
          <button key={t} type="button" onClick={() => start(t)} className="crm-card text-left p-5 rounded-xl border border-border hover:border-primary transition-colors">
            <Icon className="w-6 h-6 text-primary mb-3" /><p className="font-semibold text-foreground">{l}</p><p className="text-xs text-muted-foreground mt-1">{d}</p>
          </button>
        ))}
      </div>
      <Button type="button" variant="ghost" onClick={() => setMode('view')}>Cancelar</Button>
    </div>
  );

  if (mode === 'form') return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground">{type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'} · Etapa {step + 1} de {steps.length}</p>
        <h3 className="text-base font-semibold text-foreground">{steps[step]}</h3>
        <div className="flex gap-1 mt-3">{steps.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />)}</div>
      </div>
      {renderStep()}
      <div className="flex justify-between pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={() => (step === 0 ? setMode('view') : setStep(step - 1))} className="gap-1"><ChevronLeft className="w-4 h-4" />{step === 0 ? 'Cancelar' : 'Voltar'}</Button>
        {isProfileStep
          ? <Button type="button" disabled={!stepValid() || saving} onClick={submit} className="gap-1">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Calcular perfil</Button>
          : <Button type="button" disabled={!stepValid()} onClick={() => setStep(step + 1)} className="gap-1">Avançar<ChevronRight className="w-4 h-4" /></Button>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><h3 className="text-base font-semibold text-foreground">Suitability — Perfil do Investidor</h3></div>
        <Button type="button" size="sm" onClick={() => setMode('choose')} className="gap-1.5">{active ? <><RotateCcw className="w-3.5 h-3.5" />Refazer suitability</> : 'Iniciar suitability'}</Button>
      </div>
      {!active ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum suitability realizado. Inicie para calcular o perfil do investidor conforme a regulamentação CVM.</div>
      ) : (
        <div className="crm-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Perfil atual ({active.person_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'})</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${PROFILE_TONE[active.investor_profile]}`}>{PROFILE_LABEL[active.investor_profile]}</span>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => exportPdf(active)} className="gap-1.5"><Download className="w-3.5 h-3.5" />Exportar PDF</Button>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Pontuação</span><span className="font-semibold text-foreground">{active.score}/100</span></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${active.score}%` }} /></div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>Conservador</span><span>Moderado</span><span>Arrojado</span><span>Agressivo</span></div>
          </div>
          <p className="text-sm text-muted-foreground">{PROFILE_TEXT[active.investor_profile]}</p>
          <div className="text-sm grid sm:grid-cols-2 gap-2">
            <p><span className="text-muted-foreground">Realizado em: </span>{new Date(active.completed_at).toLocaleDateString('pt-BR')}</p>
            <p className={expired ? 'text-destructive font-medium' : daysLeft <= 60 ? 'text-warning font-medium' : ''}><span className="text-muted-foreground">Válido até: </span>{new Date(active.valid_until).toLocaleDateString('pt-BR')}{expired ? ' (vencido — refaça)' : daysLeft <= 60 ? ` (vence em ${daysLeft} dias)` : ''}</p>
            {active.person_type === 'PF' && active.form_data.monthlyIncome > 0 && <p><span className="text-muted-foreground">Renda mensal: </span>{fmt(active.form_data.monthlyIncome)}</p>}
            {active.person_type === 'PF' && active.form_data.totalInvestments > 0 && <p><span className="text-muted-foreground">Investimentos: </span>{fmt(active.form_data.totalInvestments)}</p>}
          </div>
        </div>
      )}
      {rows.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Histórico</p>
          <div className="rounded-lg border border-border divide-y divide-border">
            {rows.filter((r) => r !== active).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{new Date(r.completed_at).toLocaleDateString('pt-BR')} · {r.person_type}</span>
                <span className="text-muted-foreground">{PROFILE_LABEL[r.investor_profile]} ({r.score})</span>
                <button type="button" onClick={() => exportPdf(r)} className="text-primary text-xs hover:underline">PDF</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
