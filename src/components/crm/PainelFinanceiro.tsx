import { useState, useMemo } from 'react';
import { Copy, Check, AlertTriangle, FileText, Pencil, Lock, TrendingUp, DollarSign, Wallet, ShieldAlert, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { ConhecerClienteData } from './conhecer/types';

export interface PainelFinanceiroOverrides {
  financialAssets: string;
  materialAssets: string;
  businessAssets: string;
  emergencyReserve: string;
  monthlyRevenue: string;
  monthlyContribution: string;
  monthlyLivingCost: string;
  passiveIncome: string;
}

interface Props {
  conhecerData: ConhecerClienteData;
  overrides: PainelFinanceiroOverrides;
  onOverrideChange: (field: keyof PainelFinanceiroOverrides, value: string) => void;
  consultantNote: string;
  onConsultantNoteChange: (value: string) => void;
  clientName: string;
  age: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent-foreground))', '#f59e0b'];
const BAR_COLORS = ['hsl(var(--primary))', '#ef4444', '#22c55e'];

function KpiCard({ icon: Icon, label, value, color, subtext, sourceLabel }: { icon: React.ElementType; label: string; value: string; color?: string; subtext?: string; sourceLabel?: string }) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border shadow-sm space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color || 'text-foreground'}`}>{value}</p>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      {sourceLabel && <p className="text-[10px] text-muted-foreground/60 italic">{sourceLabel}</p>}
    </div>
  );
}

export function PainelFinanceiro({
  conhecerData,
  overrides,
  onOverrideChange,
  consultantNote,
  onConsultantNoteChange,
  clientName,
  age,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);

  // === DATA RESOLUTION: Manual override > ConhecerCliente sync > fallback ===
  const resolveWithSource = (conhecerVal: string | undefined, overrideVal: string): { value: number; source: 'conhecer' | 'manual' | 'none' } => {
    const raw = overrideVal == null ? '' : String(overrideVal).trim();
    const c = parseFloat(conhecerVal || '') || 0;
    // Typed override wins, including an intentional zero; '' or bare '0' = not set
    if (raw !== '' && raw !== '0') return { value: parseFloat(raw) || 0, source: 'manual' };
    if (c > 0) return { value: c, source: 'conhecer' };
    return { value: 0, source: 'none' };
  };

  // Use patrimonioFinanceiro (new) or investedAmount (legacy) from conhecer
  const conhecerFinanceiro = conhecerData.patrimonioFinanceiro || conhecerData.investedAmount || '';
  const financialAssetsRes = resolveWithSource(conhecerFinanceiro, overrides.financialAssets);
  const financialAssets = financialAssetsRes.value;

  const materialAssetsRes = resolveWithSource(conhecerData.patrimonioImobiliario, overrides.materialAssets);
  const materialAssets = materialAssetsRes.value;

  const businessAssetsRes = resolveWithSource(conhecerData.participacoesSocietarias || conhecerData.businessValue, overrides.businessAssets);
  const businessValue = businessAssetsRes.value;

  // Use auto-calculated totalPatrimony from conhecer or sum of overrides
  const totalPatrimony = parseFloat(conhecerData.totalPatrimony || '') || 0;
  const effectivePatrimony = totalPatrimony > 0 ? totalPatrimony : (financialAssets + materialAssets + businessValue);

  // Revenue from conhecer
  const mainRevenue = parseFloat(conhecerData.monthlyRevenue) || 0;
  const otherIncomesTotal = conhecerData.otherIncomes.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
  const totalRevenue = (mainRevenue + otherIncomesTotal) || resolveWithSource(undefined, overrides.monthlyRevenue).value;
  
  const monthlyContributionRes = resolveWithSource(conhecerData.monthlyInvestment, overrides.monthlyContribution);
  const monthlyContribution = monthlyContributionRes.value;

  // === MELHORIA 5: Custo Mensal = Receita - Aporte (auto-calculated) ===
  const autoLivingCost = totalRevenue > 0 && monthlyContribution > 0 ? totalRevenue - monthlyContribution : 0;
  const overrideLivingCost = parseFloat(overrides.monthlyLivingCost) || 0;
  const conhecerLivingCost = parseFloat(conhecerData.livingCost) || 0;
  
  // Priority: manual override > conhecer > auto-calculated
  const livingCost = overrideLivingCost > 0 ? overrideLivingCost : conhecerLivingCost > 0 ? conhecerLivingCost : autoLivingCost;
  const livingCostSource = overrideLivingCost > 0 ? 'manual' : conhecerLivingCost > 0 ? 'conhecer' : autoLivingCost > 0 ? 'calculado' : 'none';

  const surplus = totalRevenue - livingCost;

  // Liquidity from conhecer emergencyMonths
  const emergencyMonths = parseFloat(conhecerData.emergencyMonths) || 0;
  const emergencyReserveRes = resolveWithSource(conhecerData.emergencyReserveAmount, overrides.emergencyReserve);
  const emergencyReserve = emergencyReserveRes.value;
  const effectiveLiquidityMonths = emergencyMonths > 0 ? emergencyMonths : (livingCost > 0 ? emergencyReserve / livingCost : 0);

  // Savings rate
  const savingsRate = totalRevenue > 0 ? (monthlyContribution / totalRevenue) * 100 : null;

  // Active dependency (business value / total patrimony)
  const activeDependencyPct = effectivePatrimony > 0 && businessValue > 0 ? (businessValue / effectivePatrimony) * 100 : null;

  // Patrimony distribution
  const pctFin = effectivePatrimony > 0 ? (financialAssets / effectivePatrimony * 100) : 0;
  const pctMat = effectivePatrimony > 0 ? (materialAssets / effectivePatrimony * 100) : 0;
  const pctBiz = effectivePatrimony > 0 ? (businessValue / effectivePatrimony * 100) : 0;

  // Colors
  const liquidityColor = effectiveLiquidityMonths < 3 ? 'text-destructive' : effectiveLiquidityMonths <= 6 ? 'text-yellow-500' : 'text-green-500';
  const savingsColor = savingsRate !== null ? (savingsRate < 10 ? 'text-destructive' : savingsRate <= 25 ? 'text-yellow-500' : 'text-green-500') : 'text-muted-foreground';

  // Pie chart data
  const pieData = useMemo(() => {
    const items = [
      { name: 'Financeiro', value: financialAssets },
      { name: 'Imobiliário', value: materialAssets },
      { name: 'Societário', value: businessValue },
    ].filter(i => i.value > 0);
    return items;
  }, [financialAssets, materialAssets, businessValue]);

  // Bar chart data
  const barData = useMemo(() => [
    { name: 'Receita', value: totalRevenue, fill: BAR_COLORS[0] },
    { name: 'Custo', value: livingCost, fill: BAR_COLORS[1] },
    { name: 'Aporte', value: monthlyContribution, fill: BAR_COLORS[2] },
  ], [totalRevenue, livingCost, monthlyContribution]);

  // === ALERTS ===
  const alerts = useMemo(() => {
    const a: string[] = [];
    if (!livingCost) a.push('Sem custo mensal preenchido — não é possível calcular liquidez.');
    if (!totalRevenue) a.push('Sem renda mensal preenchida.');
    if (effectiveLiquidityMonths > 0 && effectiveLiquidityMonths < 6) a.push(`Reserva abaixo de 6 meses (${effectiveLiquidityMonths.toFixed(1)} meses).`);
    if (effectiveLiquidityMonths === 0 && livingCost > 0) a.push('Sem reserva de emergência identificada.');
    if (savingsRate !== null && savingsRate < 10) a.push(`Taxa de poupança baixa (${savingsRate.toFixed(1)}%).`);
    if (effectivePatrimony > 0 && pctBiz > 50) a.push('Patrimônio muito concentrado em empresa.');
    if (effectivePatrimony > 0 && pctFin < 10 && financialAssets > 0) a.push('Patrimônio financeiro abaixo de 10% do total.');
    if (activeDependencyPct !== null && activeDependencyPct > 70) a.push(`Alta dependência ativa (${activeDependencyPct.toFixed(0)}%).`);
    return a;
  }, [livingCost, totalRevenue, effectiveLiquidityMonths, savingsRate, effectivePatrimony, pctBiz, pctFin, financialAssets, activeDependencyPct]);

  // === NEXT STEPS ===
  const nextSteps = useMemo(() => {
    const s: string[] = [];
    if (effectiveLiquidityMonths < 6) s.push('Estruturar ou reforçar reserva de emergência.');
    if (savingsRate !== null && savingsRate < 10) s.push('Revisar fluxo de caixa para aumentar capacidade de aporte.');
    if (effectivePatrimony > 0 && pctBiz > 50) s.push('Avaliar estratégia de diversificação patrimonial.');
    if (conhecerData.successionThought !== 'Sim') s.push('Iniciar planejamento sucessório.');
    if (s.length === 0) s.push('Prosseguir com a construção da arquitetura estratégica da carteira.');
    return s;
  }, [effectiveLiquidityMonths, savingsRate, effectivePatrimony, pctBiz, conhecerData.successionThought]);

  const handleCopyAll = () => {
    const text = `📊 RESUMO FINANCEIRO — ${clientName}\n\nPatrimônio Total: ${fmt(effectivePatrimony)}\nReceita Total: ${fmt(totalRevenue)}\nCusto de Vida: ${fmt(livingCost)}\nSobra Mensal: ${fmt(surplus)}\nAporte: ${fmt(monthlyContribution)}\nLiquidez: ${effectiveLiquidityMonths.toFixed(1)} meses\n${savingsRate !== null ? `Taxa de Poupança: ${savingsRate.toFixed(1)}%` : ''}\n\n⚠️ ALERTAS\n${alerts.length > 0 ? alerts.map(a => `⚠️ ${a}`).join('\n') : 'Nenhum.'}\n\n➡️ PRÓXIMOS PASSOS\n${nextSteps.map(s => `→ ${s}`).join('\n')}${consultantNote ? `\n\n📝 NOTA\n${consultantNote}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lastUpdate = new Date().toLocaleDateString('pt-BR');

  // Source label helper
  const getSourceLabel = (source: string) => {
    if (source === 'conhecer') return 'via Conhecer o Cliente';
    if (source === 'manual') return 'Editado manualmente';
    if (source === 'calculado') return 'Calculado: Receita − Aporte';
    return undefined;
  };

  return (
    <div className="space-y-5">
      {/* Source indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border">
        <span>📥 Dados importados de <strong>Conhecer o Cliente</strong> — última atualização: {lastUpdate}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditMode(!editMode)} className="text-xs gap-1.5 h-7">
          {editMode ? <><Lock className="w-3 h-3" /> Bloquear</> : <><Pencil className="w-3 h-3" /> Editar manualmente</>}
        </Button>
      </div>

      {/* === LINHA 1 — 4 Cards principais === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} label="Patrimônio Total" value={effectivePatrimony > 0 ? fmt(effectivePatrimony) : 'Sem dados'} sourceLabel={financialAssetsRes.source === 'conhecer' ? 'via Conhecer o Cliente' : financialAssetsRes.source === 'manual' ? 'Editado manualmente' : undefined} />
        <KpiCard icon={TrendingUp} label="Taxa de Poupança" value={savingsRate !== null ? `${savingsRate.toFixed(1)}%` : 'Sem dados'} color={savingsColor} />
        <KpiCard
          icon={ShieldAlert}
          label="Liquidez"
          value={effectiveLiquidityMonths > 0 ? `${effectiveLiquidityMonths.toFixed(1)} meses` : 'Sem dados'}
          color={effectiveLiquidityMonths > 0 ? liquidityColor : undefined}
          subtext={effectiveLiquidityMonths > 0 ? (effectiveLiquidityMonths < 3 ? '⚠️ Crítico' : effectiveLiquidityMonths <= 6 ? 'Regular' : '✅ Adequado') : undefined}
          sourceLabel={emergencyReserveRes.source === 'conhecer' ? 'via Conhecer o Cliente' : emergencyReserveRes.source === 'manual' ? 'Editado manualmente' : undefined}
        />
        <KpiCard
          icon={Activity}
          label="Dependência Ativa"
          value={activeDependencyPct !== null ? `${activeDependencyPct.toFixed(0)}%` : 'Sem dados'}
          color={activeDependencyPct !== null && activeDependencyPct > 70 ? 'text-destructive' : undefined}
        />
      </div>

      {/* === LINHA 2 — 3 Cards secundários === */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={Wallet} label="Receita Total Mensal" value={totalRevenue > 0 ? fmt(totalRevenue) : 'Sem dados'} />
        <KpiCard
          icon={Wallet}
          label="Custo de Vida Mensal"
          value={livingCost > 0 ? fmt(livingCost) : 'Sem dados'}
          sourceLabel={getSourceLabel(livingCostSource)}
        />
        <KpiCard
          icon={Wallet}
          label="Sobra + Aporte"
          value={surplus !== 0 ? `${fmt(surplus)} | ${fmt(monthlyContribution)}` : 'Sem dados'}
          color={surplus < 0 ? 'text-destructive' : undefined}
        />
      </div>

      {/* === LINHA 3 — 2 Gráficos lado a lado === */}
      {(pieData.length > 0 || totalRevenue > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pieData.length > 0 && (
            <div className="p-4 bg-card rounded-xl border border-border">
              <h4 className="text-sm font-medium mb-3">Distribuição do Patrimônio</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {totalRevenue > 0 && (
            <div className="p-4 bg-card rounded-xl border border-border">
              <h4 className="text-sm font-medium mb-3">Receita vs Custo vs Aporte</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* === LINHA 4 — Alertas automáticos === */}
      {alerts.length > 0 && (
        <div className="p-4 bg-card rounded-xl border border-border space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Pontos de Atenção ({alerts.length})
          </h4>
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-md">⚠️ {a}</p>
            ))}
          </div>
          <div className="pt-2 border-t border-border space-y-1">
            <p className="text-xs font-medium text-muted-foreground">➡️ Próximos passos sugeridos</p>
            {nextSteps.map((s, i) => (
              <p key={i} className="text-xs text-foreground">→ {s}</p>
            ))}
          </div>
        </div>
      )}

      {/* === LINHA 5 — Nota do consultor === */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Nota do Consultor</Label>
        <Textarea
          value={consultantNote}
          onChange={(e) => onConsultantNoteChange(e.target.value)}
          placeholder="Adicione observações, contexto adicional ou ajustes..."
          className="crm-input min-h-[80px] text-sm"
        />
      </div>

      {/* === Override manual === */}
      {editMode && (
        <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-3">
          <p className="text-xs text-muted-foreground">Edição manual — sobrescreve dados de "Conhecer o Cliente" apenas neste painel.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1"><Label className="text-xs">Patrimônio Financeiro</Label><CurrencyInput value={overrides.financialAssets} onChange={(v) => onOverrideChange('financialAssets', v)} /></div>
            <div className="space-y-1"><Label className="text-xs">Patrimônio Imobiliário</Label><CurrencyInput value={overrides.materialAssets} onChange={(v) => onOverrideChange('materialAssets', v)} /></div>
            <div className="space-y-1"><Label className="text-xs">Patrimônio Societário</Label><CurrencyInput value={overrides.businessAssets} onChange={(v) => onOverrideChange('businessAssets', v)} /></div>
            <div className="space-y-1"><Label className="text-xs">Reserva de Emergência</Label><CurrencyInput value={overrides.emergencyReserve} onChange={(v) => onOverrideChange('emergencyReserve', v)} /></div>
            <div className="space-y-1"><Label className="text-xs">Receita Mensal</Label><CurrencyInput value={overrides.monthlyRevenue} onChange={(v) => onOverrideChange('monthlyRevenue', v)} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Custo Mensal</Label>
              <CurrencyInput value={overrides.monthlyLivingCost} onChange={(v) => onOverrideChange('monthlyLivingCost', v)} />
              {!overrideLivingCost && autoLivingCost > 0 && (
                <p className="text-[10px] text-muted-foreground/60 italic">Auto: Receita − Aporte = {fmt(autoLivingCost)}</p>
              )}
            </div>
            <div className="space-y-1"><Label className="text-xs">Aporte Mensal</Label><CurrencyInput value={overrides.monthlyContribution} onChange={(v) => onOverrideChange('monthlyContribution', v)} /></div>
            <div className="space-y-1"><Label className="text-xs">Renda Passiva</Label><CurrencyInput value={overrides.passiveIncome} onChange={(v) => onOverrideChange('passiveIncome', v)} /></div>
          </div>
        </div>
      )}

      {/* Copy button */}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={handleCopyAll} className="gap-2 text-xs">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado!' : 'Copiar resumo'}
        </Button>
      </div>
    </div>
  );
}
