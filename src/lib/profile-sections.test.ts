import { expect, it } from 'vitest';
import { changedSectionAnswers, profileSections } from './profile-sections';
it('keeps section links stage-specific and covers the full questionnaire', () => {
  const pregnant = profileSections('pregnant');
  const postpartum = profileSections('postpartum');
  expect(new Set(pregnant.map(s => s.id)).size).toBe(pregnant.length);
  expect(postpartum.some(s => s.id === pregnant[1].id)).toBe(false);
  expect(pregnant.some(s => s.section.questions.some(q => q.key === 'weight_kg'))).toBe(true);
  expect(pregnant.some(s => s.section.questions.some(q => q.key === 'support'))).toBe(true);
});
it('only sends changed section keys and preserves explicit blank clears', () => {
  const section = { title: 'One', questions: [{ key: 'weight', label: 'Weight' }, { key: 'height', label: 'Height' }] };
  expect(changedSectionAnswers(section, { weight: '65', height: '170', other: 'yes' }, { weight: '', height: '170', other: 'no' })).toEqual({ weight: '' });
  expect(changedSectionAnswers(section, {}, {})).toEqual({});
});
