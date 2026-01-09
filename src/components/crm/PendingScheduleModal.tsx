import { useState } from 'react';
import { Calendar, User, ChevronRight, CalendarIcon } from 'lucide-react';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PendingScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClient: (client: Client) => void;
}

export function PendingScheduleModal({ open, onOpenChange, onEditClient }: PendingScheduleModalProps) {
  const { clients, scheduleClientMeeting } = useClients();
  const [schedulingClient, setSchedulingClient] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  
  const pendingClients = clients.filter(c => c.pendingSchedule);

  const handleSchedule = (clientId: string) => {
    if (selectedDate) {
      scheduleClientMeeting(clientId, { date: selectedDate, time: selectedTime || undefined });
      setSchedulingClient(null);
      setSelectedDate(undefined);
      setSelectedTime('');
    }
  };

  const handleOpenClient = (client: Client) => {
    onOpenChange(false);
    onEditClient(client);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Calendar className="w-5 h-5" />
            Agendamentos Pendentes ({pendingClients.length})
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {pendingClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum agendamento pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingClients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-full bg-destructive/10">
                        <User className="w-4 h-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{client.name}</h4>
                        <p className="text-sm text-muted-foreground">{client.funnelStage}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Última atualização: {client.updatedAt.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => handleOpenClient(client)}
                      >
                        Abrir
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                      
                      {schedulingClient === client.id ? (
                        <div className="space-y-2 p-2 bg-background rounded border">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "w-full justify-start text-left font-normal text-xs h-8",
                                  !selectedDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Horário"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 h-7 text-xs"
                              onClick={() => setSchedulingClient(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs bg-success hover:bg-success/90"
                              onClick={() => handleSchedule(client.id)}
                              disabled={!selectedDate}
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs h-8 bg-success hover:bg-success/90"
                          onClick={() => setSchedulingClient(client.id)}
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Agendar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
