import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronRight, ChevronUp, MessageSquare, Heart } from 'lucide-react';

export interface FamilyData {
  maritalStatus: string; // Solteiro(a) | Casado(a) | União estável | Divorciado(a) | Viúvo(a)
  propertyRegime: string; // Comunhão parcial | Comunhão universal | Separação total | Participação final nos aquestos | Não aplicável
  hasChildren: string; // Sim | Não
  childrenCount: string;
  childrenAges: string;
  childrenFinanciallyDependent: string; // Sim | Não
  hasOtherDependents: string; // Sim | Não
  otherDependentsDetail: string;
  spouseHasIncome: string; // Sim | Não | Não se aplica
  spouseMonthlyIncome: string;
  exclusiveIncomeDependency: string; // Sim | Não | Parcialmente
  successionDiscussed: string; // Sim | Não | Parcialmente
  familySynthesis: string;
}

export const defaultFamilyData: FamilyData = {
  maritalStatus: '',
  propertyRegime: '',
  hasChildren: '',
  childrenCount: '',
  childrenAges: '',
  childrenFinanciallyDependent: '',
  hasOtherDependents: '',
  otherDependentsDetail: '',
  spouseHasIncome: '',
  spouseMonthlyIncome: '',
  exclusiveIncomeDependency: '',
  successionDiscussed: '',
  familySynthesis: '',
};

export interface StrategicDiagnosticData {
  // 1 - Construção de Patrimônio
  wealthBuilding: string;
  wealthSources: string[];
  wealthBuildingNotes: string;
  // 2 - Momento de Vida
  lifePhaseAnswer: string;
  lifePhase: string;
  lifePhaseNotes: string;
  // 3 - Maior Decisão
  biggestDecision: string;
  decisionProfile: string;
  biggestDecisionNotes: string;
  // 4 - Maior Erro
  biggestMistake: string;
  identifiedTriggers: string;
  biggestMistakeNotes: string;
  // 5 - Visão de Futuro
  futureVision: string;
  targetPatrimony: string;
  targetMonthlyIncome: string;
  futureVisionNotes: string;
  // 6 - Estrutura Familiar
  family: FamilyData;
  // Síntese
  strategicSynthesis: string;
}

export const defaultStrategicDiagnostic: StrategicDiagnosticData = {
  wealthBuilding: '',
  wealthSources: [],
  wealthBuildingNotes: '',
  lifePhaseAnswer: '',
  lifePhase: '',
  lifePhaseNotes: '',
  biggestDecision: '',
  decisionProfile: '',
  biggestDecisionNotes: '',
  biggestMistake: '',
  identifiedTriggers: '',
  biggestMistakeNotes: '',
  futureVision: '',
  targetPatrimony: '',
  targetMonthlyIncome: '',
  futureVisionNotes: '',
  family: { ...defaultFamilyData },
  strategicSynthesis: '',
};

const WEALTH_SOURCES = [
  'Empresa',
  'Imóveis',
  'Investimentos financeiros',
  'Herança',
  'Venda de empresa',
  'Outros',
];

const LIFE_PHASES = ['Expansão', 'Consolidação', 'Proteção'];
const DECISION_PROFILES = ['Estratégico', 'Oportunista', 'Conservador', 'Impulsivo'];

interface Props {
  data: StrategicDiagnosticData;
  onChange: (data: StrategicDiagnosticData) => void;
}

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

function OptionalNotes({ value, onChange, label = 'Observações do consultor' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(!!value);
  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>{value ? 'Ver observações' : 'Adicionar observações'}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          className="crm-input min-h-[70px] mt-2"
        />
      )}
    </div>
  );
}

const MARITAL_STATUS_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'];
const PROPERTY_REGIME_OPTIONS = ['Comunhão parcial', 'Comunhão universal', 'Separação total', 'Participação final nos aquestos', 'Não aplicável'];

