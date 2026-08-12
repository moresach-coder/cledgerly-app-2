/**
 * Regression tests for the bank-alert regexes. Run with:  npx tsx scripts/test-alert-parser.ts
 *
 * Issuers change their alert wording without notice, so when a real mail stops importing,
 * paste its body in here as a new case before touching the patterns.
 */
import { parseAlert, parseAlertDate, looksLikeBankMail } from '../lib/alertParser';

interface Case {
  name: string;
  subject: string;
  body: string;
  expect: null | { amount: number; direction: 'debit' | 'credit'; merchant: string; date: string | null; last4: string | null };
}

const CASES: Case[] = [
  {
    name: 'ICICI card transaction',
    subject: 'Transaction alert',
    body: 'Dear Customer, Your ICICI Bank Credit Card XX2002 has been used for a transaction of INR 348.00 on 02-Aug-26 at SWIGGY BANGALORE. ',
    expect: { amount: 348, direction: 'debit', merchant: 'SWIGGY BANGALORE', date: '2026-08-02', last4: '2002' },
  },
  {
    name: 'HDFC spent-on wording',
    subject: 'Alert',
    body: 'Rs.1600.00 has been spent on your HDFC Bank Card ending 7207 at ADOBE SYSTEMS on 03/08/2026. Not you? Call us.',
    expect: { amount: 1600, direction: 'debit', merchant: 'ADOBE SYSTEMS', date: '2026-08-03', last4: '7207' },
  },
  {
    name: 'Amex long-form date',
    subject: 'Purchase approved',
    body: 'You made a transaction of INR 2,44,497.24 at MARRIOTT HOTEL on August 3, 2026 with your American Express Card ending 1004.',
    expect: { amount: 244497.24, direction: 'debit', merchant: 'MARRIOTT HOTEL', date: '2026-08-03', last4: '1004' },
  },
  {
    name: 'Salary credit',
    subject: 'Account credited',
    body: 'Dear Customer, INR 2,50,000.00 has been credited to your account XX8830 from ACME PAYROLL on 01-Aug-2026.',
    expect: { amount: 250000, direction: 'credit', merchant: 'ACME PAYROLL', date: '2026-08-01', last4: '8830' },
  },
  {
    name: 'HDFC Info: style (merchant before amount)',
    subject: 'UPI txn',
    body: 'Info: SWIGGY INSTAMART; Amt: Rs 512.00; A/c XX8830; Date 05-08-26',
    expect: { amount: 512, direction: 'debit', merchant: 'SWIGGY INSTAMART', date: '2026-08-05', last4: '8830' },
  },
  {
    name: 'HTML-wrapped body',
    subject: 'Txn',
    body: '<html><body><p>Your card <b>XX2002</b> was used for a transaction of <b>Rs. 999.00</b> at <b>NETFLIX</b> on 04-Aug-26</p></body></html>',
    expect: { amount: 999, direction: 'debit', merchant: 'NETFLIX', date: '2026-08-04', last4: '2002' },
  },
  {
    name: 'Refund is a credit',
    subject: 'Refund processed',
    body: 'INR 1,299.00 has been credited to your Card XX2002 from AMAZON REFUND on 06-Aug-2026',
    expect: { amount: 1299, direction: 'credit', merchant: 'AMAZON REFUND', date: '2026-08-06', last4: '2002' },
  },
  { name: 'Marketing mail is rejected', subject: 'Get 10% off!', body: 'Dear Customer, enjoy amazing offers this festive season on your credit card. Shop now!', expect: null },
  { name: 'OTP mail is rejected', subject: 'Your OTP', body: 'Your one time password is 445566. Do not share it with anyone.', expect: null },
];

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.log(`   ✗ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  return ok;
}

for (const c of CASES) {
  const got = parseAlert(c.body, c.subject);
  if (c.expect === null) {
    if (got !== null) {
      failures++;
      console.log(`✗ ${c.name}: expected no match, got ${JSON.stringify(got)}`);
    } else console.log(`✓ ${c.name}`);
    continue;
  }
  if (!got) {
    failures++;
    console.log(`✗ ${c.name}: did not parse at all`);
    continue;
  }
  const before = failures;
  check('amount', got.amount, c.expect.amount);
  check('direction', got.direction, c.expect.direction);
  check('merchant', got.merchant, c.expect.merchant);
  check('date', got.date, c.expect.date);
  check('last4', got.last4, c.expect.last4);
  if (failures === before) console.log(`✓ ${c.name}`);
  else console.log(`✗ ${c.name}`);
}

// Date formats in isolation
const DATES: [string, string | null][] = [
  ['02-Aug-26', '2026-08-02'],
  ['2 August 2026', '2026-08-02'],
  ['August 3, 2026', '2026-08-03'],
  ['03/08/2026', '2026-08-03'],
  ['15-12-25', '2025-12-15'],
  ['not a date', null],
];
for (const [raw, exp] of DATES) {
  if (!check(`parseAlertDate(${raw})`, parseAlertDate(raw), exp)) continue;
}

if (!looksLikeBankMail('alerts@icicibank.com', 'anything')) {
  failures++;
  console.log('✗ looksLikeBankMail should accept a known issuer domain');
}

console.log(failures === 0 ? '\nAll alert-parser tests passed.' : `\n${failures} assertion(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
