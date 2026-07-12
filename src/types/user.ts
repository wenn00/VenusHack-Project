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
  // Nullable: the intake UI never asks for a count, and fabricating one
  // (the old hardcoded 1) is worse than admitting it's unknown.
  numberOfPregnancies: number | null;
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
