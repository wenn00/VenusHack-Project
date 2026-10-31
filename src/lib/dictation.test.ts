import { expect, it } from 'vitest';
import { mergeDictation } from './dictation';
it('keeps typed notes and replaces interim speech against a stable baseline', () => {
  expect(mergeDictation('Today: ', 'I feel')).toBe('Today: I feel');
  expect(mergeDictation('Today: ', 'I feel well')).toBe('Today: I feel well');
  expect(mergeDictation('', '  hello  ')).toBe('hello');
  expect(mergeDictation('Keep this', '')).toBe('Keep this');
});
