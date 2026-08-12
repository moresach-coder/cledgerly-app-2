/**
 * Reporting periods on the Indian financial year (1 April – 31 March).
 *
 * A lifetime total is not a useful default for a spending ledger — it only grows and can
 * never be compared against anything. The default is the current financial year, because
 * that is the window Indian tax and household budgeting actually work in.
 */

export type Granularity = 'month' | 'quarter' | 'year';

export interface Period {
  id: string;        // 'y2026' | 'q2026-2' | 'm2026-08' | 'all'
  label: string;     // 'FY 2026-27' | 'Q2 FY26-27' | 'Aug 2026'
  from: string;      // inclusive YYYY-MM-DD
  to: string;        // inclusive YYYY-MM-DD
  granularity: Granularity;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The financial year a date falls in, named by its starting calendar year. */
export function fyOf(date: Date): number {
  return date.getUTCMonth() + 1 >= 4 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

export function fyLabel(fy: number): string {
  return `FY ${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;
}

export function yearPeriod(fy: number): Period {
  return {
    id: `y${fy}`,
    label: fyLabel(fy),
    from: `${fy}-04-01`,
    to: `${fy + 1}-03-31`,
    granularity: 'year',
  };
}

/** Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar. */
export function quarterPeriod(fy: number, q: 1 | 2 | 3 | 4): Period {
  const startMonth = 4 + (q - 1) * 3;          // 4, 7, 10, 13
  const startYear = fy + (startMonth > 12 ? 1 : 0);
  const sm = startMonth > 12 ? startMonth - 12 : startMonth;
  const endMonthAbs = sm + 2;
  const endYear = startYear + (endMonthAbs > 12 ? 1 : 0);
  const em = endMonthAbs > 12 ? endMonthAbs - 12 : endMonthAbs;

  return {
    id: `q${fy}-${q}`,
    label: `Q${q} ${fyLabel(fy).replace('FY ', 'FY')}`,
    from: `${startYear}-${pad(sm)}-01`,
    to: `${endYear}-${pad(em)}-${pad(lastDay(endYear, em))}`,
    granularity: 'quarter',
  };
}

export function monthPeriod(key: string): Period {
  const [y, m] = key.split('-').map(Number);
  return {
    id: `m${key}`,
    label: `${MONTHS[m - 1]} ${y}`,
    from: `${key}-01`,
    to: `${key}-${pad(lastDay(y, m))}`,
    granularity: 'month',
  };
}

export const ALL_TIME: Period = {
  id: 'all',
  label: 'All time',
  from: '0000-01-01',
  to: '9999-12-31',
  granularity: 'year',
};

export function parsePeriod(id: string): Period {
  if (!id || id === 'all') return ALL_TIME;
  if (id.startsWith('y')) return yearPeriod(Number(id.slice(1)));
  if (id.startsWith('q')) {
    const [fy, q] = id.slice(1).split('-').map(Number);
    return quarterPeriod(fy, q as 1 | 2 | 3 | 4);
  }
  if (id.startsWith('m')) return monthPeriod(id.slice(1));
  return ALL_TIME;
}

/** Default view: the financial year we are currently in. */
export function currentPeriod(now = new Date()): Period {
  return yearPeriod(fyOf(now));
}

/**
 * The choices offered for a granularity, newest first, limited to periods that could
 * contain data (derived from the months actually present in the ledger).
 */
export function optionsFor(granularity: Granularity, months: string[], now = new Date()): Period[] {
  if (months.length === 0) return [currentPeriod(now)];

  const sorted = [...months].sort();
  const earliest = new Date(`${sorted[0]}-01T00:00:00Z`);
  const latest = new Date(`${sorted[sorted.length - 1]}-01T00:00:00Z`);

  if (granularity === 'month') {
    return [...sorted].reverse().map(monthPeriod);
  }

  const firstFy = fyOf(earliest);
  const lastFy = fyOf(latest);
  const years: number[] = [];
  for (let fy = lastFy; fy >= firstFy; fy--) years.push(fy);

  if (granularity === 'year') return years.map(yearPeriod);

  const out: Period[] = [];
  for (const fy of years) {
    for (const q of [4, 3, 2, 1] as const) {
      const p = quarterPeriod(fy, q);
      // Keep a quarter only if some month in the ledger falls inside it.
      if (sorted.some((m) => m >= p.from.slice(0, 7) && m <= p.to.slice(0, 7))) out.push(p);
    }
  }
  return out;
}
