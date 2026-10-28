import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { booleanAnswer, familySections, readIntakeNotes } from "@/lib/intake";
import { saveIntakeHistory } from "@/services/intake";

export default function IntakeFamilyScreen() {
  const { user } = useAuth();
  const { profile, familyHistory: history, refresh } = useUserData();
  const stage = profile?.stage ?? "not_specified";
  const prior = readIntakeNotes(history?.notes);
  const initial = {
    has_cvd_family: booleanAnswer(history?.hasCvdFamily),
    has_stroke_family: booleanAnswer(history?.hasStrokeFamily),
    has_diabetes_family: booleanAnswer(history?.hasDiabetesFamily),
    has_hypertension_family: booleanAnswer(history?.hasHypertensionFamily),
    ...(prior?.stage === stage ? prior.answers : {}),
  };
  return <Screen scroll={false} contentStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}>
    <IntakeForm key={`${user?.id}:${stage}`} sections={familySections(stage)} initialAnswers={initial} submitLabel="Complete onboarding" onSave={async answers => {
      if (!user || stage === "not_specified") throw new Error("Please sign in and choose your stage first.");
      await saveIntakeHistory("family_history", user.id, stage, answers);
      await refresh();
      router.replace("/(app)/dashboard");
    }} />
  </Screen>;
}
