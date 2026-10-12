import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ShieldCheck, FileText, Link2, Copy, MessageCircle, Mail, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { PROFILE_DESC, ALLOCATIONS } from '@/lib/suitability';
import { generateSuitabilityPDF, type SuitabilityRecord } from '@/utils/suitabilityPdf';

interface Props { clientId: string; clientName: string; clientPhone?: string; clientEmail?: string; onProfile?: (p: string) => void; }
interface Token { id: string; short_code: string; status: string; expires_at: string; submitted_at: string | null; submitted_data: any; merged_at: string | null; }

const genCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '-');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function SuitabilityModule({ clientId, clientName, clientPhone, clientEmail, onProfile }: Props) {
  const { user } = useAuth();
  const [active, setActive] = useState<(SuitabilityRecord & { id: string }) | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from('client_suitability').select('*').eq('client_id', clientId).eq('status', 'active').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('client_suitability_tokens').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setActive(s as any); setToken(t as any);
  };
  useEffect(() => { load(); }, [clientId]);

  const openLink = async () => {
    if (!user) return;
    setOpen(true);
    if (token && token.status === 'pending' && new Date(token.expires_at) > new Date()) return;
    setBusy(true);
    const { data, error } = await supabase.from('client_suitability_tokens')
      .insert({ client_id: clientId, user_id: user.id, short_code: genCode() }).select('*').single();
    setBusy(false);
    if (error) { toast.error('Não foi possível gerar o link.'); setOpen(false); return; }
    setToken(data as any);
  };

  const ack = async () => {
    if (!token) return;
    await supabase.from('client_suitability_tokens').update({ merged_at: new Date().toISOString() }).eq('id', token.id);
    const p = token.submitted_data?.calculatedProfile;
    if (p) onProfile?.(cap(p));
    setToken({ ...token, merged_at: new Date().toISOString() });
  };

  const url = token ? `${window.location.origin}/s/${token.short_code}` : '';
  const first = clientName?.split(' ')[0] || '';
  const msg = `Olá ${first}! Para adequarmos seus investimentos ao seu perfil, precisamos que você preencha este questionário rápido:\n\n${url}\n\nLeva menos de 5 minutos.`;
  const days = token ? Math.max(0, Math.ceil((new Date(token.expires_at).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" />Suitability — Perfil do Investidor</h3>
          <p className="text-sm text-muted-foreground">Análise de adequação ao perfil (API/CVM)</p>
        </div>
        <div className="flex items-center gap-2">
          {active && <Button variant="outline" size="sm" className="gap-2" onClick={() => generateSuitabilityPDF(active, clientName)}><FileText className="w-4 h-4" />Ver PDF</Button>}
          <Button size="sm" className="gap-2" onClick={openLink}><Link2 className="w-4 h-4" />Enviar Suitability</Button>
        </div>
      </div>

      {token?.status === 'submitted' && !token.merged_at && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" />
            O cliente preencheu o Suitability em {fmt(token.submitted_at)}. Perfil identificado: <strong>{cap(token.submitted_data?.calculatedProfile || '')}</strong> (Score: {token.submitted_data?.calculatedScore})
          </span>
          <Button size="sm" variant="outline" onClick={ack}>OK, Entendido</Button>
        </div>
      )}

      {active ? (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-semibold capitalize">{active.investor_profile}</span>
            <span className="text-sm text-muted-foreground">Score {active.score}/100 · {active.person_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
          </div>
          <p className="text-sm text-muted-foreground">{PROFILE_DESC[active.investor_profile]}</p>
          <div className="grid grid-cols-3 gap-3">
            {(ALLOCATIONS[active.investor_profile] || []).map(([k, v]) => (
              <div key={k} className="rounded-md bg-muted p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Realizado em {fmt(active.completed_at)} · Válido até {fmt(active.valid_until)}</p>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-md">
          {token?.status === 'pending' ? 'Aguardando o cliente preencher o questionário.' : 'Nenhum Suitability preenchido. Clique em "Enviar Suitability" para mandar o link ao cliente.'}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Suitability ao Cliente</DialogTitle>
            <DialogDescription>O cliente preencherá o questionário de perfil de investidor, sem precisar de login.</DialogDescription>
          </DialogHeader>
          {busy || !token ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div> : <>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-mono font-medium flex-1 truncate">{url}</span>
              <Button size="sm" variant="ghost" aria-label="Copiar link" onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copiado'); }}><Copy className="w-4 h-4" /></Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(`https://wa.me/${(clientPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')}><MessageCircle className="w-4 h-4" />WhatsApp</Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(`mailto:${clientEmail || ''}?subject=${encodeURIComponent('Questionário de Perfil de Investidor')}&body=${encodeURIComponent(msg)}`)}><Mail className="w-4 h-4" />Email</Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Expira em {days} dias</span>
              <span>{token.status === 'pending' ? 'Aguardando' : `Preenchido em ${fmt(token.submitted_at)}`}</span>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
