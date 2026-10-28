import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Heading } from '@/components/ui/Heading';
import { Body } from '@/components/ui/Body';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { isUpcomingVisit, validVisitDate } from '@/lib/appointments';
interface Appointment { id: string; title: string; visit_date: string; provider: string; notes: string; summary: unknown }
export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Appointment[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [provider, setProvider] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setVisits([]); setLoading(true); setError(null);
    if (!user) { setLoading(false); return; }
    supabase.from('appointments').select('id,title,visit_date,provider,notes,summary').eq('user_id', user.id).order('visit_date', { ascending: true }).limit(200).then(({ data, error: failure }) => {
      if (!active) return;
      if (failure) setError('Appointments are unavailable. The appointment database migration may still need to be applied, or the connection failed.');
      else setVisits(data ?? []);
      setLoading(false);
    }, () => { if (active) { setError('Could not connect. Please try again.'); setLoading(false); } });
    return () => { active = false; };
  }, [user?.id, revision]));
  async function save() {
    if (!user || savingRef.current) return;
    if (!title.trim() || !validVisitDate(date)) { setError('Enter a visit title and a valid date in YYYY-MM-DD format.'); return; }
    savingRef.current = true; setSaving(true); setError(null);
    try {
      const { error: failure } = await supabase.from('appointments').insert({ user_id: user.id, title: title.trim(), visit_date: date, provider: provider.trim(), notes: notes.trim() });
      if (failure) throw failure;
      setEditing(false); setTitle(''); setDate(''); setProvider(''); setNotes(''); setRevision(v => v + 1);
    } catch { setError('Your appointment could not be saved. Your entries are still here; please try again.'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  function list(upcoming: boolean) {
    const filtered = visits.filter(v => isUpcomingVisit(v.visit_date) === upcoming);
    if (!upcoming) filtered.reverse();
    return filtered.length ? filtered.map(v => <Card key={v.id}>
      <Heading level={3}>{v.title}</Heading><Body>{v.visit_date}{v.provider ? ` · ${v.provider}` : ''}</Body>
      {!!v.notes && <Body tone="muted">{v.notes}</Body>}
      <Button label={v.summary ? 'View summary' : 'Generate summary'} onPress={() => router.push({ pathname: '/(app)/doctor-prep', params: { appointmentId: v.id } })} />
    </Card>) : <Body tone="muted">{upcoming ? 'No upcoming visits yet.' : 'No past visits yet.'}</Body>;
  }
  return <Screen contentStyle={styles.screen}>
    <Heading level={1}>Appointment Prep</Heading>
    <Button label={editing ? 'Close new appointment' : 'Log an upcoming appointment'} disabled={saving} onPress={() => setEditing(v => !v)} />
    {editing && <Card>
      <TextField label="Visit title" value={title} onChangeText={setTitle} maxLength={120} editable={!saving} />
      <TextField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} maxLength={10} editable={!saving} placeholder="2026-11-15" />
      <TextField label="Provider (optional)" value={provider} onChangeText={setProvider} maxLength={200} editable={!saving} />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} maxLength={2000} editable={!saving} multiline />
      <Button label={saving ? 'Saving…' : 'Save appointment'} disabled={saving} onPress={save} />
    </Card>}
    {!!error && <View accessibilityRole="alert"><Body>{error}</Body><Button label="Retry loading" variant="secondary" onPress={() => setRevision(v => v + 1)} /></View>}
    {loading ? <ActivityIndicator color="white" /> : !error && <><Heading level={2}>Upcoming visits</Heading>{list(true)}<Heading level={2}>Past Visits</Heading>{list(false)}</>}
    <Button label="Create a standalone visit summary" variant="secondary" onPress={() => router.push('/(app)/doctor-prep')} />
    <Body size="sm" tone="muted">Visits are dates in your local calendar. This records your plans; it does not book an appointment with a provider. Showing up to 200 visits.</Body>
  </Screen>;
}
const styles = StyleSheet.create({ screen: { paddingTop: 56, paddingBottom: 120, gap: 24 } });