export function DiagnosticoEstrategico({ data, onChange }: Props) {
  const update = (partial: Partial<StrategicDiagnosticData>) => {
    onChange({ ...data, ...partial });
  };

  const family = data.family || defaultFamilyData;
  const updateFamily = (partial: Partial<FamilyData>) => {
    update({ family: { ...family, ...partial } });
  };

  const toggleSource = (source: string) => {
    const sources = data.wealthSources.includes(source)
      ? data.wealthSources.filter(s => s !== source)
      : [...data.wealthSources, source];
    update({ wealthSources: sources });
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">Diagnóstico Estratégico – Identidade e Direção do Cliente</span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pt-4 space-y-6">
        <p className="text-xs text-muted-foreground">
          Mapear mentalidade, momento de vida, padrão decisório e visão de futuro antes de falar sobre investimentos.
        </p>

      {/* 1️⃣ Construção de Patrimônio */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">1️⃣ Construção de Patrimônio</h4>
        <Label>Como você construiu seu patrimônio até aqui?</Label>
        <Textarea
          value={data.wealthBuilding}
          onChange={(e) => update({ wealthBuilding: e.target.value })}
          placeholder="Resposta descritiva do cliente..."
          className="crm-input min-h-[100px]"
        />
        <ConsultantNote>
          Identificar origem da riqueza (empresa, carreira, herança, venda de ativo). Avaliar concentração de risco, dependência da renda ativa e perfil gerador de patrimônio.
        </ConsultantNote>

        <div className="space-y-2">
          <Label>Principais fontes de patrimônio</Label>
          <div className="flex flex-wrap gap-3">
            {WEALTH_SOURCES.map(source => (
              <label key={source} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={data.wealthSources.includes(source)}
                  onCheckedChange={() => toggleSource(source)}
                />
                {source}
              </label>
            ))}
          </div>
        </div>

        <OptionalNotes value={data.wealthBuildingNotes} onChange={(v) => update({ wealthBuildingNotes: v })} />
      </div>

      {/* 2️⃣ Momento de Vida Atual */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">2️⃣ Momento de Vida Atual</h4>
        <Label>Hoje você se considera em fase de expansão, consolidação ou proteção do patrimônio? Por quê?</Label>
        <Textarea
          value={data.lifePhaseAnswer}
          onChange={(e) => update({ lifePhaseAnswer: e.target.value })}
          placeholder="Resposta descritiva do cliente..."
          className="crm-input min-h-[100px]"
        />
        <ConsultantNote>
          Entender prioridade atual. Crescimento agressivo ou preservação? Detectar mudanças familiares, sucessórias ou empresariais.
        </ConsultantNote>

        <div className="space-y-2">
          <Label>Fase marcada pelo consultor</Label>
          <RadioGroup value={data.lifePhase} onValueChange={(v) => update({ lifePhase: v })} className="flex gap-4">
            {LIFE_PHASES.map(phase => (
              <label key={phase} className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value={phase} />
                {phase}
              </label>
            ))}
          </RadioGroup>
        </div>

        <OptionalNotes value={data.lifePhaseNotes} onChange={(v) => update({ lifePhaseNotes: v })} />
      </div>

      {/* 3️⃣ Maior Decisão Financeira */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">3️⃣ Maior Decisão Financeira</h4>
        <Label>Qual foi a decisão financeira mais importante da sua vida até hoje?</Label>
        <Textarea
          value={data.biggestDecision}
          onChange={(e) => update({ biggestDecision: e.target.value })}
          placeholder="Resposta descritiva do cliente..."
          className="crm-input min-h-[100px]"
        />
        <ConsultantNote>
          Mapear padrão decisório. Identificar se valoriza coragem, prudência, oportunidade ou planejamento. Entender percepção de risco e convicção.
        </ConsultantNote>

        <div className="space-y-2">
          <Label>Perfil percebido pelo consultor</Label>
          <RadioGroup value={data.decisionProfile} onValueChange={(v) => update({ decisionProfile: v })} className="flex flex-wrap gap-4">
            {DECISION_PROFILES.map(profile => (
              <label key={profile} className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value={profile} />
                {profile}
              </label>
            ))}
          </RadioGroup>
        </div>

        <OptionalNotes value={data.biggestDecisionNotes} onChange={(v) => update({ biggestDecisionNotes: v })} />
      </div>

      {/* 4️⃣ Maior Erro Financeiro */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">4️⃣ Maior Erro Financeiro</h4>
        <Label>Qual foi o maior erro financeiro que você já cometeu?</Label>
        <Textarea
          value={data.biggestMistake}
          onChange={(e) => update({ biggestMistake: e.target.value })}
          placeholder="Resposta descritiva do cliente..."
          className="crm-input min-h-[100px]"
        />
        <ConsultantNote>
          Identificar traumas financeiros e gatilhos emocionais. Antecipar comportamento em crises e tolerância a perdas.
        </ConsultantNote>

        <div className="space-y-2">
          <Label>Gatilhos identificados</Label>
          <Input
            value={data.identifiedTriggers}
            onChange={(e) => update({ identifiedTriggers: e.target.value })}
            placeholder="Ex: medo de perder, excesso de confiança, influência externa..."
            className="crm-input"
          />
        </div>

        <OptionalNotes value={data.biggestMistakeNotes} onChange={(v) => update({ biggestMistakeNotes: v })} />
      </div>

      {/* 5️⃣ Visão de Futuro */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">5️⃣ Visão de Futuro</h4>
        <Label>Se eu te encontrar daqui a 10 anos e você disser "deu certo", o que precisa ter acontecido?</Label>
        <Textarea
          value={data.futureVision}
          onChange={(e) => update({ futureVision: e.target.value })}
          placeholder="Resposta descritiva do cliente..."
          className="crm-input min-h-[100px]"
        />
        <ConsultantNote>
          Transformar desejo em meta mensurável. Identificar definição pessoal de sucesso: renda mensal, liberdade, venda da empresa, sucessão organizada, tranquilidade.
        </ConsultantNote>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Patrimônio alvo (R$)</Label>
            <CurrencyInput
              value={data.targetPatrimony}
              onChange={(v) => update({ targetPatrimony: v })}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Renda mensal desejada (R$)</Label>
            <CurrencyInput
              value={data.targetMonthlyIncome}
              onChange={(v) => update({ targetMonthlyIncome: v })}
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <OptionalNotes value={data.futureVisionNotes} onChange={(v) => update({ futureVisionNotes: v })} />
      </div>

      {/* 6️⃣ Estrutura Familiar e Responsabilidades */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          6️⃣ Estrutura Familiar e Responsabilidades
        </h4>
        <ConsultantNote>
          Mapear responsabilidades familiares, dependência financeira e impacto na estratégia patrimonial, proteção e sucessão.
        </ConsultantNote>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estado Civil</Label>
            <Select value={family.maritalStatus} onValueChange={(v) => updateFamily({ maritalStatus: v })}>
              <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {MARITAL_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {(family.maritalStatus === 'Casado(a)' || family.maritalStatus === 'União estável') && (
            <div className="space-y-2">
              <Label>Regime de Bens</Label>
              <Select value={family.propertyRegime} onValueChange={(v) => updateFamily({ propertyRegime: v })}>
                <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_REGIME_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filhos */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Possui Filhos?</Label>
            <Select value={family.hasChildren} onValueChange={(v) => updateFamily({ hasChildren: v })}>
              <SelectTrigger className="crm-input w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {family.hasChildren === 'Sim' && (
            <div className="p-3 bg-card rounded-lg border border-border space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade de filhos</Label>
                  <Input
                    type="number"
                    value={family.childrenCount}
                    onChange={(e) => updateFamily({ childrenCount: e.target.value })}
                    placeholder="Ex: 2"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Idade dos filhos</Label>
                  <Input
                    value={family.childrenAges}
                    onChange={(e) => updateFamily({ childrenAges: e.target.value })}
                    placeholder="Ex: 8 e 12 anos"
                    className="crm-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dependem financeiramente?</Label>
                <Select value={family.childrenFinanciallyDependent} onValueChange={(v) => updateFamily({ childrenFinanciallyDependent: v })}>
                  <SelectTrigger className="crm-input w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Outros dependentes */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Possui Outros Dependentes Financeiros?</Label>
            <Select value={family.hasOtherDependents} onValueChange={(v) => updateFamily({ hasOtherDependents: v })}>
              <SelectTrigger className="crm-input w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {family.hasOtherDependents === 'Sim' && (
            <Input
              value={family.otherDependentsDetail}
              onChange={(e) => updateFamily({ otherDependentsDetail: e.target.value })}
              placeholder="Ex: mãe idosa, irmão com deficiência..."
              className="crm-input"
            />
          )}
        </div>

        {/* Renda do cônjuge */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cônjuge Possui Renda Própria?</Label>
            <Select value={family.spouseHasIncome} onValueChange={(v) => updateFamily({ spouseHasIncome: v })}>
              <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Não se aplica">Não se aplica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {family.spouseHasIncome === 'Sim' && (
            <div className="space-y-2">
              <Label>Renda mensal estimada do cônjuge (R$)</Label>
              <CurrencyInput
                value={family.spouseMonthlyIncome}
                onChange={(v) => updateFamily({ spouseMonthlyIncome: v })}
                placeholder="R$ 0,00"
              />
            </div>
          )}
        </div>

        {/* Dependência exclusiva */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Alguém depende exclusivamente da sua renda?</Label>
            <Select value={family.exclusiveIncomeDependency} onValueChange={(v) => updateFamily({ exclusiveIncomeDependency: v })}>
              <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Parcialmente">Parcialmente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>A sucessão já foi discutida com a família?</Label>
            <Select value={family.successionDiscussed} onValueChange={(v) => updateFamily({ successionDiscussed: v })}>
              <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Parcialmente">Parcialmente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Síntese Familiar */}
        <div className="space-y-2 pt-3 border-t border-border/50">
          <Label className="font-medium">Síntese Familiar do Consultor</Label>
          <ConsultantNote>
            Registrar impacto da estrutura familiar na estratégia patrimonial, risco e sucessão.
          </ConsultantNote>
          <Textarea
            value={family.familySynthesis}
            onChange={(e) => updateFamily({ familySynthesis: e.target.value })}
            placeholder="Ex: família com alta dependência financeira do titular, sem planejamento sucessório, cônjuge sem renda própria — priorizar seguro de vida e testamento."
            className="crm-input min-h-[100px]"
          />
        </div>
      </div>

      {/* 🎯 Síntese Estratégica */}
      <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-3">
        <h4 className="font-semibold text-primary flex items-center gap-2">
          🎯 Síntese Estratégica do Consultor
        </h4>
        <p className="text-xs text-muted-foreground">
          Registre: motor financeiro do cliente, principal medo identificado, principal objetivo estratégico e direção estratégica inicial sugerida.
        </p>
        <Textarea
          value={data.strategicSynthesis}
          onChange={(e) => update({ strategicSynthesis: e.target.value })}
          placeholder={"• Motor financeiro do cliente:\n• Principal medo identificado:\n• Principal objetivo estratégico:\n• Direção estratégica inicial sugerida:"}
          className="crm-input min-h-[160px] text-sm"
        />
      </div>
      </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
