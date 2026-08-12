import { NextRequest, NextResponse } from 'next/server';
import { listTransactions, applyToMany } from '@/lib/repo';
import { categorize, findSimilarMerchants } from '@/lib/categorizer';
import type { Txn } from '@/lib/repo';

export const runtime = 'nodejs';

/**
 * GET — what auto-categorisation *would* do, without doing it.
 *
 * The previous behaviour rewrote every uncategorised row in one click and additionally
 * flipped them to 'unknown'. Nothing was shown first, so there was no way to tell what
 * had changed or to disagree with any single guess.
 */
export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get('account') || undefined;
  const month = req.nextUrl.searchParams.get('month') || undefined;

  const txns = await listTransactions({ account, month: month === 'all' ? undefined : month }) as Txn[];
  const proposals = txns
    .filter((t) => !t.category && t.status !== 'duplicate')
    .map((t) => {
      const guess = categorize(t.merchant);
      return guess.category
        ? {
            id: t.id,
            merchant: t.merchant,
            amount: t.amount,
            date: t.date,
            account: t.account,
            type: t.type,
            proposedCategory: guess.category,
            confidence: guess.confidence ?? 'medium',
          }
        : null;
    })
    .filter(Boolean);

  return NextResponse.json({ proposals, uncategorised: txns.filter((t) => !t.category).length });
}

/** POST — applies the guesses the user actually ticked. Nothing else is touched. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accepted: { id: string; category: string; type: string }[] = Array.isArray(body.accepted)
      ? body.accepted
      : [];
    if (accepted.length === 0) {
      return NextResponse.json({ error: 'Nothing selected' }, { status: 400 });
    }

    // Grouped by category so each distinct decision is one statement.
    const byCategory = new Map<string, { ids: string[]; type: string }>();
    for (const a of accepted) {
      const key = `${a.type}::${a.category}`;
      const hit = byCategory.get(key) || { ids: [], type: a.type };
      hit.ids.push(a.id);
      byCategory.set(key, hit);
    }

    let updated = 0;
    for (const [key, { ids, type }] of byCategory) {
      const category = key.split('::')[1];
      // Stays 'pending' — a machine guess the user accepted is still not a verification.
      updated += await applyToMany(ids, { type, category, status: 'pending' as any });
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** Merchants in the ledger that resemble the given one, for batch categorisation. */
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchant = searchParams.get('merchant') || '';
  const pool = (await listTransactions({}) as Txn[]).map((t) => t.merchant);
  return NextResponse.json({ similar: findSimilarMerchants(pool, merchant) });
}
