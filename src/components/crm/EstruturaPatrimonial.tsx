import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput, formatCurrencyBR } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, ChevronUp, MessageSquare } from 'lucide-react';

export interface EstruturaPatrimonialData {
  // 1 - Patrimônio Total
  totalPatrimony: string;
  totalPatrimonyNotes: string;
  // 2 - Divisão PF e PJ
  pfValue: string;
  pjValue: string;
  // 3 - Alocação por Classe
  liquidFinancialAssets: string;
  realEstate: string;
  businessParticipations: string;
  cashAccount: string;
  otherAssets: string;
  // 4 - Concentração de Risco
  concentrationNotes: string;
  hasConcentration: string; // 'sim' | 'nao' | ''
  concentrationDetail: string;
  // 5 - Dependência Ativa
  activeDependencyNotes: string;
  activeDependencyPercent: string;
  // 6 - Síntese Técnica
  // 6 - Síntese Técnica (structured)
  concentrationLevel: string;
  liquidityLevel: string;
  legalExposure: string;
  personalDependency: string;
  strategicDirection: string;
}

export const defaultEstruturaPatrimonial: EstruturaPatrimonialData = {
  totalPatrimony: '',
  totalPatrimonyNotes: '',
  pfValue: '',
  pjValue: '',
  liquidFinancialAssets: '',
  realEstate: '',
  businessParticipations: '',
  cashAccount: '',
  otherAssets: '',
  concentrationNotes: '',
  hasConcentration: '',
  concentrationDetail: '',
  activeDependencyNotes: '',
  activeDependencyPercent: '',
  concentrationLevel: '',
  liquidityLevel: '',
  legalExposure: '',
  personalDependency: '',
  strategicDirection: '',
};

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

interface Props {
  data: EstruturaPatrimonialData;
  onChange: (data: EstruturaPatrimonialData) => void;
}

