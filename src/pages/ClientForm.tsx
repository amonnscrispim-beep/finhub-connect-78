import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';

const TOTAL_STEPS = 7;

const MARITAL_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'];
const PROPERTY_REGIME_OPTIONS = ['Comunhão parcial', 'Comunhão universal', 'Separação total', 'Participação final nos aquestos', 'Não aplicável'];

interface FormResponses {
  // Step 1 - Identity
  wealthBuilding: string;
  biggestDecision: string;
  biggestMistake: string;
  lifePhaseAnswer: string;
  futureVision: string;
  // Step 2 - Family
  family: {
    maritalStatus: string;
    propertyRegime: string;
    hasChildren: string;
    childrenCount: string;
    childrenAges: string;
    childrenFinanciallyDependent: string;
    hasOtherDependents: string;
    otherDependentsDetail: string;
    successionDiscussed: string;
  };
  // Step 3 - Patrimony
  estruturaPatrimonial: {
    totalPatrimony: string;
    pfValue: string;
    pjValue: string;
    liquidFinancialAssets: string;
    realEstate: string;
    businessParticipations: string;
    concentrationDetail: string;
    hasConcentration: string;
  };
  // Step 4 - Cash Flow
  fluxoCaixa: {
    monthlyRevenue: string;
    revenueStability: string;
    livingCost: string;
    monthlyInvestment: string;
    alreadyInvesting: string;
  };
  // Step 5 - Goals
  objetivosMetas: {
    mainObjective: string;
    goalMonthlyIncome: string;
    goalTargetWealth: string;
    timeframe: string;
    restrictions: string;
  };
  targetPatrimony: string;
  targetMonthlyIncome: string;
  // Step 6 - Risk
  perfilRisco: {
    volatilityReaction: string;
    oscillationLimit: string;
    crisisPriority: string;
  };
  // Step 7 - Protection
  protecaoSucessao: {
    successionPlanning: string;
    patrimonialOrganization: string;
    lifeInsurance: string;
    geoDiversification: string;
  };
  // Extra
  additionalNotes: string;
}

const defaultResponses: FormResponses = {
  wealthBuilding: '',
  biggestDecision: '',
  biggestMistake: '',
  lifePhaseAnswer: '',
  futureVision: '',
  family: {
    maritalStatus: '',
    propertyRegime: '',
    hasChildren: '',
    childrenCount: '',
    childrenAges: '',
    childrenFinanciallyDependent: '',
    hasOtherDependents: '',
    otherDependentsDetail: '',
    successionDiscussed: '',
  },
  estruturaPatrimonial: {
    totalPatrimony: '',
    pfValue: '',
    pjValue: '',
    liquidFinancialAssets: '',
    realEstate: '',
    businessParticipations: '',
    concentrationDetail: '',
    hasConcentration: '',
  },
  fluxoCaixa: {
    monthlyRevenue: '',
    revenueStability: '',
    livingCost: '',
    monthlyInvestment: '',
    alreadyInvesting: '',
  },
  objetivosMetas: {
    mainObjective: '',
    goalMonthlyIncome: '',
    goalTargetWealth: '',
    timeframe: '',
    restrictions: '',
  },
  targetPatrimony: '',
  targetMonthlyIncome: '',
  perfilRisco: {
    volatilityReaction: '',
    oscillationLimit: '',
    crisisPriority: '',
  },
  protecaoSucessao: {
    successionPlanning: '',
    patrimonialOrganization: '',
    lifeInsurance: '',
    geoDiversification: '',
  },
  additionalNotes: '',
};

