import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { booleanAnswer, pregnancySections, readIntakeNotes } from "@/lib/intake";
import { saveIntakeHistory } from "@/services/intake";

export default function IntakePregnancyScreen() {
  const { user } = useAuth();
  const { profile, pregnancyHistory: history, refresh } = useUserData();
  const stage = profile?.stage ?? "not_specified";
  const prior = readIntakeNotes(history?.notes);
  const initial = {
    had_preeclampsia: booleanAnswer(history?.hadPreeclampsia),
    had_gestational_hypertension: booleanAnswer(history?.hadGestationalHypertension),
    had_gestational_diabetes: booleanAnswer(history?.hadGestationalDiabetes),
    had_preterm_birth: booleanAnswer(history?.hadPretermBirth),
    had_eclampsia: booleanAnswer(history?.hadEclampsia),
    number_of_pregnancies: history?.numberOfPregnancies == null ? "" : String(history.numberOfPregnancies),
    ...(prior?.stage === stage ? prior.answers : {}),
  };
  return <Screen scroll={false} contentStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}>
    <IntakeForm key={`${user?.id}:${stage}`} sections={pregnancySections(stage)} initialAnswers={initial} onSave={async answers => {
      if (!user || stage === "not_specified") throw new Error("Please sign in and choose your stage first.");
      await saveIntakeHistory("pregnancy_history", user.id, stage, answers);
      await refresh();
      router.push("/(auth)/intake-family");
    }} />
  </Screen>;
}
