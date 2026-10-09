import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Copy, Mail, MessageCircle, RefreshCw, Loader2 } from 'lucide-react';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; clientId: string; clientName: string; }
interface Token { id: string; token: string; status: string; expires_at: string | null; completed_at: string | null; }

export function FormLinkDialog({ open, onOpenChange, clientId, clientName }: Props) {
  const { user } = useAuth();
  const [token, setToken] = useState<Token | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('client_form_tokens')
      .insert({ client_id: clientId, user_id: user.id, client_name: clientName, status: 'sent',
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
      .select('id, token, status, expires_at, completed_at').single();
    if (error) { toast.error('Não foi possível gerar o link.'); return null; }
    return data as Token;
  };

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setBusy(true);
      const { data } = await supabase.from('client_form_tokens')
        .select('id, token, status, expires_at, completed_at')
        .eq('client_id', clientId).eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      const valid = data && (!data.expires_at || new Date(data.expires_at) > new Date());
      setToken(valid ? (data as Token) : await create());
      setBusy(false);
    })();
  }, [open, clientId, user?.id]);

  const regenerate = async () => {
    setBusy(true);
    if (token) await supabase.from('client_form_tokens').update({ expires_at: new Date().toISOString() }).eq('id', token.id);
    setToken(await create());
    setBusy(false);
    toast.success('Novo link gerado. O anterior foi invalidado.');
  };

  const url = token ? `${window.location.origin}/client-form/${token.token}` : '';
  const msg = `Olá${clientName ? `, ${clientName.split(' ')[0]}` : ''}! Para prepararmos sua reunião, preencha este formulário: ${url}`;
  const daysLeft = token?.expires_at ? Math.max(0, Math.ceil((new Date(token.expires_at).getTime() - Date.now()) / 86400000)) : null;
  const submitted = token && ['completed', 'updated'].includes(token.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Formulário do cliente</DialogTitle>
          <DialogDescription>Envie o link para o cliente preencher antes da reunião, sem precisar de login.</DialogDescription>
        </DialogHeader>
        {busy || !token ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={url} className="crm-input text-xs" />
              <Button type="button" size="sm" onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copiado!'); }} className="gap-1.5"><Copy className="w-3.5 h-3.5" />Copiar</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')}><MessageCircle className="w-3.5 h-3.5" />Enviar por WhatsApp</Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('Formulário de Planejamento Financeiro')}&body=${encodeURIComponent(msg)}`; }}><Mail className="w-3.5 h-3.5" />Enviar por Email</Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={regenerate}><RefreshCw className="w-3.5 h-3.5" />Gerar novo link</Button>
            </div>
            <div className="text-sm rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <p><span className="text-muted-foreground">Status: </span>{submitted ? `Preenchido em ${new Date(token.completed_at || '').toLocaleDateString('pt-BR')}` : 'Aguardando preenchimento'}</p>
              {daysLeft !== null && <p className="text-muted-foreground">Expira em {daysLeft} dia{daysLeft === 1 ? '' : 's'}</p>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