export function EstruturaPatrimonial({ data, onChange }: Props) {
  const update = (partial: Partial<EstruturaPatrimonialData>) => {
    onChange({ ...data, ...partial });
  };

  const [isOpen, setIsOpen] = useState(false);

  // PF/PJ percentage calculation
  const pfNum = parseFloat(data.pfValue) || 0;
  const pjNum = parseFloat(data.pjValue) || 0;
  const pfPjTotal = pfNum + pjNum;
  const pfPercent = pfPjTotal > 0 ? ((pfNum / pfPjTotal) * 100).toFixed(1) : '0.0';
  const pjPercent = pfPjTotal > 0 ? ((pjNum / pfPjTotal) * 100).toFixed(1) : '0.0';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold text-foreground text-sm">Estrutura Patrimonial Completa</span>
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
            Mapear a estrutura real do patrimônio, identificar concentração de risco, dependência de renda ativa e vulnerabilidades estruturais.
          </p>

          {/* 1️⃣ Patrimônio Total */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Patrimônio Total</h4>
            <Label>Qual é o seu patrimônio total aproximado hoje? (financeiro + imóveis + participações + outros ativos)</Label>
            <CurrencyInput
              value={data.totalPatrimony}
              onChange={(v) => update({ totalPatrimony: v })}
              placeholder="R$ 0,00"
            />
            <ConsultantNote>
              Dimensionar porte real do cliente e calibrar complexidade da estratégia. Verificar possível desalinhamento entre percepção e realidade patrimonial.
            </ConsultantNote>
            <OptionalNotes value={data.totalPatrimonyNotes} onChange={(v) => update({ totalPatrimonyNotes: v })} />
          </div>

          {/* 2️⃣ Divisão PF e PJ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Divisão PF e PJ</h4>
            <Label>Como seu patrimônio está dividido entre Pessoa Física e Pessoa Jurídica?</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor em PF (R$)</Label>
                <CurrencyInput
                  value={data.pfValue}
                  onChange={(v) => update({ pfValue: v })}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor em PJ (R$)</Label>
                <CurrencyInput
                  value={data.pjValue}
                  onChange={(v) => update({ pjValue: v })}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
            {pfPjTotal > 0 && (
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">PF: <strong className="text-foreground">{pfPercent}%</strong></span>
                <span className="text-muted-foreground">PJ: <strong className="text-foreground">{pjPercent}%</strong></span>
              </div>
            )}
            <ConsultantNote>
              Avaliar exposição jurídica, risco patrimonial e oportunidade de estruturação via holding, reorganização societária ou planejamento sucessório.
            </ConsultantNote>
          </div>

          {/* 3️⃣ Alocação por Classe de Ativo */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Alocação por Classe de Ativo</h4>
            <Label>Como seu patrimônio está distribuído atualmente?</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ativos financeiros líquidos (R$)</Label>
                <CurrencyInput value={data.liquidFinancialAssets} onChange={(v) => update({ liquidFinancialAssets: v })} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Imóveis (R$)</Label>
                <CurrencyInput value={data.realEstate} onChange={(v) => update({ realEstate: v })} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Participações societárias (R$)</Label>
                <CurrencyInput value={data.businessParticipations} onChange={(v) => update({ businessParticipations: v })} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Caixa / conta corrente (R$)</Label>
                <CurrencyInput value={data.cashAccount} onChange={(v) => update({ cashAccount: v })} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <Label>Outros ativos (R$)</Label>
                <CurrencyInput value={data.otherAssets} onChange={(v) => update({ otherAssets: v })} placeholder="R$ 0,00" />
              </div>
            </div>
            <ConsultantNote>
              Identificar grau de liquidez e concentração estrutural. Patrimônio alto com baixa liquidez exige estratégia diferente de patrimônio líquido disponível.
            </ConsultantNote>
          </div>

          {/* 4️⃣ Concentração de Risco */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">4️⃣ Concentração de Risco</h4>
            <Label>Existe concentração relevante em algum ativo ou negócio específico?</Label>
            <Textarea
              value={data.concentrationNotes}
              onChange={(e) => update({ concentrationNotes: e.target.value })}
              placeholder="Descreva a situação..."
              className="crm-input min-h-[80px]"
            />
            <RadioGroup
              value={data.hasConcentration}
              onValueChange={(v) => update({ hasConcentration: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="sim" />
                Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="nao" />
                Não
              </label>
            </RadioGroup>
            {data.hasConcentration === 'sim' && (
              <div className="space-y-2">
                <Label>Qual ativo ou negócio representa maior concentração?</Label>
                <Textarea
                  value={data.concentrationDetail}
                  onChange={(e) => update({ concentrationDetail: e.target.value })}
                  placeholder="Descreva o ativo ou negócio concentrado..."
                  className="crm-input min-h-[70px]"
                />
              </div>
            )}
            <ConsultantNote>
              Detectar risco sistêmico patrimonial. Concentração acima de 50% em um único ativo ou empresa indica vulnerabilidade estratégica.
            </ConsultantNote>
          </div>

          {/* 5️⃣ Dependência da Presença Ativa */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">5️⃣ Dependência da Presença Ativa</h4>
            <Label>Qual parte do seu patrimônio depende diretamente da sua presença ativa para gerar resultado?</Label>
            <Textarea
              value={data.activeDependencyNotes}
              onChange={(e) => update({ activeDependencyNotes: e.target.value })}
              placeholder="Descreva a dependência..."
              className="crm-input min-h-[80px]"
            />
            <div className="space-y-2">
              <Label>Percentual estimado que depende da atuação direta (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={data.activeDependencyPercent}
                onChange={(e) => update({ activeDependencyPercent: e.target.value })}
                placeholder="Ex: 70"
                className="crm-input w-[150px]"
              />
            </div>
            <ConsultantNote>
              Medir risco de dependência pessoal. Alta dependência exige construção acelerada de renda passiva e diversificação.
            </ConsultantNote>
          </div>

          {/* 6️⃣ Síntese Técnica do Consultor */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <h4 className="font-semibold text-primary">6️⃣ Diagnóstico Estrutural Inicial</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível de concentração (% maior ativo)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={data.concentrationLevel}
                  onChange={(e) => update({ concentrationLevel: e.target.value })}
                  placeholder="Ex: 65"
                  className="crm-input w-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Grau de liquidez</Label>
                <Select value={data.liquidityLevel} onValueChange={(v) => update({ liquidityLevel: v })}>
                  <SelectTrigger className="crm-input w-[180px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alto">Alto</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Exposição jurídica</Label>
                <Select value={data.legalExposure} onValueChange={(v) => update({ legalExposure: v })}>
                  <SelectTrigger className="crm-input w-[180px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dependência pessoal</Label>
                <Select value={data.personalDependency} onValueChange={(v) => update({ personalDependency: v })}>
                  <SelectTrigger className="crm-input w-[180px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
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
