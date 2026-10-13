import { supabase } from '@/integrations/supabase/client';

/** Formulário mesclado na tela, mas ainda não gravado. Só é marcado como mesclado após salvar a ficha. */
const key = (clientId: string) => `crm-pending-form-merge:${clientId}`;

export const setPendingMerge = (clientId: string, tokenId: string) => {
  try { localStorage.setItem(key(clientId), tokenId); } catch { /* ignore */ }
};
export const getPendingMerge = (clientId: string): string | null => {
  try { return localStorage.getItem(key(clientId)); } catch { return null; }
};
export const clearPendingMerge = (clientId: string) => {
  try { localStorage.removeItem(key(clientId)); } catch { /* ignore */ }
};

/** Chamar somente depois que a ficha foi salva com sucesso. */
export async function commitPendingMerge(clientId: string) {
  const tokenId = getPendingMerge(clientId);
  if (!tokenId) return;
  const { error } = await supabase.from('client_form_tokens')
    .update({ merged_at: new Date().toISOString(), status: 'updated' }).eq('id', tokenId);
  if (!error) clearPendingMerge(clientId);
}
