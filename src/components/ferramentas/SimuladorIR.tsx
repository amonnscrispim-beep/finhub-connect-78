import { useState, useMemo } from 'react';
import {
  Calculator, TrendingDown, TrendingUp, ChevronRight, ChevronLeft,
  HelpCircle, Plus, Minus, Sparkles, AlertTriangle, FileDown, Save,
  CheckCircle2, Wallet, PiggyBank, Receipt, ChevronDown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  simulateIR, fmtBRL, fmtPct, LIMITS, type IRInputs, type IRSimulationResult,
} from '@/lib/ir-calculator';

// ===========================================================
// Paleta Premium Dark — local ao componente (não polui tokens globais)
// Fundo #0A0E14 · Cards #141A23 · Accent Azul #0055FF
// ===========================================================
const PALETTE = {
  bg: '#0A0E14',
  card: '#141A23',
  cardElev: '#1A2230',
  border: '#1F2A3A',
  accent: '#0055FF',
  accentSoft: 'rgba(0,85,255,0.12)',
  text: '#E6ECF5',
  textMuted: '#8A98AD',
  positive: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// ===========================================================
// Helpers
// ===========================================================
const InfoTip = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
          style={{ color: PALETTE.textMuted, background: PALETTE.cardElev }}>
          <HelpCircle className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs" style={{ background: PALETTE.cardElev, color: PALETTE.text, borderColor: PALETTE.border }}>
        {children}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

function FieldLabel({ label, tip }: { label: string; tip?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs font-medium" style={{ color: PALETTE.textMuted }}>{label}</Label>
      {tip && <InfoTip>{tip}</InfoTip>}
    </div>
  );
}

function MoneyField({
  label, tip, value, onChange, placeholder,
}: { label: string; tip?: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} tip={tip} />
      <CurrencyInput
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? 'R$ 0,00'}
        className="h-11 border text-sm"
      />
    </div>
  );
}

// ===========================================================
// STEPPER
// ===========================================================
function Stepper({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Simulação' },
    { n: 2, label: 'Resultados' },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all',
            )}
            style={{
              background: step >= s.n ? PALETTE.accent : PALETTE.cardElev,
              color: step >= s.n ? '#fff' : PALETTE.textMuted,
              boxShadow: step === s.n ? `0 0 0 4px ${PALETTE.accentSoft}` : 'none',
            }}
          >
            {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
          </div>
          <span className="text-xs font-medium hidden sm:inline" style={{ color: step >= s.n ? PALETTE.text : PALETTE.textMuted }}>
            {s.label}
          </span>
          {i < steps.length - 1 && <div className="w-10 h-px" style={{ background: PALETTE.border }} />}
        </div>
      ))}
    </div>
  );
}

