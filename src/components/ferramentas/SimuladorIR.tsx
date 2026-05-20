import { useState, useMemo, useEffect } from 'react';
import {
  TrendingDown, TrendingUp, ChevronRight, ChevronLeft,
  HelpCircle, Plus, Minus, Sparkles, AlertTriangle, FileDown, Save,
  CheckCircle2, Wallet, PiggyBank, Receipt, ChevronDown, Info,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  simulateIR, fmtBRL, fmtPct, LIMITS, calcINSSAnualFromAnual,
  type IRInputs, type IRSimulationResult,
} from '@/lib/ir-calculator';

// ===========================================================
// Helpers
// ===========================================================
const InfoTip = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-primary transition">
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

function FieldLabel({ label, tip }: { label: string; tip?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {tip && <InfoTip>{tip}</InfoTip>}
    </div>
  );
}

function MoneyField({
  label, tip, value, onChange, placeholder, autoComputed,
}: { label: string; tip?: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; autoComputed?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <FieldLabel label={label} tip={tip} />
        {autoComputed && (
          <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Automático</span>
        )}
      </div>
      <CurrencyInput
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? 'R$ 0,00'}
        className="h-10 text-sm"
      />
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 }) {
  const steps = [{ n: 1, label: 'Simulação' }, { n: 2, label: 'Resultados' }] as const;
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all',
              step >= s.n ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground',
            )}
          >
            {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
          </div>
          <span className={cn('text-xs font-medium hidden sm:inline', step >= s.n ? 'text-foreground' : 'text-muted-foreground')}>
            {s.label}
          </span>
          {i < steps.length - 1 && <div className="w-10 h-px bg-border" />}
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

  const [rendaMonthly, setRendaMonthly] = useState(false);
  const [renda, setRenda] = useState('');
  const [inssAutomatico, setInssAutomatico] = useState(true);
  const [inssManual, setInssManual] = useState('');
  const [saude, setSaude] = useState('');
  const [educacaoTitular, setEducacaoTitular] = useState('');
  const [dependentes, setDependentes] = useState(0);
  const [educacaoDeps, setEducacaoDeps] = useState<string[]>([]);
  const [outras, setOutras] = useState('');
  const [temPgbl, setTemPgbl] = useState(false);
  const [pgblExistente, setPgblExistente] = useState('');

  // Mantém array de educação por dependente sincronizado
  useEffect(() => {
    setEducacaoDeps((prev) => {
      const next = [...prev];
      if (next.length < dependentes) {
        while (next.length < dependentes) next.push('');
      } else if (next.length > dependentes) {
        next.length = dependentes;
      }
      return next;
    });
  }, [dependentes]);

  const rendaBrutaAnual = useMemo(() => {
    const n = parseFloat(renda) || 0;
    return rendaMonthly ? n * 12 : n;
  }, [renda, rendaMonthly]);

  const inssCalculado = useMemo(() => calcINSSAnualFromAnual(rendaBrutaAnual), [rendaBrutaAnual]);
  const inssFinal = inssAutomatico ? inssCalculado : (parseFloat(inssManual) || 0);

  const inputs: IRInputs = useMemo(() => ({
    rendaBrutaAnual,
    despesaSaude: parseFloat(saude) || 0,
    educacaoTitular: parseFloat(educacaoTitular) || 0,
    educacaoPorDependente: educacaoDeps.map((v) => parseFloat(v) || 0),
    numDependentes: dependentes,
    outrasDeducoes: parseFloat(outras) || 0,
    pgblExistente: temPgbl ? (parseFloat(pgblExistente) || 0) : 0,
    inssAnual: inssFinal,
  }), [rendaBrutaAnual, saude, educacaoTitular, educacaoDeps, dependentes, outras, temPgbl, pgblExistente, inssFinal]);

  const result = useMemo<IRSimulationResult>(() => simulateIR(inputs), [inputs]);
  const canAdvance = inputs.rendaBrutaAnual > 0;

  const handleSaveLocal = () => {
    try {
      localStorage.setItem('simulador-ir:last', JSON.stringify({ inputs, result, savedAt: new Date().toISOString() }));
      toast({ title: 'Simulação salva', description: 'Os dados ficam disponíveis nesta máquina para futura consulta.' });
    } catch {
      toast({ title: 'Não foi possível salvar', variant: 'destructive' });
    }
  };

  const handleExportPdf = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildPrintableHtml(inputs, result));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="min-h-[600px] rounded-xl bg-background p-6 md:p-8 text-foreground">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight">
            Simulador de Imposto de Renda
          </h1>
          <p className="text-xs text-muted-foreground">
            Tabela progressiva 2026 · INSS automático · Benefício PGBL
          </p>
        </div>
      </div>

      <div className="my-6 h-px bg-border" />
      <Stepper step={step} />

      {step === 1 ? (
        <Step1
          rendaMonthly={rendaMonthly} setRendaMonthly={setRendaMonthly}
          renda={renda} setRenda={setRenda}
          inssAutomatico={inssAutomatico} setInssAutomatico={setInssAutomatico}
          inssCalculado={inssCalculado} inssManual={inssManual} setInssManual={setInssManual}
          saude={saude} setSaude={setSaude}
          educacaoTitular={educacaoTitular} setEducacaoTitular={setEducacaoTitular}
          dependentes={dependentes} setDependentes={setDependentes}
          educacaoDeps={educacaoDeps} setEducacaoDeps={setEducacaoDeps}
          outras={outras} setOutras={setOutras}
          temPgbl={temPgbl} setTemPgbl={setTemPgbl}
          pgblExistente={pgblExistente} setPgblExistente={setPgblExistente}
          onNext={() => setStep(2)}
          canAdvance={canAdvance}
        />
      ) : (
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
// STEP 1
// ===========================================================
function Step1(props: any) {
  const {
    rendaMonthly, setRendaMonthly,
    renda, setRenda,
    inssAutomatico, setInssAutomatico, inssCalculado, inssManual, setInssManual,
    saude, setSaude,
    educacaoTitular, setEducacaoTitular,
    dependentes, setDependentes,
    educacaoDeps, setEducacaoDeps,
    outras, setOutras,
    temPgbl, setTemPgbl, pgblExistente, setPgblExistente,
    onNext, canAdvance,
  } = props;

  const updateDep = (i: number, v: string) => {
    const next = [...educacaoDeps];
    next[i] = v;
    setEducacaoDeps(next);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-card border-border">
        <h2 className="text-base font-semibold mb-1 text-foreground">
          Simule o benefício fiscal disponível para o seu cliente
        </h2>
        <p className="text-xs text-muted-foreground mb-6">
          O <strong className="text-primary">PGBL</strong> permite deduzir até <strong>12% da renda bruta tributável anual</strong> da
          base de cálculo do IR — exclusivo para quem declara no modelo <strong>Completo</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Renda */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel
                label={rendaMonthly ? 'Renda Bruta Mensal' : 'Renda Bruta Anual Tributável'}
                tip="Salários, pró-labore, aluguéis e demais rendimentos tributáveis. Não inclua rendimentos isentos (poupança, FIIs, LCI/LCA)."
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{rendaMonthly ? 'Mensal' : 'Anual'}</span>
                <Switch checked={rendaMonthly} onCheckedChange={setRendaMonthly} />
              </div>
            </div>
            <CurrencyInput value={renda} onChange={setRenda} placeholder="R$ 0,00" className="h-12 text-base font-semibold" />
          </div>

          {/* INSS */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel
                label="INSS / Previdência Oficial (anual)"
                tip="Calculado automaticamente via faixas progressivas 2026 (7,5% a 14%) com teto de R$ 8.157,41/mês. Desative para informar manualmente."
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Calcular automaticamente</span>
                <Switch checked={inssAutomatico} onCheckedChange={setInssAutomatico} />
              </div>
            </div>
            {inssAutomatico ? (
              <div className="h-10 rounded-md border border-input bg-muted/40 px-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground tabular-nums">{fmtBRL(inssCalculado)}</span>
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Auto</span>
              </div>
            ) : (
              <CurrencyInput value={inssManual} onChange={setInssManual} placeholder="R$ 0,00" className="h-10 text-sm" />
            )}
          </div>

          <MoneyField
            label="Despesa anual com saúde"
            tip="Planos de saúde, médicos, dentistas, hospitais. Sem limite — desde que comprovado por nota fiscal."
            value={saude} onChange={setSaude}
          />

          <MoneyField
            label="Educação (Titular)"
            tip={`Educação formal: escola e faculdade. Limite legal de ${fmtBRL(LIMITS.EDUCATION_PER_PERSON)}/ano por CPF.`}
            value={educacaoTitular} onChange={setEducacaoTitular}
          />

          {/* Dependentes */}
          <div className="space-y-1.5">
            <FieldLabel
              label="Número de dependentes"
              tip={`Cada dependente concede ${fmtBRL(LIMITS.DEPENDENT_DEDUCTION)}/ano de dedução automática.`}
            />
            <div className="flex items-center gap-2 h-10 rounded-md border border-input bg-background px-2">
              <Button
                type="button" variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => setDependentes(Math.max(0, dependentes - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="flex-1 text-center text-sm font-semibold">{dependentes}</span>
              <Button
                type="button" variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => setDependentes(dependentes + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Educação por dependente — dinâmico */}
          {dependentes > 0 && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              {Array.from({ length: dependentes }).map((_, i) => (
                <MoneyField
                  key={i}
                  label={`Educação (Dependente ${i + 1})`}
                  tip={`Limite individual de ${fmtBRL(LIMITS.EDUCATION_PER_PERSON)}/ano por CPF.`}
                  value={educacaoDeps[i] ?? ''}
                  onChange={(v) => updateDep(i, v)}
                />
              ))}
            </div>
          )}

          <MoneyField
            label="Outras despesas dedutíveis"
            tip="Pensão alimentícia judicial, doações incentivadas (Pronas, Pronon, FIA, Lei Rouanet) — observe limites legais específicos."
            value={outras} onChange={setOutras}
          />

          {/* PGBL existente */}
          <div className="md:col-span-2 mt-2 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Já tenho investimento em PGBL este ano</Label>
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
        <Button onClick={onNext} disabled={!canAdvance} className="h-11 px-6 font-semibold">
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
    { name: 'Sem PGBL', imposto: Math.round(semAporte.imposto), fill: 'hsl(var(--destructive))' },
    { name: 'Com PGBL', imposto: Math.round(comAporteSugerido.imposto), fill: 'hsl(var(--primary))' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HERO */}
      <Card className="p-6 md:p-8 bg-card border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.07] bg-primary blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Aporte sugerido para o benefício máximo
            </span>
          </div>
          <p className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {fmtBRL(aporteSugerido)}
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            equivalente a <strong className="text-foreground">{fmtBRL(mensal.aporteSugerido)}</strong> por mês
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricMini icon={<TrendingDown className="w-4 h-4" />} label="Imposto sem PGBL"
              value={fmtBRL(semAporte.imposto)} tone="destructive" />
            <MetricMini icon={<TrendingUp className="w-4 h-4" />} label="Imposto com PGBL"
              value={fmtBRL(comAporteSugerido.imposto)} tone="primary" />
            <MetricMini icon={<Wallet className="w-4 h-4" />} label="Benefício fiscal estimado"
              value={fmtBRL(beneficioFiscal)} tone="primary" highlight />
          </div>
        </div>
      </Card>

      {/* GRÁFICO */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Imposto Devido — Comparativo</h3>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={{ stroke: 'hsl(var(--border))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <RTooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                formatter={(v: number) => fmtBRL(v)}
              />
              <Bar dataKey="imposto" radius={[8, 8, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* TABELA */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Detalhamento Comparativo</h3>
        <ComparisonTable a={semAporte} b={comAporteSugerido} />
      </Card>

      {/* ALERTA SIMPLIFICADA */}
      {declaracaoSimplificada.melhorQueCompleta && (
        <Card className="p-5 border-warning/50 bg-warning/10 flex gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-warning" />
          <div className="text-xs leading-relaxed text-foreground">
            <strong>Atenção:</strong> com base nos dados informados, a <strong>Declaração Simplificada</strong> (imposto
            de {fmtBRL(declaracaoSimplificada.imposto)}) seria mais vantajosa do que a <strong>Completa com aporte máximo em PGBL</strong> ({fmtBRL(comAporteSugerido.imposto)}).
            Reavalie suas deduções antes de definir o modelo de declaração.
          </div>
        </Card>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <Button variant="ghost" onClick={onBack} className="h-11 text-muted-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" /> Editar dados
        </Button>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onSave} variant="outline" className="h-11">
            <Save className="w-4 h-4 mr-2" />
            Salvar no Perfil
          </Button>
          <Button onClick={onExport} className="h-11 font-semibold">
            <FileDown className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground flex items-start gap-1">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        Estimativa baseada na Tabela Progressiva Anual 2026. Não considera particularidades do contribuinte e não substitui orientação contábil.
      </p>
    </div>
  );
}

function MetricMini({ icon, label, value, tone, highlight }: {
  icon: React.ReactNode; label: string; value: string; tone: 'primary' | 'destructive'; highlight?: boolean;
}) {
  const toneText = tone === 'destructive' ? 'text-destructive' : 'text-primary';
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      highlight ? 'bg-primary/5 border-primary/40' : 'bg-background border-border',
    )}>
      <div className={cn('flex items-center gap-2 mb-1', toneText)}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
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
      <div className="hidden sm:block">
        <div className="grid grid-cols-3 gap-4 pb-3 border-b border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-right text-muted-foreground">Sem PGBL</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-right text-primary">Com PGBL no teto</span>
        </div>
        {rows.map((row, i) => (
          <div key={i}>
            <div className="grid grid-cols-3 gap-4 py-3 border-b border-border items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{row.label}</span>
                {row.isExpandable && (
                  <button onClick={() => setOpenDed(!openDed)} className="text-primary hover:opacity-80 transition">
                    <ChevronDown className={cn('w-4 h-4 transition-transform', openDed && 'rotate-180')} />
                  </button>
                )}
              </div>
              <span className={cn('text-sm text-right tabular-nums', row.highlight ? 'font-bold text-destructive' : 'text-foreground')}>
                {row.pct ? fmtPct(row.valA) : fmtBRL(row.valA)}
              </span>
              <span className={cn('text-sm text-right tabular-nums', row.highlight ? 'font-bold text-primary' : 'text-foreground')}>
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

      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-xs font-medium mb-2 text-muted-foreground">{row.label}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Sem PGBL</p>
                <p className={cn('text-sm font-semibold', row.highlight ? 'text-destructive' : 'text-foreground')}>
                  {row.pct ? fmtPct(row.valA) : fmtBRL(row.valA)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-primary">Com PGBL</p>
                <p className={cn('text-sm font-semibold', row.highlight ? 'text-primary' : 'text-foreground')}>
                  {row.pct ? fmtPct(row.valB) : fmtBRL(row.valB)}
                </p>
              </div>
            </div>
            {row.isExpandable && (
              <button onClick={() => setOpenDed(!openDed)} className="mt-2 text-xs flex items-center gap-1 text-primary">
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
    <div className={cn('rounded-md p-3 my-2 bg-muted/40', compact ? '' : 'ml-4')}>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-3 gap-4 py-1.5 text-xs">
          <span className="text-muted-foreground">{l.label}</span>
          <span className="text-right tabular-nums text-foreground">{fmtBRL(l.va)}</span>
          <span className={cn('text-right tabular-nums font-semibold', l.accent ? 'text-primary' : 'text-foreground')}>
            {fmtBRL(l.vb)}
          </span>
        </div>
      ))}
      {a.educacaoExcedente > 0 && (
        <p className="text-[10px] mt-2 pt-2 border-t border-border text-warning">
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
    `<tr${hl ? ' style="background:#F1F5F9;font-weight:700"' : ''}>
       <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0">${label}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:right">${a}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:right;color:#1E293B;font-weight:600">${b}</td>
     </tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Simulação IR</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;color:#0F172A;max-width:820px;margin:24px auto;padding:0 24px;background:#F8FAFC}
      h1{margin:0 0 4px;font-size:20px;color:#1E293B}
      h2{font-size:13px;color:#64748B;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.05em}
      .hero{background:#1E293B;color:#fff;padding:24px;border-radius:12px;margin:16px 0}
      .hero .v{font-size:28px;font-weight:700;color:#fff}
      table{width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden}
      th{text-align:left;padding:8px 12px;background:#1E293B;color:#fff;font-size:11px;text-transform:uppercase}
    </style></head><body>
    <h1>Simulação de Imposto de Renda</h1>
    <p style="color:#64748B;font-size:12px">Gerado em ${new Date().toLocaleDateString('pt-BR')} · Tabela 2026</p>

    <div class="hero">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8">Aporte sugerido em PGBL</div>
      <div class="v">${fmtBRL(r.aporteSugerido)}</div>
      <div style="font-size:12px;color:#CBD5E1;margin-top:4px">Benefício fiscal estimado: <strong style="color:#fff">${fmtBRL(r.beneficioFiscal)}</strong></div>
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
      Simulação informativa baseada na Tabela Progressiva Anual 2026. Não substitui orientação contábil.
    </p>
    </body></html>`;
}
