import type { TxnType } from './reference';

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function maskDates(line: string): string {
  return line
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, ' ')
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-,]?\d{2,4}\b/g, ' ');
}

/**
 * Rejects impossible and implausible dates.
 *
 * Day 0 and month 0 were previously accepted, producing rows dated "2005-04-00" from
 * what were actually account numbers. Dates far in the future come from loan
 * amortisation schedules, which list instalments yet to be paid — not transactions.
 */
function validDate(y: number, mo: number, d: number, now = new Date()): boolean {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false;
  if (y < 2000) return false;
  // A statement can post a day or two ahead; a year ahead is a schedule, not a purchase.
  const limit = new Date(now.getTime() + 7 * 86_400_000);
  return dt <= limit;
}

function fmtDate(y: number, mo: number, d: number): string {
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseDate(line: string, now = new Date()): string | null {
  let m = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (m) {
    const d = +m[1];
    const mo = +m[2];
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (validDate(y, mo, d, now)) return fmtDate(y, mo, d);
  }
  m = line.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    if (validDate(y, mo, d, now)) return fmtDate(y, mo, d);
  }
  m = line.match(/\b(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-,]?(\d{2,4})\b/);
  if (m) {
    const d = +m[1];
    const mo = MONTH_MAP[m[2].toLowerCase().slice(0, 3)];
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (mo && validDate(y, mo, d, now)) return fmtDate(y, mo, d);
  }
  return null;
}

/** Above this, a "number" on a statement line is a reference, not money. */
const MAX_PLAUSIBLE_AMOUNT = 1e9;

