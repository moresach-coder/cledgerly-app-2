import { NextRequest, NextResponse } from 'next/server';
import { parseLines } from '@/lib/parser';
import { getRules, commitImport } from '@/lib/repo';
import { detectStatementPeriod } from '@/lib/statementPeriod';
import { categorize } from '@/lib/categorizer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const account: string = (body.account || 'Unspecified account').trim();
  const text: string = body.text || '';
  const declared: number | null = body.declared === '' || body.declared == null ? null : Number(body.declared);

  const rules = await getRules();
  let lines = parseLines(text, rules);

  if (lines.length === 0) {
    return NextResponse.json({ error: 'No transactions found in that text' }, { status: 400 });
  }

  // Auto-categorize all lines using the smart engine
  lines = lines.map((line) => {
    if (!line.category) {
      const result = categorize(line.merchant);
      return {
        ...line,
        category: result.category || null,
        confidence: result.confidence,
      };
    }
    return line;
  });

  const parsedTotal = lines.filter((l) => l.direction === 'debit').reduce((s, l) => s + l.amount, 0);
  const gap = declared != null ? Math.abs(declared - parsedTotal) : null;
  const categorizedCount = lines.filter((l) => l.category).length;

  // Preview mode: return parsed lines without committing, so the UI can show reconciliation first.
  if (body.mode === 'preview') {
    return NextResponse.json({ lines, parsedTotal, declared, gap, categorizedCount, total: lines.length });
  }

  const period = detectStatementPeriod(text);
  const result = await commitImport(account, declared, lines, {
    periodFrom: period.from,
    periodTo: period.to,
    statementDate: period.statementDate,
    fileName: body.fileName ?? null,
  });
  return NextResponse.json({ ...result, gap, categorizedCount });
}
