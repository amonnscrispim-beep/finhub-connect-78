import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ConhecerClienteData } from './conhecer/types';
import { mergeClientFormData } from './conhecer/merge';
import { setPendingMerge, getPendingMerge } from './conhecer/pendingMerge';
import { FormSubmissionPreview } from './FormSubmissionPreview';

interface Props { clientId: string; data: ConhecerClienteData; onMerge: (d: ConhecerClienteData) => void; }
interface Submission { id: string; responses: Record<string, any>; completed_at: string | null; }

export function FormSubmissionBanner({ clientId, data, onMerge }: Props) {
  const { user } = useAuth();
  const [sub, setSub] = useState<Submission | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [mergedLocally, setMergedLocally] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setSub(null); setIsRecovery(false);
    setMergedLocally(!!getPendingMerge(clientId));
    (async () => {
      const { data: row } = await supabase.from('client_form_tokens').select('id, responses, completed_at')
        .eq('client_id', clientId).eq('user_id', user.id).eq('status', 'completed').is('merged_at', null)
        .order('completed_at', { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (row && (row.responses as any)?._formVersion === 2) { setSub(row as Submission); return; }

      // Recuperação: formulário marcado como mesclado, mas a ficha ficou sem os dados básicos
      const { data: mergedRow } = await supabase.from('client_form_tokens').select('id, responses, completed_at')
        .eq('client_id', clientId).eq('user_id', user.id).eq('status', 'updated').not('merged_at', 'is', null)
        .order('completed_at', { ascending: false }).limit(1).maybeSingle();
      if (cancelled || !mergedRow || !(mergedRow.responses as any)?._formVersion) return;
      const d = data as any;
      if (!d?.birthDate && !d?.civilStatus && !d?.profession) {
        setSub(mergedRow as Submission); setIsRecovery(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user?.id]);

  if (!sub) return null;

  const merge = () => {
    onMerge(mergeClientFormData(data, sub.responses));
    if (!isRecovery) setPendingMerge(clientId, sub.id);
    setMergedLocally(true);
    setPreviewOpen(false);
    toast.success('Dados do cliente mesclados! Clique em "Salvar Alterações" para gravar definitivamente.');
  };

  if (mergedLocally) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        <p className="text-sm text-foreground">Dados do formulário mesclados. Clique em <strong>Salvar Alterações</strong> para gravar na ficha.</p>
      </div>
    );
  }

  return (
    <>
      {isRecovery ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Dados do formulário precisam ser recuperados</p>
              <p className="text-xs text-muted-foreground">O cliente preencheu o formulário, mas os dados não foram salvos na ficha. Clique para recuperar.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>Visualizar</Button>
            <Button type="button" size="sm" onClick={merge}>Recuperar Dados</Button>
          </div>
        </div>
      ) : (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Formulário preenchido pelo cliente</p>
              <p className="text-xs text-muted-foreground">
                Enviado em {sub.completed_at ? new Date(sub.completed_at).toLocaleDateString('pt-BR') : '—'}. Os dados serão mesclados com o que já existe.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>Visualizar</Button>
            <Button type="button" size="sm" onClick={merge}>Mesclar Dados</Button>
          </div>
        </div>
      )}
      <FormSubmissionPreview open={previewOpen} onOpenChange={setPreviewOpen} current={data} submitted={sub.responses} onMerge={merge} />
    </>
  );
}
