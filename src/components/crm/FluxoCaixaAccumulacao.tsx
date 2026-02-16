import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface FluxoCaixaData {
  // 1
  monthlyRevenue: string;
  revenueSource: string;
  // 2
  revenueStability: string;
  // 3
  livingCost: string;
  // 4
  monthlyInvestment: string;
  alreadyInvesting: string;
  // 5
  financialAutonomy: string;
  // 6 - Síntese
  savingsRate: string;
  stabilityLevel: string;
  autonomyMonths: string;
  strategicDirection: string;
}

export const defaultFluxoCaixa: FluxoCaixaData = {
  monthlyRevenue: '',
  revenueSource: '',
  revenueStability: '',
  livingCost: '',
  monthlyInvestment: '',
  alreadyInvesting: '',
  financialAutonomy: '',
  savingsRate: '',
  stabilityLevel: '',
  autonomyMonths: '',
  strategicDirection: '',
};

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

const REVENUE_SOURCES = [
  'Salário',
  'Pró-labore',
  'Distribuição de lucros',
  'Dividendos',
  'Aluguéis',
  'Honorários',
  'Outros',
];

interface Props {
  data: FluxoCaixaData;
  onChange: (data: FluxoCaixaData) => void;
}

export function FluxoCaixaAccumulacao({ data, onChange }: Props) {
  const update = (partial: Partial<FluxoCaixaData>) => {
    onChange({ ...data, ...partial });
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold text-foreground text-sm">Fluxo de Caixa e Capacidade de Acumulação</span>
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
            Entender geração de renda, estabilidade financeira e capacidade real de construção patrimonial.
          </p>

          {/* 1️⃣ Receita Mensal Média */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Receita Mensal Média</h4>
            <Label>Qual é sua receita média mensal nos últimos 12 meses?</Label>
            <CurrencyInput
              value={data.monthlyRevenue}
              onChange={(v) => update({ monthlyRevenue: v })}
              placeholder="R$ 0,00"
            />
            <div className="space-y-2">
              <Label>Fonte principal da renda</Label>
              <RadioGroup
                value={data.revenueSource}
                onValueChange={(v) => update({ revenueSource: v })}
                className="flex flex-wrap gap-x-4 gap-y-2"
              >
                {REVENUE_SOURCES.map(source => (
                  <label key={source} className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value={source} />
                    {source}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <ConsultantNote>
              Identificar origem da renda e grau de dependência ativa.
            </ConsultantNote>
          </div>

          {/* 2️⃣ Estabilidade da Receita */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Estabilidade da Receita</h4>
            <Label>Sua receita é previsível ou varia ao longo do ano?</Label>
            <Select value={data.revenueStability} onValueChange={(v) => update({ revenueStability: v })}>
              <SelectTrigger className="crm-input w-[250px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alta previsibilidade">Alta previsibilidade</SelectItem>
                <SelectItem value="Moderada variação">Moderada variação</SelectItem>
                <SelectItem value="Alta variação">Alta variação</SelectItem>
              </SelectContent>
            </Select>
            <ConsultantNote>
              Definir necessidade de reserva estratégica e perfil de liquidez.
            </ConsultantNote>
          </div>

          {/* 3️⃣ Custo de Vida */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Custo de Vida</h4>
            <Label>Qual é seu custo de vida mensal médio?</Label>
            <CurrencyInput
              value={data.livingCost}
              onChange={(v) => update({ livingCost: v })}
              placeholder="R$ 0,00"
            />
            <ConsultantNote>
              Calcular taxa de poupança real.
            </ConsultantNote>
          </div>

          {/* 4️⃣ Capacidade de Aporte */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">4️⃣ Capacidade de Aporte</h4>
            <Label>Quanto você consegue investir mensalmente de forma consistente?</Label>
            <CurrencyInput
              value={data.monthlyInvestment}
              onChange={(v) => update({ monthlyInvestment: v })}
              placeholder="R$ 0,00"
            />
            <div className="space-y-2">
              <Label>Esse valor já está sendo investido?</Label>
              <RadioGroup
                value={data.alreadyInvesting}
                onValueChange={(v) => update({ alreadyInvesting: v })}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="Sim" />
                  Sim
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="Parcialmente" />
                  Parcialmente
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="Não" />
                  Não
                </label>
              </RadioGroup>
            </div>
            <ConsultantNote>
              Medir velocidade de crescimento patrimonial.
            </ConsultantNote>
          </div>

          {/* 5️⃣ Dependência de Renda Ativa */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">5️⃣ Dependência de Renda Ativa</h4>
            <Label>Se você parar de trabalhar hoje, por quanto tempo seu padrão de vida se mantém?</Label>
            <Textarea
              value={data.financialAutonomy}
              onChange={(e) => update({ financialAutonomy: e.target.value })}
              placeholder="Resposta descritiva ou número de meses..."
              className="crm-input min-h-[80px]"
            />
            <ConsultantNote>
              Medir autonomia financeira real.
            </ConsultantNote>
          </div>

          {/* 6️⃣ Síntese Financeira do Consultor */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <h4 className="font-semibold text-primary">6️⃣ Síntese Financeira do Consultor</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa de poupança (% da renda)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={data.savingsRate}
                  onChange={(e) => update({ savingsRate: e.target.value })}
                  placeholder="Ex: 30"
                  className="crm-input w-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Grau de estabilidade</Label>
                <Select value={data.stabilityLevel} onValueChange={(v) => update({ stabilityLevel: v })}>
                  <SelectTrigger className="crm-input w-[180px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alto">Alto</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Autonomia financeira (meses)</Label>
                <Input
                  type="number"
                  min="0"
                  value={data.autonomyMonths}
                  onChange={(e) => update({ autonomyMonths: e.target.value })}
                  placeholder="Ex: 18"
                  className="crm-input w-[150px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Direção estratégica sugerida</Label>
              <Textarea
                value={data.strategicDirection}
                onChange={(e) => update({ strategicDirection: e.target.value })}
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
