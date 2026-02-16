import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface ObjetivosMetasData {
  // 1
  mainObjective: string;
  // 2
  goalType: string;
  goalMonthlyIncome: string;
  goalTargetWealth: string;
  goalEstimatedValue: string;
  // 3
  timeframe: string;
  targetDate: string;
  // 4
  priority1: string;
  priority2: string;
  priority3: string;
  // 5
  restrictions: string;
  // 6 - Síntese
  summaryMainGoal: string;
  summaryTargetNumber: string;
  summaryTimeframe: string;
  summaryDominantPriority: string;
  summaryRestrictions: string;
  summaryStrategicDirection: string;
}

export const defaultObjetivosMetas: ObjetivosMetasData = {
  mainObjective: '',
  goalType: '',
  goalMonthlyIncome: '',
  goalTargetWealth: '',
  goalEstimatedValue: '',
  timeframe: '',
  targetDate: '',
  priority1: '',
  priority2: '',
  priority3: '',
  restrictions: '',
  summaryMainGoal: '',
  summaryTargetNumber: '',
  summaryTimeframe: '',
  summaryDominantPriority: '',
  summaryRestrictions: '',
  summaryStrategicDirection: '',
};

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

const GOAL_TYPES = [
  'Renda mensal (R$/mês)',
  'Patrimônio alvo (R$)',
  'Quitação de dívidas (R$)',
  'Compra de imóvel (R$)',
  'Venda de empresa (R$)',
  'Aposentadoria / independência financeira',
  'Outros',
];

const TIMEFRAMES = [
  'Até 1 ano',
  '1 a 3 anos',
  '3 a 5 anos',
  '5 a 10 anos',
  '10+ anos',
];

const PRIORITIES = [
  'Segurança / preservação',
  'Crescimento do patrimônio',
  'Renda passiva',
  'Liquidez',
  'Planejamento sucessório',
  'Proteção patrimonial',
  'Diversificação internacional',
];

interface Props {
  data: ObjetivosMetasData;
  onChange: (data: ObjetivosMetasData) => void;
}

