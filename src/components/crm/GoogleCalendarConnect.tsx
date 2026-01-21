import { Calendar, Link2, Link2Off, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GoogleCalendarConnectProps {
  compact?: boolean;
}

export function GoogleCalendarConnect({ compact = false }: GoogleCalendarConnectProps) {
  const { isConnected, googleEmail, isLoading, connect, disconnect } = useGoogleCalendar();

  if (isLoading) {
    return compact ? (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Verificando...
      </Button>
    ) : (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-muted-foreground">Verificando conexão...</span>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    if (isConnected) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-success" />
            <span className="hidden sm:inline">{googleEmail || 'Conectado'}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={disconnect} title="Desconectar">
            <Link2Off className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <Button variant="outline" size="sm" onClick={connect}>
        <Calendar className="w-4 h-4 mr-2" />
        Conectar Google Agenda
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Google Agenda
        </CardTitle>
        <CardDescription>
          Conecte sua conta Google para sincronizar reuniões automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <Alert className="bg-success/10 border-success/30">
              <Link2 className="w-4 h-4 text-success" />
              <AlertDescription className="ml-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-success">Conectado</span>
                  {googleEmail && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {googleEmail}
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Reuniões agendadas no CRM serão automaticamente adicionadas ao seu Google Agenda.
            </p>
            <Button variant="outline" onClick={disconnect} className="w-full">
              <Link2Off className="w-4 h-4 mr-2" />
              Desconectar Google Agenda
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Ao conectar, você poderá criar eventos no seu Google Agenda diretamente ao agendar reuniões com clientes.
            </p>
            <Button onClick={connect} className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Conectar Google Agenda
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
