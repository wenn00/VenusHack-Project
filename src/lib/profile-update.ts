import { validIntakeDate } from './intake';
import { PregnancyStage, UserProfile } from '@/types';
interface Draft { name: string; stage: PregnancyStage; dueDate: string; birthDate: string }
export function personalProfilePatch(initial: UserProfile, draft: Draft, now = new Date()): { patch: Record<string, unknown>; error: string | null } {
  const patch: Record<string, unknown> = {};
  const name = draft.name.trim();
  if (!name || name.length > 120) return { patch, error: 'Please enter a name of 120 characters or fewer.' };
  if (draft.stage === 'not_specified') return { patch, error: 'Please choose your current stage.' };
  const stageChanged = draft.stage !== initial.stage;
  const dueChanged = draft.dueDate.trim() !== (initial.dueDate ?? '');
  const birthChanged = draft.birthDate.trim() !== (initial.postpartumStartDate ?? '');
  const error = draft.stage === 'pregnant' && (dueChanged || stageChanged) ? validIntakeDate(draft.dueDate.trim(), 'due', now) : draft.stage === 'postpartum' && (birthChanged || stageChanged) ? validIntakeDate(draft.birthDate.trim(), 'birth', now) : null;
  if (error) return { patch, error };
  if (name !== initial.fullName) patch.full_name = name;
  if (stageChanged) patch.stage = draft.stage;
  // Keep inactive dates as historical data; only explicit active-date edits clear them.
  if (draft.stage === 'pregnant' && dueChanged) patch.due_date = draft.dueDate.trim() || null;
  if (draft.stage === 'postpartum' && birthChanged) patch.postpartum_start_date = draft.birthDate.trim() || null;
  return { patch, error: null };
}
