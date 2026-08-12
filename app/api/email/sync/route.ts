import { NextResponse } from 'next/server';
import { listEmailAccounts } from '@/lib/emailRepo';
import { syncAccount, type SyncResult } from '@/lib/emailSync';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Fetches new bank mail for every configured mailbox. Everything imported lands in Review. */
export async function POST(req: Request) {
  // How far back the very first sync looks. Later syncs continue from the last UID seen.
  let firstRunDays = 120;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.firstRunDays)) firstRunDays = Math.max(1, Math.min(3650, body.firstRunDays));
  } catch {
    /* no body — use the default */
  }

  const accounts = await listEmailAccounts();
  if (accounts.length === 0) {
    return NextResponse.json({ error: 'No mailbox connected yet' }, { status: 400 });
  }

  const totals: SyncResult = {
    scanned: 0, alertsImported: 0, statementsImported: 0, statementTxns: 0,
    needsPassword: [], needsMapping: [], failed: 0, superseded: 0,
  };
  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const r = await syncAccount(account, firstRunDays);
      totals.scanned += r.scanned;
      totals.alertsImported += r.alertsImported;
      totals.statementsImported += r.statementsImported;
      totals.statementTxns += r.statementTxns;
      totals.failed += r.failed;
      totals.superseded += r.superseded;
      for (const p of r.needsPassword) if (!totals.needsPassword.includes(p)) totals.needsPassword.push(p);
      for (const m of r.needsMapping) if (!totals.needsMapping.includes(m)) totals.needsMapping.push(m);
    } catch (e) {
      errors.push(`${account.email}: ${String(e).replace(/\s+/g, ' ').slice(0, 200)}`);
    }
  }

  return NextResponse.json({ ...totals, errors });
}
