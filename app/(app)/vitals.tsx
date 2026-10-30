import { BrandHeader } from "@/components/ui/BrandHeader";
import { PageTitle } from "@/components/ui/PageTitle";
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Body } from '@/components/ui/Body';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Metric, metricLabels, PressureRow, readingsFor, sourceLabel, VitalRow } from '@/lib/vitals-overview';
import { colors } from '@/theme';

const metrics: Metric[] = ['heart_rate', 'blood_pressure', 'hrv', 'sleep'];
export default function VitalsScreen() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<Metric>('heart_rate');
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [bp, setBp] = useState<PressureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setVitals([]); setBp([]); setError(null); setLoading(true);
    if (!user) { setLoading(false); return; }
    async function load() {
      try {
        const [v, b] = await Promise.all([
          supabase.from('vitals_log').select('id, heart_rate, hrv_ms, measured_at, measurement_type').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(200),
          supabase.from('bp_readings').select('id, systolic, diastolic, pulse, measured_at, source').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(200),
        ]);
        if (v.error || b.error) throw v.error ?? b.error;
        if (active) { setVitals(v.data ?? []); setBp(b.data ?? []); }
      } catch { if (active) setError('Your measurements could not be loaded. Please try again.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user?.id, retry]));
  const readings = readingsFor(metric, vitals, bp);
  const latest = readings[0];
  const label = metricLabels[metric];
  return <Screen contentStyle={styles.screen} header={<BrandHeader />}>
    <View style={styles.heading}><PageTitle>Overview</PageTitle><Body>{label.description}</Body></View>
    <View accessibilityRole="tablist" style={styles.tabs}>
      {metrics.map(m => <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: metric === m }} onPress={() => setMetric(m)} style={[styles.tab, metric === m && styles.activeTab]}><Text style={styles.tabText}>{m === 'hrv' ? 'HRV' : metricLabels[m].title}</Text></Pressable>)}
    </View>
    {loading ? <ActivityIndicator color="white" accessibilityLabel="Loading measurements" /> : error ? <View accessibilityRole="alert"><Body>{error}</Body><Button label="Try again" onPress={() => setRetry(n => n + 1)} /></View> : <>
      <View style={styles.orb}><Text style={styles.value} adjustsFontSizeToFit numberOfLines={1}>{latest?.value ?? '—'}</Text><Text style={styles.unit}>{label.unit}</Text></View>
      <View style={styles.panel}>
        <Body>{latest ? new Date(latest.at).toLocaleString() : metric === 'sleep' ? 'Sleep tracking is not connected' : 'No measurements yet'}</Body>
        {latest && <Body tone="muted">{sourceLabel(latest.source)}</Body>}
        {metric === 'hrv' && <Body size="sm" tone="muted">Camera HRV is an estimate from a short recording, not a clinical measurement.</Body>}
        {metrics.filter(m => m !== metric).map(m => {
          const r = readingsFor(m, vitals, bp)[0];
          return <Pressable key={m} onPress={() => setMetric(m)} accessibilityRole="button" accessibilityLabel={`View ${metricLabels[m].title}`} style={styles.row}><Text style={styles.rowLabel}>{metricLabels[m].title}</Text><Text style={styles.rowValue}>{r?.value ?? (m === 'sleep' ? 'Not connected' : 'No data')}</Text></Pressable>;
        })}
      </View>
      <View style={styles.actions}><Button label="Record blood pressure" onPress={() => router.push('/(app)/log-bp')} /><Button label="Measure heart rate" variant="secondary" onPress={() => router.push('/(app)/camera-rppg')} /></View>
      <Text style={styles.sectionTitle}>Measurement history</Text>
      <Body size="sm" tone="muted">Latest saved records for this metric. Each data source is loaded up to 200 records.</Body>
      {readings.length === 0 ? <Body tone="muted">{metric === 'sleep' ? 'Apple Health / Watch integration is not available yet.' : 'Saved readings will appear here.'}</Body> : readings.map(r => <View key={r.id} style={styles.historyRow}><View style={styles.historyText}><Body>{new Date(r.at).toLocaleString()}</Body><Body size="sm" tone="muted">{sourceLabel(r.source)}</Body></View><Body>{r.value}</Body></View>)}
    </>}
  </Screen>;
}
const styles = StyleSheet.create({
  screen: { paddingTop: 0, paddingBottom: 120, gap: 24 },
  heading: { gap: 8 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, tab: { borderWidth: 1, borderColor: colors.border.default, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 }, activeTab: { backgroundColor: colors.bg.muted, borderColor: 'white' }, tabText: { color: 'white', fontSize: 14 },
  orb: { width: 253, height: 253, maxWidth: '100%', alignSelf: 'center', borderRadius: 130, borderWidth: 2, borderTopColor: '#DCF2FF', borderLeftColor: '#84C3FF', borderBottomColor: '#96BAFF', borderRightColor: '#4676D9', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(60,95,235,0.32)', gap: 8 },
  value: { color: 'white', fontSize: 58, fontWeight: '500', maxWidth: '90%' }, unit: { color: colors.fg.secondary, fontSize: 16 },
  panel: { backgroundColor: '#184597', borderRadius: 36, padding: 24, gap: 20 }, row: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 48 }, rowLabel: { flex: 1, color: 'white', fontSize: 17 }, rowValue: { color: 'white', fontSize: 16, textAlign: 'right', maxWidth: '45%' },
  actions: { gap: 12 }, sectionTitle: { color: 'white', fontSize: 24 }, historyRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.faint }, historyText: { flex: 1, gap: 4 },
});
