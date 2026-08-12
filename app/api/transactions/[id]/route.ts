import { NextRequest, NextResponse } from 'next/server';
import { updateTransaction } from '@/lib/repo';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const result = await updateTransaction(params.id, {
    merchant: body.merchant,
    type: body.type,
    category: body.category,
    note: body.note,
    status: body.status,
    // Explicit ids only — the old blanket applyRule flag is gone on purpose.
    applyToIds: Array.isArray(body.applyToIds) ? body.applyToIds : [],
    rememberRule: !!body.rememberRule,
  });
  return NextResponse.json(result);
}
