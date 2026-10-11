import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Calculator, Download, Lightbulb, Loader2, Plus, Trash2, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine, LineChart, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Client } from '@/types/client';
import { calcularProjecao, rendaConsumindo, rendaPreservando, sensibilidade, gerarCenarios, type FluxoPlanejado, type ParametrosProjecao, type Recorrencia } from './projecao-calc';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const axis = (v: number) => (Math.abs(v) >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)} Mi` : Math.abs(v) >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)} K` : `R$ ${v}`);
const PIE = ['hsl(var(--primary))', 'hsl(var(--chart-2, 160 60% 40%))', 'hsl(var(--chart-3, 40 80% 50%))', 'hsl(var(--chart-4, 200 70% 50%))', 'hsl(var(--chart-5, 0 70% 55%))'];
const C_REF = 'hsl(var(--primary))', C_PRES = 'hsl(330 75% 55%)', C_CONS = 'hsl(38 92% 50%)';

function idadeDe(c: Client) {
  if (c.birthDate) {
    const b = new Date(c.birthDate), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  return Number(c.age) || 35;
}

const Section = ({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <Collapsible defaultOpen={open} className="crm-card rounded-xl border border-border bg-card">
    <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-3 text-left group">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent className="px-5 pb-5 space-y-4" data-pdf-section>{children}</CollapsibleContent>
  </Collapsible>
);

const KV = ({ rows }: { rows: [string, string][] }) => (
  <table className="w-full text-sm border border-border rounded-lg overflow-hidden"><tbody>
    {rows.map(([k, v]) => <tr key={k} className="border-t border-border first:border-t-0"><td className="px-3 py-2 text-muted-foreground">{k}</td><td className="px-3 py-2 text-right font-semibold text-foreground whitespace-nowrap">{v}</td></tr>)}
  </tbody></table>
);

const Insight = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"><Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div className="space-y-1">{children}</div></div>
);

interface Saved { params: ParametrosProjecao; aportes: FluxoPlanejado[]; objetivos: FluxoPlanejado[]; outros: { fgts: number; previdencia: number } }

export function ProjecaoPatrimonial({ client, clientName }: { client: Client; clientName?: string }) {
  const { user } = useAuth();
  const idadeAtual = idadeDe(client);
  const nome = clientName || client.name;
  const anyC = client as unknown as Record<string, any>;
  const defaults = (): Saved => {
    const params: ParametrosProjecao = { rentabilidadeAnual: 10, rentabilidadeAposentadoria: 8, inflacao: 5, idadeAposentadoria: Math.max(60, idadeAtual + 1), idadeLimite: 90, rendaMensalDesejada: Number(anyC.retirementGoal?.desiredIncome) || 0 };
    return {
      params,
      aportes: [{ id: crypto.randomUUID(), nome: 'Aporte Mensal', recorrencia: 'Mensal', idadeInicio: idadeAtual, idadeFim: params.idadeAposentadoria, taxaReajuste: params.inflacao, valor: client.monthlyContribution || 0 }],
      objetivos: [],
      outros: { fgts: 0, previdencia: 0 },
    };
  };
  const [s, setS] = useState<Saved>(defaults);
  const [raw, setRaw] = useState<Record<string, unknown>>({});
  const [calculado, setCalculado] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('client_patrimonial_simulations').select('data').eq('client_id', client.id).eq('user_id', user.id).maybeSingle().then(({ data }) => {
      const d = (data?.data || {}) as Record<string, any>;
      setRaw(d);
      if (d.projecao?.params) { setS({ ...defaults(), ...d.projecao }); setCalculado(true); }
      setLoaded(true);
    });
  }, [client.id, user?.id]);

  // Save debounced
  useEffect(() => {
    if (!loaded || !user) return;
    const t = setTimeout(async () => {
      const next = { ...raw, projecao: s };
      const { error } = await supabase.from('client_patrimonial_simulations').upsert({ client_id: client.id, user_id: user.id, data: JSON.parse(JSON.stringify(next)), updated_at: new Date().toISOString() }, { onConflict: 'client_id,user_id' });
      if (error) toast.error('Não foi possível salvar a projeção.');
    }, 800);
    return () => clearTimeout(t);
  }, [s, loaded]);

  const fontes = useMemo(() => [
    { nome: 'Patrimônio Financeiro', valor: client.patrimonioFinanceiroLiquido ?? client.financialAssets ?? 0 },
    { nome: 'Patrimônio Imobiliário', valor: client.materialAssets || 0 },
    { nome: 'Patrimônio Societário', valor: client.businessAssets || 0 },
    { nome: 'FGTS', valor: s.outros.fgts },
    { nome: 'Previdência Privada', valor: s.outros.previdencia },
  ].filter((f) => f.valor > 0), [client, s.outros]);
  const total = fontes.reduce((a, f) => a + f.valor, 0);
  // Base investível: patrimônio financeiro + FGTS + previdência (imóveis e empresa não geram fluxo de projeção)
  const inicial = (client.patrimonioFinanceiroLiquido ?? client.financialAssets ?? 0) + s.outros.fgts + s.outros.previdencia;
  const p = s.params;

  const r = useMemo(() => {
    const objetivos = p.rendaMensalDesejada > 0
      ? [...s.objetivos, { id: 'ret', nome: 'Aposentadoria', recorrencia: 'Mensal' as Recorrencia, idadeInicio: p.idadeAposentadoria, idadeFim: p.idadeLimite, taxaReajuste: p.inflacao, valor: p.rendaMensalDesejada * Math.pow(1 + p.inflacao / 100, p.idadeAposentadoria - idadeAtual) }]
      : s.objetivos;
    const proj = calcularProjecao(inicial, s.aportes, objetivos, p, idadeAtual);
    const pAp = proj.patrimonioNaAposentadoria;
    const rCons = rendaConsumindo(pAp, p.rentabilidadeAposentadoria, p.inflacao, p.idadeAposentadoria, p.idadeLimite);
    const rPres = rendaPreservando(pAp, p.rentabilidadeAposentadoria, p.inflacao);
    const rRef = p.rendaMensalDesejada * Math.pow(1 + p.inflacao / 100, p.idadeAposentadoria - idadeAtual);
    const base = proj.aporteMedioMensal;
    return {
      proj, pAp, rCons, rPres, rRef, base,
      cenarios: gerarCenarios(inicial, s.aportes, p, idadeAtual, rRef, rPres, rCons),
      sensCons: sensibilidade(inicial, s.aportes, p, idadeAtual, base, 'consumindo'),
      sensPres: sensibilidade(inicial, s.aportes, p, idadeAtual, base, 'preservando'),
    };
  }, [s, inicial, idadeAtual]);

  const setP = (k: keyof ParametrosProjecao, v: number) => setS((x) => ({ ...x, params: { ...x.params, [k]: v } }));
  const updFluxo = (list: 'aportes' | 'objetivos', id: string, k: keyof FluxoPlanejado, v: unknown) => setS((x) => ({ ...x, [list]: x[list].map((f) => (f.id === id ? { ...f, [k]: v } : f)) }));
  const addFluxo = (list: 'aportes' | 'objetivos') => setS((x) => ({ ...x, [list]: [...x[list], { id: crypto.randomUUID(), nome: list === 'aportes' ? 'Novo aporte' : 'Novo objetivo', recorrencia: 'Único', idadeInicio: idadeAtual + 5, idadeFim: idadeAtual + 6, taxaReajuste: p.inflacao, valor: 0 }] }));
  const delFluxo = (list: 'aportes' | 'objetivos', id: string) => setS((x) => ({ ...x, [list]: x[list].filter((f) => f.id !== id) }));

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const W = 190;
      pdf.setFontSize(9); pdf.text('Gofferjé Investimentos', 10, 10);
      pdf.setFontSize(16); pdf.text(`Planejamento Patrimonial — ${nome}`, 10, 18);
      pdf.setFontSize(9); pdf.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, 10, 24);
      let y = 30;
      const sections = Array.from(reportRef.current.querySelectorAll<HTMLElement>('[data-pdf-section]'));
      for (const el of sections) {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
        const h = (canvas.height * W) / canvas.width;
        if (y + h > 285) { pdf.addPage(); y = 10; }
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, y, W, Math.min(h, 275));
        y += Math.min(h, 275) + 4;
      }
      pdf.setFontSize(7);
      pdf.text('Projeção hipotética baseada nos parâmetros informados. Não constitui garantia de rentabilidade.', 10, 292);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdf.output('blob'));
      a.download = `planejamento_patrimonial_${nome.normalize('NFD').replace(/[^\w]/g, '_')}.pdf`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { toast.error('Erro ao gerar o PDF.'); }
    setExporting(false);
  };

  const FluxoTable = ({ list, label }: { list: 'aportes' | 'objetivos'; label: string }) => (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="crm-table-header"><tr>{[label, 'Recorrência', 'Idade início', 'Idade fim', 'Reajuste (% a.a.)', 'Valor (R$)', ''].map((h) => <th key={h} className="px-2 py-2 text-left text-xs font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {s[list].length === 0 && <tr><td colSpan={7} className="px-3 py-3 text-xs text-muted-foreground">Nenhum item.</td></tr>}
            {s[list].map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-2 py-1.5"><Input className="h-8" value={f.nome} onChange={(e) => updFluxo(list, f.id, 'nome', e.target.value)} /></td>
                <td className="px-2 py-1.5"><select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={f.recorrencia} onChange={(e) => updFluxo(list, f.id, 'recorrencia', e.target.value)}>{['Mensal', 'Anual', 'Único'].map((o) => <option key={o}>{o}</option>)}</select></td>
                <td className="px-2 py-1.5"><Input className="h-8 w-20" type="number" value={f.idadeInicio} onChange={(e) => updFluxo(list, f.id, 'idadeInicio', Number(e.target.value))} /></td>
                <td className="px-2 py-1.5"><Input className="h-8 w-20" type="number" disabled={f.recorrencia === 'Único'} value={f.idadeFim} onChange={(e) => updFluxo(list, f.id, 'idadeFim', Number(e.target.value))} /></td>
                <td className="px-2 py-1.5"><Input className="h-8 w-20" type="number" step="0.1" value={f.taxaReajuste} onChange={(e) => updFluxo(list, f.id, 'taxaReajuste', Number(e.target.value))} /></td>
                <td className="px-2 py-1.5"><CurrencyInput className="h-8 w-36" value={String(f.valor)} onChange={(v) => updFluxo(list, f.id, 'valor', parseFloat(v) || 0)} /></td>
                <td className="px-2 py-1.5"><button type="button" onClick={() => delFluxo(list, f.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => addFluxo(list)}><Plus className="w-3.5 h-3.5" />Adicionar {list === 'aportes' ? 'aporte' : 'objetivo'}</Button>
    </div>
  );
  const Sens = ({ rows, tone }: { rows: typeof r.sensCons; tone: string }) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm min-w-[560px]">
        <thead className="crm-table-header"><tr><th className="px-3 py-2 text-left text-xs font-medium">Aporte mensal médio</th>{rows[0]?.rendas.map((c) => <th key={c.idade} className="px-3 py-2 text-right text-xs font-medium">{c.idade} anos</th>)}</tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.percentual} className="border-t border-border">
            <td className="px-3 py-2 text-xs">{Math.round(row.percentual * 100)}% de aportes – {fmt(row.aporte)}</td>
            {row.rendas.map((c) => <td key={c.idade} className={`px-3 py-2 text-right text-xs ${row.percentual === 1 && c.idade === p.idadeAposentadoria ? `${tone} font-bold` : ''}`}>{c.renda == null ? '–' : fmt(c.renda)}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );

  if (!loaded) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  const paramFields: [keyof ParametrosProjecao, string, boolean?][] = [
    ['rentabilidadeAnual', 'Rentabilidade esperada (% a.a.)'], ['rentabilidadeAposentadoria', 'Rentabilidade na aposentadoria (% a.a.)'], ['inflacao', 'Inflação estimada (% a.a.)'],
    ['idadeAposentadoria', 'Idade de aposentadoria'], ['idadeLimite', 'Idade limite da projeção'], ['rendaMensalDesejada', 'Renda mensal desejada (R$ de hoje)', true],
  ];

  return (
    <div className="space-y-4" ref={reportRef}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Projeção Patrimonial</h2>
        <div className="flex gap-2">
          <Button type="button" size="sm" className="gap-1.5" onClick={() => { setCalculado(true); toast.success('Projeção calculada.'); }}><Calculator className="w-3.5 h-3.5" />Calcular Projeção</Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={!calculado || exporting} onClick={exportPdf}>{exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}Gerar PDF</Button>
        </div>
      </div>

      <Section title="1. Resumo do cliente e patrimônio">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div><span className="text-xs text-muted-foreground">Cliente</span><p className="font-semibold text-foreground">{nome}</p></div>
          <div><span className="text-xs text-muted-foreground">Perfil de Risco</span><p className="font-semibold text-foreground">{client.investorProfile || 'Não definido'}</p></div>
          <div><span className="text-xs text-muted-foreground">Idade Atual</span><p className="font-semibold text-foreground">{idadeAtual} anos</p></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">FGTS (R$)</Label><CurrencyInput value={String(s.outros.fgts)} onChange={(v) => setS((x) => ({ ...x, outros: { ...x.outros, fgts: parseFloat(v) || 0 } }))} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Previdência privada acumulada (R$)</Label><CurrencyInput value={String(s.outros.previdencia)} onChange={(v) => setS((x) => ({ ...x, outros: { ...x.outros, previdencia: parseFloat(v) || 0 } }))} /></div>
        </div>
        <p className="text-sm font-medium text-foreground">Patrimônio total inicial: {fmt(total)}</p>
        {fontes.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="h-56"><ResponsiveContainer><PieChart><Pie data={fontes} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={85}>{fontes.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Tooltip formatter={(v: number) => fmt(v)} /></PieChart></ResponsiveContainer></div>
            <table className="w-full text-sm"><thead><tr className="text-xs text-muted-foreground"><th className="text-left py-1">Fonte</th><th className="text-right">%</th><th className="text-right">Valor</th></tr></thead>
              <tbody>{fontes.map((f, i) => <tr key={f.nome} className="border-t border-border"><td className="py-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: PIE[i % PIE.length] }} />{f.nome}</td><td className="text-right">{((f.valor / total) * 100).toFixed(1)}%</td><td className="text-right">{fmt(f.valor)}</td></tr>)}</tbody></table>
          </div>
        ) : <p className="text-sm text-muted-foreground">Nenhum patrimônio registrado na ficha do cliente.</p>}
        <p className="text-xs text-muted-foreground">A projeção usa como capital inicial o patrimônio financeiro, o FGTS e a previdência ({fmt(inicial)}). Imóveis e empresas entram no total, mas não no fluxo da projeção.</p>
        <div><p className="text-sm font-medium text-foreground mb-2">Aportes planejados</p>{FluxoTable({ list: "aportes", label: "Nome do aporte" })}</div>
        <div><p className="text-sm font-medium text-foreground mb-2">Objetivos (retiradas planejadas)</p>{FluxoTable({ list: "objetivos", label: "Objetivo" })}<p className="text-xs text-muted-foreground mt-1">A renda de aposentadoria é definida nos parâmetros abaixo e não precisa ser listada aqui.</p></div>
      </Section>

      <Section title="2. Parâmetros da projeção">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {paramFields.map(([k, l, money]) => (
            <div key={k} className="space-y-1.5"><Label className="text-xs leading-tight">{l}</Label>
              {money ? <CurrencyInput value={String(p[k])} onChange={(v) => setP(k, parseFloat(v) || 0)} /> : <Input type="number" step="0.1" value={p[k]} onChange={(e) => setP(k, Number(e.target.value))} />}
            </div>
          ))}
        </div>
        {p.idadeAposentadoria <= idadeAtual && <p className="text-xs text-destructive">A idade de aposentadoria precisa ser maior que a idade atual.</p>}
      </Section>

      {calculado && (<>
        <Section title="3. Evolução patrimonial projetada">
          <Insight>
            <p className="font-medium text-foreground">{nome.split(' ')[0]}, veja os cenários projetados para a sua aposentadoria:</p>
            <p>• Patrimônio acumulado dos {idadeAtual} aos {p.idadeAposentadoria} anos: <strong>{fmt(r.pAp)}</strong></p>
            <p>• Para preservar o patrimônio dos {p.idadeAposentadoria} aos {p.idadeLimite}, a renda mensal ideal é de <strong>{fmt(r.rPres)}</strong></p>
            <p>• Para consumir todo o patrimônio, a renda mensal ideal é de <strong>{fmt(r.rCons)}</strong></p>
          </Insight>
          <p className="text-sm font-medium text-foreground">Fluxo de caixa anual</p>
          <div className="h-80"><ResponsiveContainer><BarChart data={r.proj.evolucao.slice(1)} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="idade" tickFormatter={(v) => String(Math.round(v))} fontSize={11} />
            <YAxis tickFormatter={axis} fontSize={11} width={80} />
            <Tooltip formatter={(v: number) => fmt(Math.abs(v))} labelFormatter={(l) => `${Math.round(Number(l))} anos`} />
            <Legend />
            <Bar dataKey="aportes" name="Aportes" fill={C_REF} stackId="s" />
            <Bar dataKey="retiradas" name="Retiradas" fill="hsl(25 95% 53%)" stackId="s" />
            <ReferenceLine x={p.idadeAposentadoria} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Aposentadoria', position: 'top', fontSize: 11 }} />
          </BarChart></ResponsiveContainer></div>
          <p className="text-sm font-medium text-foreground">Cenários de evolução patrimonial</p>
          <div className="h-96"><ResponsiveContainer><LineChart data={r.cenarios}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="ano" fontSize={11} />
            <YAxis tickFormatter={axis} fontSize={11} width={80} />
            <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l, pl) => `${l} (${pl?.[0]?.payload?.idade ?? ''} anos)`} />
            <Legend />
            <Line type="monotone" dataKey="referencia" name="Cenário referência" stroke={C_REF} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="preservando" name="Preservando patrimônio" stroke={C_PRES} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="consumindo" name="Consumindo todo o patrimônio" stroke={C_CONS} strokeWidth={2} dot={false} />
            <ReferenceLine x={new Date().getFullYear() + (p.idadeAposentadoria - idadeAtual)} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: 'Aposentadoria', position: 'top', fontSize: 11 }} />
          </LineChart></ResponsiveContainer></div>
          <KV rows={[
            ['Rentabilidade esperada (acumulação)', `${p.rentabilidadeAnual}% a.a.`],
            ['Rentabilidade na aposentadoria (retirada)', `${p.rentabilidadeAposentadoria}% a.a.`],
            ['Inflação estimada', `${p.inflacao}% a.a.`],
          ]} />
          <p className="text-xs text-muted-foreground">Valores nominais. As rendas de aposentadoria são reajustadas pela inflação a cada mês.</p>
        </Section>

        <Section title="4. Aposentadoria — 3 cenários">
          <KV rows={[['Idade inicial da retirada', `${p.idadeAposentadoria} anos`], ['Idade limite da projeção', `${p.idadeLimite} anos`], ['Renda mensal esperada (valores de hoje)', fmt(p.rendaMensalDesejada)]]} />

          <div className="border-l-4 pl-4 space-y-3" style={{ borderColor: C_REF }}>
            <h4 className="font-semibold text-foreground">Cenário referência</h4>
            <p className="text-sm text-muted-foreground">Patrimônio atingido considerando os aportes e objetivos definidos.</p>
            <Insight><p>Considerando o capital inicial e os aportes planejados, o patrimônio será de <strong>{fmt(r.pAp)}</strong> aos {p.idadeAposentadoria} anos. {p.rendaMensalDesejada > 0 ? (r.proj.patrimonioFinal > 0 ? <>Esse valor permite retiradas mensais de <strong>{fmt(r.rRef)}</strong> até os {p.idadeLimite} anos.</> : <>A renda desejada de <strong>{fmt(r.rRef)}</strong> esgota o patrimônio antes dos {p.idadeLimite} anos.</>) : 'Informe a renda mensal desejada para avaliar o cenário.'}</p></Insight>
            <KV rows={[[`Patrimônio aos ${p.idadeAposentadoria} anos com aportes e retiradas planejadas`, fmt(r.pAp)], [`Patrimônio restante aos ${p.idadeLimite} anos`, fmt(r.proj.patrimonioFinal)], ['Valor médio de aportes por mês', fmt(r.base)]]} />
          </div>

          <div className="border-l-4 pl-4 space-y-3" style={{ borderColor: C_CONS }}>
            <h4 className="font-semibold text-foreground">Consumindo todo o patrimônio</h4>
            <Insight><p>Para consumir todo o patrimônio até os {p.idadeLimite} anos, com aportes mensais médios de {fmt(r.base)}, a retirada mensal de <strong>{fmt(r.rCons)}</strong> entre os {p.idadeAposentadoria} e {p.idadeLimite} anos garante o uso completo dos recursos.</p></Insight>
            <KV rows={[[`Patrimônio aos ${p.idadeAposentadoria} anos`, fmt(r.pAp)], ['Para consumir todo, a renda mensal ideal é de', fmt(r.rCons)]]} />
            <p className="text-sm font-medium text-foreground">Análise de sensibilidade — consumindo</p>
            {Sens({ rows: r.sensCons, tone: "bg-warning/20" })}
          </div>

          <div className="border-l-4 pl-4 space-y-3" style={{ borderColor: C_PRES }}>
            <h4 className="font-semibold text-foreground">Preservando o patrimônio</h4>
            <Insight><p>Para preservar o patrimônio até os {p.idadeLimite} anos, com aportes mensais médios de {fmt(r.base)}, a retirada mensal ideal é de <strong>{fmt(r.rPres)}</strong>, entre os {p.idadeAposentadoria} e {p.idadeLimite} anos.</p></Insight>
            <KV rows={[[`Patrimônio aos ${p.idadeAposentadoria} anos`, fmt(r.pAp)], ['Para preservar o patrimônio, a renda mensal ideal é de', fmt(r.rPres)]]} />
            <p className="text-sm font-medium text-foreground">Análise de sensibilidade — preservando</p>
            {Sens({ rows: r.sensPres, tone: "bg-destructive/10" })}
          </div>
        </Section>
      </>)}
    </div>
  );
}
