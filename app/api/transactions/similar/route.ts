import { NextRequest, NextResponse } from 'next/server';
import { findSimilarPending } from '@/lib/repo';

export const runtime = 'nodejs';

/**
 * Rows that would receive the same category, so the user can see and tick them before
 * anything is written. Read-only — nothing changes until the PATCH carries explicit ids.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const merchant = req.nextUrl.searchParams.get('merchant') ?? undefined;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  return NextResponse.json({ similar: await findSimilarPending(id, merchant) });
}
