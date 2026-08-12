import { NextRequest, NextResponse } from 'next/server';
import { accountSummary } from '@/lib/repo';

export async function GET(req: NextRequest, { params }: { params: { account: string } }) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || undefined;
  const account = decodeURIComponent(params.account);
  return NextResponse.json(await accountSummary(account, month));
}
