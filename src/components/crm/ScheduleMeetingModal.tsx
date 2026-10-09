import { useState } from 'react';
import { Calendar, Clock, User, Mail, FileText, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Client } from '@/types/client';
import { toast } from 'sonner';
import { useClients } from '@/contexts/ClientContext';

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSuccess?: () => void;
}

export function ScheduleMeetingModal({ 
  open, 
  onOpenChange, 
  client,
  onSuccess 
}: ScheduleMeetingModalProps) {
  const { isConnected, connect, createMeeting, isLoading: isCheckingConnection } = useGoogleCalendar();
  const { updateClient } = useClients();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [title, setTitle] = useState(client ? `Reunião com ${client.name}` : '');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState(client?.name || '');
  const [clientEmail, setClientEmail] = useState(client?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedDate(undefined);
    setStartTime('09:00');
    setEndTime('10:00');
    setTitle(client ? `Reunião com ${client.name}` : '');
    setDescription('');
    setClientName(client?.name || '');
    setClientEmail(client?.email || '');
  };

  const handleSubmit = async () => {
    if (!selectedDate || !title || !clientName) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse times
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startAt = setMinutes(setHours(selectedDate, startHour), startMin);
      const endAt = setMinutes(setHours(selectedDate, endHour), endMin);

      if (endAt <= startAt) {
        toast.error('O horário de término deve ser após o horário de início.');
        setIsSubmitting(false);
        return;
      }

      const result = await createMeeting({
        clientId: client?.id,
        clientName,
        clientEmail: clientEmail || undefined,
        title,
        description: description || undefined,
        startAt,
        endAt
      });

      if (result.success) {
        if (client?.id) {
          try {
            await updateClient(client.id, { lastMeetingDate: startAt, lastActivityAt: new Date() });
          } catch (e) {
            console.error('Falha ao atualizar última reunião:', e);
          }
        }
        if (result.googleEventCreated) {
          toast.success('Reunião agendada e adicionada ao Google Agenda!');
        } else {
          toast.success('Reunião agendada com sucesso!');
        }
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } else if (result.needsConnection) {
        toast.error(result.error);
      } else {
        toast.error(result.error || 'Erro ao agendar reunião.');
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast.error('Erro ao agendar reunião.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Agendar Reunião
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Google Calendar Connection Warning */}
          {!isCheckingConnection && !isConnected && (
            <Alert className="bg-warning/10 border-warning/30">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <AlertDescription className="ml-2">
                <div className="flex flex-col gap-2">
                  <span className="text-sm">
                    Conecte sua conta Google para sincronizar reuniões automaticamente.
                  </span>
                  <Button size="sm" variant="outline" onClick={connect}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Conectar Google Agenda
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="clientName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nome do Cliente *
            </Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome do cliente"
              disabled={!!client}
            />
          </div>

          {/* Client Email */}
          <div className="space-y-2">
            <Label htmlFor="clientEmail" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email do Cliente
            </Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
            <p className="text-xs text-muted-foreground">
              Se informado, o cliente receberá um convite do Google Agenda.
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Título da Reunião *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da reunião"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Início *
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Término *
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição ou pauta da reunião..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedDate || !title || !clientName}>
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Agendando...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Reunião
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
