import { expect, it } from 'vitest';
import { validVisitDate, isUpcomingVisit, localDateKey, validAppointmentId } from './appointments';
it('validates calendar dates rather than normalized impossible dates', () => {
  expect(validVisitDate('2026-02-29')).toBe(false);
  expect(validVisitDate('2028-02-29')).toBe(true);
  expect(validVisitDate('2026-13-01')).toBe(false);
  expect(validVisitDate('10/28/2026')).toBe(false);
});
it('keeps today upcoming and uses local calendar dates', () => {
  expect(isUpcomingVisit('2026-10-28', '2026-10-28')).toBe(true);
  expect(isUpcomingVisit('2026-10-27', '2026-10-28')).toBe(false);
  expect(localDateKey(new Date(2026, 0, 2, 23))).toBe('2026-01-02');
});
it('rejects arrays and invalid IDs from links', () => {
  expect(validAppointmentId(['abc'])).toBe(false);
  expect(validAppointmentId('bad')).toBe(false);
});
