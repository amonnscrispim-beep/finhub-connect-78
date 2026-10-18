import { useEffect, useState } from 'react';
import { Users, ArrowRightLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/contexts/ClientContext';
import { toast } from 'sonner';

interface Consultant {
  user_id: string;
  email: string;
  full_name: string;
  client_count: number;
}

interface MigrateClientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrateClientsModal({ open, onOpenChange }: MigrateClientsModalProps) {
  const { user } = useAuth();
  const { refetch } = useClients();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [isMaster, setIsMaster] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [fromUser, setFromUser] = useState<string>('');
  const [toUser, setToUser] = useState<string>('');

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    setFromUser('');
    setToUser('');

    (async () => {
      const [{ data: masterData, error: masterError }, { data: listData, error: listError }] = await Promise.all([
        supabase.rpc('is_master_user', { p_user_id: user.id }),
        supabase.rpc('admin_list_consultants'),
      ]);
      if (cancelled) return;
      if (masterError || listError) {
        toast.error('Não foi possível carregar as contas. Tente novamente.');
        setIsMaster(false);
        setConsultants([]);
      } else {
        setIsMaster(Boolean(masterData));
        setConsultants((listData as unknown as Consultant[]) ?? []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [open, user?.id]);

  const origin = consultants.find(c => c.user_id === fromUser);
  const destination = consultants.find(c => c.user_id === toUser);
  const canMigrate = Boolean(fromUser && toUser && fromUser !== toUser && !migrating);

  const handleMigrate = async () => {
    if (!canMigrate) return;
    setMigrating(true);
    const { data, error } = await supabase.rpc('admin_migrate_clients', {
      p_from_user: fromUser,
      p_to_user: toUser,
    });
    setMigrating(false);

    if (error) {
      toast.error(error.message || 'Falha ao migrar clientes.');
      return;
    }

    const result = data as { clients_moved?: number } | null;
    const moved = result?.clients_moved ?? 0;
    toast.success(`Migração concluída: ${moved} cliente(s) movido(s).`);
    await refetch();
    onOpenChange(false);
  };

  const label = (c?: Consultant) => (c ? `${c.full_name || c.email} (${c.client_count})` : '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Migrar Clientes
          </DialogTitle>
          <DialogDescription>
            Move todos os clientes de uma conta para outra, junto com reuniões, tarefas, arquivos e demais registros vinculados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isMaster === false ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Acesso restrito</p>
              <p className="text-muted-foreground">
                Apenas a conta mestre pode migrar clientes entre consultores.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Conta de origem</label>
              <Select value={fromUser} onValueChange={setFromUser}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map(c => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.full_name || c.email} — {c.client_count} cliente(s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Conta de destino</label>
              <Select value={toUser} onValueChange={setToUser}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {consultants
                    .filter(c => c.user_id !== fromUser)
                    .map(c => (
                      <SelectItem key={c.user_id} value={c.user_id}>
                        {c.full_name || c.email} — {c.client_count} cliente(s)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {origin && destination && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p>
                  <span className="font-medium">{origin.client_count}</span> cliente(s) passarão de{' '}
                  <span className="font-medium">{origin.full_name || origin.email}</span> para{' '}
                  <span className="font-medium">{destination.full_name || destination.email}</span>.
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Registros vinculados (reuniões, tarefas, arquivos, aportes, relatórios e outros) acompanham cada cliente.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-foreground/80">
                Esta ação move as contas de forma permanente e não pode ser desfeita automaticamente. Confira se selecionou as contas corretas.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={migrating}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleMigrate} disabled={!canMigrate}>
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Confirmar migração
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
