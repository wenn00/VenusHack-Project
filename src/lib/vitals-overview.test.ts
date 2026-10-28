import { describe, expect, it } from 'vitest';
import { readingsFor, VitalRow, PressureRow } from './vitals-overview';
const v: VitalRow = { id: '1', heart_rate: 80, hrv_ms: 0, measured_at: '2026-10-27T10:00:00Z', measurement_type: 'rppg' };
const p: PressureRow = { id: '2', systolic: 120, diastolic: 80, pulse: 75, measured_at: '2026-10-28T10:00:00Z', source: 'manual' };
describe('recorded vitals overview', () => {
  it('merges pulse and camera measurements newest first with their real sources', () => {
    expect(readingsFor('heart_rate', [v], [p]).map(r => [r.value, r.source])).toEqual([['75', 'manual'], ['80', 'rppg']]);
  });
  it('does not invent sleep or turn missing HRV into a measurement', () => {
    expect(readingsFor('sleep', [v], [p])).toEqual([]);
    expect(readingsFor('hrv', [v, { ...v, hrv_ms: null }], [p])).toEqual([]);
  });
  it('formats BP and rejects invalid dates', () => {
    expect(readingsFor('blood_pressure', [], [p])[0].value).toBe('120/80');
    expect(readingsFor('heart_rate', [{ ...v, measured_at: 'invalid' }], [])).toEqual([]);
  });
});
