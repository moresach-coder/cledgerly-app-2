import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';
import { looksLikeTransaction } from '@/lib/parser';

export const runtime = 'nodejs';

/**
 * Finds rows that the current parser would no longer accept — statement furniture
 * imported as transactions before the line filter existed (addresses, phone numbers,
 * "Minimum Payment", running totals).
 *
 * GET lists them so they can be inspected. Deletion only happens on POST with explicit
 * ids, so nothing disappears that the user has not seen.
 */
async function phantomRows() {
  await dbReady;
  const result = await db.execute(`SELECT id, account, date, narration, merchant, amount, status FROM transactions`);
  const rows = result.rows as any[];
  return rows.filter((r) => !looksLikeTransaction(String(r.narration), true));
}

export async function GET() {
  const rows = await phantomRows();
  return NextResponse.json({
    count: rows.length,
    totalAmount: rows.reduce((s, r) => s + r.amount, 0),
    byAccount: rows.reduce((acc: Record<string, number>, r) => {
      acc[r.account] = (acc[r.account] || 0) + 1;
      return acc;
    }, {}),
    rows: rows.slice(0, 200),
  });
}

export async function POST(req: NextRequest) {
  const { ids, all } = await req.json();

  const targets: string[] = all ? (await phantomRows()).map((r) => r.id) : Array.isArray(ids) ? ids : [];
  if (targets.length === 0) return NextResponse.json({ error: 'Nothing selected' }, { status: 400 });

  const tx = await db.transaction('write');
  let deleted = 0;
  try {
    for (const id of targets) {
      const r = await tx.execute({ sql: 'DELETE FROM transactions WHERE id = ?', args: [id] });
      deleted += r.rowsAffected;
    }
    await tx.commit();
  } catch (e) { await tx.rollback(); throw e; }
  return NextResponse.json({ ok: true, deleted });
}
