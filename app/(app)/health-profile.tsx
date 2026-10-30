import { PageTitle } from "@/components/ui/PageTitle";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Body } from '@/components/ui/Body';
import { Button } from '@/components/ui/Button';
import { useUserData } from '@/contexts/UserDataContext';
import { profileSections } from '@/lib/profile-sections';
import { colors } from '@/theme';

export default function HealthProfileScreen() {
  const { profile } = useUserData();
  if (!profile) return <Screen><ActivityIndicator color="white" /></Screen>;
  const stageLabel = { pregnant: 'Pregnant', postpartum: 'Postpartum', planning: 'Planning a pregnancy', not_specified: 'Not set' }[profile.stage];
  const entries = [{ id: 'personal', title: 'Personal details', description: [profile.fullName, stageLabel].filter(Boolean).join(' · ') }, ...profileSections(profile.stage)];
  return <Screen contentStyle={styles.content}>
    <PageTitle>Health profile</PageTitle>
    <Body tone="muted">Choose what you want to update. Save one section and you’re done.</Body>
    <View style={styles.sections}>
      {entries.map(entry => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Edit ${entry.title.toLowerCase()}`} onPress={() => router.push({ pathname: '/(app)/edit-health-profile', params: { section: entry.id } })} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.labels}><Text style={styles.title}>{entry.title}</Text><Text style={styles.description} numberOfLines={2}>{entry.description}</Text></View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>)}
    </View>
    <Button label="Done" variant="secondary" onPress={() => router.replace('/(app)/dashboard')} />
  </Screen>;
}
const styles = StyleSheet.create({
  content: { gap: 16 }, sections: { gap: 10, marginVertical: 6 },
  row: { borderWidth: 1, borderColor: colors.border.faint, borderRadius: 18, backgroundColor: colors.bg.card, flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12, minHeight: 82 },
  labels: { flex: 1, gap: 6 }, title: { color: colors.fg.primary, fontSize: 18, lineHeight: 24, fontWeight: '500' },
  description: { color: colors.fg.muted, fontSize: 13, lineHeight: 19 }, chevron: { color: colors.fg.secondary, fontSize: 30 }, pressed: { opacity: 0.7 },
});
