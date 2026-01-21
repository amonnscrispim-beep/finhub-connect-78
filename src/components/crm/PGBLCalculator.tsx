import { useState, useMemo } from 'react';
import { Calculator, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { CurrencyInput, formatCurrencyBR } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

type TaxDeclaration = 'completa' | 'simplificada' | '';

const IR_RATES = [
  { value: '0', label: '0% (Isento)' },
  { value: '7.5', label: '7,5%' },
  { value: '15', label: '15%' },
  { value: '22.5', label: '22,5%' },
  { value: '27.5', label: '27,5%' },
];

export function PGBLCalculator() {
  const [taxableIncome, setTaxableIncome] = useState('');
  const [marginalRate, setMarginalRate] = useState('');
  const [annualContribution, setAnnualContribution] = useState('');
  const [declarationType, setDeclarationType] = useState<TaxDeclaration>('');

  const calculation = useMemo(() => {
    const income = parseFloat(taxableIncome) || 0;
    const rate = parseFloat(marginalRate) || 0;
    const contribution = parseFloat(annualContribution) || 0;

    if (income <= 0 || contribution <= 0) {
      return null;
    }

    // Maximum deductible: 12% of taxable income
    const maxDeductible = income * 0.12;
    const actualDeductible = Math.min(contribution, maxDeductible);
    const excessContribution = Math.max(0, contribution - maxDeductible);
    const newTaxableBase = income - actualDeductible;
    const estimatedSavings = actualDeductible * (rate / 100);

    return {
      maxDeductible,
      actualDeductible,
      excessContribution,
      originalBase: income,
      newTaxableBase,
      estimatedSavings,
      rate,
    };
  }, [taxableIncome, marginalRate, annualContribution]);

  const isSimplificada = declarationType === 'simplificada';
  const showCalculation = declarationType === 'completa' && calculation !== null;

  return (
    <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Calculator className="w-5 h-5" />
        <h4 className="font-medium">Simulador de Benefício Fiscal PGBL</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Regime de Declaração do IR</Label>
          <Select value={declarationType} onValueChange={(value) => setDeclarationType(value as TaxDeclaration)}>
            <SelectTrigger className="crm-input">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completa">Declaração Completa</SelectItem>
              <SelectItem value="simplificada">Declaração Simplificada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isSimplificada && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> O PGBL geralmente só faz sentido na declaração completa, pois a dedução 
            dos 12% não se aplica da mesma forma na simplificada. Considere avaliar com um contador.
          </AlertDescription>
        </Alert>
      )}

      {declarationType === 'completa' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Base Tributável Anual</Label>
              <CurrencyInput
                value={taxableIncome}
                onChange={setTaxableIncome}
                placeholder="Ex: R$ 100.000,00"
              />
              <p className="text-xs text-muted-foreground">Renda anual tributável</p>
            </div>

            <div className="space-y-2">
              <Label>Alíquota Marginal do IR</Label>
              <Select value={marginalRate} onValueChange={setMarginalRate}>
                <SelectTrigger className="crm-input">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {IR_RATES.map((rate) => (
                    <SelectItem key={rate.value} value={rate.value}>
                      {rate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aporte Anual no PGBL</Label>
              <CurrencyInput
                value={annualContribution}
                onChange={setAnnualContribution}
                placeholder="Ex: R$ 12.000,00"
              />
            </div>
          </div>

          {showCalculation && (
            <div className="mt-4 p-4 bg-card rounded-lg border border-border space-y-4">
              <div className="flex items-center gap-2 text-success">
                <TrendingUp className="w-4 h-4" />
                <h5 className="font-medium">Resultado da Simulação</h5>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Limite de 12%</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrencyBR(calculation.maxDeductible)}
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Aporte Dedutível</p>
                  <p className="text-lg font-semibold text-success">
                    {formatCurrencyBR(calculation.actualDeductible)}
                  </p>
                </div>

                {calculation.excessContribution > 0 && (
                  <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
                    <p className="text-xs text-muted-foreground">Fora do Limite</p>
                    <p className="text-lg font-semibold text-warning">
                      {formatCurrencyBR(calculation.excessContribution)}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Base Original</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrencyBR(calculation.originalBase)}
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Nova Base Tributável</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrencyBR(calculation.newTaxableBase)}
                  </p>
                </div>

                <div className="p-3 bg-success/10 rounded-lg border border-success/30">
                  <p className="text-xs text-muted-foreground">Economia Estimada de IR</p>
                  <p className="text-xl font-bold text-success">
                    {formatCurrencyBR(calculation.estimatedSavings)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({calculation.rate.toFixed(1).replace('.', ',')}% de alíquota)
                  </p>
                </div>
              </div>

              <Alert className="bg-muted/50 border-muted">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs text-muted-foreground">
                  <strong>Aviso:</strong> Estimativa simplificada. Não considera outras deduções, 
                  dependentes, previdência oficial, descontos legais ou particularidades do 
                  contribuinte. Consulte um contador para um cálculo preciso.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </>
      )}
    </div>
  );
}
