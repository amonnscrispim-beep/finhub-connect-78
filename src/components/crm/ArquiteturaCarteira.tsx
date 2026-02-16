import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface ArquiteturaCarteiraData {
  dominantObjective: string;
  riskLevel: string;
  minLiquidity: string;
  liquidityJustification: string;
  // Distribution pillars
  fixedIncomePct: string;
  equitiesPct: string;
  passiveIncomePct: string;
  internationalPct: string;
  alternativesPct: string;
  cashPct: string;
  // Tax
  taxDirective: string;
  taxObservations: string;
  // Rebalancing
  rebalancingRule: string;
  // Synthesis
  summaryObjective: string;
  summaryRisk: string;
  summaryLiquidity: string;
  summaryMacroMap: string;
  summaryTaxDirective: string;
  summaryRebalancing: string;
  summaryObservations: string;
}

export const defaultArquiteturaCarteira: ArquiteturaCarteiraData = {
  dominantObjective: '',
  riskLevel: '',
  minLiquidity: '',
  liquidityJustification: '',
  fixedIncomePct: '',
  equitiesPct: '',
  passiveIncomePct: '',
  internationalPct: '',
  alternativesPct: '',
  cashPct: '',
  taxDirective: '',
  taxObservations: '',
  rebalancingRule: '',
  summaryObjective: '',
  summaryRisk: '',
  summaryLiquidity: '',
  summaryMacroMap: '',
  summaryTaxDirective: '',
  summaryRebalancing: '',
  summaryObservations: '',
};

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

const OBJECTIVES = [
  'Preservação e proteção',
  'Crescimento do patrimônio',
  'Construção de renda passiva',
  'Mistura equilibrada (crescimento + renda)',
  'Liquidez e flexibilidade',
  'Estratégia fiscal/tributária como prioridade',
];

const RISK_LEVELS = ['Conservador', 'Moderado', 'Arrojado'];

const LIQUIDITY_OPTIONS = [
  '3 meses de custo de vida',
  '6 meses',
  '12 meses',
  '18+ meses',
];

const TAX_DIRECTIVES = [
  'Priorizar isentos quando fizer sentido',
  'Indiferente, foco em retorno líquido',
  'Minimizar ganho de capital',
  'Planejar sucessão/estrutura antes de alocar',
  'Outros',
];

const REBALANCING_RULES = [
  'Trimestral',
  'Semestral',
  'Anual',
  'Por desvio de alocação (ex: 5% ou 10%)',
];

interface Props {
  data: ArquiteturaCarteiraData;
  onChange: (data: ArquiteturaCarteiraData) => void;
}

