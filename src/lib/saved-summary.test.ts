import { expect, it } from 'vitest';
import { readSavedSummary } from './saved-summary';
it('rejects unusable saved envelopes and normalizes older partial summaries', () => {
  expect(() => readSavedSummary({})).toThrow();
  const s = readSavedSummary({ summary: { urgent_concerns: 'oops' }, generatedAt: '2026-10-28T10:00:00Z', bpRows: [null, {}] });
  expect(s.summary.urgent_concerns).toEqual([]);
  expect(s.bpRows).toEqual([]);
});
