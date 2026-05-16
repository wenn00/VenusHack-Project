/**
 * User profile and intake history types.
 * Mirrors the Supabase schema in docs/05-database-schema.md.
 */

export type PregnancyStage = "pregnant" | "postpartum" | "planning" | "not_specified";

export interface UserProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  stage: PregnancyStage;
  dueDate: string | null;
  postpartumStartDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PregnancyHistory {
  id: string;
  userId: string;
  hadPreeclampsia: boolean;
  hadGestationalHypertension: boolean;
  hadGestationalDiabetes: boolean;
  hadPretermBirth: boolean;
  hadEclampsia: boolean;
  numberOfPregnancies: number;
  notes: string | null;
}

export interface FamilyHistory {
  id: string;
  userId: string;
  hasCvdFamily: boolean;
  hasStrokeFamily: boolean;
  hasDiabetesFamily: boolean;
  hasHypertensionFamily: boolean;
  notes: string | null;
}
