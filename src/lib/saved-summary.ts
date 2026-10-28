import { normalizeDoctorSummary } from './ai-normalize';
import type { BpRow, MoodRow } from '@/services/pdf';
export function readSavedSummary(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw new Error('Saved summary is unreadable. Please regenerate it.');
  const r = raw as Record<string, unknown>;
  if (!r.summary || typeof r.summary !== 'object' || typeof r.generatedAt !== 'string' || !Number.isFinite(Date.parse(r.generatedAt))) throw new Error('Saved summary is incomplete. Please regenerate it.');
  const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
  const bpRows: BpRow[] = Array.isArray(r.bpRows) ? r.bpRows.filter(isRecord).filter(v => typeof v.measuredAt === 'string' && Number.isFinite(Date.parse(v.measuredAt)) && typeof v.systolic === 'number' && typeof v.diastolic === 'number').map(v => ({ measuredAt: v.measuredAt as string, systolic: v.systolic as number, diastolic: v.diastolic as number, pulse: typeof v.pulse === 'number' ? v.pulse : null, source: typeof v.source === 'string' ? v.source : 'unknown' })) : [];
  const moodRows: MoodRow[] = Array.isArray(r.moodRows) ? r.moodRows.filter(isRecord).filter(v => typeof v.loggedAt === 'string' && Number.isFinite(Date.parse(v.loggedAt)) && typeof v.mood === 'string').map(v => ({ loggedAt: v.loggedAt as string, mood: v.mood as string, note: typeof v.note === 'string' ? v.note : null })) : [];
  return { summary: normalizeDoctorSummary(r.summary), generatedAt: r.generatedAt, bpRows, moodRows };
}