export function ArquiteturaCarteira({ data, onChange }: Props) {
  const safeData = data ?? defaultArquiteturaCarteira;
  const update = (partial: Partial<ArquiteturaCarteiraData>) => {
    onChange({ ...safeData, ...partial });
  };
  const [isOpen, setIsOpen] = useState(false);

  const pctFields = [
    { key: 'fixedIncomePct' as const, label: 'Renda fixa (crédito, pós, IPCA, etc.)' },
    { key: 'equitiesPct' as const, label: 'Renda variável (ações, fundos, etc.)' },
    { key: 'passiveIncomePct' as const, label: 'Renda passiva (FIIs/estratégias de renda)' },
    { key: 'internationalPct' as const, label: 'Internacional / moeda forte' },
    { key: 'alternativesPct' as const, label: 'Estratégias estruturadas / alternativos' },
    { key: 'cashPct' as const, label: 'Caixa / oportunidade' },
  ];

  const totalPct = pctFields.reduce((sum, f) => sum + (parseFloat(safeData[f.key]) || 0), 0);
  const isValid = Math.abs(totalPct - 100) < 0.01;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <span className="font-semibold text-foreground text-sm">Arquitetura Estratégica da Carteira</span>
          {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pt-4 space-y-6">
          <p className="text-xs text-muted-foreground">
            Definir a estrutura macro da carteira com base no diagnóstico: crescimento, renda, proteção, liquidez, diversificação e eficiência tributária.
          </p>

          {/* 1️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Objetivo dominante da carteira</h4>
            <Label>Qual é o objetivo dominante da carteira neste momento?</Label>
            <Select value={safeData.dominantObjective} onValueChange={(v) => update({ dominantObjective: v })}>
              <SelectTrigger className="crm-input w-full max-w-[400px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <ConsultantNote>Define o "centro de gravidade" da carteira. Todo o resto se ajusta a isso.</ConsultantNote>
          </div>

          {/* 2️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Nível de risco recomendado</h4>
            <Label>Com base no diagnóstico comportamental, qual nível de risco é adequado?</Label>
            <Select value={safeData.riskLevel} onValueChange={(v) => update({ riskLevel: v })}>
              <SelectTrigger className="crm-input w-[250px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <ConsultantNote>Não é o que o cliente diz. É o que ele aguenta.</ConsultantNote>
          </div>

          {/* 3️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Liquidez mínima necessária</h4>
            <Label>Qual é a liquidez mínima que a carteira precisa manter?</Label>
            <Select value={safeData.minLiquidity} onValueChange={(v) => update({ minLiquidity: v })}>
              <SelectTrigger className="crm-input w-[300px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {LIQUIDITY_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea
                value={safeData.liquidityJustification}
                onChange={(e) => update({ liquidityJustification: e.target.value })}
                placeholder="Justifique a liquidez mínima..."
                className="crm-input min-h-[60px]"
              />
            </div>
            <ConsultantNote>Liquidez é o "cinto de segurança" que evita resgate em crise.</ConsultantNote>
          </div>

          {/* 4️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">4️⃣ Distribuição macro por pilares</h4>
            <div className="space-y-3">
              {pctFields.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <Label className="flex-1 text-sm">{f.label}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={safeData[f.key]}
                      onChange={(e) => update({ [f.key]: e.target.value } as any)}
                      className="crm-input w-[80px] text-right"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <span className="text-sm font-medium">Total:</span>
                <span className={`text-sm font-bold ${isValid ? 'text-green-600' : totalPct > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {totalPct.toFixed(0)}%
                </span>
                {!isValid && totalPct > 0 && (
                  <span className="text-xs text-destructive">
                    (deve somar 100%)
                  </span>
                )}
              </div>
            </div>
            <ConsultantNote>Aqui nasce o mapa da carteira. Depois você só "preenche" com ativos.</ConsultantNote>
          </div>

          {/* 5️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">5️⃣ Diretrizes de eficiência tributária</h4>
            <Label>Existe alguma diretriz tributária que deve orientar a construção da carteira?</Label>
            <Select value={safeData.taxDirective} onValueChange={(v) => update({ taxDirective: v })}>
              <SelectTrigger className="crm-input w-full max-w-[400px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TAX_DIRECTIVES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={safeData.taxObservations}
                onChange={(e) => update({ taxObservations: e.target.value })}
                placeholder="Observações sobre diretriz tributária..."
                className="crm-input min-h-[60px]"
              />
            </div>
            <ConsultantNote>Para alta renda, retorno líquido e estrutura importam mais do que retorno bruto.</ConsultantNote>
          </div>

          {/* 6️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">6️⃣ Regras de rebalanceamento</h4>
            <Label>Qual regra de rebalanceamento deve ser usada?</Label>
            <Select value={safeData.rebalancingRule} onValueChange={(v) => update({ rebalancingRule: v })}>
              <SelectTrigger className="crm-input w-full max-w-[350px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {REBALANCING_RULES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <ConsultantNote>Rebalanceamento é o que mantém o plano vivo e reduz risco comportamental.</ConsultantNote>
          </div>

          {/* 7️⃣ Síntese */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <h4 className="font-semibold text-primary">7️⃣ Síntese da Arquitetura</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Objetivo dominante</Label>
                <Select value={safeData.summaryObjective} onValueChange={(v) => update({ summaryObjective: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nível de risco</Label>
                <Select value={safeData.summaryRisk} onValueChange={(v) => update({ summaryRisk: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Liquidez mínima</Label>
                <Select value={safeData.summaryLiquidity} onValueChange={(v) => update({ summaryLiquidity: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {LIQUIDITY_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Diretriz tributária principal</Label>
                <Select value={safeData.summaryTaxDirective} onValueChange={(v) => update({ summaryTaxDirective: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TAX_DIRECTIVES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regra de rebalanceamento</Label>
                <Select value={safeData.summaryRebalancing} onValueChange={(v) => update({ summaryRebalancing: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {REBALANCING_RULES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mapa macro final</Label>
              <Textarea
                value={safeData.summaryMacroMap}
                onChange={(e) => update({ summaryMacroMap: e.target.value })}
                placeholder="Descreva o mapa macro da carteira..."
                className="crm-input min-h-[80px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações estratégicas</Label>
              <Textarea
                value={safeData.summaryObservations}
                onChange={(e) => update({ summaryObservations: e.target.value })}
                placeholder="Observações adicionais..."
                className="crm-input min-h-[80px] text-sm"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
