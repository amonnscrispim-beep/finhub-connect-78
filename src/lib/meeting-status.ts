import { isPast, isToday } from 'date-fns';

export type AgendaStatus = 'confirmada' | 'pendente' | 'atrasada' | 'realizada' | 'cancelada';

export function classifyMeeting(date: Date, pendingSchedule = false, status?: string): AgendaStatus {
  if (status === 'completed') return 'realizada';
  if (status === 'cancelled') return 'cancelada';
  if (isPast(date) && !isToday(date)) return 'atrasada';
  return pendingSchedule ? 'pendente' : 'confirmada';
}

export function isMeetingVisible(date: Date, status?: string, now = Date.now()): boolean {
  if (!Number.isFinite(date.getTime())) return false;
  const daysPast = Math.floor((now - date.getTime()) / 86400000);
  return daysPast <= (status === 'completed' ? 3 : 7);
}

export function isMeetingScheduled(status?: string): boolean {
  return !status || status === 'scheduled';
}