import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Client, FUNNEL_STAGES, INVESTOR_PROFILES, BRAZILIAN_STATES } from '@/types/client';
import { useClients } from '@/contexts/ClientContext';

import type { InvestorProfile, FunnelStage } from '@/types/client';

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
}

interface FormData {
  contractStart: string;
  contractEnd: string;
  name: string;
  age: string;
  email: string;
  phone: string;
  profession: string;
  objective: string;
  investmentTerm: string;
  financialAssets: string;
  materialAssets: string;
  emergencyReserve: string;
  investorProfile: InvestorProfile;
  monthlyRevenue: string;
  monthlyContribution: string;
  workDone: string;
  observations: string;
  city: string;
  state: string;
  funnelStage: FunnelStage;
  renewed: boolean;
  renewalPotential: boolean;
}

const defaultFormData: FormData = {
  contractStart: new Date().toISOString().split('T')[0],
  contractEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  name: '',
  age: '',
  email: '',
  phone: '',
  profession: '',
  objective: '',
  investmentTerm: '',
  financialAssets: '',
  materialAssets: '',
  emergencyReserve: '',
  investorProfile: 'Moderado',
  monthlyRevenue: '',
  monthlyContribution: '',
  workDone: '',
  observations: '',
  city: '',
  state: 'SP',
  funnelStage: 'Novo cliente',
  renewed: false,
  renewalPotential: false,
};

export function ClientModal({ open, onOpenChange, client }: ClientModalProps) {
  const { addClient, updateClient } = useClients();
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (client) {
      setFormData({
        contractStart: client.contractStart.toISOString().split('T')[0],
        contractEnd: client.contractEnd.toISOString().split('T')[0],
        name: client.name,
        age: client.age.toString(),
        email: client.email,
        phone: client.phone,
        profession: client.profession,
        objective: client.objective,
        investmentTerm: client.investmentTerm,
        financialAssets: client.financialAssets.toString(),
        materialAssets: client.materialAssets.toString(),
        emergencyReserve: client.emergencyReserve.toString(),
        investorProfile: client.investorProfile,
        monthlyRevenue: client.monthlyRevenue.toString(),
        monthlyContribution: client.monthlyContribution.toString(),
        workDone: client.workDone,
        observations: client.observations,
        city: client.city,
        state: client.state,
        funnelStage: client.funnelStage,
        renewed: client.renewed,
        renewalPotential: client.renewalPotential,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [client, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const clientData = {
      contractStart: new Date(formData.contractStart),
      contractEnd: new Date(formData.contractEnd),
      name: formData.name,
      age: parseInt(formData.age) || 0,
      email: formData.email,
      phone: formData.phone,
      profession: formData.profession,
      objective: formData.objective,
      investmentTerm: formData.investmentTerm,
      financialAssets: parseFloat(formData.financialAssets) || 0,
      materialAssets: parseFloat(formData.materialAssets) || 0,
      emergencyReserve: parseFloat(formData.emergencyReserve) || 0,
      investorProfile: formData.investorProfile,
      monthlyRevenue: parseFloat(formData.monthlyRevenue) || 0,
      monthlyContribution: parseFloat(formData.monthlyContribution) || 0,
      workDone: formData.workDone,
      tasks: client?.tasks || [],
      observations: formData.observations,
      city: formData.city,
      state: formData.state,
      funnelStage: formData.funnelStage,
      renewed: formData.renewed,
      renewalPotential: formData.renewalPotential,
    };

    if (client) {
      updateClient(client.id, clientData);
    } else {
      addClient(clientData);
    }
    
    onOpenChange(false);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="crm-header p-6 rounded-t-lg">
          <DialogTitle className="text-xl">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Contract Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractStart">Início do Contrato</Label>
                <Input
                  id="contractStart"
                  type="date"
                  value={formData.contractStart}
                  onChange={(e) => handleChange('contractStart', e.target.value)}
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractEnd">Fim do Contrato</Label>
                <Input
                  id="contractEnd"
                  type="date"
                  value={formData.contractEnd}
                  onChange={(e) => handleChange('contractEnd', e.target.value)}
                  className="crm-input"
                />
              </div>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nome completo"
                  className="crm-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="Ex: 35"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profissão</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => handleChange('profession', e.target.value)}
                  placeholder="Ex: Engenheiro"
                  className="crm-input"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="crm-input"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="São Paulo"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Select value={formData.state} onValueChange={(value) => handleChange('state', value)}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Financial Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="financialAssets">Patrimônio Financeiro</Label>
                <Input
                  id="financialAssets"
                  type="number"
                  value={formData.financialAssets}
                  onChange={(e) => handleChange('financialAssets', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialAssets">Patrimônio Material</Label>
                <Input
                  id="materialAssets"
                  type="number"
                  value={formData.materialAssets}
                  onChange={(e) => handleChange('materialAssets', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyReserve">Reserva de Emergência</Label>
                <Input
                  id="emergencyReserve"
                  type="number"
                  value={formData.emergencyReserve}
                  onChange={(e) => handleChange('emergencyReserve', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRevenue">Faturamento Mensal</Label>
                <Input
                  id="monthlyRevenue"
                  type="number"
                  value={formData.monthlyRevenue}
                  onChange={(e) => handleChange('monthlyRevenue', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyContribution">Aporte Mensal</Label>
                <Input
                  id="monthlyContribution"
                  type="number"
                  value={formData.monthlyContribution}
                  onChange={(e) => handleChange('monthlyContribution', e.target.value)}
                  placeholder="R$ 0,00"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investorProfile">Perfil de Investidor</Label>
                <Select value={formData.investorProfile} onValueChange={(value) => handleChange('investorProfile', value)}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTOR_PROFILES.map((profile) => (
                      <SelectItem key={profile} value={profile}>
                        {profile}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Objectives */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Input
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => handleChange('objective', e.target.value)}
                  placeholder="Ex: Aposentadoria"
                  className="crm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investmentTerm">Prazo de Investimentos</Label>
                <Input
                  id="investmentTerm"
                  value={formData.investmentTerm}
                  onChange={(e) => handleChange('investmentTerm', e.target.value)}
                  placeholder="Ex: 10 anos"
                  className="crm-input"
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="funnelStage">Etapa do Funil</Label>
                <Select value={formData.funnelStage} onValueChange={(value) => handleChange('funnelStage', value)}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNNEL_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewed">Renovado?</Label>
                <Select value={formData.renewed ? 'sim' : 'não'} onValueChange={(value) => handleChange('renewed', value === 'sim')}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewalPotential">Potencial Renovação?</Label>
                <Select value={formData.renewalPotential ? 'sim' : 'não'} onValueChange={(value) => handleChange('renewalPotential', value === 'sim')}>
                  <SelectTrigger className="crm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="workDone">O que foi feito</Label>
              <Textarea
                id="workDone"
                value={formData.workDone}
                onChange={(e) => handleChange('workDone', e.target.value)}
                placeholder="Descreva o trabalho realizado..."
                className="crm-input min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleChange('observations', e.target.value)}
                placeholder="Observações adicionais..."
                className="crm-input min-h-[80px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="crm-btn-accent">
                {client ? 'Salvar Alterações' : 'Criar Cliente'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
