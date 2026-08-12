import { NextRequest, NextResponse } from 'next/server';
import { setCardMap, clearBlocked } from '@/lib/emailRepo';

export const runtime = 'nodejs';

/** Ties a card's last four digits to one of your accounts, so alerts land on the right card. */
export async function POST(req: NextRequest) {
  try {
    const { last4, institution, account } = await req.json();
    if (!last4 || !institution || !account) {
      return NextResponse.json({ error: 'last4, institution and account are required' }, { status: 400 });
    }
    await setCardMap(String(last4), String(institution), String(account));
    await clearBlocked('needs_mapping'); // let parked messages retry on the next sync
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
