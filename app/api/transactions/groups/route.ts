import { NextRequest, NextResponse } from 'next/server';
import { listGroups, applyToMany, listTransactions } from '@/lib/repo';

export const runtime = 'nodejs';

/** Merchant groups for the review queue, so a statement is tens of decisions, not hundreds. */
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || 'pending';
  const account = req.nextUrl.searchParams.get('account') || undefined;
  const from = req.nextUrl.searchParams.get('from') || undefined;
  const to = req.nextUrl.searchParams.get('to') || undefined;
  const groups = await listGroups(status, { account, from, to });
  return NextResponse.json({
    groups,
    totalRows: groups.reduce((s, g) => s + g.count, 0),
    groupCount: groups.length,
  });
}

/** Applies one decision to every id the caller passes — always an explicit list. */
export async function POST(req: NextRequest) {
  const { ids, type, category, status } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids are required' }, { status: 400 });
  }
  const updated = await applyToMany(ids, {
    type: type || 'personal_expense',
    category: category ?? null,
    status: status || 'accepted',
  });
  return NextResponse.json({ ok: true, updated });
}
