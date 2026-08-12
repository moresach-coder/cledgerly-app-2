import { NextRequest, NextResponse } from 'next/server';
import { summary } from '@/lib/repo';
import { parsePeriod, ALL_TIME } from '@/lib/period';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');
  const month = searchParams.get('month');

  // `period` is the financial-year aware form; `month` stays for the per-card views.
  if (period) {
    const p = parsePeriod(period);
    const data = p.id === ALL_TIME.id ? await summary() : await summary({ from: p.from, to: p.to });
    return NextResponse.json({ ...data, period: p });
  }
  return NextResponse.json(await summary(month || 'all'));
}
