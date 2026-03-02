import { useMemo, useCallback } from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import { generateArquiteturaPdf } from '@/lib/pdf-generators';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  const isEmpty = !value;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
      {isEmpty ? (
        <div className="flex items-center gap-1.5 text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-xs">Não preenchido</span>
        </div>
      ) : (
        <span className="text-sm font-medium text-foreground text-right">{value}</span>
      )}
    </div>
  );
}

function AlertItem({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-amber-600 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function ArquiteturaEstrategicaPainel({
  arquiteturaCarteira,
  arquiteturaEstrategica,
  consultantNote,
  onConsultantNoteChange,
  clientName = '',
  advisorName = '',
}: Props) {
  // Resolve values: prefer arquiteturaCarteira (Conhecer o Cliente), fallback to legacy arquiteturaEstrategica
  const objective = arquiteturaCarteira.dominantObjective || arquiteturaEstrategica.dominantObjective || '';
  const riskLevel = arquiteturaCarteira.riskLevel || arquiteturaEstrategica.riskLevel || '';
  const liquidity = arquiteturaCarteira.minLiquidity || arquiteturaEstrategica.structuralLiquidity || '';
  const horizon = arquiteturaEstrategica.strategicHorizon || '';
  const taxDirective = arquiteturaCarteira.taxDirective || '';
  const pillars = arquiteturaEstrategica.pillars || [];

  // Macro allocation from Conhecer o Cliente
  const macroFields = useMemo(() => {
    const fromCarteira = [
      { label: 'Renda Fixa', value: arquiteturaCarteira.fixedIncomePct },
      { label: 'Renda Variável', value: arquiteturaCarteira.equitiesPct },
      { label: 'Renda Passiva (FIIs)', value: arquiteturaCarteira.passiveIncomePct },
      { label: 'Internacional', value: arquiteturaCarteira.internationalPct },
      { label: 'Alternativos', value: arquiteturaCarteira.alternativesPct },
      { label: 'Caixa / Oportunidade', value: arquiteturaCarteira.cashPct },
    ];
    const hasData = fromCarteira.some(f => f.value && parseFloat(f.value) > 0);
    if (hasData) return { source: 'carteira' as const, fields: fromCarteira };

    // Fallback to legacy
    const fromLegacy = [
      { label: 'Renda Fixa', value: String(arquiteturaEstrategica.fixedIncomePct || 0) },
      { label: 'Renda Variável', value: String(arquiteturaEstrategica.equitiesPct || 0) },
      { label: 'Internacional', value: String(arquiteturaEstrategica.internationalPct || 0) },
      { label: 'Alternativos', value: String(arquiteturaEstrategica.alternativesPct || 0) },
      { label: 'Caixa / Oportunidade', value: String(arquiteturaEstrategica.cashPct || 0) },
    ];
    const hasLegacy = fromLegacy.some(f => parseFloat(f.value) > 0);
    if (hasLegacy) return { source: 'legacy' as const, fields: fromLegacy };

    return null;
  }, [arquiteturaCarteira, arquiteturaEstrategica]);

  // Build alerts for missing fields
  const alerts = useMemo(() => {
    const result: string[] = [];
    if (!objective) result.push('Falta definir "Objetivo dominante" no Conhecer o Cliente.');
    if (!riskLevel) result.push('Falta definir "Nível de risco" no Conhecer o Cliente.');
    if (!liquidity) result.push('Falta definir "Liquidez mínima" no Conhecer o Cliente.');
    if (!horizon) result.push('Falta definir "Horizonte estratégico" no Conhecer o Cliente.');
    if (!macroFields) result.push('Mapa macro não definido no Conhecer o Cliente.');
    if (pillars.length === 0) result.push('Falta definir "Pilares estratégicos" no Conhecer o Cliente.');
    return result;
  }, [objective, riskLevel, liquidity, horizon, macroFields, pillars]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Painel automático — dados extraídos do módulo <strong>Conhecer o Cliente</strong>. Para alterar, edite o módulo mestre.
      </p>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1.5">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Campos pendentes</span>
          {alerts.map((a, i) => <AlertItem key={i} message={a} />)}
        </div>
      )}

      {/* Resumo automático */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-1">
        <h4 className="font-semibold text-foreground text-sm mb-3">Resumo Automático da Arquitetura</h4>
        <InfoRow label="Objetivo dominante" value={objective} />
        <InfoRow label="Nível de risco recomendado" value={riskLevel} />
        <InfoRow label="Horizonte estratégico" value={horizon} />
        <InfoRow label="Liquidez mínima necessária" value={liquidity} />
        <InfoRow label="Diretrizes tributárias" value={taxDirective} />
      </div>

      {/* Pilares */}
      {pillars.length > 0 && (
        <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
          <h4 className="font-semibold text-foreground text-sm">Pilares Estratégicos</h4>
          <div className="flex flex-wrap gap-2">
            {pillars.map((p, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Mapa macro */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-semibold text-foreground text-sm">Mapa Macro de Alocação</h4>
        {macroFields ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {macroFields.fields.map((f) => {
              const pct = parseFloat(f.value) || 0;
              if (pct === 0) return null;
              return (
                <div key={f.label} className="p-3 bg-card rounded-lg border border-border text-center">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  <p className="text-lg font-bold text-foreground">{pct}%</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-amber-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Mapa macro não definido no Conhecer o Cliente.
          </p>
        )}
      </div>

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
