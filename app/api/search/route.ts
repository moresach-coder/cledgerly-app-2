import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';
import { CATEGORIES } from '@/lib/reference';
import { displayMerchant } from '@/lib/merchantName';

interface ParsedQuery {
  merchant?: string;
  category?: string;
  account?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  raw: string;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function parseQuery(q: string): ParsedQuery {
  const raw = q;
  const lower = q.toLowerCase().trim();
  const parsed: ParsedQuery = { raw };

  // Amount patterns
  const aboveMatch = lower.match(/(?:above|over|more than|greater than|>)\s*(?:rs\.?|₹|inr)?\s*([\d,]+)/);
  if (aboveMatch) parsed.minAmount = Number(aboveMatch[1].replace(/,/g, ''));

  const belowMatch = lower.match(/(?:below|under|less than|<)\s*(?:rs\.?|₹|inr)?\s*([\d,]+)/);
  if (belowMatch) parsed.maxAmount = Number(belowMatch[1].replace(/,/g, ''));

  const betweenMatch = lower.match(/(?:between)\s*(?:rs\.?|₹|inr)?\s*([\d,]+)\s*(?:and|to|-)\s*(?:rs\.?|₹|inr)?\s*([\d,]+)/);
  if (betweenMatch) {
    parsed.minAmount = Number(betweenMatch[1].replace(/,/g, ''));
    parsed.maxAmount = Number(betweenMatch[2].replace(/,/g, ''));
  }

  // Category matching
  for (const cat of CATEGORIES) {
    const catLower = cat.label.toLowerCase();
    const catId = cat.id.toLowerCase();
    if (lower.includes(catLower) || lower.includes(catId)) {
      parsed.category = cat.id;
      break;
    }
  }
  // Short aliases
  if (!parsed.category) {
    if (/\b(food|dining|restaurant|eat)\b/.test(lower)) parsed.category = 'food';
    else if (/\b(travel|trip|flight|hotel)\b/.test(lower)) parsed.category = 'travel';
    else if (/\b(grocery|grocer)\b/.test(lower)) parsed.category = 'groceries';
    else if (/\b(shop|shopping|buy)\b/.test(lower)) parsed.category = 'shopping';
    else if (/\b(medical|doctor|hospital|pharma)\b/.test(lower)) parsed.category = 'medical';
    else if (/\b(health|gym|fitness)\b/.test(lower)) parsed.category = 'health';
    else if (/\b(subscription|netflix|spotify|ott)\b/.test(lower)) parsed.category = 'subs';
    else if (/\b(emi|loan)\b/.test(lower)) parsed.category = 'loan';
    else if (/\b(insurance)\b/.test(lower)) parsed.category = 'insurance';
    else if (/\b(invest|mutual fund|sip|stock)\b/.test(lower)) parsed.category = 'investments';
    else if (/\b(tax|gst)\b/.test(lower)) parsed.category = 'taxes';
    else if (/\b(utility|electric|water|gas|bill)\b/.test(lower)) parsed.category = 'utilities';
    else if (/\b(rent|housing)\b/.test(lower)) parsed.category = 'housing';
    else if (/\b(entertainment|movie|game)\b/.test(lower)) parsed.category = 'entertainment';
    else if (/\b(fashion|clothes|clothing)\b/.test(lower)) parsed.category = 'fashion';
    else if (/\b(education|school|college|course)\b/.test(lower)) parsed.category = 'education';
    else if (/\b(gift|donation)\b/.test(lower)) parsed.category = 'gifts';
    else if (/\b(family)\b/.test(lower)) parsed.category = 'family';
  }

  // Account matching
  if (/\b(amex|american express)\b/.test(lower)) parsed.account = 'Amex Platinum';
  else if (/\b(hdfc|regalia)\b/.test(lower)) parsed.account = 'HDFC Regalia Credit Card';
  else if (/\b(icici|savings)\b/.test(lower)) parsed.account = 'ICICI Savings Bank';

  // Date: "last month", "this month", "january", "last 3 months"
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (/\bthis month\b/.test(lower)) {
    parsed.dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    parsed.dateTo = `${year}-${String(month).padStart(2, '0')}-31`;
  } else if (/\blast month\b/.test(lower)) {
    const lm = month === 1 ? 12 : month - 1;
    const ly = month === 1 ? year - 1 : year;
    parsed.dateFrom = `${ly}-${String(lm).padStart(2, '0')}-01`;
    parsed.dateTo = `${ly}-${String(lm).padStart(2, '0')}-31`;
  } else if (/\blast (\d+) months?\b/.test(lower)) {
    const n = Number(lower.match(/last (\d+) months?/)![1]);
    const from = new Date(year, month - 1 - n, 1);
    parsed.dateFrom = from.toISOString().slice(0, 10);
    parsed.dateTo = `${year}-${String(month).padStart(2, '0')}-31`;
  } else if (/\bthis year\b/.test(lower)) {
    parsed.dateFrom = `${year}-01-01`;
    parsed.dateTo = `${year}-12-31`;
  } else if (/\blast year\b/.test(lower)) {
    parsed.dateFrom = `${year - 1}-01-01`;
    parsed.dateTo = `${year - 1}-12-31`;
  } else {
    // Named month: "in january", "january 2025", "march"
    for (const [name, num] of Object.entries(MONTH_NAMES)) {
      const re = new RegExp(`\\b${name}\\s*(\\d{4})?\\b`);
      const m = lower.match(re);
      if (m) {
        const y = m[1] ? Number(m[1]) : year;
        parsed.dateFrom = `${y}-${String(num).padStart(2, '0')}-01`;
        parsed.dateTo = `${y}-${String(num).padStart(2, '0')}-31`;
        break;
      }
    }
  }

  return parsed;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return NextResponse.json({ results: [], summary: null, parsed: {} });

  const parsed = parseQuery(q);

  await dbReady;
  let sql = 'SELECT * FROM transactions WHERE is_duplicate = 0';
  const params: any[] = [];

  if (parsed.category) { sql += ' AND category = ?'; params.push(parsed.category); }
  if (parsed.account) { sql += ' AND account = ?'; params.push(parsed.account); }
  if (parsed.minAmount) { sql += ' AND amount >= ?'; params.push(parsed.minAmount); }
  if (parsed.maxAmount) { sql += ' AND amount <= ?'; params.push(parsed.maxAmount); }
  if (parsed.dateFrom) { sql += ' AND date >= ?'; params.push(parsed.dateFrom); }
  if (parsed.dateTo) { sql += ' AND date <= ?'; params.push(parsed.dateTo); }

  // If no structured filters matched, do a fuzzy merchant search
  if (!parsed.category && !parsed.account && !parsed.minAmount && !parsed.maxAmount && !parsed.dateFrom && !parsed.dateTo) {
    sql += ' AND (LOWER(merchant) LIKE ? OR LOWER(narration) LIKE ?)';
    const like = `%${q.toLowerCase()}%`;
    params.push(like, like);
  }

  sql += ' ORDER BY date DESC LIMIT 50';
  const result = await db.execute({ sql, args: params });
  const rows = result.rows as any[];

  const total = rows.reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const results = rows.map((r: any) => ({
    id: r.id,
    date: r.date,
    merchant: displayMerchant(r.merchant),
    amount: r.amount,
    account: r.account,
    category: r.category,
  }));

  // Build a natural language summary
  let summaryText = '';
  if (results.length > 0) {
    const amt = Math.round(total).toLocaleString('en-IN');
    summaryText = `Found ${results.length} transaction${results.length > 1 ? 's' : ''} totalling ₹${amt}`;
    if (parsed.category) {
      const cat = CATEGORIES.find(c => c.id === parsed.category);
      summaryText += ` in ${cat?.label || parsed.category}`;
    }
    if (parsed.account) summaryText += ` from ${parsed.account}`;
    if (parsed.dateFrom && parsed.dateTo) {
      const fromMonth = new Date(parsed.dateFrom + 'T00:00:00').toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      summaryText += ` (${fromMonth})`;
    }
  } else {
    summaryText = 'No transactions found matching your query.';
  }

  return NextResponse.json({ results, summary: summaryText, parsed, count: results.length, total });
}
