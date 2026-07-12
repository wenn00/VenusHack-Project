/**
 * Date-of-birth validation for the MM/DD/YYYY signup field.
 * Previously any non-empty string (e.g. "abc") passed the required check.
 */

const MIN_YEAR = 1900;

export function isValidDateOfBirth(text: string, now: Date = new Date()): boolean {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return false;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (year < MIN_YEAR) return false;

  const date = new Date(year, month - 1, day);
  // new Date() normalizes overflow (02/30 -> 03/02); require exact match
  // so impossible calendar dates are rejected.
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDate && date.getTime() < now.getTime();
}
