import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Link2, Copy, RefreshCw, ExternalLink, AlertTriangle, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ClientSummaryModal } from './ClientSummaryModal';

interface ClientFormLinkProps {
  clientId: string;
  clientName: string;
  onFormCompleted?: () => void;
}

interface FormToken {
  id: string;
  token: string;
  status: string;
  responses: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  completed_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_sent: { label: 'Não enviado', variant: 'outline' },
  sent: { label: 'Enviado', variant: 'secondary' },
  in_progress: { label: 'Em andamento', variant: 'default' },
  completed: { label: 'Concluído', variant: 'default' },
  updated: { label: 'Atualizado', variant: 'default' },
};

export function ClientFormLink({ clientId, clientName, onFormCompleted }: ClientFormLinkProps) {
  const { user } = useAuth();
  const [formToken, setFormToken] = useState<FormToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    loadToken();
  }, [clientId]);

  const loadToken = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('client_form_tokens')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setFormToken(data as FormToken | null);
    setLoading(false);
  };

  const generateLink = async () => {
    if (!user) return;
    setGenerating(true);
    const { data, error } = await supabase
      .from('client_form_tokens')
      .insert({
        client_id: clientId,
        user_id: user.id,
        client_name: clientName,
        status: 'sent',
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao gerar link');
      console.error(error);
    } else {
      setFormToken(data as FormToken);
      toast.success('Link gerado com sucesso!');
    }
    setGenerating(false);
  };

  const copyLink = () => {
    if (!formToken) return;
    const url = `${window.location.origin}/formulario/${formToken.token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const regenerateLink = async () => {
    if (!user || !formToken) return;
    // Delete old token
    await supabase.from('client_form_tokens').delete().eq('id', formToken.id);
    await generateLink();
  };

  const handleSync = async (mode: 'overwrite' | 'merge' | 'keep') => {
    if (!formToken || !user) return;
    setSyncing(true);

    if (mode === 'keep') {
      // Just mark as synced, don't update CRM
      await supabase
        .from('client_form_tokens')
        .update({ status: 'updated' })
        .eq('id', formToken.id);
      toast.success('Dados do CRM mantidos. Formulário marcado como sincronizado.');
    } else {
      // Call the edge function to sync (it already syncs on submit, but for overwrite/merge after review)
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/client-form`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: formToken.token,
            responses: formToken.responses,
            submit: true,
          }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success(mode === 'overwrite' ? 'Dados do CRM substituídos pelo formulário.' : 'Dados mesclados com sucesso.');
        onFormCompleted?.();
      } else {
        toast.error('Erro ao sincronizar');
      }
    }

    setSyncing(false);
    setSyncDialogOpen(false);
    loadToken();
  };

  if (loading) return null;

  const statusInfo = formToken ? STATUS_MAP[formToken.status] || STATUS_MAP.not_sent : STATUS_MAP.not_sent;
  const isExpired = formToken?.expires_at ? new Date(formToken.expires_at) < new Date() : false;
  const isCompleted = formToken?.status === 'completed';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Resumo do Cliente</span>
        </div>

        <Button size="sm" onClick={() => setSummaryOpen(true)} className="gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Gerar Resumo do Cliente
        </Button>
      </div>

      <ClientSummaryModal
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        clientId={clientId}
        clientName={clientName}
      />
    </div>
  );
}
