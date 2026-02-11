import { AlertTriangle, Info } from 'lucide-react';

interface Props {
  financialAssets: number;
  materialAssets: number;
  businessAssets: number;
  emergencyReserve: number;
  monthlyLivingCost: number | null;
  monthlyRevenue: number;
  monthlyContribution: number;
}

interface AlertItem {
  text: string;
  level: 'warning' | 'info';
}

export function AlertasConsultor({
  financialAssets,
  materialAssets,
  businessAssets,
  emergencyReserve,
  monthlyLivingCost,
  monthlyRevenue,
  monthlyContribution,
}: Props) {
  const alerts: AlertItem[] = [];
  const total = financialAssets + materialAssets + businessAssets;

  // Liquidez
  if (!monthlyLivingCost || monthlyLivingCost === 0) {
    alerts.push({ text: 'Sem custo mensal preenchido — não é possível calcular liquidez', level: 'info' });
  } else if (emergencyReserve <= 0) {
    alerts.push({ text: 'Sem reserva de emergência preenchida', level: 'warning' });
  } else {
    const months = emergencyReserve / monthlyLivingCost;
    if (months < 6) {
      alerts.push({ text: `Reserva abaixo de 6 meses (${months.toFixed(1)} meses)`, level: 'warning' });
    }
  }

  // Concentração empresarial
  if (total > 0 && businessAssets / total > 0.5) {
    alerts.push({ text: 'Patrimônio muito concentrado em empresa', level: 'warning' });
  }

  // Aporte vs receita
  if (monthlyRevenue > 0 && monthlyContribution > 0) {
    const savingsRate = (monthlyContribution * 12) / (monthlyRevenue * 12) * 100;
    if (savingsRate < 10) {
      alerts.push({ text: `Aporte mensal baixo vs faturamento (${savingsRate.toFixed(1)}%)`, level: 'warning' });
    }
  }

  // Financeiro muito baixo
  if (total > 0 && financialAssets / total < 0.1) {
    alerts.push({ text: 'Patrimônio financeiro abaixo de 10% do total', level: 'warning' });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        Alertas do Consultor
      </h4>
      <div className="space-y-1.5">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 text-xs px-3 py-2 rounded-md ${
              alert.level === 'warning'
                ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
            }`}
          >
            {alert.level === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            ) : (
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            )}
            <span>{alert.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
