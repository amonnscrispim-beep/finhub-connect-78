import { FunnelStage, KANBAN_COLUMN_STAGES } from '@/types/client';

/**
 * Mapping from stored stage names to display labels.
 */
const STAGE_DISPLAY_MAP: Record<string, string> = {
  'Em atendimento': 'Em atendimento',
  'Pendências Urgentes': 'PENDÊNCIAS URGENTES',
  'PRIVATE': 'PRIVATE',
  'SELECT': 'SELECT',
  'GROWTH': 'GROWTH',
  'CORE': 'CORE',
  'START': 'START',
  // Legacy stages
  '1ª Reunião agendada': '1ª Reunião',
  '2ª Reunião agendada': '2ª Reunião',
  '3ª Reunião agendada': '3ª Reunião',
  '4ª Reunião agendada': '4ª Reunião',
  '5ª Reunião agendada': '5ª Reunião',
  '6ª Reunião agendada': '6ª Reunião',
  'Conclusão': 'Conclusão',
  'Diagnóstico Iniciado': 'Diagnóstico Iniciado',
  'Diagnóstico Concluído': 'Diagnóstico Concluído',
  'Estratégia Apresentada': 'Estratégia Apresentada',
  'Implementação': 'Implementação',
  'Acompanhamento': 'Acompanhamento',
  'Cliente Patrimonial': 'Cliente Patrimonial',
  '1ª Reunião': '1ª Reunião',
  '2ª Reunião': '2ª Reunião',
  '3ª Reunião': '3ª Reunião',
  '4ª Reunião': '4ª Reunião',
  '5ª Reunião': '5ª Reunião',
  '6ª Reunião': '6ª Reunião',
};

export function getStageDisplayLabel(stage: FunnelStage | string): string {
  return STAGE_DISPLAY_MAP[stage] || stage;
}

export function getStageValueToSave(displayLabel: string): FunnelStage {
  const reverseMap: Record<string, FunnelStage> = {
    'Em atendimento': 'Em atendimento',
    'PENDÊNCIAS URGENTES': 'Pendências Urgentes',
    'Pendências Urgentes': 'Pendências Urgentes',
    'PRIVATE': 'PRIVATE',
    'SELECT': 'SELECT',
    'GROWTH': 'GROWTH',
    'CORE': 'CORE',
    'START': 'START',
    // Legacy
    '1ª Reunião': '1ª Reunião agendada',
    '2ª Reunião': '2ª Reunião agendada',
    '3ª Reunião': '3ª Reunião agendada',
    '4ª Reunião': '4ª Reunião agendada',
    '5ª Reunião': '5ª Reunião agendada',
    '6ª Reunião': '6ª Reunião agendada',
    'Conclusão': 'Conclusão',
    'Diagnóstico Iniciado': 'Diagnóstico Iniciado',
    'Diagnóstico Concluído': 'Diagnóstico Concluído',
    'Estratégia Apresentada': 'Estratégia Apresentada',
    'Implementação': 'Implementação',
    'Acompanhamento': 'Acompanhamento',
    'Cliente Patrimonial': 'Cliente Patrimonial',
    '1ª Reunião agendada': '1ª Reunião agendada',
    '2ª Reunião agendada': '2ª Reunião agendada',
    '3ª Reunião agendada': '3ª Reunião agendada',
    '4ª Reunião agendada': '4ª Reunião agendada',
    '5ª Reunião agendada': '5ª Reunião agendada',
    '6ª Reunião agendada': '6ª Reunião agendada',
  };
  return reverseMap[displayLabel] || (displayLabel as FunnelStage);
}

/**
 * Active Kanban column stages for dropdowns (new structure)
 */
export const FUNNEL_STAGE_OPTIONS = [
  { value: 'Em atendimento', label: 'Em atendimento' },
  { value: 'PRIVATE', label: 'PRIVATE' },
  { value: 'SELECT', label: 'SELECT' },
  { value: 'GROWTH', label: 'GROWTH' },
  { value: 'CORE', label: 'CORE' },
  { value: 'Pendências Urgentes', label: 'PENDÊNCIAS URGENTES' },
  { value: 'START', label: 'START' },
] as const;

/**
 * Check if a stage is a legacy stage that no longer appears as a Kanban column
 */
export function isLegacyStage(stage: string): boolean {
  return !['Em atendimento', ...KANBAN_COLUMN_STAGES].includes(stage as FunnelStage);
}
