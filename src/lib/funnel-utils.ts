import { FunnelStage } from '@/types/client';

/**
 * Mapping from stored stage names to display labels.
 * This maintains backward compatibility with old data while showing cleaner labels.
 */
const STAGE_DISPLAY_MAP: Record<string, string> = {
  'Em atendimento': 'Em atendimento',
  'Pendências Urgentes': 'Pendências Urgentes',
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
  // Also support the new format (in case new data is saved with short names)
  '1ª Reunião': '1ª Reunião',
  '2ª Reunião': '2ª Reunião',
  '3ª Reunião': '3ª Reunião',
  '4ª Reunião': '4ª Reunião',
  '5ª Reunião': '5ª Reunião',
  '6ª Reunião': '6ª Reunião',
};

/**
 * Gets the display label for a funnel stage.
 * Removes "agendada" from meeting stages for cleaner display.
 */
export function getStageDisplayLabel(stage: FunnelStage | string): string {
  return STAGE_DISPLAY_MAP[stage] || stage;
}

/**
 * Gets the internal value to save for a funnel stage.
 * New clients will be saved with the short format.
 */
export function getStageValueToSave(displayLabel: string): FunnelStage {
  // Map display labels back to stored values (using existing format for compatibility)
  const reverseMap: Record<string, FunnelStage> = {
    'Em atendimento': 'Em atendimento',
    'Pendências Urgentes': 'Pendências Urgentes',
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
    // Also handle if already in full format
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
 * Array of stages with their display labels for use in dropdowns.
 * Value is what gets stored, label is what gets displayed.
 */
export const FUNNEL_STAGE_OPTIONS = [
  { value: 'Em atendimento', label: 'Em atendimento' },
  { value: 'Pendências Urgentes', label: 'Pendências Urgentes' },
  { value: '1ª Reunião agendada', label: '1ª Reunião' },
  { value: '2ª Reunião agendada', label: '2ª Reunião' },
  { value: '3ª Reunião agendada', label: '3ª Reunião' },
  { value: '4ª Reunião agendada', label: '4ª Reunião' },
  { value: '5ª Reunião agendada', label: '5ª Reunião' },
  { value: '6ª Reunião agendada', label: '6ª Reunião' },
  { value: 'Conclusão', label: 'Conclusão' },
  { value: 'Diagnóstico Iniciado', label: 'Diagnóstico Iniciado' },
  { value: 'Diagnóstico Concluído', label: 'Diagnóstico Concluído' },
  { value: 'Estratégia Apresentada', label: 'Estratégia Apresentada' },
  { value: 'Implementação', label: 'Implementação' },
  { value: 'Acompanhamento', label: 'Acompanhamento' },
  { value: 'Cliente Patrimonial', label: 'Cliente Patrimonial' },
] as const;
