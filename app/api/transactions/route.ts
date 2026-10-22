import { NextRequest, NextResponse } from 'next/server';
import { listTransactions, getStatusCounts, getStatements, updateTransaction } from '@/lib/repo';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const month = searchParams.get('month') || undefined;
  const account = searchParams.get('account') || undefined;
  const idsParam = searchParams.get('ids');
  const ids = idsParam ? idsParam.split(',').filter(Boolean) : undefined;
  const txns = await listTransactions({ status, month, ids });
  const counts = await getStatusCounts(account);
  const statements = await getStatements();
  return NextResponse.json({ txns, counts, statements });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, category, status } = body;

  try {
    await updateTransaction(id, {
      category: category || undefined,
      status: status || 'accepted',
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { bulkConfirm: ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids required' }, { status: 400 });
  const { bulkConfirm } = await import('@/lib/repo');
  const updated = await bulkConfirm(ids);
  return NextResponse.json({ updated });
}