export function ObjetivosMetas({ data, onChange }: Props) {
  const safeData = data ?? defaultObjetivosMetas;

  const update = (partial: Partial<ObjetivosMetasData>) => {
    onChange({ ...safeData, ...partial });
  };

  const [isOpen, setIsOpen] = useState(false);

  const showMonthlyIncome = safeData.goalType === 'Renda mensal (R$/mês)' || safeData.goalType === 'Aposentadoria / independência financeira';
  const showTargetWealth = safeData.goalType === 'Patrimônio alvo (R$)';
  const showEstimatedValue = ['Quitação de dívidas (R$)', 'Compra de imóvel (R$)', 'Venda de empresa (R$)', 'Outros'].includes(safeData.goalType);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold text-foreground text-sm">Objetivos, Metas e Linha do Tempo</span>
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
            Mapear objetivos financeiros e de vida, traduzindo em metas mensuráveis com prazo e prioridade.
          </p>

          {/* 1️⃣ Objetivo Principal */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Objetivo Principal</h4>
            <Label>Qual é o seu principal objetivo financeiro hoje?</Label>
            <Textarea
              value={safeData.mainObjective}
              onChange={(e) => update({ mainObjective: e.target.value })}
              placeholder="Descreva o objetivo principal..."
              className="crm-input min-h-[80px]"
            />
            <ConsultantNote>
              Encontrar o "norte" que guia todas as decisões e define o que é sucesso pro cliente.
            </ConsultantNote>
          </div>

          {/* 2️⃣ Metas Mensuráveis */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Metas Mensuráveis</h4>
            <Label>Quando você fala que "deu certo", isso significa qual número?</Label>
            <Select value={safeData.goalType} onValueChange={(v) => update({ goalType: v })}>
              <SelectTrigger className="crm-input w-full max-w-[350px]"><SelectValue placeholder="Selecione o tipo de meta" /></SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showMonthlyIncome && (
              <div className="space-y-2">
                <Label>Valor da renda mensal desejada (R$)</Label>
                <CurrencyInput
                  value={safeData.goalMonthlyIncome}
                  onChange={(v) => update({ goalMonthlyIncome: v })}
                  placeholder="R$ 0,00"
                />
              </div>
            )}

            {showTargetWealth && (
              <div className="space-y-2">
                <Label>Patrimônio alvo (R$)</Label>
                <CurrencyInput
                  value={safeData.goalTargetWealth}
                  onChange={(v) => update({ goalTargetWealth: v })}
                  placeholder="R$ 0,00"
                />
              </div>
            )}

            {showEstimatedValue && (
              <div className="space-y-2">
                <Label>Valor estimado da meta (R$)</Label>
                <CurrencyInput
                  value={safeData.goalEstimatedValue}
                  onChange={(v) => update({ goalEstimatedValue: v })}
                  placeholder="R$ 0,00"
                />
              </div>
            )}

            <ConsultantNote>
              Transformar desejo em número. Sem número, não existe plano.
            </ConsultantNote>
          </div>

          {/* 3️⃣ Prazo */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Prazo</h4>
            <Label>Em quanto tempo você quer alcançar isso?</Label>
            <Select value={safeData.timeframe} onValueChange={(v) => update({ timeframe: v })}>
              <SelectTrigger className="crm-input w-[250px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label>Data alvo (opcional)</Label>
              <Input
                type="date"
                value={safeData.targetDate}
                onChange={(e) => update({ targetDate: e.target.value })}
                className="crm-input w-[200px]"
              />
            </div>
            <ConsultantNote>
              Prazo define risco, liquidez e composição da estratégia.
            </ConsultantNote>
          </div>

          {/* 4️⃣ Prioridades */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">4️⃣ Prioridades</h4>
            <Label>Se você tivesse que priorizar, o que vem primeiro?</Label>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">1ª Prioridade</Label>
                <Select value={safeData.priority1} onValueChange={(v) => update({ priority1: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">2ª Prioridade</Label>
                <Select value={safeData.priority2} onValueChange={(v) => update({ priority2: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">3ª Prioridade</Label>
                <Select value={safeData.priority3} onValueChange={(v) => update({ priority3: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ConsultantNote>
              Isso evita conflito na carteira: cliente fala "quero rentabilidade" mas prioriza "segurança".
            </ConsultantNote>
          </div>

          {/* 5️⃣ Restrições e Regras do Cliente */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">5️⃣ Restrições e Regras do Cliente</h4>
            <Label>Existe algo que você não quer fazer de jeito nenhum com seu dinheiro?</Label>
            <Textarea
              value={safeData.restrictions}
              onChange={(e) => update({ restrictions: e.target.value })}
              placeholder="Descreva restrições..."
              className="crm-input min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Exemplos: Não quero renda variável · Não quero investir fora do Brasil · Não aceito oscilações acima de X% · Preciso de liquidez mínima de X meses
            </p>
            <ConsultantNote>
              Mapear limites para evitar quebra de confiança e resgates futuros.
            </ConsultantNote>
          </div>

          {/* 6️⃣ Síntese de Metas do Consultor */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <h4 className="font-semibold text-primary">6️⃣ Síntese de Metas do Consultor</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meta principal</Label>
                <Input
                  value={safeData.summaryMainGoal}
                  onChange={(e) => update({ summaryMainGoal: e.target.value })}
                  placeholder="Ex: Independência financeira"
                  className="crm-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Número alvo (R$ ou R$/mês)</Label>
                <CurrencyInput
                  value={safeData.summaryTargetNumber}
                  onChange={(v) => update({ summaryTargetNumber: v })}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Prazo</Label>
                <Select value={safeData.summaryTimeframe} onValueChange={(v) => update({ summaryTimeframe: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade dominante</Label>
                <Select value={safeData.summaryDominantPriority} onValueChange={(v) => update({ summaryDominantPriority: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Restrições relevantes</Label>
              <Input
                value={safeData.summaryRestrictions}
                onChange={(e) => update({ summaryRestrictions: e.target.value })}
                placeholder="Resumo das restrições do cliente..."
                className="crm-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Direção estratégica sugerida</Label>
              <Textarea
                value={safeData.summaryStrategicDirection}
                onChange={(e) => update({ summaryStrategicDirection: e.target.value })}
                placeholder="Descreva a direção estratégica sugerida..."
                className="crm-input min-h-[100px] text-sm"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