// ===========================================================
// MAIN
// ===========================================================
export function SimuladorIR() {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);

  // Inputs (em string para casar com CurrencyInput)
  const [rendaMonthly, setRendaMonthly] = useState(false);
  const [renda, setRenda] = useState('');
  const [inss, setInss] = useState('');
  const [saude, setSaude] = useState('');
  const [educacao, setEducacao] = useState('');
  const [dependentes, setDependentes] = useState(0);
  const [outras, setOutras] = useState('');
  const [temPgbl, setTemPgbl] = useState(false);
  const [pgblExistente, setPgblExistente] = useState('');

  const inputs: IRInputs = useMemo(() => {
    const rendaNum = parseFloat(renda) || 0;
    return {
      rendaBrutaAnual: rendaMonthly ? rendaNum * 12 : rendaNum,
      despesaSaude: parseFloat(saude) || 0,
      despesaEducacao: parseFloat(educacao) || 0,
      numDependentes: dependentes,
      outrasDeducoes: parseFloat(outras) || 0,
      pgblExistente: temPgbl ? (parseFloat(pgblExistente) || 0) : 0,
      inssAnual: parseFloat(inss) || 0,
    };
  }, [renda, rendaMonthly, inss, saude, educacao, dependentes, outras, temPgbl, pgblExistente]);

  const result = useMemo<IRSimulationResult>(() => simulateIR(inputs), [inputs]);

  const canAdvance = inputs.rendaBrutaAnual > 0;

  const handleSaveLocal = () => {
    try {
      const payload = { inputs, result, savedAt: new Date().toISOString() };
      localStorage.setItem('simulador-ir:last', JSON.stringify(payload));
      toast({ title: 'Simulação salva', description: 'Os dados ficam disponíveis nesta máquina para futura consulta.' });
    } catch {
      toast({ title: 'Não foi possível salvar', variant: 'destructive' });
    }
  };

  const handleExportPdf = () => {
    // Abre janela com layout printável → "Salvar como PDF" via diálogo do browser.
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildPrintableHtml(inputs, result));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="min-h-[600px] rounded-xl p-6 md:p-8 font-sans" style={{ background: PALETTE.bg, color: PALETTE.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2.5 rounded-lg" style={{ background: PALETTE.accentSoft, color: PALETTE.accent }}>
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight" style={{ color: PALETTE.text }}>
            Simulador de Imposto de Renda
          </h1>
          <p className="text-xs" style={{ color: PALETTE.textMuted }}>
            Calculadora premium · Tabela vigente · Benefício PGBL
          </p>
        </div>
      </div>

      <div className="my-6 h-px" style={{ background: PALETTE.border }} />

      <Stepper step={step} />

      {step === 1 && (
        <Step1
          rendaMonthly={rendaMonthly} setRendaMonthly={setRendaMonthly}
          renda={renda} setRenda={setRenda}
          inss={inss} setInss={setInss}
          saude={saude} setSaude={setSaude}
          educacao={educacao} setEducacao={setEducacao}
          dependentes={dependentes} setDependentes={setDependentes}
          outras={outras} setOutras={setOutras}
          temPgbl={temPgbl} setTemPgbl={setTemPgbl}
          pgblExistente={pgblExistente} setPgblExistente={setPgblExistente}
          onNext={() => setStep(2)}
          canAdvance={canAdvance}
        />
      )}

      {step === 2 && (
        <Step2
          result={result}
          onBack={() => setStep(1)}
          onSave={handleSaveLocal}
          onExport={handleExportPdf}
        />
      )}
    </div>
  );
}

