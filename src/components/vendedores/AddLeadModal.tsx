import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { nome: string; telefone: string; email: string; como_chegou: string; observacoes_iniciais: string }) => void;
}

export function AddLeadModal({ open, onOpenChange, onSave }: Props) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [comoChegou, setComoChegou] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const handleSave = () => {
    if (!nome.trim() || !telefone.trim()) return;
    onSave({ nome: nome.trim(), telefone: telefone.trim(), email: email.trim(), como_chegou: comoChegou.trim(), observacoes_iniciais: observacoes.trim() });
    setNome(''); setTelefone(''); setEmail(''); setComoChegou(''); setObservacoes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome completo *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do lead" />
          </div>
          <div>
            <Label>Telefone / WhatsApp *</Label>
            <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label>Como chegou até nós?</Label>
            <Input value={comoChegou} onChange={e => setComoChegou(e.target.value)} placeholder="Indicação, redes sociais..." />
          </div>
          <div>
            <Label>Observações iniciais</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Notas sobre o lead..." rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!nome.trim() || !telefone.trim()}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
