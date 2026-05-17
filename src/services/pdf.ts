/**
 * PDF export service.
 *
 * Renders the Doctor Visit Summary into an HTML document with clean,
 * clinical formatting: bullet-style sections from the AI plus a raw
 * data table for objective vitals so the clinician can verify the
 * underlying readings at a glance.
 *
 * Uses expo-print to convert to PDF, expo-sharing to hand off to the
 * user's sharing sheet (AirDrop / Messages / Mail / Save to Files).
 */

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface BpRow {
  measuredAt: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  source: string;
}

export interface MoodRow {
  loggedAt: string;
  mood: string;
  note: string | null;
}

export interface DoctorSummaryDocument {
  patientName: string;
  generatedAt: string;
  windowDays: number;

  patientContext: string[];
  vitalsSummary: string[];
  symptomSummary: string[];
  moodSummary: string[];
  riskFactors: string[];
  questionsToAsk: string[];
  urgentConcerns: string[];

  // Raw data tables — straight from the database, not the AI.
  bpReadings: BpRow[];
  moodEntries: MoodRow[];
}

export async function exportDoctorSummary(doc: DoctorSummaryDocument): Promise<void> {
  const html = renderDoctorSummaryHtml(doc);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { dialogTitle: "Share with your provider" });
  }
}

// ---- HTML template -------------------------------------------------

