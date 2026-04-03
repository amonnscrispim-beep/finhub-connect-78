import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, MessageSquare, Pencil, Loader2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { AddLeadModal } from './AddLeadModal';
import type { Lead } from './VendedoresTab';

const STATUS_COLORS: Record<string, string> = {
  'Novo': 'bg-muted text-muted-foreground',
  'Em Qualificação': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Qualificado': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Sem Fit': 'bg-red-500/20 text-red-400 border-red-500/30',
};

const FIT_COLORS: Record<string, string> = {
  'Muito Alto': 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  'Alto': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Médio': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Baixo': 'bg-muted text-muted-foreground',
};

function NotaBar({ nota }: { nota: number }) {
  const pct = (nota / 10) * 100;
  const color = nota >= 8 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold">{nota}</span>
    </div>
  );
}

interface Props {
  onStartQualification: (lead: Lead, qualificacaoId: string) => void;
  onViewReport: (lead: Lead) => void;
}

export function LeadsList({ onStartQualification, onViewReport }: Props) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('vendedor_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar leads'); console.error(error); }
    else setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const handleAddLead = async (data: { nome: string; telefone: string; email: string; como_chegou: string; observacoes_iniciais: string }) => {
    if (!user) return;
    const { error } = await supabase.from('leads').insert({
      vendedor_id: user.id,
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
      como_chegou: data.como_chegou,
      observacoes_iniciais: data.observacoes_iniciais,
    });
    if (error) { toast.error('Erro ao salvar lead'); console.error(error); return; }
    toast.success('Lead adicionado!');
    fetchLeads();
  };

  const handleStartQualification = async (lead: Lead) => {
    if (!user) return;
    // Check for existing qualificacao
    const { data: existing } = await supabase
      .from('qualificacoes')
      .select('id')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1);

    let qualificacaoId: string;
    if (existing && existing.length > 0) {
      qualificacaoId = existing[0].id;
    } else {
      const { data: created, error } = await supabase
        .from('qualificacoes')
        .insert({ lead_id: lead.id, vendedor_id: user.id })
        .select('id')
        .single();
      if (error || !created) { toast.error('Erro ao iniciar qualificação'); return; }
      qualificacaoId = created.id;
      // Update lead status
      await supabase.from('leads').update({ status: 'Em Qualificação' }).eq('id', lead.id);
    }
    onStartQualification({ ...lead, status: 'Em Qualificação' }, qualificacaoId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Meus Leads</h2>
          <p className="text-sm text-muted-foreground">{leads.length} leads cadastrados</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Lead
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">Nenhum lead cadastrado ainda.</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar primeiro lead
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contato</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fit Comercial</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nota</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{lead.nome}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.telefone}</span>
                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_COLORS[lead.status] || ''}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.fit_comercial ? (
                        <Badge variant="outline" className={FIT_COLORS[lead.fit_comercial] || ''}>
                          {lead.fit_comercial}
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.nota_prontidao != null ? <NotaBar nota={lead.nota_prontidao} /> : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {lead.relatorio && (
                          <Button variant="ghost" size="sm" onClick={() => onViewReport(lead)} title="Ver Relatório">
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleStartQualification(lead)} title="Iniciar Qualificação">
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddLeadModal open={modalOpen} onOpenChange={setModalOpen} onSave={handleAddLead} />
    </div>
  );
}
