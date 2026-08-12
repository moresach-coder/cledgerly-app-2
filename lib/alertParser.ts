/**
 * Parser for single-transaction alert emails from Indian banks and card issuers.
 *
 * These arrive within minutes of a swipe and are the app's live feed between statements.
 * They are deliberately treated as provisional: the monthly statement is authoritative,
 * and reconcileAlerts() in lib/repo.ts supersedes an alert once the statement covers it.
 *
 * Formats vary per issuer and change without notice, so anything that does not match a
 * known shape is reported as unparsed rather than guessed at.
 */

export interface ParsedAlert {
  amount: number;
  direction: 'debit' | 'credit';
  merchant: string;
  date: string | null; // YYYY-MM-DD
  last4: string | null;
  instrument: 'card' | 'account' | null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Normalises the date spellings these mails use into YYYY-MM-DD. */
export function parseAlertDate(raw: string, now = new Date()): string | null {
  const s = raw.trim().replace(/(\d)(st|nd|rd|th)\b/gi, '$1');

  // 02-Aug-26 / 02 Aug 2026 / 2-August-2026
  let m = s.match(/\b(\d{1,2})[-\s/]([A-Za-z]{3,9})[-\s/](\d{2,4})\b/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon) {
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      return `${y}-${pad(mon)}-${pad(Number(m[1]))}`;
    }
  }

  // August 3, 2026
  m = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon) return `${m[3]}-${pad(mon)}-${pad(Number(m[2]))}`;
  }

  // 02-08-26 / 02/08/2026 — day-first, which is the Indian convention.
  m = s.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const day = Number(m[1]);
    const mon = Number(m[2]);
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) return `${y}-${pad(mon)}-${pad(day)}`;
  }

  return null;
}

function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Alert bodies run the merchant straight into trailing clauses ("… at ADOBE on 03/08/2026
// with your card ending 7207"). Cut at the first of these so the merchant stays the
// merchant.
const MERCHANT_STOPS = [
  /\s+on\s+\d/i,
  /\s+on\s+[A-Za-z]{3,9}\s+\d/i,
  /\s+(?:with|using|via|from|through)\s+your\b/i,
  /\s+(?:dated|ref(?:erence)?|txn|transaction|avl|available|info|not you|to know)\b/i,
  /\s+(?:a\/c|account|card)\s+(?:no|ending|xx)/i,
  /[;|]/,
];

function cleanMerchant(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  for (const stop of MERCHANT_STOPS) {
    const m = s.match(stop);
    if (m && m.index != null && m.index > 0) s = s.slice(0, m.index);
  }
  return s
    .replace(/[.,;:\-]+$/, '')
    .replace(/\b(on|at|via|dated|info|ref|towards|with)\s*$/i, '')
    .trim()
    .slice(0, 80);
}

const CREDIT_HINTS = /\b(credited|received|refund(?:ed)?|reversal|cashback|deposited)\b/i;

// Ordered most-specific first. Each supplies amount + merchant; date and card are pulled
// from the whole body afterwards since their position varies.
const PATTERNS: { re: RegExp; amount: number; merchant: number }[] = [
  // "transaction of INR 348.00 ... at SWIGGY"
  { re: /(?:transaction|txn)\s+of\s+(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)[^]{0,80}?\bat\s+([A-Za-z0-9][^\n.]{1,60})/i, amount: 1, merchant: 2 },
  // "Rs.348.00 spent on ... at SWIGGY"
  { re: /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:spent|used|debited|charged)[^]{0,80}?\b(?:at|to|towards|in favour of)\s+([A-Za-z0-9][^\n.]{1,60})/i, amount: 1, merchant: 2 },
  // "credited ... Rs 250000 ... from ACME PAYROLL"
  { re: /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:credited|received)[^]{0,80}?\b(?:from|by)\s+([A-Za-z0-9][^\n.]{1,60})/i, amount: 1, merchant: 2 },
  // "Info: SWIGGY ... Amt: Rs 348.00" (HDFC-style, merchant before amount)
  { re: /\b(?:Info|Merchant|Payee)\s*[:\-]\s*([A-Za-z0-9][^\n;]{1,60})[^]{0,120}?(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i, amount: 2, merchant: 1 },
];

/**
 * Attempts to read one transaction out of an alert email body.
 * Returns null when the message does not look like a transaction alert at all.
 */
export function parseAlert(body: string, subject = '', now = new Date()): ParsedAlert | null {
  // Strip HTML and collapse entities so the same patterns work on either part.
  const text = body
    .replace(/<(script|style)[^]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8377;|&rupee;/gi, '₹')
    .replace(/[ \t]+/g, ' ');

  const haystack = `${subject}\n${text}`;

  for (const p of PATTERNS) {
    const m = haystack.match(p.re);
    if (!m) continue;

    const amount = parseAmount(m[p.amount]);
    const merchant = cleanMerchant(m[p.merchant]);
    if (amount == null || merchant.length < 2) continue;

    const dateMatch = haystack.match(
      /\b\d{1,2}[-\s/][A-Za-z]{3,9}[-\s/]\d{2,4}\b|\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/
    );
    const last4Match = haystack.match(
      /(?:card|a\/c|account|ending|xx+|\*+)\s*[:\-]?\s*(?:no\.?\s*)?[xX*\d]*?(\d{4})\b/i
    );

    return {
      amount,
      direction: CREDIT_HINTS.test(haystack) ? 'credit' : 'debit',
      merchant,
      date: dateMatch ? parseAlertDate(dateMatch[0], now) : null,
      last4: last4Match ? last4Match[1] : null,
      instrument: /\bcard\b/i.test(haystack) ? 'card' : /\ba\/c\b|\baccount\b/i.test(haystack) ? 'account' : null,
    };
  }

  return null;
}

/** True when a message looks like bank mail worth opening at all. */
export function looksLikeBankMail(from: string, subject: string): boolean {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();
  const senderHit =
    /(icici|hdfc|axis|sbi|kotak|amex|americanexpress|idfc|yesbank|indusind|onecard|sbicard|rblbank|federalbank)/.test(f);
  const subjectHit =
    /(transaction|statement|alert|spent|debited|credited|e-?statement|bill|card)/.test(s);
  return senderHit || subjectHit;
}
