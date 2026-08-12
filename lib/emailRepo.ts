import { randomUUID } from 'crypto';
import { db, dbReady } from './db';
import { merchantSimilarity } from './categorizer';
import type { ParsedAlert } from './alertParser';

// ---------------------------------------------------------------- mail accounts

export interface EmailAccount {
  id: string;
  email: string;
  host: string;
  port: number;
  mailbox: string;
  lastUid: number;
  lastSyncAt: string | null;
}

function rowToAccount(r: any): EmailAccount {
  return {
    id: r.id, email: r.email, host: r.host, port: Number(r.port),
    mailbox: r.mailbox, lastUid: Number(r.last_uid), lastSyncAt: r.last_sync_at,
  };
}

export async function listEmailAccounts(): Promise<EmailAccount[]> {
  await dbReady;
  const result = await db.execute('SELECT * FROM email_accounts ORDER BY created_at');
  return (result.rows as any[]).map(rowToAccount);
}

export async function getEmailAccount(id: string): Promise<EmailAccount | null> {
  await dbReady;
  const result = await db.execute({ sql: 'SELECT * FROM email_accounts WHERE id = ?', args: [id] });
  return result.rows.length ? rowToAccount(result.rows[0]) : null;
}

export async function upsertEmailAccount(email: string, host: string, port: number, mailbox = 'INBOX'): Promise<EmailAccount> {
  await dbReady;
  const existing = await db.execute({ sql: 'SELECT * FROM email_accounts WHERE email = ?', args: [email] });
  if (existing.rows.length) {
    const row = existing.rows[0] as any;
    await db.execute({ sql: 'UPDATE email_accounts SET host=?, port=?, mailbox=? WHERE id=?', args: [host, port, mailbox, row.id] });
    return (await getEmailAccount(row.id))!;
  }
  const id = randomUUID();
  await db.execute({
    sql: 'INSERT INTO email_accounts (id, email, host, port, mailbox) VALUES (?,?,?,?,?)',
    args: [id, email, host, port, mailbox],
  });
  return (await getEmailAccount(id))!;
}

export async function deleteEmailAccount(id: string) {
  await dbReady;
  const tx = await db.transaction('write');
  try {
    await tx.execute({ sql: 'DELETE FROM email_messages WHERE account_id = ?', args: [id] });
    await tx.execute({ sql: 'DELETE FROM email_accounts WHERE id = ?', args: [id] });
    await tx.commit();
  } catch (e) { await tx.rollback(); throw e; }
}

export async function setLastUid(id: string, uid: number) {
  await dbReady;
  await db.execute({
    sql: `UPDATE email_accounts SET last_uid=?, last_sync_at=datetime('now') WHERE id=?`,
    args: [uid, id],
  });
}

// ------------------------------------------------------- institution password hints

export async function listInstitutionSecrets(): Promise<{ institution: string; hint: string; updatedAt: string }[]> {
  await dbReady;
  const result = await db.execute('SELECT * FROM institution_secrets ORDER BY institution');
  return (result.rows as any[]).map((r) => ({
    institution: r.institution, hint: r.hint, updatedAt: r.updated_at,
  }));
}

export async function recordInstitutionSecret(institution: string, hint: string) {
  await dbReady;
  await db.execute({
    sql: `INSERT INTO institution_secrets (institution, hint) VALUES (?,?)
     ON CONFLICT(institution) DO UPDATE SET hint=excluded.hint, updated_at=datetime('now')`,
    args: [institution.toLowerCase(), hint],
  });
}

export async function forgetInstitutionSecret(institution: string) {
  await dbReady;
  await db.execute({ sql: 'DELETE FROM institution_secrets WHERE institution = ?', args: [institution.toLowerCase()] });
}

// ------------------------------------------------------------------ message log

export type MessageKind = 'statement' | 'alert' | 'ignored';
export type MessageStatus = 'imported' | 'skipped' | 'needs_password' | 'needs_mapping' | 'failed';

export async function alreadyProcessed(accountId: string, uid: number): Promise<boolean> {
  await dbReady;
  const result = await db.execute({ sql: 'SELECT 1 FROM email_messages WHERE account_id=? AND uid=?', args: [accountId, uid] });
  return result.rows.length > 0;
}

export async function logMessage(m: {
  accountId: string; uid: number; messageId?: string | null; from: string; subject: string;
  receivedAt: string | null; kind: MessageKind; status: MessageStatus; detail?: string; importedCount?: number;
}) {
  await dbReady;
  await db.execute({
    sql: `INSERT INTO email_messages (id, account_id, uid, message_id, from_addr, subject, received_at, kind, status, detail, imported_count)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(account_id, uid) DO UPDATE SET
       kind=excluded.kind, status=excluded.status, detail=excluded.detail,
       imported_count=excluded.imported_count, processed_at=datetime('now')`,
    args: [
      randomUUID(), m.accountId, m.uid, m.messageId ?? null,
      m.from, m.subject, m.receivedAt,
      m.kind, m.status, m.detail ?? '', m.importedCount ?? 0,
    ],
  });
}

export async function listRecentMessages(limit = 50) {
  await dbReady;
  const result = await db.execute({ sql: 'SELECT * FROM email_messages ORDER BY processed_at DESC LIMIT ?', args: [limit] });
  return result.rows as any[];
}