// ===========================================================
// STEP 1 — INPUTS
// ===========================================================
function Step1(props: any) {
  const {
    rendaMonthly, setRendaMonthly,
    renda, setRenda, inss, setInss, saude, setSaude, educacao, setEducacao,
    dependentes, setDependentes, outras, setOutras,
    temPgbl, setTemPgbl, pgblExistente, setPgblExistente,
    onNext, canAdvance,
  } = props;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 border" style={{ background: PALETTE.card, borderColor: PALETTE.border }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: PALETTE.text }}>
          Simule aqui o benefício fiscal que você pode ter no imposto de renda
        </h2>
        <p className="text-xs mb-6" style={{ color: PALETTE.textMuted }}>
          O <strong style={{ color: PALETTE.accent }}>PGBL</strong> é o único produto que permite deduzir até <strong>12% da renda bruta tributável anual</strong> da
          base de cálculo do IR — desde que você faça declaração no modelo <strong>completo</strong>. Preencha os campos
          abaixo para descobrir quanto você poderia economizar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Renda */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel
                label={rendaMonthly ? 'Renda Bruta Mensal' : 'Renda Bruta Anual Tributável'}
                tip="Soma de salários, pró-labore, aluguéis e demais rendimentos tributáveis na sua declaração. Não inclua rendimentos isentos (poupança, FIIs, LCI/LCA)."
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: PALETTE.textMuted }}>Mensal</span>
                <Switch checked={rendaMonthly} onCheckedChange={setRendaMonthly} />
              </div>
            </div>
            <CurrencyInput value={renda} onChange={setRenda} placeholder="R$ 0,00" className="h-12 text-base font-semibold" />
          </div>

          <MoneyField
            label="INSS / Previdência Oficial (anual)"
            tip="Contribuições obrigatórias ao INSS são integralmente dedutíveis."
            value={inss} onChange={setInss}
          />

          <MoneyField
            label="Despesa anual com saúde"
            tip="Planos de saúde, médicos, dentistas, hospitais. Sem limite de dedução — desde que comprovado por nota fiscal."
            value={saude} onChange={setSaude}
          />

          <MoneyField
            label="Despesa anual com educação"
            tip={`Educação formal (escola, faculdade). Limite legal de ${fmtBRL(LIMITS.EDUCATION_PER_PERSON)} por pessoa (titular + dependentes). Cursos livres não entram.`}
            value={educacao} onChange={setEducacao}
          />

          {/* Dependentes */}
          <div className="space-y-1.5">
            <FieldLabel
              label="Número de dependentes"
              tip={`Cada dependente concede ${fmtBRL(LIMITS.DEPENDENT_DEDUCTION)}/ano de dedução automática.`}
            />
            <div className="flex items-center gap-2 h-11 rounded-md border px-2" style={{ background: PALETTE.cardElev, borderColor: PALETTE.border }}>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-8 w-8" style={{ color: PALETTE.text }}
                onClick={() => setDependentes(Math.max(0, dependentes - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="flex-1 text-center text-sm font-semibold" style={{ color: PALETTE.text }}>
                {dependentes}
              </span>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-8 w-8" style={{ color: PALETTE.text }}
                onClick={() => setDependentes(dependentes + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <MoneyField
            label="Outras despesas dedutíveis"
            tip="Pensão alimentícia judicial, doações incentivadas (Pronas, Pronon, FIA, Lei Rouanet) — observe limites legais específicos."
            value={outras} onChange={setOutras}
          />

          {/* PGBL existente */}
          <div className="md:col-span-2 mt-2 p-4 rounded-lg border" style={{ background: PALETTE.cardElev, borderColor: PALETTE.border }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4" style={{ color: PALETTE.accent }} />
                <Label className="text-sm font-medium" style={{ color: PALETTE.text }}>
                  Já tenho investimento em PGBL este ano
                </Label>
              </div>
              <Switch checked={temPgbl} onCheckedChange={setTemPgbl} />
            </div>
            {temPgbl && (
              <div className="mt-4 animate-fade-in">
                <MoneyField
                  label="Valor já aportado em PGBL (anual)"
                  tip="Considere todos os aportes feitos no ano-calendário em planos PGBL."
                  value={pgblExistente} onChange={setPgblExistente}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canAdvance}
          className="h-11 px-6 font-semibold"
          style={{ background: PALETTE.accent, color: '#fff' }}
        >
          Calcular benefício fiscal
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ===========================================================
// STEP 2 — RESULTADOS
// ===========================================================
function Step2({ result, onBack, onSave, onExport }: {
  result: IRSimulationResult; onBack: () => void; onSave: () => void; onExport: () => void;
}) {
  const { semAporte, comAporteSugerido, aporteSugerido, beneficioFiscal, declaracaoSimplificada, mensal } = result;

  const chartData = [
    { name: 'Sem PGBL', imposto: Math.round(semAporte.imposto), fill: PALETTE.danger },
    { name: 'Com PGBL', imposto: Math.round(comAporteSugerido.imposto), fill: PALETTE.positive },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HERO RESULTADO */}
      <Card className="p-6 md:p-8 border relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${PALETTE.card} 0%, ${PALETTE.cardElev} 100%)`, borderColor: PALETTE.border }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: PALETTE.accent, filter: 'blur(80px)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" style={{ color: PALETTE.accent }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: PALETTE.accent }}>
              Aporte sugerido para o benefício máximo
            </span>
          </div>
          <p className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: PALETTE.text }}>
            {fmtBRL(aporteSugerido)}
          </p>
          <p className="text-sm mt-1" style={{ color: PALETTE.textMuted }}>
            equivalente a <strong style={{ color: PALETTE.text }}>{fmtBRL(mensal.aporteSugerido)}</strong> por mês
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricMini
              icon={<TrendingDown className="w-4 h-4" />}
              label="Imposto sem PGBL" value={fmtBRL(semAporte.imposto)} color={PALETTE.danger}
            />
            <MetricMini
              icon={<TrendingUp className="w-4 h-4" />}
              label="Imposto com PGBL" value={fmtBRL(comAporteSugerido.imposto)} color={PALETTE.positive}
            />
            <MetricMini
              icon={<Wallet className="w-4 h-4" />}
              label="Benefício fiscal estimado" value={fmtBRL(beneficioFiscal)} color={PALETTE.accent}
              highlight
            />
          </div>
        </div>
      </Card>

      {/* GRÁFICO */}
      <Card className="p-6 border" style={{ background: PALETTE.card, borderColor: PALETTE.border }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: PALETTE.text }}>Imposto Pago vs. Imposto Recuperado</h3>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
              <XAxis dataKey="name" tick={{ fill: PALETTE.textMuted, fontSize: 12 }} axisLine={{ stroke: PALETTE.border }} />
              <YAxis tick={{ fill: PALETTE.textMuted, fontSize: 11 }} axisLine={{ stroke: PALETTE.border }}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <RTooltip
                contentStyle={{ background: PALETTE.cardElev, border: `1px solid ${PALETTE.border}`, borderRadius: 8, color: PALETTE.text }}
                formatter={(v: number) => fmtBRL(v)}
              />
              <Bar dataKey="imposto" radius={[8, 8, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* TABELA COMPARATIVA */}
      <Card className="p-6 border" style={{ background: PALETTE.card, borderColor: PALETTE.border }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: PALETTE.text }}>Detalhamento Comparativo</h3>
        <ComparisonTable a={semAporte} b={comAporteSugerido} />
      </Card>

      {/* ALERTA SIMPLIFICADA */}
      {declaracaoSimplificada.melhorQueCompleta && (
        <Card className="p-5 border flex gap-3" style={{ background: 'rgba(245,158,11,0.08)', borderColor: PALETTE.warning }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: PALETTE.warning }} />
          <div className="text-xs leading-relaxed" style={{ color: PALETTE.text }}>
            <strong>Atenção:</strong> com base nos dados informados, a <strong>Declaração Simplificada</strong> (imposto
            de {fmtBRL(declaracaoSimplificada.imposto)}) seria mais vantajosa do que a <strong>Completa com aporte máximo em PGBL</strong> ({fmtBRL(comAporteSugerido.imposto)}).
            Reavalie suas deduções antes de definir o modelo de declaração.
          </div>
        </Card>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <Button variant="ghost" onClick={onBack} className="h-11" style={{ color: PALETTE.textMuted }}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Editar dados
        </Button>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onSave} variant="outline" className="h-11"
            style={{ borderColor: PALETTE.border, background: 'transparent', color: PALETTE.text }}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Simulação
          </Button>
          <Button onClick={onExport} className="h-11 font-semibold"
            style={{ background: PALETTE.accent, color: '#fff' }}>
            <FileDown className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetricMini({ icon, label, value, color, highlight }: {
  icon: React.ReactNode; label: string; value: string; color: string; highlight?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg border" style={{
      background: highlight ? PALETTE.accentSoft : 'transparent',
      borderColor: highlight ? PALETTE.accent : PALETTE.border,
    }}>
      <div className="flex items-center gap-2 mb-1" style={{ color }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold" style={{ color: highlight ? PALETTE.text : PALETTE.text }}>
        {value}
      </p>
    </div>
  );
}

function ComparisonTable({ a, b }: { a: any; b: any }) {
  const [openDed, setOpenDed] = useState(false);
  const rows = [
    { label: 'Renda Bruta Anual', valA: a.rendaBruta, valB: b.rendaBruta },
    { label: 'Total de Deduções', valA: a.totalDeducoes, valB: b.totalDeducoes, isExpandable: true },
    { label: 'Base de Cálculo', valA: a.baseCalculo, valB: b.baseCalculo },
    { label: 'Imposto Devido', valA: a.imposto, valB: b.imposto, highlight: true },
    { label: 'Alíquota Efetiva', valA: a.aliquotaEfetiva, valB: b.aliquotaEfetiva, pct: true },
  ];

  return (
    <div>
      {/* Desktop / tablet */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-3 gap-4 pb-3 border-b" style={{ borderColor: PALETTE.border }}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PALETTE.textMuted }}>Item</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: PALETTE.textMuted }}>Sem PGBL</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: PALETTE.accent }}>Com PGBL no teto</span>
        </div>
        {rows.map((row, i) => (
          <div key={i}>
            <div className="grid grid-cols-3 gap-4 py-3 border-b items-center"
              style={{ borderColor: PALETTE.border }}>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: PALETTE.text }}>{row.label}</span>
                {row.isExpandable && (
                  <button onClick={() => setOpenDed(!openDed)}
                    className="text-xs hover:opacity-80 transition" style={{ color: PALETTE.accent }}>
                    <ChevronDown className={cn('w-4 h-4 transition-transform', openDed && 'rotate-180')} />
                  </button>
                )}
              </div>
              <span className={cn('text-sm text-right tabular-nums', row.highlight && 'font-bold')}
                style={{ color: row.highlight ? PALETTE.danger : PALETTE.text }}>
                {row.pct ? fmtPct(row.valA) : fmtBRL(row.valA)}
              </span>
              <span className={cn('text-sm text-right tabular-nums', row.highlight && 'font-bold')}
                style={{ color: row.highlight ? PALETTE.positive : PALETTE.text }}>
                {row.pct ? fmtPct(row.valB) : fmtBRL(row.valB)}
              </span>
            </div>
            {row.isExpandable && (
              <Collapsible open={openDed}>
                <CollapsibleContent>
                  <DeducoesBreakdown a={a} b={b} />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ))}
      </div>

      {/* Mobile — cards */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="p-3 rounded-lg border" style={{ background: PALETTE.cardElev, borderColor: PALETTE.border }}>
            <p className="text-xs font-medium mb-2" style={{ color: PALETTE.textMuted }}>{row.label}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px]" style={{ color: PALETTE.textMuted }}>Sem PGBL</p>
                <p className="text-sm font-semibold" style={{ color: row.highlight ? PALETTE.danger : PALETTE.text }}>
                  {row.pct ? fmtPct(row.valA) : fmtBRL(row.valA)}
                </p>
              </div>
              <div>
                <p className="text-[10px]" style={{ color: PALETTE.accent }}>Com PGBL</p>
                <p className="text-sm font-semibold" style={{ color: row.highlight ? PALETTE.positive : PALETTE.text }}>
                  {row.pct ? fmtPct(row.valB) : fmtBRL(row.valB)}
                </p>
              </div>
            </div>
            {row.isExpandable && (
              <button onClick={() => setOpenDed(!openDed)}
                className="mt-2 text-xs flex items-center gap-1" style={{ color: PALETTE.accent }}>
                {openDed ? 'Ocultar' : 'Detalhar'} deduções
                <ChevronDown className={cn('w-3 h-3 transition-transform', openDed && 'rotate-180')} />
              </button>
            )}
            {row.isExpandable && openDed && (
              <div className="mt-2"><DeducoesBreakdown a={a} b={b} compact /></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DeducoesBreakdown({ a, b, compact }: { a: any; b: any; compact?: boolean }) {
  const lines = [
    { label: 'INSS / Previdência Oficial', va: a.inss, vb: b.inss },
    { label: 'Saúde', va: a.saude, vb: b.saude },
    { label: `Educação (até ${fmtBRL(a.educacaoLimite)})`, va: a.educacaoAplicada, vb: b.educacaoAplicada },
    { label: 'Dependentes', va: a.dependentes, vb: b.dependentes },
    { label: 'Outras', va: a.outras, vb: b.outras },
    { label: 'PGBL aplicado', va: a.pgblAplicado, vb: b.pgblAplicado, accent: true },
  ];
  return (
    <div className={cn('rounded-md p-3 my-2', compact ? '' : 'ml-4')} style={{ background: PALETTE.cardElev }}>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-3 gap-4 py-1.5 text-xs">
          <span style={{ color: PALETTE.textMuted }}>{l.label}</span>
          <span className="text-right tabular-nums" style={{ color: PALETTE.text }}>{fmtBRL(l.va)}</span>
          <span className="text-right tabular-nums font-semibold"
            style={{ color: l.accent ? PALETTE.accent : PALETTE.text }}>
            {fmtBRL(l.vb)}
          </span>
        </div>
      ))}
      {a.educacaoExcedente > 0 && (
        <p className="text-[10px] mt-2 pt-2 border-t" style={{ color: PALETTE.warning, borderColor: PALETTE.border }}>
          ⚠ Excedente educacional não dedutível: {fmtBRL(a.educacaoExcedente)}
        </p>
      )}
    </div>
  );
}

// ===========================================================
// PDF (impressão via window.print)
// ===========================================================
function buildPrintableHtml(inputs: IRInputs, r: IRSimulationResult): string {
  const row = (label: string, a: number | string, b: number | string, hl = false) =>
    `<tr${hl ? ' style="background:#F4F6FA;font-weight:700"' : ''}>
       <td style="padding:8px 12px;border-bottom:1px solid #E5E9F0">${label}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #E5E9F0;text-align:right">${a}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #E5E9F0;text-align:right;color:#0055FF">${b}</td>
     </tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Simulação IR</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;color:#0A0E14;max-width:820px;margin:24px auto;padding:0 24px}
      h1{margin:0 0 4px;font-size:20px}
      h2{font-size:14px;color:#475569;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.05em}
      .hero{background:#0A0E14;color:#fff;padding:24px;border-radius:12px;margin:16px 0}
      .hero .v{font-size:28px;font-weight:700;color:#0055FF}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;padding:8px 12px;background:#0A0E14;color:#fff;font-size:11px;text-transform:uppercase}
    </style></head><body>
    <h1>Simulação de Imposto de Renda</h1>
    <p style="color:#64748B;font-size:12px">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>

    <div class="hero">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8">Aporte sugerido em PGBL</div>
      <div class="v">${fmtBRL(r.aporteSugerido)}</div>
      <div style="font-size:12px;color:#94A3B8;margin-top:4px">Benefício fiscal estimado: <strong style="color:#10B981">${fmtBRL(r.beneficioFiscal)}</strong></div>
    </div>

    <h2>Comparativo</h2>
    <table>
      <thead><tr><th>Item</th><th style="text-align:right">Sem PGBL</th><th style="text-align:right">Com PGBL</th></tr></thead>
      <tbody>
        ${row('Renda Bruta Anual', fmtBRL(r.semAporte.rendaBruta), fmtBRL(r.comAporteSugerido.rendaBruta))}
        ${row('Total de Deduções', fmtBRL(r.semAporte.totalDeducoes), fmtBRL(r.comAporteSugerido.totalDeducoes))}
        ${row('Base de Cálculo', fmtBRL(r.semAporte.baseCalculo), fmtBRL(r.comAporteSugerido.baseCalculo))}
        ${row('Imposto Devido', fmtBRL(r.semAporte.imposto), fmtBRL(r.comAporteSugerido.imposto), true)}
        ${row('Alíquota Efetiva', fmtPct(r.semAporte.aliquotaEfetiva), fmtPct(r.comAporteSugerido.aliquotaEfetiva))}
      </tbody>
    </table>

    <h2>Deduções aplicadas (cenário com PGBL no teto)</h2>
    <table>
      <tbody>
        ${row('INSS / Previdência', fmtBRL(r.comAporteSugerido.inss), '')}
        ${row('Saúde', fmtBRL(r.comAporteSugerido.saude), '')}
        ${row('Educação', fmtBRL(r.comAporteSugerido.educacaoAplicada), '')}
        ${row('Dependentes', fmtBRL(r.comAporteSugerido.dependentes), '')}
        ${row('Outras', fmtBRL(r.comAporteSugerido.outras), '')}
        ${row('PGBL', fmtBRL(r.comAporteSugerido.pgblAplicado), '', true)}
      </tbody>
    </table>

    ${r.declaracaoSimplificada.melhorQueCompleta ? `
      <div style="margin-top:24px;padding:16px;border:1px solid #F59E0B;background:#FEF3C7;border-radius:8px;font-size:12px">
        <strong>Alerta:</strong> a Declaração Simplificada resultaria em imposto de
        <strong>${fmtBRL(r.declaracaoSimplificada.imposto)}</strong>, valor inferior ao da Completa com PGBL.
      </div>` : ''}

    <p style="margin-top:32px;font-size:10px;color:#94A3B8">
      Simulação informativa baseada na tabela progressiva anual vigente. Não substitui orientação contábil.
    </p>
    </body></html>`;
}
