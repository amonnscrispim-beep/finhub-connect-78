import { useState } from 'react';
import { Sparkles, CheckCircle2, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ConhecerClienteData } from './conhecer/types';

interface Extraction {
  informacoes_pessoais?: any;
  perfil?: any;
  situacao_financeira?: any;
  ativos?: any[];
  dividas?: any[];
  seguros?: any;
  objetivos?: any[];
  riscos_identificados?: string[];
  resumo_executivo?: string;
  principais_dores?: string[];
  principais_oportunidades?: string[];
  proximos_passos?: string[];
}

interface Props {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  conhecerData: ConhecerClienteData;
  setConhecerData: (data: ConhecerClienteData) => void;
}

const genId = () => Math.random().toString(36).slice(2, 10);

export function DiagnosticoInteligente({ formData, setFormData, conhecerData, setConhecerData }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extraction, setExtraction] = useState<Extraction | null>(null);

  const handleAnalyze = async () => {
    if (text.trim().length < 20) {
      toast({ title: 'Texto muito curto', description: 'Cole pelo menos um parágrafo.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-client-text', { body: { text } });
      if (error) throw error;
      if (!data?.extraction) throw new Error('Sem extração retornada');
      setExtraction(data.extraction);
      toast({ title: 'Análise concluída', description: 'Revise os dados e clique em "Preencher CRM".' });
    } catch (err: any) {
      toast({ title: 'Erro ao analisar', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFillCrm = () => {
    if (!extraction) return;
    const p = extraction.informacoes_pessoais || {};
    const fin = extraction.situacao_financeira || {};
    const perfil = extraction.perfil || {};

    // 1) formData (campos principais do cliente)
    setFormData((prev: any) => ({
      ...prev,
      name: p.nome && p.nome !== 'Não informado' ? p.nome : prev.name,
      age: typeof p.idade === 'number' ? p.idade : prev.age,
      profession: p.profissao && p.profissao !== 'Não informado' ? p.profissao : prev.profession,
      city: p.cidade && p.cidade !== 'Não informado' ? p.cidade : prev.city,
      state: p.estado && p.estado !== 'Não informado' ? p.estado : prev.state,
      country: p.pais && p.pais !== 'Não informado' ? p.pais : prev.country,
      married: p.estado_civil?.toLowerCase().includes('casad') ? true : prev.married,
      hasChildren: Array.isArray(p.filhos) && p.filhos.length > 0 ? true : prev.hasChildren,
      children: Array.isArray(p.filhos) && p.filhos.length > 0
        ? p.filhos.map((f: any) => ({ id: genId(), name: f.nome || '', age: f.idade ?? null }))
        : prev.children,
      monthlyRevenue: typeof fin.renda_mensal === 'number' ? fin.renda_mensal : prev.monthlyRevenue,
      monthlyContribution: typeof fin.aporte_mensal === 'number' ? fin.aporte_mensal : prev.monthlyContribution,
      financialAssets: typeof fin.patrimonio_financeiro === 'number' ? fin.patrimonio_financeiro : prev.financialAssets,
      materialAssets: typeof fin.patrimonio_imobiliario === 'number' ? fin.patrimonio_imobiliario : prev.materialAssets,
      businessAssets: typeof fin.patrimonio_societario === 'number' ? fin.patrimonio_societario : prev.businessAssets,
      emergencyReserve: typeof fin.reserva_emergencia_valor === 'number' ? fin.reserva_emergencia_valor : prev.emergencyReserve,
      monthlyLivingCost: typeof fin.custo_vida_mensal === 'number' ? fin.custo_vida_mensal : prev.monthlyLivingCost,
      objective: extraction.resumo_executivo || prev.objective,
      observations: [
        prev.observations || '',
        extraction.resumo_executivo ? `📋 Resumo: ${extraction.resumo_executivo}` : '',
        extraction.principais_dores?.length ? `⚠️ Dores: ${extraction.principais_dores.join('; ')}` : '',
        extraction.principais_oportunidades?.length ? `💡 Oportunidades: ${extraction.principais_oportunidades.join('; ')}` : '',
        extraction.proximos_passos?.length ? `➡️ Próximos passos: ${extraction.proximos_passos.join('; ')}` : '',
        extraction.riscos_identificados?.length ? `🛑 Riscos: ${extraction.riscos_identificados.join('; ')}` : '',
      ].filter(Boolean).join('\n\n'),
    }));

    // 2) conhecerData
    const next: ConhecerClienteData = { ...conhecerData };
    if (p.nome && p.nome !== 'Não informado') next.fullName = p.nome;
    if (typeof p.idade === 'number') next.manualAge = String(p.idade);
    if (p.profissao && p.profissao !== 'Não informado') next.profession = p.profissao;
    if (p.estado_civil) next.isMarried = p.estado_civil.toLowerCase().includes('casad') ? 'Sim' : 'Não';
    if (p.regime_bens) next.marriageRegime = p.regime_bens;
    if (p.conjuge) next.spouseName = p.conjuge;
    if (Array.isArray(p.filhos) && p.filhos.length) {
      next.hasChildren = 'Sim';
      next.numChildren = String(p.filhos.length);
      next.children = p.filhos.map((f: any) => ({ id: genId(), name: f.nome || '', age: f.idade != null ? String(f.idade) : '' }));
    }
    if (perfil.hobbies) next.hobbies = perfil.hobbies;
    if (perfil.relacao_com_dinheiro) next.moneyRelationship = perfil.relacao_com_dinheiro;
    if (perfil.decisores_financeiros) next.financialDecisionMakers = perfil.decisores_financeiros;
    if (perfil.como_conheceu) next.howFoundUs = perfil.como_conheceu;

    if (typeof fin.custo_vida_mensal === 'number') next.monthlyCostOfLiving = String(fin.custo_vida_mensal);
    if (typeof fin.aporte_mensal === 'number') next.monthlyInvestmentB2 = String(fin.aporte_mensal);
    if (typeof fin.renda_mensal === 'number') next.monthlyRevenue = String(fin.renda_mensal);
    if (typeof fin.patrimonio_financeiro === 'number') next.patrimonioFinanceiro = String(fin.patrimonio_financeiro);
    if (typeof fin.patrimonio_imobiliario === 'number') next.patrimonioImobiliario = String(fin.patrimonio_imobiliario);
    if (typeof fin.patrimonio_societario === 'number') next.participacoesSocietarias = String(fin.patrimonio_societario);
    if (typeof fin.reserva_emergencia_valor === 'number') {
      next.hasEmergencyReserveB3 = 'Sim';
      next.emergencyReserveValueB3 = String(fin.reserva_emergencia_valor);
      next.emergencyReserveAmount = String(fin.reserva_emergencia_valor);
    }
    if (fin.reserva_emergencia_local) next.emergencyReserveLocationB3 = fin.reserva_emergencia_local;
    if (fin.instituicoes_financeiras) next.investmentInstitutions = fin.instituicoes_financeiras;

    // Ativos -> patrimonioTableItems
    if (Array.isArray(extraction.ativos) && extraction.ativos.length) {
      next.patrimonioTableItems = [
        ...(next.patrimonioTableItems || []),
        ...extraction.ativos.map((a: any) => ({
          id: genId(),
          description: a.descricao || '',
          category: a.categoria || 'Outros Bens',
          value: a.valor != null ? String(a.valor) : '',
          liquidezImediata: (a.liquidez || '').toLowerCase().includes('alt') ? 'Sim' : 'Não',
        })),
      ];
    }

    // Dívidas -> debtsListB3
    if (Array.isArray(extraction.dividas) && extraction.dividas.length) {
      next.hasDebtsB3 = 'Sim';
      next.debtsListB3 = [
        ...(next.debtsListB3 || []),
        ...extraction.dividas.map((d: any) => ({
          id: genId(),
          description: [d.tipo, d.descricao].filter(Boolean).join(' — '),
          balance: d.saldo_devedor != null ? String(d.saldo_devedor) : '',
          remainingInstallments: d.prazo_restante || '',
        })),
      ];
    }

    // Seguros
    const seg = extraction.seguros || {};
    if (seg.seguro_vida) {
      next.hasLifeInsurance = /sim|tem|poss/i.test(seg.seguro_vida) ? 'Sim' : 'Não';
      next.lifeInsuranceAdequate = seg.seguro_vida;
    }
    if (seg.seguro_patrimonial) {
      next.hasPropertyInsurance = /sim|tem|poss/i.test(seg.seguro_patrimonial) ? 'Sim' : 'Não';
      next.propertyInsuranceDetails = seg.seguro_patrimonial;
    }

    // Objetivos -> financialGoals em texto + retirement
    if (Array.isArray(extraction.objetivos) && extraction.objetivos.length) {
      next.financialGoals = extraction.objetivos
        .map((o: any) => `• ${o.objetivo}${o.prazo ? ` (prazo: ${o.prazo})` : ''}${o.valor_necessario ? ` — R$ ${o.valor_necessario}` : ''}${o.prioridade ? ` [${o.prioridade}]` : ''}`)
        .join('\n');
      const apos = extraction.objetivos.find((o: any) => /aposent|independ/i.test(o.objetivo || ''));
      if (apos) {
        next.wantsRetirement = 'Sim';
        if (apos.prazo) next.successTimeline = apos.prazo;
      }
      const exterior = extraction.objetivos.find((o: any) => /morar fora|exterior/i.test(o.objetivo || ''));
      if (exterior) {
        next.wantsToLiveAbroad = 'Sim';
        if (exterior.prazo) next.abroadTimeline = exterior.prazo;
      }
    }

    if (extraction.riscos_identificados?.length) {
      next.identifiedRisks = extraction.riscos_identificados.join('; ');
    }

    setConhecerData(next);
    toast({ title: 'CRM preenchido', description: 'Revise os módulos e clique em Salvar para persistir.' });
  };

  const found = extraction ? checklist(extraction) : [];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Diagnóstico Inteligente</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Cole transcrição de reunião, anotações, WhatsApp ou resumo. A IA estrutura tudo e preenche os módulos do CRM automaticamente. Nada é salvo até você clicar em <strong>Salvar Alterações</strong>.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole aqui a transcrição da reunião, áudio transcrito, anotações ou qualquer texto do cliente…"
          className="min-h-[260px] font-mono text-sm"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          <Button onClick={handleAnalyze} disabled={loading} className="crm-button-primary">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Analisar Cliente
          </Button>
          <Button onClick={handleFillCrm} disabled={!extraction} variant="outline">
            <Wand2 className="h-4 w-4 mr-2" />
            Preencher CRM
          </Button>
          {extraction && (
            <Button variant="ghost" onClick={() => { setExtraction(null); setText(''); }}>
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {extraction && (
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold text-sm">Revisão da Extração</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {found.map(([label, ok]) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className={`h-4 w-4 ${ok ? 'text-emerald-600' : 'text-muted-foreground/40'}`} />
                <span className={ok ? '' : 'text-muted-foreground'}>{label}</span>
              </div>
            ))}
          </div>

          {extraction.resumo_executivo && (
            <Section title="Resumo Executivo">
              <p className="text-sm whitespace-pre-wrap">{extraction.resumo_executivo}</p>
            </Section>
          )}
          {!!extraction.principais_dores?.length && (
            <Section title="Principais Dores"><Chips items={extraction.principais_dores} variant="destructive" /></Section>
          )}
          {!!extraction.principais_oportunidades?.length && (
            <Section title="Oportunidades"><Chips items={extraction.principais_oportunidades} variant="default" /></Section>
          )}
          {!!extraction.riscos_identificados?.length && (
            <Section title="Riscos Identificados"><Chips items={extraction.riscos_identificados} variant="secondary" /></Section>
          )}
          {!!extraction.proximos_passos?.length && (
            <Section title="Próximos Passos">
              <ol className="list-decimal list-inside text-sm space-y-1">
                {extraction.proximos_passos.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </Section>
          )}
          {!!extraction.objetivos?.length && (
            <Section title="Objetivos">
              <ul className="text-sm space-y-1">
                {extraction.objetivos.map((o, i) => (
                  <li key={i}>• <strong>{o.objetivo}</strong> {o.prazo && `— ${o.prazo}`} {o.valor_necessario && `— R$ ${o.valor_necessario}`} {o.prioridade && <Badge variant="outline" className="ml-1">{o.prioridade}</Badge>}</li>
                ))}
              </ul>
            </Section>
          )}
          {!!extraction.ativos?.length && (
            <Section title={`Ativos (${extraction.ativos.length})`}>
              <ul className="text-sm space-y-1">
                {extraction.ativos.map((a, i) => (
                  <li key={i}>• {a.descricao} — {a.categoria} {a.valor && `— R$ ${a.valor.toLocaleString('pt-BR')}`} {a.liquidez && `(${a.liquidez})`}</li>
                ))}
              </ul>
            </Section>
          )}
          {!!extraction.dividas?.length && (
            <Section title={`Dívidas (${extraction.dividas.length})`}>
              <ul className="text-sm space-y-1">
                {extraction.dividas.map((d, i) => (
                  <li key={i}>• {d.tipo} {d.descricao && `— ${d.descricao}`} {d.saldo_devedor && `— R$ ${d.saldo_devedor.toLocaleString('pt-BR')}`} {d.prazo_restante && `(${d.prazo_restante})`}</li>
                ))}
              </ul>
            </Section>
          )}
        </Card>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-3">
      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</h5>
      {children}
    </div>
  );
}

function Chips({ items, variant }: { items: string[]; variant: any }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => <Badge key={i} variant={variant}>{s}</Badge>)}
    </div>
  );
}

function checklist(e: Extraction): [string, boolean][] {
  const p = e.informacoes_pessoais || {};
  const f = e.situacao_financeira || {};
  return [
    ['Nome', !!p.nome && p.nome !== 'Não informado'],
    ['Idade', typeof p.idade === 'number'],
    ['Profissão', !!p.profissao && p.profissao !== 'Não informado'],
    ['Cidade / País', !!(p.cidade || p.pais)],
    ['Estado civil', !!p.estado_civil],
    ['Filhos', Array.isArray(p.filhos) && p.filhos.length > 0],
    ['Renda mensal', typeof f.renda_mensal === 'number'],
    ['Custo de vida', typeof f.custo_vida_mensal === 'number'],
    ['Patrimônio financeiro', typeof f.patrimonio_financeiro === 'number'],
    ['Patrimônio imobiliário', typeof f.patrimonio_imobiliario === 'number'],
    ['Reserva de emergência', typeof f.reserva_emergencia_valor === 'number'],
    ['Ativos', !!e.ativos?.length],
    ['Dívidas', !!e.dividas?.length],
    ['Objetivos', !!e.objetivos?.length],
    ['Riscos', !!e.riscos_identificados?.length],
    ['Resumo executivo', !!e.resumo_executivo],
  ];
}
