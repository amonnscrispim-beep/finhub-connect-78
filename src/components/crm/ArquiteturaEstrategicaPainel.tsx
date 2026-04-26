import { FileText } from 'lucide-react';
import { generateArquiteturaPdf } from '@/lib/pdf-generators';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { ArquiteturaCarteiraData } from './ArquiteturaCarteira';
import type { ArquiteturaEstrategicaData } from './ArquiteturaEstrategicaCarteira';

interface Props {
  arquiteturaCarteira: ArquiteturaCarteiraData;
  arquiteturaEstrategica: ArquiteturaEstrategicaData;
  consultantNote: string;
  onConsultantNoteChange: (value: string) => void;
  clientName?: string;
  advisorName?: string;
}

export function ArquiteturaEstrategicaPainel({
  arquiteturaCarteira,
  arquiteturaEstrategica,
  consultantNote,
  onConsultantNoteChange,
  clientName = '',
  advisorName = '',
}: Props) {
  const objective = arquiteturaCarteira.dominantObjective || arquiteturaEstrategica.dominantObjective || '';
  const riskLevel = arquiteturaCarteira.riskLevel || arquiteturaEstrategica.riskLevel || '';
  const liquidity = arquiteturaCarteira.minLiquidity || arquiteturaEstrategica.structuralLiquidity || '';
  const horizon = arquiteturaEstrategica.strategicHorizon || '';
  const taxDirective = '';
  const pillars = arquiteturaEstrategica.pillars || [];
  const macroFields = null;

  return (
    <div className="space-y-6">
      {/* Único campo editável */}
      <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-3">
        <h4 className="font-semibold text-primary text-sm">Observação Estratégica do Consultor</h4>
        <Label className="text-xs text-muted-foreground">
          Campo livre para anotações e considerações estratégicas do consultor.
        </Label>
        <Textarea
          value={consultantNote}
          onChange={(e) => onConsultantNoteChange(e.target.value)}
          placeholder="Ex: ajustar exposição a renda variável após próxima revisão trimestral..."
          className="crm-input min-h-[100px]"
        />
      </div>

      {/* Gerar PDF */}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => generateArquiteturaPdf({
          clientName, advisorName, objective, riskLevel, liquidity, horizon, taxDirective, pillars, macroFields, consultantNote,
        })}>
          <FileText className="w-4 h-4" />
          Gerar PDF
        </Button>
      </div>
    </div>
  );
}
