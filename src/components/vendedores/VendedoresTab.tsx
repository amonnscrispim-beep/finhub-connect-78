import { useState } from 'react';
import { LeadsList } from './LeadsList';
import { QualificationChat } from './QualificationChat';
import { LeadReport } from './LeadReport';

export type Lead = {
  id: string;
  vendedor_id: string;
  nome: string;
  telefone: string;
  email: string;
  como_chegou: string;
  observacoes_iniciais: string;
  status: string;
  fit_comercial: string | null;
  nota_prontidao: number | null;
  relatorio: any;
  created_at: string;
  updated_at: string;
};

type View = 
  | { type: 'list' }
  | { type: 'chat'; lead: Lead; qualificacaoId: string }
  | { type: 'report'; lead: Lead };

export function VendedoresTab() {
  const [view, setView] = useState<View>({ type: 'list' });

  if (view.type === 'chat') {
    return (
      <QualificationChat
        lead={view.lead}
        qualificacaoId={view.qualificacaoId}
        onBack={() => setView({ type: 'list' })}
        onReportGenerated={(lead) => setView({ type: 'report', lead })}
      />
    );
  }

  if (view.type === 'report') {
    return (
      <LeadReport
        lead={view.lead}
        onBack={() => setView({ type: 'list' })}
      />
    );
  }

  return (
    <LeadsList
      onStartQualification={(lead, qualificacaoId) => setView({ type: 'chat', lead, qualificacaoId })}
      onViewReport={(lead) => setView({ type: 'report', lead })}
    />
  );
}
