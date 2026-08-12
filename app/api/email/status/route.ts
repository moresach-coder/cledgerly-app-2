import { NextResponse } from 'next/server';
import {
  listEmailAccounts, listBlockedMessages,
  listCardMap, knownAccounts, countPendingAlerts,
} from '@/lib/emailRepo';

export const runtime = 'nodejs';

/**
 * Deliberately does not return a log of scanned mail. Ledgerly reads the mailbox to find
 * statements; surfacing unrelated personal email back into the UI is not part of that job.
 * Only messages blocked on a password or an account mapping are exposed, because those
 * need a decision from the user.
 */
export async function GET() {
  return NextResponse.json({
    accounts: await listEmailAccounts(),
    blocked: await listBlockedMessages(),
    cardMap: await listCardMap(),
    knownAccounts: await knownAccounts(),
    pendingAlerts: await countPendingAlerts(),
  });
}
