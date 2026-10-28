import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Heading } from '@/components/ui/Heading';
import { Body } from '@/components/ui/Body';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { IntakeForm } from '@/components/intake/IntakeForm';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/contexts/UserDataContext';
import { changedSectionAnswers, ProfileSection, profileSections } from '@/lib/profile-sections';
import { getHistoryAnswers } from '@/lib/profile-editing';
import { personalProfilePatch } from '@/lib/profile-update';
import { saveIntakeSection } from '@/services/intake';
import { supabase } from '@/services/supabase';
import { FamilyHistory, PregnancyHistory, PregnancyStage, UserProfile } from '@/types';

const returnToProfile = () => router.replace('/(app)/health-profile');
export default function EditHealthProfileScreen() {
  const { section: requested } = useLocalSearchParams<{ section?: string | string[] }>();
  const { user } = useAuth();
  const { profile, pregnancyHistory, familyHistory, refresh } = useUserData();
  if (!user || !profile) return <Screen><ActivityIndicator color="white" /></Screen>;
  if (requested === 'personal') return <PersonalEditor key={user.id} userId={user.id} profile={profile} refresh={refresh} />;
  const section = typeof requested === 'string' ? profileSections(profile.stage).find(s => s.id === requested) : undefined;
  if (!section) return <Screen><Heading level={2}>Choose a section</Heading><Body>Your health stage may have changed. Pick the section you want to edit from your profile.</Body><Button label="Back to health profile" onPress={returnToProfile} /></Screen>;
  const history = section.table === 'pregnancy_history' ? pregnancyHistory : familyHistory;
  return <HistoryEditor key={`${user.id}:${section.id}:${history?.id ?? 'new'}`} userId={user.id} stage={profile.stage} section={section} history={history} refresh={refresh} />;
}
function HistoryEditor({ userId, stage, section, history, refresh }: {
  userId: string; stage: PregnancyStage; section: ProfileSection; history: PregnancyHistory | FamilyHistory | null; refresh: () => Promise<void>;
}) {
  const [initial] = useState(() => getHistoryAnswers(section.table, stage, history));
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  return <Screen scroll={false} contentStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}>
    <IntakeForm title={section.title} sections={[{ ...section.section, title: 'Save changes to this section.' }]} initialAnswers={initial} submitLabel="Save changes" onCancel={returnToProfile} onSave={async answers => {
      const patch = changedSectionAnswers(section.section, initial, answers);
      if (Object.keys(patch).length) {
        await saveIntakeSection(section.table, userId, stage, patch);
        if (!alive.current) return;
        await refresh();
      }
      if (alive.current) returnToProfile();
    }} />
  </Screen>;
}
function PersonalEditor({ userId, profile, refresh }: { userId: string; profile: UserProfile; refresh: () => Promise<void> }) {
  const [initial] = useState(profile);
  const [name, setName] = useState(initial.fullName ?? '');
  const [stage, setStage] = useState(initial.stage);
  const [dueDate, setDueDate] = useState(initial.dueDate ?? '');
  const [birthDate, setBirthDate] = useState(initial.postpartumStartDate ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function save() {
    if (busy.current) return;
    setError(null);
    const { patch, error: invalid } = personalProfilePatch(initial, { name, stage, dueDate, birthDate });
    if (invalid) { setError(invalid); return; }
    if (!Object.keys(patch).length) { returnToProfile(); return; }
    busy.current = true; setSaving(true);
    try {
      const { data, error: failure } = await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', userId).select('id').single();
      if (failure || !data) throw new Error('Profile update failed');
      if (!alive.current) return;
      await refresh();
      if (alive.current) returnToProfile();
    } catch { if (alive.current) setError('Your changes could not be saved. Your input is still here; please try again.'); }
    finally { busy.current = false; if (alive.current) setSaving(false); }
  }
  const stages: { label: string; value: PregnancyStage }[] = [{ label: 'Planning a pregnancy', value: 'planning' }, { label: 'Pregnant', value: 'pregnant' }, { label: 'Postpartum', value: 'postpartum' }];
  return <Screen contentStyle={styles.content}>
    <Heading level={1}>Personal details</Heading>
    <Body tone="muted">Edit what has changed, then save. You won’t need to repeat the questionnaire.</Body>
    <TextField label="Full name" accessibilityLabel="Full name" value={name} onChangeText={setName} maxLength={120} editable={!saving} />
    <View style={styles.stages} accessibilityRole="radiogroup" accessibilityLabel="Current stage"><Body>Current stage</Body>{stages.map(s => <Pressable key={s.value} accessibilityRole="radio" accessibilityLabel={s.label} accessibilityState={{ checked: stage === s.value, disabled: saving }} onPress={() => setStage(s.value)} disabled={saving} style={[styles.stageChoice, stage === s.value && styles.stageSelected]}><Text style={styles.stageLabel}>{s.label}</Text></Pressable>)}</View>
    {stage === 'pregnant' && <TextField label="Expected due date" accessibilityLabel="Expected due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" maxLength={10} editable={!saving} />}
    {stage === 'postpartum' && <TextField label="Birth date" accessibilityLabel="Birth date" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" maxLength={10} editable={!saving} />}
    {stage !== 'planning' && <Body size="sm" tone="muted">Dates are optional if you’re unsure.</Body>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button label={saving ? 'Saving…' : 'Save changes'} onPress={save} disabled={saving} />
    <Button label="Cancel" variant="ghost" onPress={returnToProfile} disabled={saving} />
  </Screen>;
}
const styles = StyleSheet.create({ content: { paddingTop: 42, gap: 22 }, stages: { gap: 10 }, stageChoice: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)', padding: 14 }, stageSelected: { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.16)' }, stageLabel: { color: 'white', fontSize: 16, textAlign: 'center' }, error: { color: '#FFE8E8', fontSize: 16, lineHeight: 24 } });
