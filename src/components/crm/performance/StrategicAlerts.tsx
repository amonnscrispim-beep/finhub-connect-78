import { AlertTriangle } from 'lucide-react';

interface StrategicAlertsProps {
  alerts: string[];
}

export function StrategicAlerts({ alerts }: StrategicAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="p-4 bg-card rounded-xl border border-border shadow-sm space-y-3">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        Alertas Estratégicos
      </h3>
      <div className="space-y-1.5">
        {alerts.map((a, i) => (
          <div
            key={i}
            className={`p-2 rounded text-xs border ${
              a.startsWith('🔴') ? 'bg-destructive/10 border-destructive/30 text-destructive' :
              a.startsWith('⚠️') ? 'bg-yellow-500/10 border-yellow-500/30 text-foreground' :
              a.startsWith('   •') ? 'bg-muted/30 border-border text-muted-foreground ml-4' :
              'bg-muted/30 border-border text-foreground'
            }`}
          >
            {a}
          </div>
        ))}
      </div>
    </div>
  );
}
