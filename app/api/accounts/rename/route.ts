import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Renames an account across every table that references it.
 *
 * Early imports took the account name from the file name, leaving entries like
 * "2026 04 28". Renaming one of those to an account that already exists merges them,
 * which is the usual fix.
 */
export async function POST(req: NextRequest) {
  try {
    const { from, to } = await req.json();
    if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
    }
    if (from === to) return NextResponse.json({ error: 'Names are identical' }, { status: 400 });

    await dbReady;
    const tx = await db.transaction('write');
    let moved = 0;
    try {
      const r = await tx.execute({ sql: 'UPDATE transactions SET account = ? WHERE account = ?', args: [to, from] });
      moved = r.rowsAffected;
      await tx.execute({ sql: 'UPDATE statements SET account = ? WHERE account = ?', args: [to, from] });
      await tx.execute({ sql: 'UPDATE card_map SET account = ? WHERE account = ?', args: [to, from] });
      await tx.commit();
    } catch (e) { await tx.rollback(); throw e; }

    return NextResponse.json({ ok: true, moved });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** Account names with how many transactions each holds, for the rename UI. */
export async function GET() {
  await dbReady;
  const result = await db.execute('SELECT account, COUNT(*) as n, MIN(date) as first, MAX(date) as last FROM transactions GROUP BY account ORDER BY n DESC');
  return NextResponse.json({ accounts: result.rows });
}
