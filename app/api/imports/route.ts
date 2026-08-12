import { NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  await dbReady;

  const accountsResult = await db.execute(
    `SELECT account,
            COUNT(*)                                       AS total,
            SUM(source = 'statement')                      AS fromStatements,
            SUM(source = 'alert')                          AS fromAlerts,
            SUM(status = 'pending')                        AS pending,
            SUM(status = 'accepted')                       AS confirmed,
            SUM(is_duplicate = 1)                          AS duplicates,
            SUM(date IS NULL)                              AS undated,
            MIN(date)                                      AS firstDate,
            MAX(date)                                      AS lastDate,
            SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS outflow
       FROM transactions
      GROUP BY account
      ORDER BY total DESC`
  );
  const accounts = accountsResult.rows as any[];

  const statementsResult = await db.execute(
    `SELECT account, COUNT(*) AS files, SUM(count) AS rows, MAX(imported_at) AS lastImport
       FROM statements GROUP BY account`
  );
  const statements = statementsResult.rows as any[];

  const byAccount = new Map(statements.map((s) => [s.account, s]));

  const statementListResult = await db.execute(
    `SELECT s.id, s.account, s.period_from AS periodFrom, s.period_to AS periodTo,
            s.statement_date AS statementDate, s.file_name AS fileName,
            s.count AS rows, s.declared, s.imported_at AS importedAt,
            (SELECT IFNULL(SUM(amount), 0) FROM transactions t
              WHERE t.statement_id = s.id AND t.direction = 'debit' AND t.is_duplicate = 0) AS debits,
            (SELECT IFNULL(SUM(amount), 0) FROM transactions t
              WHERE t.statement_id = s.id AND t.direction = 'credit' AND t.is_duplicate = 0) AS credits
       FROM statements s
      ORDER BY IFNULL(s.period_to, s.imported_at) DESC`
  );
  const statementList = statementListResult.rows as any[];

  const blockedResult = await db.execute(
    `SELECT status, from_addr, subject, detail, received_at
       FROM email_messages
      WHERE status IN ('needs_password', 'needs_mapping')
      ORDER BY received_at DESC`
  );
  const blocked = blockedResult.rows as any[];

  function groupBlocked(status: string) {
    const rows = blocked.filter((b) => b.status === status);
    const bySender = new Map<string, { sender: string; count: number; detail: string; latest: string; subject: string }>();
    for (const r of rows) {
      const key = String(r.from_addr).toLowerCase();
      const hit = bySender.get(key);
      if (hit) hit.count++;
      else
        bySender.set(key, {
          sender: r.from_addr as string,
          count: 1,
          detail: r.detail as string,
          latest: r.received_at as string,
          subject: r.subject as string,
        });
    }
    return [...bySender.values()].sort((a, b) => b.count - a.count);
  }

  const mailResult = await db.execute(`SELECT status, COUNT(*) as n FROM email_messages GROUP BY status`);
  const mail = mailResult.rows as any[];

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      ...a,
      statementFiles: byAccount.get(a.account)?.files ?? 0,
      lastImport: byAccount.get(a.account)?.lastImport ?? null,
    })),
    statements: statementList,
    lockedStatements: groupBlocked('needs_password'),
    unrecognisedSenders: groupBlocked('needs_mapping'),
    mailScanned: mail.reduce((s, m) => s + Number(m.n), 0),
    mailBreakdown: mail,
  });
}
