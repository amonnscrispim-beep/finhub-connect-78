export interface StudyModule {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  icon: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudySubmodule {
  id: string;
  moduleId: string;
  userId: string;
  title: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudySlide {
  id: string;
  submoduleId: string;
  userId: string;
  title: string;
  content: string | null;
  imageUrl: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_MODULES = [
  { title: 'Planejamento Financeiro', description: 'Fundamentos do planejamento financeiro pessoal', icon: 'Target' },
  { title: 'Método de Alocação', description: 'Estratégias de alocação de ativos', icon: 'PieChart' },
  { title: 'Macroeconomia', description: 'Conceitos macroeconômicos para investidores', icon: 'TrendingUp' },
  { title: 'Renda Fixa', description: 'Investimentos em renda fixa', icon: 'Landmark' },
  { title: 'Fundos Imobiliários', description: 'Investimentos em FIIs', icon: 'Building2' },
  { title: 'Ações', description: 'Mercado de ações e análise fundamentalista', icon: 'LineChart' },
  { title: 'Investimento Internacional', description: 'Diversificação global de portfólio', icon: 'Globe' },
  { title: 'Criptomoedas', description: 'Ativos digitais e blockchain', icon: 'Bitcoin' },
];