function renderDoctorSummaryHtml(doc: DoctorSummaryDocument): string {
  const hasUrgent = doc.urgentConcerns.length > 0;
  const cleanMoodEntries = doc.moodEntries.filter((m) => !isGarbageNote(m.note));

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Visit Summary — ${escapeHtml(doc.patientName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, "Helvetica Neue", system-ui, sans-serif;
      color: #1f1316;
      padding: 22px 30px;
      line-height: 1.35;
      font-size: 11px;
    }
    .doc-header {
      border-bottom: 2px solid #D97A8C;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .doc-header h1 {
      margin: 0;
      font-size: 18px;
      color: #B85F71;
      letter-spacing: 0.3px;
    }
    .doc-header .meta {
      color: #8C7C84;
      font-size: 9.5px;
      text-align: right;
    }
    h2 {
      font-size: 10.5px;
      margin: 12px 0 3px;
      color: #2A1A1F;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      border-bottom: 1px solid #EFE0DC;
      padding-bottom: 2px;
    }
    ul {
      padding-left: 15px;
      margin: 3px 0;
    }
    li {
      margin-bottom: 1.5px;
    }
    .urgent {
      background: #F7DDD8;
      border-left: 3px solid #D8584A;
      padding: 6px 10px;
      border-radius: 3px;
      margin: 4px 0 12px;
    }
    .urgent h2 {
      color: #D8584A;
      border-bottom: none;
      margin: 0 0 2px;
      padding: 0;
    }
    .urgent ul { margin: 2px 0 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0 2px;
      font-size: 10px;
    }
    th, td {
      text-align: left;
      padding: 3px 6px;
      border-bottom: 1px solid #EFE0DC;
    }
    th {
      background: #FAEFEC;
      color: #5A4750;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.3px;
    }
    td.numeric { font-variant-numeric: tabular-nums; }
    .bp-high { color: #D8584A; font-weight: 600; }
    .empty-row {
      color: #8C7C84;
      font-style: italic;
      font-size: 10px;
      padding: 4px 0;
    }
    .footer {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid #EFE0DC;
      color: #8C7C84;
      font-size: 9px;
    }
    .two-col {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }
    .two-col > div { flex: 1; min-width: 0; }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>Visit Summary</h1>
    <div class="meta">
      <div><strong>Patient:</strong> ${escapeHtml(doc.patientName)}</div>
      <div>${escapeHtml(doc.generatedAt)} · ${doc.windowDays}-day window</div>
    </div>
  </div>

  ${
    hasUrgent
      ? `<div class="urgent">
          <h2>⚠ Urgent concerns</h2>
          ${renderBullets(doc.urgentConcerns)}
        </div>`
      : ""
  }

  <div class="two-col">
    <div>
      <h2>Patient context</h2>
      ${renderBullets(doc.patientContext)}
    </div>
    <div>
      <h2>Vitals — interpretation</h2>
      ${renderBullets(doc.vitalsSummary)}
    </div>
  </div>

  <h2>Blood pressure readings</h2>
  ${renderBpTable(doc.bpReadings)}

  <div class="two-col">
    <div>
      <h2>Symptoms</h2>
      ${renderBullets(doc.symptomSummary)}
    </div>
    <div>
      <h2>Mood</h2>
      ${renderBullets(doc.moodSummary)}
      ${cleanMoodEntries.length > 0 ? renderMoodTable(cleanMoodEntries) : ""}
    </div>
  </div>

  <div class="two-col">
    <div>
      <h2>Risk factors</h2>
      ${renderBullets(doc.riskFactors)}
    </div>
    <div>
      <h2>Questions to ask</h2>
      ${renderBullets(doc.questionsToAsk)}
    </div>
  </div>

  <div class="footer">
    Generated by Kairos. AI interpretation supports — not replaces — clinical judgement; verify against source data.
  </div>
</body>
</html>`;
}

/**
 * Filter out junk notes (e.g. "11111111", "aaa", whitespace) that the user
 * typed while testing — they make the mood table look unprofessional.
 */
function isGarbageNote(note: string | null): boolean {
  if (!note) return false;
  const trimmed = note.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length < 3) return true;
  // All the same character repeated.
  if (/^(.)\1+$/.test(trimmed)) return true;
  return false;
}

function renderBullets(items: string[]): string {
  if (!items || items.length === 0) {
    return `<div class="empty-row">No notable findings.</div>`;
  }
  return `<ul>${items.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`;
}

function renderBpTable(rows: BpRow[]): string {
  if (rows.length === 0) {
    return `<div class="empty-row">No blood pressure readings in this window.</div>`;
  }
  const sorted = [...rows].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );
  return `<table>
    <thead>
      <tr><th>Date</th><th>Time</th><th>BP (mmHg)</th><th>Pulse</th><th>Source</th></tr>
    </thead>
    <tbody>
      ${sorted
        .map((r) => {
          const date = new Date(r.measuredAt);
          const isHigh = r.systolic >= 140 || r.diastolic >= 90;
          return `<tr>
            <td>${escapeHtml(date.toLocaleDateString())}</td>
            <td>${escapeHtml(date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</td>
            <td class="numeric ${isHigh ? "bp-high" : ""}">${r.systolic}/${r.diastolic}${isHigh ? " ⚠" : ""}</td>
            <td class="numeric">${r.pulse ?? "—"}</td>
            <td>${escapeHtml(prettySource(r.source))}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>`;
}

function renderMoodTable(rows: MoodRow[]): string {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
  );
  const recent = sorted.slice(0, 10);
  return `<table>
    <thead>
      <tr><th>Date</th><th>Mood</th><th>Note</th></tr>
    </thead>
    <tbody>
      ${recent
        .map((r) => {
          const date = new Date(r.loggedAt);
          return `<tr>
            <td>${escapeHtml(date.toLocaleDateString())}</td>
            <td>${escapeHtml(capitalize(r.mood))}</td>
            <td>${escapeHtml(r.note ?? "—")}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>`;
}

function prettySource(source: string): string {
  if (source === "manual") return "Manual cuff";
  if (source === "rppg") return "rPPG (estimate)";
  if (source === "apple_health") return "Apple Health";
  if (source === "bluetooth_cuff") return "BT cuff";
  return source;
}

function capitalize(s: string): string {
  if (!s) return "";
  return s[0].toUpperCase() + s.slice(1);
}

function escapeHtml(s: string): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
