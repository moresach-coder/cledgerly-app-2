import { randomUUID } from 'crypto';
import { db, dbReady } from './db';
import { periodFromDates } from './statementPeriod';
import { ruleKey, extractMerchant, type ParsedLine, type RuleMap } from './parser';
import { typeInfo } from './reference';

export interface Txn {
  id: string;
  date: string | null;
  narration: string;
  merchant: string;
  amount: number;
  direction: 'debit' | 'credit';
  account: string;
  type: string;
  category: string | null;
  confidence: string;
  status: string;
  note: string;
  isDuplicate: boolean;
  statementId: string | null;
}

function rowToTxn(r: any): Txn {
  return {
    id: r.id, date: r.date, narration: r.narration, merchant: r.merchant,
    amount: r.amount, direction: r.direction, account: r.account,
    type: r.type, category: r.category, confidence: r.confidence,
    status: r.status, note: r.note, isDuplicate: !!r.is_duplicate,
    statementId: r.statement_id,
  };
}

export async function getRules(): Promise<RuleMap> {
  await dbReady;
  const result = await db.execute('SELECT key, type, category FROM rules');
  const map: RuleMap = {};
  for (const r of result.rows as any[]) map[r.key] = { type: r.type, category: r.category };
  return map;
}

export async function upsertRule(key: string, type: string, category: string | null) {
  await dbReady;
  await db.execute({
    sql: `INSERT INTO rules (key, type, category) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET type=excluded.type, category=excluded.category`,
    args: [key, type, category],
  });
}

async function findDuplicateId(date: string | null, amount: number, merchant: string, narration: string): Promise<string | null> {
  const key = ruleKey(merchant);
  const result = await db.execute({
    sql: `SELECT id, narration, amount FROM transactions WHERE date = ? AND amount = ? AND status != 'duplicate'`,
    args: [date, amount],
  });
  for (const r of result.rows as any[]) {
    if (r.narration.trim() === narration.trim()) return r.id;
    const derivedMerchant = extractMerchant(r.narration, r.amount);
    if (ruleKey(derivedMerchant) === key) return r.id;
  }
  return null;
}

