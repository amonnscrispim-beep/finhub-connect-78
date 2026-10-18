import { test, expect } from 'bun:test';
import { classifyMeeting, isMeetingVisible, isMeetingScheduled } from '../../src/lib/meeting-status';

const date = new Date('2026-10-10T12:00:00Z');
const after = (days: number) => date.getTime() + days * 86400000;
test('completed meetings never count as overdue', () => {
  expect(classifyMeeting(date, false, 'completed')).toBe('realizada');
});
test('cancelled meetings never count as overdue or upcoming', () => {
  expect(classifyMeeting(date, false, 'cancelled')).toBe('cancelada');
  expect(isMeetingScheduled('cancelled')).toBe(false);
});
test('completed meetings remain for 3 days, not 4', () => {
  expect(isMeetingVisible(date, 'completed', after(3))).toBe(true);
  expect(isMeetingVisible(date, 'completed', after(4))).toBe(false);
});
test('scheduled meetings remain for 7 days, not 8', () => {
  expect(isMeetingVisible(date, 'scheduled', after(7))).toBe(true);
  expect(isMeetingVisible(date, 'scheduled', after(8))).toBe(false);
});
test('completed meetings cannot suppress next projected meeting', () => {
  expect(isMeetingScheduled('completed')).toBe(false);
  expect(isMeetingScheduled('scheduled')).toBe(true);
});