export default function ClientForm() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState(1);
  const [responses, setResponses] = useState<FormResponses>(defaultResponses);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/client-form`;

  // Load form data
  useEffect(() => {
    if (!token) return;
    fetch(`${baseUrl}?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setClientName(data.clientName || '');
          if (data.status === 'completed') {
            setSubmitted(true);
          }
          if (data.responses && Object.keys(data.responses).length > 0) {
            setResponses(prev => deepMerge(prev, data.responses));
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar formulário');
        setLoading(false);
      });
  }, [token]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (submitted || error) return;
    const interval = setInterval(() => {
      autoSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [responses, submitted, error]);

  const autoSave = useCallback(async () => {
    if (!token || submitted) return;
    try {
      await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, responses, submit: false }),
      });
      setLastSaved(new Date());
    } catch { /* silent */ }
  }, [token, responses, submitted]);

  const handleSubmit = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, responses, submit: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Erro ao enviar');
      }
    } catch {
      setError('Erro ao enviar formulário');
    }
    setSaving(false);
  };

  const progress = (step / TOTAL_STEPS) * 100;

  const updateField = (key: keyof FormResponses, value: string) => {
    setResponses(prev => ({ ...prev, [key]: value }));
  };

  const updateNested = <K extends keyof FormResponses>(
    section: K,
    field: string,
    value: string
  ) => {
    setResponses(prev => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, string>), [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">{error}</h1>
          <p className="text-slate-500 text-sm">Se acredita que isso é um erro, entre em contato com seu consultor financeiro.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-800">Formulário enviado!</h1>
          <p className="text-slate-600">Obrigado, {clientName}. Suas respostas foram registradas e seu consultor já foi notificado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-slate-800">Formulário de Planejamento Financeiro</h1>
          <p className="text-sm text-slate-500">Olá, {clientName}! Preencha com calma e salve quando quiser.</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Etapa {step} de {TOTAL_STEPS}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          {lastSaved && (
            <p className="text-xs text-slate-400 mt-1">Salvo automaticamente às {lastSaved.toLocaleTimeString('pt-BR')}</p>
          )}
        </div>
      </div>

      {/* Form Steps */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {step === 1 && (
            <StepIdentity responses={responses} updateField={updateField} />
          )}
          {step === 2 && (
            <StepFamily responses={responses} updateNested={updateNested} />
          )}
          {step === 3 && (
            <StepPatrimony responses={responses} updateNested={updateNested} />
          )}
          {step === 4 && (
            <StepCashFlow responses={responses} updateNested={updateNested} />
          )}
          {step === 5 && (
            <StepGoals responses={responses} updateField={updateField} updateNested={updateNested} />
          )}
          {step === 6 && (
            <StepRisk responses={responses} updateNested={updateNested} />
          )}
          {step === 7 && (
            <StepProtection responses={responses} updateField={updateField} updateNested={updateNested} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => { autoSave(); setStep(s => s - 1); }}
            disabled={step === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => { autoSave(); setStep(s => s + 1); }}
              className="gap-2"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Enviar Formulário
            </Button>
          )}
        </div>

        {/* Save button */}
        <div className="text-center mt-4">
          <Button variant="ghost" size="sm" onClick={autoSave} className="text-slate-500 text-xs">
            Salvar e continuar depois
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step Components ──────────────────────────

function StepIdentity({ responses, updateField }: { responses: FormResponses; updateField: (k: keyof FormResponses, v: string) => void }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800">Etapa 1 – Identidade e Momento de Vida</h2>
      <p className="text-sm text-slate-500">Queremos entender sua trajetória e visão de futuro.</p>

      <div className="space-y-2">
        <Label>Como você construiu seu patrimônio até aqui?</Label>
        <Textarea value={responses.wealthBuilding} onChange={e => updateField('wealthBuilding', e.target.value)} placeholder="Conte sua história..." className="min-h-[100px]" />
      </div>
      <div className="space-y-2">
        <Label>Qual foi a decisão financeira mais importante da sua vida?</Label>
        <Textarea value={responses.biggestDecision} onChange={e => updateField('biggestDecision', e.target.value)} placeholder="Descreva..." className="min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label>Qual foi o maior erro financeiro que você já cometeu?</Label>
        <Textarea value={responses.biggestMistake} onChange={e => updateField('biggestMistake', e.target.value)} placeholder="Descreva..." className="min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label>Hoje você se considera em fase de expansão, consolidação ou proteção do patrimônio? Por quê?</Label>
        <Textarea value={responses.lifePhaseAnswer} onChange={e => updateField('lifePhaseAnswer', e.target.value)} placeholder="Explique..." className="min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label>Se eu te encontrar daqui a 10 anos e você disser "deu certo", o que precisa ter acontecido?</Label>
        <Textarea value={responses.futureVision} onChange={e => updateField('futureVision', e.target.value)} placeholder="Descreva sua visão..." className="min-h-[100px]" />
      </div>
    </>
  );
}

function StepFamily({ responses, updateNested }: { responses: FormResponses; updateNested: (s: keyof FormResponses, f: string, v: string) => void }) {
  const f = responses.family;
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800">Etapa 2 – Estrutura Familiar</h2>
      <div className="space-y-2">
        <Label>Estado Civil</Label>
        <Select value={f.maritalStatus} onValueChange={v => updateNested('family', 'maritalStatus', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{MARITAL_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {(f.maritalStatus === 'Casado(a)' || f.maritalStatus === 'União estável') && (
        <div className="space-y-2">
          <Label>Regime de Bens</Label>
          <Select value={f.propertyRegime} onValueChange={v => updateNested('family', 'propertyRegime', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{PROPERTY_REGIME_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Possui filhos?</Label>
        <Select value={f.hasChildren} onValueChange={v => updateNested('family', 'hasChildren', v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {f.hasChildren === 'Sim' && (
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
          <div className="space-y-2">
            <Label>Quantidade de filhos</Label>
            <Input type="number" value={f.childrenCount} onChange={e => updateNested('family', 'childrenCount', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Idade dos filhos</Label>
            <Input value={f.childrenAges} onChange={e => updateNested('family', 'childrenAges', e.target.value)} placeholder="Ex: 8 e 12 anos" />
          </div>
          <div className="space-y-2">
            <Label>Dependem financeiramente?</Label>
            <Select value={f.childrenFinanciallyDependent} onValueChange={v => updateNested('family', 'childrenFinanciallyDependent', v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Possui outros dependentes financeiros?</Label>
        <Select value={f.hasOtherDependents} onValueChange={v => updateNested('family', 'hasOtherDependents', v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {f.hasOtherDependents === 'Sim' && (
        <div className="space-y-2">
          <Label>Quem são?</Label>
          <Input value={f.otherDependentsDetail} onChange={e => updateNested('family', 'otherDependentsDetail', e.target.value)} placeholder="Ex: pais, irmão..." />
        </div>
      )}
      <div className="space-y-2">
        <Label>Você já discutiu planejamento sucessório com sua família?</Label>
        <Select value={f.successionDiscussed} onValueChange={v => updateNested('family', 'successionDiscussed', v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
            <SelectItem value="Parcialmente">Parcialmente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function StepPatrimony({ responses, updateNested }: { responses: FormResponses; updateNested: (s: keyof FormResponses, f: string, v: string) => void }) {
  const p = responses.estruturaPatrimonial;
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800">Etapa 3 – Estrutura Patrimonial</h2>
      <p className="text-sm text-slate-500">Valores aproximados para ajudar na construção da estratégia.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Patrimônio financeiro total</Label>
          <CurrencyInput value={p.totalPatrimony} onChange={v => updateNested('estruturaPatrimonial', 'totalPatrimony', v)} />
        </div>
        <div className="space-y-2">
          <Label>Ativos financeiros líquidos</Label>
          <CurrencyInput value={p.liquidFinancialAssets} onChange={v => updateNested('estruturaPatrimonial', 'liquidFinancialAssets', v)} />
        </div>
        <div className="space-y-2">
          <Label>Patrimônio PF</Label>
          <CurrencyInput value={p.pfValue} onChange={v => updateNested('estruturaPatrimonial', 'pfValue', v)} />
        </div>
        <div className="space-y-2">
          <Label>Patrimônio PJ</Label>
          <CurrencyInput value={p.pjValue} onChange={v => updateNested('estruturaPatrimonial', 'pjValue', v)} />
        </div>
        <div className="space-y-2">
          <Label>Imóveis</Label>
          <CurrencyInput value={p.realEstate} onChange={v => updateNested('estruturaPatrimonial', 'realEstate', v)} />
        </div>
        <div className="space-y-2">
          <Label>Participações empresariais</Label>
          <CurrencyInput value={p.businessParticipations} onChange={v => updateNested('estruturaPatrimonial', 'businessParticipations', v)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Existe concentração relevante em algum ativo?</Label>
        <Select value={p.hasConcentration} onValueChange={v => updateNested('estruturaPatrimonial', 'hasConcentration', v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sim">Sim</SelectItem>
            <SelectItem value="nao">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {p.hasConcentration === 'sim' && (
        <div className="space-y-2">
          <Label>Onde está a concentração?</Label>
          <Input value={p.concentrationDetail} onChange={e => updateNested('estruturaPatrimonial', 'concentrationDetail', e.target.value)} placeholder="Descreva..." />
        </div>
      )}
    </>
  );
}

function StepCashFlow({ responses, updateNested }: { responses: FormResponses; updateNested: (s: keyof FormResponses, f: string, v: string) => void }) {
  const fc = responses.fluxoCaixa;
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800">Etapa 4 – Fluxo de Caixa</h2>
      <div className="space-y-2">
        <Label>Receita mensal média</Label>
        <CurrencyInput value={fc.monthlyRevenue} onChange={v => updateNested('fluxoCaixa', 'monthlyRevenue', v)} />
      </div>
      <div className="space-y-2">
        <Label>Estabilidade da renda</Label>
        <Select value={fc.revenueStability} onValueChange={v => updateNested('fluxoCaixa', 'revenueStability', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Estável">Estável (salário fixo, aposentadoria)</SelectItem>
            <SelectItem value="Variável">Variável (comissões, negócios)</SelectItem>
            <SelectItem value="Mista">Mista (parte fixa + variável)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Custo mensal de vida</Label>
        <CurrencyInput value={fc.livingCost} onChange={v => updateNested('fluxoCaixa', 'livingCost', v)} />
      </div>
      <div className="space-y-2">
        <Label>Aporte mensal para investimentos</Label>
        <CurrencyInput value={fc.monthlyInvestment} onChange={v => updateNested('fluxoCaixa', 'monthlyInvestment', v)} />
      </div>
      <div className="space-y-2">
        <Label>Já possui renda passiva?</Label>
        <Select value={fc.alreadyInvesting} onValueChange={v => updateNested('fluxoCaixa', 'alreadyInvesting', v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function StepGoals({ responses, updateField, updateNested }: { responses: FormResponses; updateField: (k: keyof FormResponses, v: string) => void; updateNested: (s: keyof FormResponses, f: string, v: string) => void }) {
  const g = responses.objetivosMetas;
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800">Etapa 5 – Metas</h2>
      <div className="space-y-2">
        <Label>Qual seu objetivo principal com o planejamento financeiro?</Label>
        <Textarea value={g.mainObjective} onChange={e => updateNested('objetivosMetas', 'mainObjective', e.target.value)} placeholder="Descreva..." className="min-h-[80px]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Renda mensal desejada</Label>
          <CurrencyInput value={responses.targetMonthlyIncome} onChange={v => updateField('targetMonthlyIncome', v)} />
        </div>
        <div className="space-y-2">
          <Label>Patrimônio alvo</Label>
          <CurrencyInput value={responses.targetPatrimony} onChange={v => updateField('targetPatrimony', v)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Prazo estimado</Label>
        <Input value={g.timeframe} onChange={e => updateNested('objetivosMetas', 'timeframe', e.target.value)} placeholder="Ex: 10 anos, até 2035..." />
      </div>
      <div className="space-y-2">
        <Label>Eventos futuros importantes (aposentadoria, viagem, educação dos filhos...)</Label>
        <Textarea value={g.restrictions} onChange={e => updateNested('objetivosMetas', 'restrictions', e.target.value)} placeholder="Descreva..." className="min-h-[80px]" />
      </div>
    </>
  );
}

function StepRisk({ responses, updateNested }: { responses: FormResponses; updateNested: (s: keyof FormResponses, f: string, v: string) => void }) {
  const r = responses.perfilRisco;
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800">Etapa 6 – Risco e Comportamento</h2>
      <div className="space-y-2">
        <Label>Como você reage quando seus investimentos caem significativamente?</Label>
        <Textarea value={r.volatilityReaction} onChange={e => updateNested('perfilRisco', 'volatilityReaction', e.target.value)} placeholder="Descreva..." className="min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label>Qual a queda máxima (%) que você toleraria na sua carteira?</Label>
        <Select value={r.oscillationLimit} onValueChange={v => updateNested('perfilRisco', 'oscillationLimit', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5%">Até 5%</SelectItem>
            <SelectItem value="10%">Até 10%</SelectItem>
            <SelectItem value="20%">Até 20%</SelectItem>
            <SelectItem value="30%+">Mais de 30%</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Em uma crise, sua prioridade seria crescimento ou tranquilidade?</Label>
        <Select value={r.crisisPriority} onValueChange={v => updateNested('perfilRisco', 'crisisPriority', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Crescimento">Crescimento (aproveitar oportunidades)</SelectItem>
            <SelectItem value="Tranquilidade">Tranquilidade (proteger o que tenho)</SelectItem>
            <SelectItem value="Equilíbrio">Equilíbrio (um pouco de cada)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function StepProtection({ responses, updateField, updateNested }: { responses: FormResponses; updateField: (k: keyof FormResponses, v: string) => void; updateNested: (s: keyof FormResponses, f: string, v: string) => void }) {
  const p = responses.protecaoSucessao;
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800">Etapa 7 – Proteção e Estrutura</h2>
      <div className="space-y-2">
        <Label>Possui holding patrimonial?</Label>
        <Select value={p.patrimonialOrganization} onValueChange={v => updateNested('protecaoSucessao', 'patrimonialOrganization', v)}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
            <SelectItem value="Em estruturação">Em estruturação</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Possui planejamento sucessório?</Label>
        <Select value={p.successionPlanning} onValueChange={v => updateNested('protecaoSucessao', 'successionPlanning', v)}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
            <SelectItem value="Parcialmente">Parcialmente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Possui seguro de vida?</Label>
        <Select value={p.lifeInsurance} onValueChange={v => updateNested('protecaoSucessao', 'lifeInsurance', v)}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Possui exposição internacional?</Label>
        <Select value={p.geoDiversification} onValueChange={v => updateNested('protecaoSucessao', 'geoDiversification', v)}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
            <SelectItem value="Interesse futuro">Interesse futuro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <hr className="my-4" />
      <div className="space-y-2">
        <Label className="font-semibold">Existe algo importante que você acredita que ainda não foi perguntado?</Label>
        <Textarea value={responses.additionalNotes} onChange={e => updateField('additionalNotes', e.target.value)} placeholder="Compartilhe qualquer informação adicional..." className="min-h-[100px]" />
      </div>
    </>
  );
}

// Deep merge helper
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
