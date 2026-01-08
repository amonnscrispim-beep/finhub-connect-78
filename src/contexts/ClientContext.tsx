import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Client, Task, FunnelStage } from '@/types/client';

interface ClientContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  moveClientToStage: (clientId: string, stage: FunnelStage) => void;
  addTask: (clientId: string, description: string) => void;
  toggleTask: (clientId: string, taskId: string) => void;
  deleteTask: (clientId: string, taskId: string) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);

// Sample data for demonstration
const sampleClients: Client[] = [
  {
    id: generateId(),
    contractStart: new Date('2024-01-15'),
    contractEnd: new Date('2025-01-15'),
    name: 'João Silva',
    age: 35,
    email: 'joao.silva@email.com',
    phone: '(11) 99999-1234',
    profession: 'Engenheiro',
    objective: 'Aposentadoria antecipada',
    investmentTerm: '15 anos',
    financialAssets: 250000,
    materialAssets: 800000,
    emergencyReserve: 50000,
    investorProfile: 'Moderado',
    monthlyRevenue: 18000,
    monthlyContribution: 3000,
    workDone: 'Planejamento inicial, alocação de carteira',
    tasks: [
      { id: generateId(), description: 'Revisar carteira de investimentos', completed: false, createdAt: new Date() },
      { id: generateId(), description: 'Enviar relatório mensal', completed: true, createdAt: new Date() },
    ],
    observations: 'Cliente interessado em investimentos sustentáveis',
    city: 'São Paulo',
    state: 'SP',
    funnelStage: 'Em atendimento',
    renewed: false,
    renewalPotential: true,
    pendingSchedule: true,
    residence: 'Mora no Brasil',
    renewalStatus: 'Potencial Renovação',
    renewalDate: new Date('2025-01-10'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    contractStart: new Date('2024-03-01'),
    contractEnd: new Date('2025-03-01'),
    name: 'Maria Santos',
    age: 42,
    email: 'maria.santos@email.com',
    phone: '(21) 98888-5678',
    profession: 'Médica',
    objective: 'Diversificação de patrimônio',
    investmentTerm: '10 anos',
    financialAssets: 500000,
    materialAssets: 1200000,
    emergencyReserve: 100000,
    investorProfile: 'Arrojado',
    monthlyRevenue: 35000,
    monthlyContribution: 8000,
    workDone: 'Análise completa, realocação de ativos',
    tasks: [
      { id: generateId(), description: 'Agendar reunião de acompanhamento', completed: false, createdAt: new Date() },
    ],
    observations: 'Prefere reuniões por videoconferência',
    city: 'Rio de Janeiro',
    state: 'RJ',
    funnelStage: '2ª Reunião agendada',
    renewed: true,
    renewalPotential: true,
    pendingSchedule: false,
    residence: 'Mora no Brasil',
    renewalStatus: 'Renovação',
    renewalDate: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    contractStart: new Date('2024-06-10'),
    contractEnd: new Date('2025-06-10'),
    name: 'Pedro Oliveira',
    age: 28,
    email: 'pedro.oliveira@email.com',
    phone: '(31) 97777-9012',
    profession: 'Desenvolvedor',
    objective: 'Primeira casa própria',
    investmentTerm: '5 anos',
    financialAssets: 80000,
    materialAssets: 0,
    emergencyReserve: 20000,
    investorProfile: 'Conservador',
    monthlyRevenue: 12000,
    monthlyContribution: 2500,
    workDone: 'Planejamento para entrada do imóvel',
    tasks: [],
    observations: 'Jovem profissional com alto potencial de crescimento',
    city: 'Belo Horizonte',
    state: 'MG',
    funnelStage: 'Em atendimento',
    renewed: false,
    renewalPotential: false,
    pendingSchedule: false,
    residence: 'Mora no Brasil',
    renewalStatus: 'Não aplicável',
    renewalDate: null,
    createdAt: new Date('2024-06-10'),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    contractStart: new Date('2023-12-01'),
    contractEnd: new Date('2024-12-01'),
    name: 'Ana Costa',
    age: 55,
    email: 'ana.costa@email.com',
    phone: '(41) 96666-3456',
    profession: 'Empresária',
    objective: 'Sucessão patrimonial',
    investmentTerm: '20 anos',
    financialAssets: 2000000,
    materialAssets: 5000000,
    emergencyReserve: 300000,
    investorProfile: 'Moderado',
    monthlyRevenue: 80000,
    monthlyContribution: 15000,
    workDone: 'Estruturação de holding familiar',
    tasks: [
      { id: generateId(), description: 'Preparar documentação holding', completed: false, createdAt: new Date() },
      { id: generateId(), description: 'Reunião com advogado', completed: false, createdAt: new Date() },
    ],
    observations: 'Cliente VIP - alta prioridade',
    city: 'Curitiba',
    state: 'PR',
    funnelStage: 'Conclusão',
    renewed: true,
    renewalPotential: true,
    pendingSchedule: false,
    residence: 'Mora no exterior',
    renewalStatus: 'Renovação',
    renewalDate: null,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    contractStart: new Date('2024-08-15'),
    contractEnd: new Date('2025-08-15'),
    name: 'Carlos Ferreira',
    age: 38,
    email: 'carlos.ferreira@email.com',
    phone: '(51) 95555-7890',
    profession: 'Advogado',
    objective: 'Independência financeira',
    investmentTerm: '12 anos',
    financialAssets: 350000,
    materialAssets: 600000,
    emergencyReserve: 60000,
    investorProfile: 'Arrojado',
    monthlyRevenue: 25000,
    monthlyContribution: 5000,
    workDone: 'Análise de perfil, carteira inicial montada',
    tasks: [
      { id: generateId(), description: 'Apresentar opções de previdência', completed: true, createdAt: new Date() },
    ],
    observations: '',
    city: 'Porto Alegre',
    state: 'RS',
    funnelStage: '3ª Reunião agendada',
    renewed: false,
    renewalPotential: true,
    pendingSchedule: true,
    residence: 'Mora no Brasil',
    renewalStatus: 'Potencial Renovação',
    renewalDate: new Date('2025-02-01'),
    createdAt: new Date('2024-08-15'),
    updatedAt: new Date(),
  },
];

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(sampleClients);

  const addClient = useCallback((clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newClient: Client = {
      ...clientData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setClients(prev => [...prev, newClient]);
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev =>
      prev.map(client =>
        client.id === id
          ? { ...client, ...updates, updatedAt: new Date() }
          : client
      )
    );
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(client => client.id !== id));
  }, []);

  const moveClientToStage = useCallback((clientId: string, stage: FunnelStage) => {
    setClients(prev =>
      prev.map(client =>
        client.id === clientId
          ? { ...client, funnelStage: stage, updatedAt: new Date() }
          : client
      )
    );
  }, []);

  const addTask = useCallback((clientId: string, description: string) => {
    const newTask: Task = {
      id: generateId(),
      description,
      completed: false,
      createdAt: new Date(),
    };
    setClients(prev =>
      prev.map(client =>
        client.id === clientId
          ? { ...client, tasks: [...client.tasks, newTask], updatedAt: new Date() }
          : client
      )
    );
  }, []);

  const toggleTask = useCallback((clientId: string, taskId: string) => {
    setClients(prev =>
      prev.map(client =>
        client.id === clientId
          ? {
              ...client,
              tasks: client.tasks.map(task =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
              ),
              updatedAt: new Date(),
            }
          : client
      )
    );
  }, []);

  const deleteTask = useCallback((clientId: string, taskId: string) => {
    setClients(prev =>
      prev.map(client =>
        client.id === clientId
          ? {
              ...client,
              tasks: client.tasks.filter(task => task.id !== taskId),
              updatedAt: new Date(),
            }
          : client
      )
    );
  }, []);

  return (
    <ClientContext.Provider
      value={{
        clients,
        addClient,
        updateClient,
        deleteClient,
        moveClientToStage,
        addTask,
        toggleTask,
        deleteTask,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClients() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
}
