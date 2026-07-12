/**
 * Gestational-age helpers.
 *
 * Conventions this module fixes relative to the old inline dashboard code:
 * - No due date (or an unparsable one) returns null — the UI must say so
 *   instead of displaying a fabricated "16 weeks" as the user's condition.
 * - Weeks are floored, matching clinical convention ("16 weeks" until
 *   16w6d); Math.round bumped the displayed week 3.5 days early.
 * - Date-only strings are parsed as LOCAL dates; new Date("YYYY-MM-DD")
 *   parses as UTC midnight and shifts boundaries a day for users west of UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const TERM_WEEKS = 40;

function parseLocalDate(dateOnly: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOnly.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPregnancyWeeks(
  dueDate: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!dueDate) return null;
  const due = parseLocalDate(dueDate);
  if (!due) return null;

  const daysUntilDue = (due.getTime() - now.getTime()) / DAY_MS;
  const weeks = Math.floor(TERM_WEEKS - daysUntilDue / 7);
  return Math.min(TERM_WEEKS, Math.max(1, weeks));
}
