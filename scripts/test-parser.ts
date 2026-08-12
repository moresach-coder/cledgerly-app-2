/**
 * Precision tests for statement parsing. Run with: npx tsx scripts/test-parser.ts
 *
 * The failure these guard against is a real one: an Amex PDF's address block, phone
 * numbers and "Minimum Payment" line were being imported as 195 phantom transactions,
 * because the only filter was "does this line contain a digit".
 */
import { parseStatement, looksLikeTransaction, parseDate, parseAmount } from '../lib/parser';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures++;
    console.log(`✗ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

// Lines lifted verbatim from a real Amex statement that must never become transactions.
const NOISE_LINES = [
  '14,499.60 - 14,499.60 + 206,116.19 = 206,116.19 10,306.00',
  'Statement includes payments and charges received by April 28, 2026 May 16, 2026',
  'DLF Bldg No. 8, Sector - 25',
  'Gurgaon - 122002',
  'on: +91-124-670-2929',
  '(Toll Free): 1800 419 2122',
  'PUNE MH 411028',
  '<enter your 15-digit Card number beginning with 37 or',
  '34>."',
  'Minimum Payment: Rs 10,306.00',
  'Due by May 16, 2026',
  'Statement Period From March 29 to April 28, 2026',
  'Credit Limit: Rs 5,00,000',
  'Available Credit Limit Rs 2,93,883.81',
  'Page 1 of 4',
  'Previous Balance 14,499.60',
  'Total Amount Due Rs 2,06,116.19',
];

for (const line of NOISE_LINES) {
  if (looksLikeTransaction(line, true)) {
    failures++;
    console.log(`✗ should be rejected: ${JSON.stringify(line)}`);
  }
}
console.log(`✓ ${NOISE_LINES.length} statement-furniture lines rejected`);

// Real transaction rows that must survive.
const REAL = [
  '03/06/2026, SWIGGY BANGALORE, 620.00',
  '07/06/2026 UBER TRIP 240.00',
  '12-Jun-2026  NETFLIX SUBSCRIPTION  649.00',
  '2026-06-18 MYNTRA ORDER 2100.00',
];
for (const line of REAL) {
  if (!looksLikeTransaction(line, true)) {
    failures++;
    console.log(`✗ should be kept: ${JSON.stringify(line)}`);
  }
}
console.log(`✓ ${REAL.length} transaction rows kept`);

// End to end on a mixed statement.
const STATEMENT = [
  'AMERICAN EXPRESS',
  'Statement Period From March 29 to April 28, 2026',
  'DLF Bldg No. 8, Sector - 25',
  'Gurgaon - 122002',
  '03/06/2026, SWIGGY BANGALORE, 620.00',
  '07/06/2026, UBER TRIP, 240.00',
  'Minimum Payment: Rs 10,306.00',
  '12/06/2026, NETFLIX SUBSCRIPTION, 649.00',
  'Total Amount Due Rs 2,06,116.19',
  'Page 1 of 4',
].join('\n');

const r = parseStatement(STATEMENT, {});
check('transactions extracted', r.lines.length, 3);
check('all carry a date', r.lines.every((l) => l.date !== null), true);
check('datesFound flag', r.datesFound, true);
check('merchants', r.lines.map((l) => l.merchant), ['SWIGGY BANGALORE', 'UBER TRIP', 'NETFLIX SUBSCRIPTION']);
check('amounts', r.lines.map((l) => l.amount), [620, 240, 649]);
check('no phantom from Minimum Payment', r.lines.some((l) => l.amount === 10306), false);
check('no phantom from Total Due', r.lines.some((l) => l.amount === 206116.19), false);

// A statement with no parseable dates still imports, but flags itself.
const UNDATED = ['SWIGGY BANGALORE 620.00', 'UBER TRIP 240.00'].join('\n');
const u = parseStatement(UNDATED, {});
check('lenient fallback still parses', u.lines.length, 2);
check('fallback reports no dates', u.datesFound, false);

check('parseDate on DD/MM/YYYY', parseDate('03/06/2026 SWIGGY'), '2026-06-03');
check('parseDate on DD-Mon-YYYY', parseDate('12-Jun-2026 NETFLIX'), '2026-06-12');

// --- date validation ------------------------------------------------------------
const NOW = new Date('2026-08-05T00:00:00Z');
check('rejects day 00', parseDate('Amazon Pay ICICI 0000000015518285 305,000.00 0.', NOW), null);
check('rejects month 13', parseDate('13/13/2026 SOMETHING 100.00', NOW), null);
check('rejects 31 Feb', parseDate('31/02/2026 SOMETHING 100.00', NOW), null);
check('rejects future EMI schedule row', parseDate('5 20-Nov-2026 1,226.74 1,194.69', NOW), null);
check('accepts today', parseDate('05/08/2026 SWIGGY 100.00', NOW), '2026-08-05');
check('accepts recent past', parseDate('03/06/2026 SWIGGY 620.00', NOW), '2026-06-03');
check('allows small posting lag', parseDate('08/08/2026 SWIGGY 100.00', NOW), '2026-08-08');

// --- amount extraction ----------------------------------------------------------
// "INR" appears inside RTGS references like SBINR5202504…, which turned a 17-digit
// reference into a 5-crore transaction.
check('ignores INR inside a reference', parseAmount('18-04-2025 RTGS-SBINR52025041882617516-SACHIN'), null);
// Bank rows end with a running balance; the transaction is the value before it.
check('takes amount not balance', parseAmount('BIL/INFT/EFN26 KRUTEE 8,00,000.00 56,92,664.51'), 800000);
check('takes amount not balance (2)', parseAmount('NET BANKING INF/0001 Sachin 21,355.00 46,34,307.26'), 21355);
check('single amount unaffected', parseAmount('03/06/2026, SWIGGY BANGALORE, 620.00'), 620);
check('explicit Rs prefix still wins', parseAmount('05/08/2026 NETFLIX Rs 649.00'), 649);

console.log(failures === 0 ? '\nAll parser tests passed.' : `\n${failures} assertion(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
