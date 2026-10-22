import { NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST() {
  await dbReady;

  try {
    const tx = await db.transaction('write');

    // Delete imported data only (keep email accounts and passwords)
    await tx.execute('DELETE FROM transactions');
    await tx.execute('DELETE FROM statements');
    await tx.execute('DELETE FROM email_messages');
    // Keep email_accounts and email_passwords

    await tx.commit();

    return NextResponse.json({ success: true, deleted: 'imported data cleared, email accounts preserved' });
  } catch (e) {
    console.error('Clear error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