export async function listBlockedMessages() {
  await dbReady;
  const result = await db.execute(`SELECT * FROM email_messages WHERE status IN ('needs_password','needs_mapping') ORDER BY processed_at DESC`);
  return result.rows as any[];
}

export async function clearBlocked(status: MessageStatus) {
  await dbReady;
  await db.execute({ sql: 'DELETE FROM email_messages WHERE status = ?', args: [status] });
}

// ------------------------------------------------------------------ card mapping

export async function listCardMap() {
  await dbReady;
  const result = await db.execute('SELECT * FROM card_map ORDER BY institution, last4');
  return result.rows as any[];
}

export async function setCardMap(last4: string, institution: string, account: string) {
  await dbReady;
  await db.execute({
    sql: `INSERT INTO card_map (last4, institution, account) VALUES (?,?,?)
     ON CONFLICT(last4, institution) DO UPDATE SET account=excluded.account`,
    args: [last4, institution.toLowerCase(), account],
  });
}

export async function knownAccounts(): Promise<string[]> {
  await dbReady;
  const result = await db.execute('SELECT DISTINCT account FROM transactions ORDER BY account');
  return (result.rows as any[]).map((r) => r.account as string);
}

export async function resolveAccount(institution: string, last4: string | null): Promise<string | null> {
  await dbReady;
  if (last4) {
    const hit = await db.execute({
      sql: 'SELECT account FROM card_map WHERE last4=? AND institution=?',
      args: [last4, institution.toLowerCase()],
    });
    if (hit.rows.length) return (hit.rows[0] as any).account;
  }
  const candidates = (await knownAccounts()).filter((a) => a.toLowerCase().includes(institution.toLowerCase()));
  if (candidates.length === 1) {
    if (last4) await setCardMap(last4, institution, candidates[0]);
    return candidates[0];
  }
  return null;
}

// --------------------------------------------------------------- alert ingestion

export async function insertAlertTxn(a: ParsedAlert, account: string, sourceRef: string): Promise<boolean> {
  await dbReady;
  const dup = await db.execute({
    sql: `SELECT id FROM transactions
       WHERE source='alert' AND account=? AND amount=? AND IFNULL(date,'')=? AND merchant=?`,
    args: [account, a.amount, a.date ?? '', a.merchant],
  });
  if (dup.rows.length) return false;

  await db.execute({
    sql: `INSERT INTO transactions
       (id, date, narration, merchant, amount, direction, account, type, category, confidence, status, source, source_ref)
     VALUES (?,?,?,?,?,?,?,'unclassified',NULL,'low','pending','alert',?)`,
    args: [randomUUID(), a.date, `${a.merchant} · alert`, a.merchant, a.amount, a.direction, account, sourceRef],
  });
  return true;
}

// ------------------------------------------------------------------ reconciliation

export async function reconcileAlerts(account: string, dayWindow = 4, minMerchantSimilarity = 0.34): Promise<number> {
  await dbReady;
  const alertsResult = await db.execute({
    sql: `SELECT * FROM transactions WHERE source='alert' AND superseded_by IS NULL AND account=?`,
    args: [account],
  });
  const alerts = alertsResult.rows as any[];
  if (alerts.length === 0) return 0;

  const stmtResult = await db.execute({
    sql: `SELECT * FROM transactions WHERE source='statement' AND account=?`,
    args: [account],
  });
  const statementRows = stmtResult.rows as any[];
  if (statementRows.length === 0) return 0;

  const claimed = new Set<string>();
  let superseded = 0;

  const tx = await db.transaction('write');
  try {
    for (const alert of alerts) {
      let best: { id: string; score: number } | null = null;

      for (const s of statementRows) {
        if (claimed.has(s.id as string)) continue;
        if (Math.abs(Number(s.amount) - Number(alert.amount)) > 0.01) continue;
        if (s.direction !== alert.direction) continue;

        if (alert.date && s.date) {
          const days = Math.abs(
            (new Date(s.date as string).getTime() - new Date(alert.date as string).getTime()) / 86_400_000
          );
          if (days > dayWindow) continue;
        }

        const score = merchantSimilarity(alert.merchant as string, s.merchant as string);
        if (score < minMerchantSimilarity) continue;
        if (!best || score > best.score) best = { id: s.id as string, score };
      }

      if (best) {
        await tx.execute({
          sql: `UPDATE transactions SET superseded_by=?, is_duplicate=1, status='duplicate', updated_at=datetime('now') WHERE id=?`,
          args: [best.id, alert.id],
        });
        claimed.add(best.id);
        superseded++;
      }
    }
    await tx.commit();
  } catch (e) { await tx.rollback(); throw e; }

  return superseded;
}

export async function countPendingAlerts(account?: string): Promise<number> {
  await dbReady;
  const sql = account
    ? `SELECT COUNT(*) as n FROM transactions WHERE source='alert' AND superseded_by IS NULL AND account=?`
    : `SELECT COUNT(*) as n FROM transactions WHERE source='alert' AND superseded_by IS NULL`;
  const result = await db.execute({ sql, args: account ? [account] : [] });
  return Number((result.rows[0] as any).n);
}
