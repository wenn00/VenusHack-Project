import { familySections, IntakeAnswers, IntakeSection, pregnancySections } from './intake';
import { PregnancyStage } from '@/types/user';
export interface ProfileSection {
  id: string;
  title: string;
  description: string;
  table: 'pregnancy_history' | 'family_history';
  section: IntakeSection;
}
/** Explicit IDs are scoped to the stage so an old link cannot edit a different section. */
export function profileSections(stage: PregnancyStage): ProfileSection[] {
  return [
    ...pregnancySections(stage).map((section, index) => ({
      id: `${stage}-pregnancy-${index}`,
      title: index === 0 ? 'Basic health details' : index === 1 ? stage === 'planning' ? 'Planning a pregnancy' : stage === 'postpartum' ? 'Birth & recovery' : 'Current pregnancy' : section.title === 'Health history specific to this pregnancy' ? 'Pregnancy health' : section.title,
      description: index === 0 ? 'Height, weight, care team and diagnoses' : section.title === 'Your pregnancy history' ? 'Previous pregnancy complications' : section.title === 'Current health status' ? 'Follow-up care, medications and symptoms' : section.title === 'Health history specific to this pregnancy' ? 'Conditions and medication during pregnancy' : stage === 'postpartum' ? 'Birth method and complications' : stage === 'planning' ? 'Past pregnancies, activity and health' : 'Pregnancy progress, symptoms and appointments',
      table: 'pregnancy_history' as const, section,
    })),
    ...familySections(stage).map((section, index) => ({ id: `${stage}-family-${index}`, title: index === 0 ? 'Family health history' : 'Emotional wellbeing', description: index === 0 ? 'Heart health and conditions in your family' : 'Mood, sleep and support at home', table: 'family_history' as const, section })),
  ];
}
/** Send only changed fields from this section, including intentional clears. */
export function changedSectionAnswers(section: IntakeSection, initial: IntakeAnswers, current: IntakeAnswers): IntakeAnswers {
  const patch: IntakeAnswers = {};
  for (const { key } of section.questions) {
    const before = initial[key] ?? '';
    const after = current[key] ?? '';
    if (after !== before) patch[key] = after;
  }
  return patch;
}
