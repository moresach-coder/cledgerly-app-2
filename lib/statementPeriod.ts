/**
 * Reads the billing window off a statement.
 *
 * Issuers print it in the header ("Statement Period From March 29 to April 28, 2026",
 * "ICICI Bank Statement from April 01, 2025 to July 31, 2025"). When no printed period is
 * found, the span of the transactions themselves is a good enough substitute — see
 * periodFromDates.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function monthNum(word: string): number | null {
  return MONTHS[word.slice(0, 4).toLowerCase()] ?? MONTHS[word.slice(0, 3).toLowerCase()] ?? null;
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > lastDay(y, m) || y < 2000 || y > 2100) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export interface StatementPeriod {
  from: string | null;
  to: string | null;
  statementDate: string | null;
}

/** "March 29 to April 28, 2026" — the year is stated once, at the end. */
function sharedYearRange(text: string): { from: string; to: string } | null {
  const m = text.match(
    /from\s+([A-Za-z]{3,9})\s+(\d{1,2})\s*(?:to|-|–|through)\s*([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/i
  );
  if (!m) return null;
  const m1 = monthNum(m[1]);
  const m2 = monthNum(m[3]);
  const year = Number(m[5]);
  if (!m1 || !m2) return null;
  // A window that wraps the new year starts in the previous one.
  const fromYear = m1 > m2 ? year - 1 : year;
  const from = iso(fromYear, m1, Number(m[2]));
  const to = iso(year, m2, Number(m[4]));
  return from && to ? { from, to } : null;
}

/** "from April 01, 2025 to July 31, 2025" — both ends carry a year. */
function fullDateRange(text: string): { from: string; to: string } | null {
  const m = text.match(
    /from\s+([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})\s*(?:to|-|–|through)\s*([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/i
  );
  if (m) {
    const m1 = monthNum(m[1]);
    const m2 = monthNum(m[4]);
    if (m1 && m2) {
      const from = iso(Number(m[3]), m1, Number(m[2]));
      const to = iso(Number(m[6]), m2, Number(m[5]));
      if (from && to) return { from, to };
    }
  }
  // Numeric form: 01/04/2025 to 31/07/2025
  const n = text.match(
    /from\s+(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s*(?:to|-|–)\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i
  );
  if (n) {
    const from = iso(Number(n[3]), Number(n[2]), Number(n[1]));
    const to = iso(Number(n[6]), Number(n[5]), Number(n[4]));
    if (from && to) return { from, to };
  }
  return null;
}

function statementDate(text: string): string | null {
  const m = text.match(
    /statement\s*date\s*[:\-]?\s*([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})|statement\s*date\s*[:\-]?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i
  );
  if (!m) return null;
  if (m[1]) {
    const mo = monthNum(m[1]);
    return mo ? iso(Number(m[3]), mo, Number(m[2])) : null;
  }
  return iso(Number(m[6]), Number(m[5]), Number(m[4]));
}

export function detectStatementPeriod(text: string): StatementPeriod {
  const head = text.slice(0, 6000); // the header carries these; the body does not
  const range = fullDateRange(head) || sharedYearRange(head);
  return {
    from: range?.from ?? null,
    to: range?.to ?? null,
    statementDate: statementDate(head),
  };
}

/** Fallback when nothing is printed: the span the transactions themselves cover. */
export function periodFromDates(dates: (string | null)[]): { from: string | null; to: string | null } {
  const valid = dates.filter((d): d is string => !!d).sort();
  return valid.length ? { from: valid[0], to: valid[valid.length - 1] } : { from: null, to: null };
}