export function parseAmount(line: string): number | null {
  const s = maskDates(line);

  // \b before the currency token matters: without it "INR" matches inside RTGS references
  // such as SBINR52025041882617516, turning the reference into a 17-digit amount.
  const m = s.match(/\b(?:rs\.?|inr|\u20B9)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (m) {
    const v = parseFloat(m[1].replace(/,/g, ''));
    if (v > 0 && v < MAX_PLAUSIBLE_AMOUNT) return v;
  }

  const dec = [...s.matchAll(/\b\d+(?:,\d{2,3})*\.\d{1,2}\b/g)]
    .map((x) => parseFloat(x[0].replace(/,/g, '')))
    .filter((v) => v > 0 && v < MAX_PLAUSIBLE_AMOUNT);

  if (dec.length === 1) return dec[0];
  if (dec.length > 1) {
    // Bank statement rows end with a running balance: "\u2026 TRANSFER 8,00,000.00 56,92,664.51".
    // The transaction is the value before it, not the balance.
    return dec[dec.length - 2];
  }

  const ints = [...s.matchAll(/\b\d{2,8}\b/g)]
    .map((x) => parseFloat(x[0]))
    .filter((v) => v > 0 && v < MAX_PLAUSIBLE_AMOUNT);
  if (ints.length === 1) return ints[0];
  if (ints.length > 1) return ints[ints.length - 2];
  return null;
}

const STOP =
  /\b(debited|credited|debit|credit|from|your|a\/?c|ac|account|no|txn|ref|upi|vpa|imps|neft|rtgs|avl|bal|balance|on|dt|dated|via|payment|paid|towards|received|info|is|for|at|of|the|inr|rs|dr|cr)\b/gi;

export function extractMerchant(line: string, amount: number | null): string {
  let s = ' ' + maskDates(line) + ' ';
  s = s
    .replace(/(?:rs\.?|inr|\u20B9)\s*[\d,]+(?:\.\d{1,2})?/gi, ' ')
    .replace(/\b\d+(?:,\d{2,3})*\.\d{1,2}\b/g, ' ')
    .replace(/\b\d{5,}\b/g, ' ')
    .replace(/\b[a-z]{1,4}\d{3,}\b/gi, ' ')
    .replace(/\*+\d+/g, ' ')
    .replace(STOP, ' ')
    .replace(/@[a-z][a-z0-9.]*/gi, ' ')
    .replace(/[^\w\s&.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (amount != null) {
    const a = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
    const cleaned = s
      .replace(new RegExp('\\b' + a.replace('.', '\\.') + '\\b', 'g'), ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned) s = cleaned;
  }
  return s || 'Unknown';
}

export function ruleKey(merchant: string): string {
  return merchant.toLowerCase().replace(/\d+/g, '').trim().split(/\s+/).slice(0, 3).join(' ');
}

/** Rules-first classifier. First regex match wins. Runs only when no learned rule exists. */
const RULES: [RegExp, TxnType, string | null][] = [
  [/\bemi\b|loan\s*(emi|instal)|instal(l)?ment|home\s*loan|auto\s*loan|car\s*loan/i, 'emi_loan', null],
  [/credit\s*card\s*(payment|bill|paid)|card\s*payment|autopay.*card|amex.*payment|neft.*card/i, 'cc_payment', null],
  [/\bsalary\b|\bcredit\s*interest|dividend|interest\s*credit/i, 'income', null],
  [/\bsip\b|mutual\s*fund|zerodha|groww|upstox|kuvera|nps\b|ppf\b|elss|smallcase|icici\s*direct|nuvama/i, 'investment', null],
  [/\batm\b|cash\s*w(it)?hdr|cash\s*wdl/i, 'cash', null],
  [/\brefund\b|reversal|chargeback/i, 'refund', null],
  [/self\b|own\s*a\/?c|transfer\s*to\s*self|imps.*self/i, 'own_transfer', null],
  [/swiggy|zomato|domino|mcdonald|kfc|starbucks|barbeque|restaurant|cafe|zepto|blinkit|bigbasket|instamart|dunzo|grocer|bakery|dairy/i, 'personal_expense', 'food'],
  [/uber|\bola\b|rapido|petrol|diesel|fuel|indian\s*oil|bpcl|hpcl|iocl|fastag|parking|toll|metro\s*card/i, 'personal_expense', 'transport'],
  [/netflix|spotify|hotstar|prime\s*video|youtube\s*premium|icloud|google\s*one|adobe|subscription/i, 'personal_expense', 'subs'],
  [/apollo|practo|1mg|pharmeasy|pharmacy|hospital|clinic|diagnostic|medplus|dental/i, 'personal_expense', 'health'],
  [/airtel|jio\b|vodafone|\bvi\b|broadband|electricity|mseb|msedcl|gas\s*bill|water\s*bill|\bbses\b/i, 'personal_expense', 'utilities'],
  [/\brent\b|maintenance|society\s*charge|housing/i, 'personal_expense', 'housing'],
  [/makemytrip|goibibo|irctc|indigo|air\s*india|spicejet|vistara|airlines|\boyo\b|airbnb|yatra|redbus|marriott|taj\b/i, 'personal_expense', 'travel'],
  [/myntra|ajio|nykaa|zara|\bh\s*&\s*m\b|lifestyle|pantaloons|shoppers\s*stop|tanishq/i, 'personal_expense', 'fashion'],
  [/school|college|tuition|coaching|byju|unacademy|course\s*fee/i, 'personal_expense', 'education'],
  [/maid|househelp|cook\b|driver\s*salary|gardener|cleaning/i, 'personal_expense', 'household'],
];

export interface RuleMap {
  [key: string]: { type: TxnType; category: string | null };
}

export function classify(merchant: string, narration: string, rules: RuleMap) {
  const key = ruleKey(merchant);
  if (rules[key]) return { ...rules[key], confidence: 'high' as const };
  const hay = narration + ' ' + merchant;
  for (const [re, type, category] of RULES) {
    if (re.test(hay)) return { type, category, confidence: 'medium' as const };
  }
  return { type: 'unclassified' as TxnType, category: null, confidence: 'low' as const };
}

/**
 * Statement furniture that carries numbers but is not a transaction: summary boxes,
 * addresses, contact details, page markers and legal text. Without this a PDF's footer
 * becomes dozens of phantom transactions.
 */
const NOISE =
  /(minimum\s*(amount\s*)?(payment|due)|total\s*(amount\s*)?due|amount\s*due|payment\s*due|due\s*by|due\s*date|statement\s*(period|includes|date|summary)|billing\s*period|credit\s*limit|available\s*(credit|limit|cash)|cash\s*limit|(previous|opening|closing|outstanding)\s*balance|total\s*(debits?|credits?|spends?|purchases?)|toll[\s-]*free|customer\s*(care|service)|helpline|contact\s*us|page\s*\d+\s*(of|\/)\s*\d+|gstin|\bpan\b|reward\s*points?|thank\s*you|please\s*(pay|note|call)|register(ed)?\s*office|www\.|https?:|@[a-z]|sector\s*-?\s*\d+|\bph\.?\s*(no|ii)\b|^\s*[\+\(]?\d{2,4}[-\s\)]\s*\d{3,}|\b\d{6}\s*$|card\s*number|15-digit|card\s*member|cardmember|account\s*(number|holder|summary)|member\s*since|loyalty\s*(number|id)|xxxx\s*x|x{4,}|ending\s*(in|with)\s*\d{4}|supplementary|add-on\s*card)/i;

/** A line that is only punctuation, an address fragment, or a bare number. */
function isStructuralNoise(line: string): boolean {
  const letters = (line.match(/[A-Za-z]/g) || []).length;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return true;
  if (letters < 3) return true;                       // "34>." / "- 1 of 1 -"
  if (/^[\d\s,.\-+=]+$/.test(line)) return true;      // a row of running totals
  return false;
}

/**
 * Whether a statement line looks like an actual transaction.
 * `requireDate` is the strict pass; see parseLines for why there is a lenient fallback.
 */
export function looksLikeTransaction(line: string, requireDate: boolean): boolean {
  if (!/\d/.test(line)) return false;
  if (isStructuralNoise(line)) return false;
  if (NOISE.test(line)) return false;
  if (requireDate && parseDate(line) === null) return false;
  return true;
}

export interface ParsedLine {
  date: string | null;
  narration: string;
  merchant: string;
  amount: number;
  direction: 'debit' | 'credit';
  type: TxnType;
  category: string | null;
  confidence: 'high' | 'medium' | 'low';
}

function buildLine(line: string, rules: RuleMap): ParsedLine | null {
  const amount = parseAmount(line);
  if (amount === null || amount <= 0) return null;
  const direction: 'debit' | 'credit' = /\bcr\b|\bcredit\b/i.test(line) ? 'credit' : 'debit';
  const merchant = extractMerchant(line, amount);
  const c = classify(merchant, line, rules);
  return {
    date: parseDate(line),
    narration: line,
    merchant,
    amount,
    direction,
    type: c.type,
    category: c.category,
    confidence: c.confidence,
  };
}

/**
 * Turns statement text into transactions.
 *
 * Two passes. The strict one keeps only lines carrying a date, which is what a real
 * transaction row always has and what a footer or address block does not. If a statement
 * yields nothing that way — some formats put the date on its own line — it falls back to
 * the lenient pass so the import still works, and `datesFound` tells the caller to warn
 * that these rows cannot be placed in a period.
 */
export function parseLines(raw: string, rules: RuleMap): ParsedLine[] {
  return parseStatement(raw, rules).lines;
}

export function parseStatement(
  raw: string,
  rules: RuleMap
): { lines: ParsedLine[]; datesFound: boolean; skipped: number } {
  const all = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  const strict: ParsedLine[] = [];
  for (const line of all) {
    if (!looksLikeTransaction(line, true)) continue;
    const p = buildLine(line, rules);
    if (p) strict.push(p);
  }
  if (strict.length > 0) {
    return { lines: strict, datesFound: true, skipped: all.length - strict.length };
  }

  const lenient: ParsedLine[] = [];
  for (const line of all) {
    if (!looksLikeTransaction(line, false)) continue;
    const p = buildLine(line, rules);
    if (p) lenient.push(p);
  }
  return { lines: lenient, datesFound: false, skipped: all.length - lenient.length };
}
