export type Metric = 'heart_rate' | 'blood_pressure' | 'hrv' | 'sleep';
export interface MetricReading { id: string; value: string; at: string; source: string }
export interface VitalRow { id: string; heart_rate: number | null; hrv_ms: number | null; measured_at: string; measurement_type: string }
export interface PressureRow { id: string; systolic: number; diastolic: number; pulse: number | null; measured_at: string; source: string }
export const metricLabels: Record<Metric, { title: string; unit: string; description: string }> = {
  heart_rate: { title: 'Heart rate', unit: 'Beats Per Minute', description: 'Your latest recorded heart rate' },
  blood_pressure: { title: 'Blood pressure', unit: 'mmHg', description: 'Your latest recorded blood pressure' },
  hrv: { title: 'Heart rate variability', unit: 'milliseconds', description: 'Your latest recorded HRV estimate' },
  sleep: { title: 'Sleep', unit: 'Hours of Sleep', description: 'Connect a supported source to track sleep' },
};
export function sourceLabel(source: string): string {
  return ({ rppg: 'Camera estimate', manual: 'Manual entry', apple_health: 'Apple Health', bluetooth_cuff: 'Blood pressure cuff' } as Record<string, string>)[source] ?? 'Recorded measurement';
}
export function readingsFor(metric: Metric, vitals: VitalRow[], bp: PressureRow[]): MetricReading[] {
  const result: MetricReading[] = [];
  if (metric === 'sleep') return result;
  if (metric === 'blood_pressure') {
    for (const r of bp) if (r.systolic > 0 && r.diastolic > 0) result.push({ id: `bp-${r.id}`, value: `${r.systolic}/${r.diastolic}`, at: r.measured_at, source: r.source });
  } else {
    for (const r of vitals) {
      const value = metric === 'heart_rate' ? r.heart_rate : r.hrv_ms;
      if (value !== null && Number.isFinite(value) && value > 0) result.push({ id: `vital-${r.id}`, value: String(value), at: r.measured_at, source: r.measurement_type });
    }
    if (metric === 'heart_rate') for (const r of bp) {
      if (r.pulse !== null && Number.isFinite(r.pulse) && r.pulse > 0) result.push({ id: `pulse-${r.id}`, value: String(r.pulse), at: r.measured_at, source: r.source });
    }
  }
  return result.filter(r => Number.isFinite(Date.parse(r.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
