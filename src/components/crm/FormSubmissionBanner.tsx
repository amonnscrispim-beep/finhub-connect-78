import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ConhecerClienteData } from './conhecer/types';
import { mergeClientFormData } from './conhecer/merge';
import { FormSubmissionPreview } from './FormSubmissionPreview';

interface Props { clientId: string; data: ConhecerClienteData; onMerge: (d: ConhecerClienteData) => void; }
interface Submission { id: string; responses: Record<string, any>; completed_at: string | null; }

export function FormSubmissionBanner({ clientId, data, onMerge }: Props) {
  const { user } = useAuth();
  const [sub, setSub] = useState<Submission | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('client_form_tokens').select('id, responses, completed_at')
      .eq('client_id', clientId).eq('user_id', user.id).eq('status', 'completed').is('merged_at', null)
      .order('completed_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data: row }) => {
        // Só formulários no novo formato (versão 2) podem ser mesclados
        if (row && (row.responses as any)?._formVersion === 2) setSub(row as Submission);
      });
  }, [clientId, user?.id]);

  if (!sub) return null;

  const merge = async () => {
    onMerge(mergeClientFormData(data, sub.responses));
    const { error } = await supabase.from('client_form_tokens').update({ merged_at: new Date().toISOString(), status: 'updated' }).eq('id', sub.id);
    if (error) { toast.error('Dados mesclados, mas não foi possível marcar o formulário.'); return; }
    toast.success('Dados do cliente mesclados com sucesso! Clique em Salvar para gravar.');
    setPreviewOpen(false);
    setSub(null);
  };

  return (
    <>
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
      <FormSubmissionPreview open={previewOpen} onOpenChange={setPreviewOpen} current={data} submitted={sub.responses} onMerge={merge} />
    </>
  );
}
