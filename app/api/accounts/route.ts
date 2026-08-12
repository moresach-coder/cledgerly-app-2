import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/lib/repo';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || undefined;
  return NextResponse.json(await listAccounts(month));
}
