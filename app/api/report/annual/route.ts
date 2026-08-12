import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';
import { typeInfo, CATEGORIES } from '@/lib/reference';
import { fyOf, fyLabel, yearPeriod } from '@/lib/period';
import { ruleKey } from '@/lib/parser';

interface YearData {
  fy: number;
  label: string;
  total: number;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
  topMerchants: { merchant: string; total: number; count: number }[];
  biggestExpenses: { merchant: string; date: string; amount: number; category: string | null }[];
  recurring: { merchant: string; avg: number; months: number }[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetFy = searchParams.get('fy') ? Number(searchParams.get('fy')) : null;

  await dbReady;
  const allResult = await db.execute(
    `SELECT date, merchant, amount, type, category, status, direction
     FROM transactions
     WHERE direction='debit' AND status != 'duplicate' AND date IS NOT NULL
     ORDER BY date ASC`
  );
  const allRows = allResult.rows as any[];

  const fySet = new Set<number>();
  for (const r of allRows) {
    const d = new Date(r.date + 'T00:00:00Z');
    fySet.add(fyOf(d));
  }
  const fyList = [...fySet].sort((a, b) => b - a);

  const buildYear = (fy: number): YearData => {
    const p = yearPeriod(fy);
    const rows = allRows.filter(r => r.date >= p.from && r.date <= p.to);
    const expenses = rows.filter(r => typeInfo(r.type).expense);

    const total = expenses.reduce((s, r) => s + r.amount, 0);

    const byCategory: Record<string, number> = {};
    for (const r of expenses.filter(r => r.status === 'accepted')) {
      const k = r.category || 'other';
      byCategory[k] = (byCategory[k] || 0) + r.amount;
    }

    const byMonth: Record<string, number> = {};
    for (const r of expenses) {
      const m = r.date.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + r.amount;
    }

    const merchantMap = new Map<string, { merchant: string; total: number; count: number }>();
    for (const r of expenses) {
      const key = ruleKey(r.merchant) || r.merchant.toLowerCase();
      const existing = merchantMap.get(key);
      if (existing) { existing.total += r.amount; existing.count++; }
      else merchantMap.set(key, { merchant: r.merchant, total: r.amount, count: 1 });
    }
    const topMerchants = [...merchantMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);

    const biggestExpenses = expenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(r => ({ merchant: r.merchant, date: r.date, amount: r.amount, category: r.category }));

    const recurringMap = new Map<string, { merchant: string; months: Set<string>; total: number; count: number }>();
    for (const r of expenses.filter(r => r.status === 'accepted')) {
      const key = ruleKey(r.merchant) || r.merchant.toLowerCase();
      const existing = recurringMap.get(key);
      if (existing) { existing.months.add(r.date.slice(0, 7)); existing.total += r.amount; existing.count++; }
      else recurringMap.set(key, { merchant: r.merchant, months: new Set([r.date.slice(0, 7)]), total: r.amount, count: 1 });
    }
    const recurring = [...recurringMap.values()]
      .filter(g => g.months.size >= 3)
      .map(g => ({ merchant: g.merchant, avg: g.total / g.count, months: g.months.size }))
      .sort((a, b) => b.avg - a.avg);

    return { fy, label: fyLabel(fy), total, byCategory, byMonth, topMerchants, biggestExpenses, recurring };
  };

  const years = (targetFy ? [targetFy] : fyList).map(buildYear);

  // Budget suggestions: average monthly spend per category across all years
  const allExpenses = allRows.filter(r => typeInfo(r.type).expense && r.status === 'accepted');
  const catMonthly: Record<string, { total: number; months: Set<string> }> = {};
  for (const r of allExpenses) {
    const k = r.category || 'other';
    if (!catMonthly[k]) catMonthly[k] = { total: 0, months: new Set() };
    catMonthly[k].total += r.amount;
    catMonthly[k].months.add(r.date.slice(0, 7));
  }
  const budgetSuggestions = Object.entries(catMonthly)
    .map(([cat, d]) => ({
      category: cat,
      monthlyAvg: d.months.size > 0 ? d.total / d.months.size : 0,
      totalMonths: d.months.size,
    }))
    .filter(b => b.monthlyAvg > 0)
    .sort((a, b) => b.monthlyAvg - a.monthlyAvg);

  return NextResponse.json({ years, fyList, budgetSuggestions });
}