export async function commitImport(
  account: string,
  declared: number | null,
  lines: ParsedLine[],
  meta?: { periodFrom?: string | null; periodTo?: string | null; statementDate?: string | null; fileName?: string | null }
) {
  await dbReady;
  const parsedTotal = lines.filter((l) => l.direction === 'debit').reduce((s, l) => s + l.amount, 0);
  const statementId = randomUUID();

  const span = periodFromDates(lines.map((l) => l.date));
  const periodFrom = meta?.periodFrom ?? span.from;
  const periodTo = meta?.periodTo ?? span.to;

  const tx = await db.transaction('write');
  let dupCount = 0;
  try {
    await tx.execute({
      sql: `INSERT INTO statements (id, account, declared, parsed, count, period_from, period_to, statement_date, file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [statementId, account, declared, parsedTotal, lines.length, periodFrom, periodTo, meta?.statementDate ?? null, meta?.fileName ?? null],
    });

    for (const l of lines) {
      const dupOf = await findDuplicateId(l.date, l.amount, l.merchant, l.narration);
      const isDup = !!dupOf;
      if (isDup) dupCount++;
      await tx.execute({
        sql: `INSERT INTO transactions
          (id, date, narration, merchant, amount, direction, account, type, category, confidence, status, is_duplicate, statement_id, source, source_ref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'statement', ?)`,
        args: [
          randomUUID(), l.date, l.narration, l.merchant, l.amount, l.direction,
          account, l.type, l.category, l.confidence,
          isDup ? 'duplicate' : 'pending', isDup ? 1 : 0, statementId, statementId,
        ],
      });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }

  return { statementId, parsedTotal, count: lines.length, duplicatesFlagged: dupCount };
}

export async function listTransactions(filter?: { status?: string; account?: string; month?: string }): Promise<Txn[]> {
  await dbReady;
  let q = 'SELECT * FROM transactions WHERE 1=1';
  const params: any[] = [];
  if (filter?.status && filter.status !== 'all') { q += ' AND status = ?'; params.push(filter.status); }
  if (filter?.account) { q += ' AND account = ?'; params.push(filter.account); }
  if (filter?.month) { q += ' AND substr(date,1,7) = ?'; params.push(filter.month); }
  q += ' ORDER BY date DESC, created_at DESC';
  const result = await db.execute({ sql: q, args: params });
  return (result.rows as any[]).map(rowToTxn);
}

export async function getStatusCounts(account?: string) {
  await dbReady;
  const sql = account
    ? 'SELECT status, COUNT(*) as n FROM transactions WHERE account = ? AND is_duplicate = 0 GROUP BY status'
    : 'SELECT status, COUNT(*) as n FROM transactions WHERE is_duplicate = 0 GROUP BY status';
  const result = await db.execute({ sql, args: account ? [account] : [] });
  const counts: Record<string, number> = { pending: 0, accepted: 0, unknown: 0, deferred: 0, duplicate: 0 };
  let total = 0;
  for (const r of result.rows as any[]) { counts[r.status] = Number(r.n); total += Number(r.n); }
  return { total, ...counts };
}

export async function getStatements() {
  await dbReady;
  const result = await db.execute('SELECT * FROM statements ORDER BY imported_at DESC');
  return result.rows as any[];
}

export interface UpdatePayload {
  merchant?: string;
  type?: string;
  category?: string | null;
  note?: string;
  status: 'accepted' | 'unknown' | 'deferred';
  applyToIds?: string[];
  rememberRule?: boolean;
}

export interface TxnGroup {
  key: string;
  merchant: string;
  count: number;
  total: number;
  accounts: string[];
  firstDate: string | null;
  lastDate: string | null;
  type: string;
  category: string | null;
  mixed: boolean;
  ids: string[];
}

export async function listGroups(status = 'pending', filter?: { account?: string; from?: string; to?: string }): Promise<TxnGroup[]> {
  await dbReady;
  let q = `SELECT * FROM transactions WHERE is_duplicate = 0`;
  const params: any[] = [];
  if (status !== 'all') { q += ' AND status = ?'; params.push(status); }
  if (filter?.account) { q += ' AND account = ?'; params.push(filter.account); }
  if (filter?.from) { q += ' AND date >= ?'; params.push(filter.from); }
  if (filter?.to) { q += ' AND date <= ?'; params.push(filter.to); }
  q += ' ORDER BY date DESC';
  const result = await db.execute({ sql: q, args: params });
  const rows = (result.rows as any[]).map(rowToTxn);

  const map = new Map<string, TxnGroup>();
  for (const t of rows) {
    const key = ruleKey(t.merchant) || t.merchant.toLowerCase();
    let g = map.get(key);
    if (!g) {
      g = {
        key, merchant: t.merchant, count: 0, total: 0, accounts: [],
        firstDate: t.date, lastDate: t.date,
        type: t.type, category: t.category, mixed: false, ids: [],
      };
      map.set(key, g);
    }
    g.count++;
    g.total += t.amount;
    g.ids.push(t.id);
    if (!g.accounts.includes(t.account)) g.accounts.push(t.account);
    if (t.date && (!g.firstDate || t.date < g.firstDate)) g.firstDate = t.date;
    if (t.date && (!g.lastDate || t.date > g.lastDate)) g.lastDate = t.date;
    if (t.type !== g.type || t.category !== g.category) g.mixed = true;
  }

  return [...map.values()].sort((a, b) => b.count - a.count || b.total - a.total);
}

export async function bulkConfirm(ids: string[]): Promise<number> {
  await dbReady;
  if (!ids.length) return 0;
  const tx = await db.transaction('write');
  let changed = 0;
  try {
    for (const id of ids) {
      const r = await tx.execute({
        sql: `UPDATE transactions SET status='accepted', confidence='high', updated_at=datetime('now') WHERE id=? AND is_duplicate=0`,
        args: [id],
      });
      changed += r.rowsAffected;
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return changed;
}

export async function applyToMany(
  ids: string[],
  patch: { type: string; category: string | null; status: 'accepted' | 'unknown' | 'deferred' }
): Promise<number> {
  await dbReady;
  if (!ids.length) return 0;
  const tx = await db.transaction('write');
  let changed = 0;
  try {
    for (const id of ids) {
      const r = await tx.execute({
        sql: `UPDATE transactions SET type=?, category=?, status=?, confidence='high', updated_at=datetime('now')
          WHERE id=? AND is_duplicate=0`,
        args: [patch.type, patch.category, patch.status, id],
      });
      changed += r.rowsAffected;
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return changed;
}

export async function findSimilarPending(id: string, merchantOverride?: string) {
  await dbReady;
  const existing = await db.execute({ sql: 'SELECT * FROM transactions WHERE id = ?', args: [id] });
  if (!existing.rows.length) return [];
  const row = existing.rows[0] as any;
  const key = ruleKey(merchantOverride?.trim() || row.merchant);

  const result = await db.execute({
    sql: `SELECT id, date, narration, merchant, amount, direction, account, type, category
         FROM transactions
         WHERE status = 'pending' AND is_duplicate = 0 AND id != ?
         ORDER BY date DESC`,
    args: [id],
  });

  return (result.rows as any[])
    .filter((r) => ruleKey(r.merchant) === key)
    .map((r) => ({
      id: r.id, date: r.date, narration: r.narration, merchant: r.merchant,
      amount: r.amount, direction: r.direction, account: r.account,
      type: r.type, category: r.category,
    }));
}

export async function updateTransaction(id: string, payload: UpdatePayload): Promise<{ updated: number }> {
  await dbReady;
  const existing = await db.execute({ sql: 'SELECT * FROM transactions WHERE id = ?', args: [id] });
  if (!existing.rows.length) return { updated: 0 };
  const row = existing.rows[0] as any;

  const merchant = payload.merchant?.trim() || row.merchant;
  const type = payload.type || row.type;
  const category = typeInfo(type).expense ? (payload.category ?? row.category ?? 'other') : null;
  const note = payload.note ?? row.note;

  const tx = await db.transaction('write');
  let updated = 1;
  try {
    await tx.execute({
      sql: `UPDATE transactions SET merchant=?, type=?, category=?, note=?, status=?, confidence='high', updated_at=datetime('now') WHERE id=?`,
      args: [merchant, type, category, note, payload.status, id],
    });

    if (payload.rememberRule && payload.status === 'accepted') {
      await tx.execute({
        sql: `INSERT INTO rules (key, type, category) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET type=excluded.type, category=excluded.category`,
        args: [ruleKey(merchant), type, category],
      });
    }

    const ids = (payload.applyToIds ?? []).filter((x) => x && x !== id);
    for (const target of ids) {
      const r = await tx.execute({
        sql: `UPDATE transactions SET type=?, category=?, status=?, confidence='high', updated_at=datetime('now')
         WHERE id=? AND status='pending'`,
        args: [type, category, payload.status, target],
      });
      updated += r.rowsAffected;
    }

    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }

  return { updated };
}

export async function recurringGroups() {
  await dbReady;
  const result = await db.execute(
    `SELECT merchant, type, date, amount FROM transactions WHERE status = 'accepted' AND direction = 'debit'`
  );
  const groups: Record<string, { merchant: string; type: string; months: Set<string>; total: number; count: number }> = {};
  for (const r of result.rows as any[]) {
    const key = ruleKey(r.merchant);
    if (!key) continue;
    if (!groups[key]) groups[key] = { merchant: r.merchant, type: r.type, months: new Set(), total: 0, count: 0 };
    if (r.date) groups[key].months.add((r.date as string).slice(0, 7));
    groups[key].total += Number(r.amount);
    groups[key].count += 1;
  }
  return Object.values(groups)
    .filter((g) => g.months.size >= 2)
    .map((g) => ({ merchant: g.merchant, type: g.type, months: g.months.size, avg: g.total / g.count }))
    .sort((a, b) => b.avg - a.avg);
}

export interface AccountListItem {
  account: string;
  txnCount: number;
  monthSpend: number;
  allTimeSpend: number;
  lastActivity: string | null;
  months: string[];
}

export async function listAccounts(month?: string): Promise<AccountListItem[]> {
  await dbReady;
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const accts = await db.execute(`SELECT DISTINCT account FROM transactions ORDER BY account`);

  const items: AccountListItem[] = [];
  for (const a of accts.rows as any[]) {
    const account = a.account as string;
    const result = await db.execute({
      sql: `SELECT amount, direction, date FROM transactions WHERE account = ? AND status != 'duplicate'`,
      args: [account],
    });
    const rows = result.rows as any[];
    const spendRows = rows.filter((r) => r.direction === 'debit');
    const allTimeSpend = spendRows.reduce((s, r) => s + Number(r.amount), 0);
    const monthSpend = spendRows.filter((r) => r.date && (r.date as string).slice(0, 7) === targetMonth).reduce((s, r) => s + Number(r.amount), 0);
    const dates = rows.map((r) => r.date).filter(Boolean).sort() as string[];
    const months = Array.from(new Set(dates.map((d) => d.slice(0, 7)))).sort().reverse();
    items.push({ account, txnCount: rows.length, monthSpend, allTimeSpend, lastActivity: dates.length ? dates[dates.length - 1] : null, months });
  }
  return items;
}

export async function accountSummary(account: string, month?: string) {
  await dbReady;
  let q = `SELECT * FROM transactions WHERE account = ? AND status != 'duplicate'`;
  const params: any[] = [account];
  if (month && month !== 'all') {
    if (month.length === 4) { q += ` AND substr(date,1,4) = ?`; }
    else { q += ` AND substr(date,1,7) = ?`; }
    params.push(month);
  }
  q += ` ORDER BY date DESC, created_at DESC`;
  const result = await db.execute({ sql: q, args: params });
  const rows = (result.rows as any[]).map(rowToTxn);

  const debits = rows.filter((t) => t.direction === 'debit');
  const spend = debits.reduce((s, t) => s + t.amount, 0);
  const verified = debits.filter((t) => t.status === 'accepted').reduce((s, t) => s + t.amount, 0);

  const byCategory: Record<string, number> = {};
  debits.filter((t) => typeInfo(t.type).expense).forEach((t) => {
    const k = t.category || 'other';
    byCategory[k] = (byCategory[k] || 0) + t.amount;
  });

  const monthsResult = await db.execute({
    sql: `SELECT DISTINCT substr(date,1,7) as m FROM transactions WHERE account = ? AND date IS NOT NULL ORDER BY m DESC`,
    args: [account],
  });

  const spendByMonthResult = await db.execute({
    sql: `SELECT substr(date,1,7) as m, SUM(amount) as total FROM transactions WHERE account = ? AND direction='debit' AND status != 'duplicate' AND date IS NOT NULL GROUP BY m ORDER BY m ASC`,
    args: [account],
  });
  const spendByMonth: Record<string, number> = {};
  for (const r of spendByMonthResult.rows as any[]) spendByMonth[r.m as string] = Number(r.total);

  return {
    account, spend, verified, txnCount: rows.length, byCategory, spendByMonth,
    months: (monthsResult.rows as any[]).map((m) => m.m).filter(Boolean) as string[],
    transactions: rows,
  };
}

export async function summary(range?: { from: string; to: string } | string) {
  await dbReady;
  let q = `SELECT * FROM transactions WHERE direction='debit' AND status != 'duplicate'`;
  const params: any[] = [];

  if (typeof range === 'string') {
    if (range && range !== 'all') { q += ` AND substr(date,1,7) = ?`; params.push(range); }
  } else if (range) {
    q += ` AND date IS NOT NULL AND date >= ? AND date <= ?`;
    params.push(range.from, range.to);
  }

  const result = await db.execute({ sql: q, args: params });
  const rows = (result.rows as any[]).map(rowToTxn);

  const expenses = rows.filter((t) => typeInfo(t.type).expense);
  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const verified = rows.filter((t) => t.status === 'accepted' && typeInfo(t.type).expense).reduce((s, t) => s + t.amount, 0);
  const provisional = rows.filter((t) => t.status !== 'accepted').reduce((s, t) => s + t.amount, 0);
  const awaiting = expenses.filter((t) => t.status !== 'accepted').length;

  const byType: Record<string, number> = {};
  rows.forEach((t) => { byType[t.type] = (byType[t.type] || 0) + t.amount; });

  const byCategory: Record<string, number> = {};
  rows.filter((t) => t.status === 'accepted' && typeInfo(t.type).expense).forEach((t) => {
    const k = t.category || 'other';
    byCategory[k] = (byCategory[k] || 0) + t.amount;
  });

  const byCategoryAll: Record<string, number> = {};
  expenses.forEach((t) => {
    const k = t.category || 'other';
    byCategoryAll[k] = (byCategoryAll[k] || 0) + t.amount;
  });
  const unconfirmedTotal = expenses.filter((t) => t.status !== 'accepted').reduce((s, t) => s + t.amount, 0);

  const byAccount: Record<string, number> = {};
  expenses.forEach((t) => { byAccount[t.account] = (byAccount[t.account] || 0) + t.amount; });

  const monthsResult = await db.execute(`SELECT DISTINCT substr(date,1,7) as m FROM transactions WHERE date IS NOT NULL ORDER BY m DESC`);

  const confirmByAccount: Record<string, { total: number; confirmed: number }> = {};
  expenses.forEach((t) => {
    if (!confirmByAccount[t.account]) confirmByAccount[t.account] = { total: 0, confirmed: 0 };
    confirmByAccount[t.account].total++;
    if (t.status === 'accepted') confirmByAccount[t.account].confirmed++;
  });

  return {
    total, verified, provisional, awaiting, unconfirmedTotal,
    byType, byCategory, byCategoryAll, byAccount, confirmByAccount,
    months: (monthsResult.rows as any[]).map((m) => m.m).filter(Boolean) as string[],
    recurring: await recurringGroups(),
  };
}
