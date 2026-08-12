import { db, dbReady } from './db';

const ISSUERS: [RegExp, string][] = [
  [/amazon\s*pay/i, 'Amazon Pay ICICI'],
  [/sapphiro/i, 'ICICI Sapphiro'],
  [/coral/i, 'ICICI Coral'],
  [/regalia/i, 'HDFC Regalia'],
  [/millennia/i, 'HDFC Millennia'],
  [/infinia/i, 'HDFC Infinia'],
  [/magnus/i, 'Axis Magnus'],
  [/bonvoy|marriott/i, 'Axis Bonvoy'],
  [/american\s*express|amex/i, 'Amex'],
  [/icici\s*bank/i, 'ICICI Bank'],
  [/hdfc\s*bank/i, 'HDFC Bank'],
  [/axis\s*bank/i, 'Axis Bank'],
  [/kotak/i, 'Kotak'],
  [/state\s*bank|sbi\s*card/i, 'SBI'],
  [/idfc/i, 'IDFC First'],
  [/indusind/i, 'IndusInd'],
  [/yes\s*bank/i, 'Yes Bank'],
];

const LAST4_PATTERNS = [
  /(?:card|a\/c|account)\s*(?:no\.?|number)?\s*[:#-]?\s*(?:[xX*•·]{2,}[\s-]*){1,4}(\d{4})\b/,
  /\bending\s*(?:in|with)?\s*[:#-]?\s*(\d{4})\b/i,
  /\b[xX*•·]{4,}[\s-]*(\d{4})\b/,
];

export interface AccountGuess {
  account: string | null;
  known: boolean;
  issuer: string | null;
  last4: string | null;
}

async function getKnownAccounts(): Promise<string[]> {
  await dbReady;
  const result = await db.execute('SELECT DISTINCT account FROM transactions ORDER BY account');
  return (result.rows as any[]).map((r) => r.account as string);
}

export function detectLast4(text: string): string | null {
  const head = text.slice(0, 4000);
  for (const re of LAST4_PATTERNS) {
    const m = head.match(re);
    if (m) return m[1];
  }
  return null;
}

export function detectIssuer(text: string): string | null {
  const head = text.slice(0, 4000);
  for (const [re, label] of ISSUERS) if (re.test(head)) return label;
  return null;
}

export async function detectAccount(text: string): Promise<AccountGuess> {
  await dbReady;
  const issuer = detectIssuer(text);
  const last4 = detectLast4(text);
  const existing = await getKnownAccounts();

  if (last4) {
    const byLast4 = await db.execute({
      sql: 'SELECT account FROM card_map WHERE last4 = ? LIMIT 1',
      args: [last4],
    });
    if (byLast4.rows.length) return { account: (byLast4.rows[0] as any).account, known: true, issuer, last4 };
  }

  if (issuer) {
    const stem = issuer.split(' ')[0].toLowerCase();
    const matches = existing.filter((a) => a.toLowerCase().includes(stem));
    if (matches.length === 1) return { account: matches[0], known: true, issuer, last4 };
    if (matches.length > 1 && last4) {
      const narrowed = matches.find((a) => a.includes(last4));
      if (narrowed) return { account: narrowed, known: true, issuer, last4 };
    }
    return { account: last4 ? `${issuer} ${last4}` : issuer, known: false, issuer, last4 };
  }

  return { account: null, known: false, issuer, last4 };
}

export async function accountSuggestions(): Promise<string[]> {
  return getKnownAccounts();
}
