import { expect, it } from 'vitest';
import { personalProfilePatch } from './profile-update';
import { UserProfile } from '@/types';
const initial: UserProfile = { id: 'user-a', email: null, fullName: 'Sam', stage: 'pregnant', dueDate: '2025-01-01', postpartumStartDate: null, createdAt: '', updatedAt: '' };
const now = new Date(2026, 9, 28);
it('lets name-only editing retain an unchanged old due date', () => {
  expect(personalProfilePatch(initial, { name: 'Sam Lee', stage: 'pregnant', dueDate: initial.dueDate!, birthDate: '' }, now)).toEqual({ patch: { full_name: 'Sam Lee' }, error: null });
});
it('validates an edited active date and supports explicitly clearing it', () => {
  expect(personalProfilePatch(initial, { name: 'Sam', stage: 'pregnant', dueDate: 'invalid', birthDate: '' }, now).error).toBeTruthy();
  expect(personalProfilePatch(initial, { name: 'Sam', stage: 'pregnant', dueDate: '', birthDate: '' }, now).patch).toEqual({ due_date: null });
});
it('switching stages preserves inactive dates and validates the new active date', () => {
  expect(personalProfilePatch(initial, { name: 'Sam', stage: 'postpartum', dueDate: initial.dueDate!, birthDate: '2026-10-01' }, now)).toEqual({ patch: { stage: 'postpartum', postpartum_start_date: '2026-10-01' }, error: null });
  expect(personalProfilePatch(initial, { name: 'Sam', stage: 'postpartum', dueDate: '', birthDate: '2027-01-01' }, now).error).toBeTruthy();
});
