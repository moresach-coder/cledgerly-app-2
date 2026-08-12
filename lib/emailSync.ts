import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getSecret } from './secrets';
import { extractPdfText, PdfPasswordRequired } from './pdf';
import { parseAlert, looksLikeBankMail } from './alertParser';
import { parseLines } from './parser';
import { detectStatementPeriod } from './statementPeriod';
import { getRules, commitImport } from './repo';
import { categorize } from './categorizer';
import {
  type EmailAccount, setLastUid, alreadyProcessed, logMessage,
  resolveAccount, insertAlertTxn, reconcileAlerts,
} from './emailRepo';

export interface SyncResult {
  scanned: number;
  alertsImported: number;
  statementsImported: number;
  statementTxns: number;
  needsPassword: string[];
  needsMapping: string[];
  failed: number;
  superseded: number;
}

/** Maps a sender address to the institution key used for passwords and card mapping. */
export function institutionFromSender(from: string): string | null {
  const f = from.toLowerCase();
  const rules: [RegExp, string][] = [
    [/amazon/, 'amazonpay'],
    [/icici/, 'icici'],
    [/hdfc/, 'hdfc'],
    [/axis/, 'axis'],
    [/sbicard|onlinesbi|\bsbi\b/, 'sbi'],
    [/kotak/, 'kotak'],
    [/americanexpress|amex/, 'amex'],
    [/idfc/, 'idfc'],
    [/yesbank/, 'yesbank'],
    [/indusind/, 'indusind'],
  ];
  for (const [re, key] of rules) if (re.test(f)) return key;
  return null;
}

const PDF_RE = /\.pdf$/i;

function isStatementMail(subject: string, hasPdf: boolean): boolean {
  return hasPdf || /statement|e-?statement/i.test(subject);
}

/**
 * Fetches new mail for one account and ingests what it recognises.
 *
 * Only UIDs above the account's high-water mark are examined, and every message is logged
 * so a repeat sync never re-imports the same mail. Statement PDFs are decrypted with the
 * institution password held in the OS keychain; when that is missing or wrong the message
 * is parked rather than dropped, so it imports on the next run once the password is set.
 */
export async function syncAccount(account: EmailAccount, firstRunDays = 120): Promise<SyncResult> {
  const result: SyncResult = {
    scanned: 0, alertsImported: 0, statementsImported: 0, statementTxns: 0,
    needsPassword: [], needsMapping: [], failed: 0, superseded: 0,
  };

  const password = await getSecret('imap', account.email);
  if (!password) throw new Error(`No app password stored for ${account.email}. Add it in Settings.`);

  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user: account.email, pass: password },
    logger: false,
  });

  await client.connect();
  const touchedAccounts = new Set<string>();
  let highestUid = account.lastUid;

  try {
    const lock = await client.getMailboxLock(account.mailbox);
    try {
      // First run has no high-water mark. Scanning the whole mailbox would mean pulling
      // years of unrelated mail, so the initial pass is bounded by date and later runs
      // continue from the last UID seen.
      let range: string | number[];
      if (account.lastUid > 0) {
        range = `${account.lastUid + 1}:*`;
      } else {
        const since = new Date(Date.now() - firstRunDays * 86_400_000);
        const uids = (await client.search({ since }, { uid: true })) || [];
        if (uids.length === 0) {
          return result; // nothing recent enough to look at
        }
        range = uids as number[];
      }

      for await (const msg of client.fetch(
        range,
        { uid: true, envelope: true, source: true },
        { uid: true }
      )) {
        // A "start:*" range always yields at least the last message, even when it is
        // already below the mark.
        if (msg.uid <= account.lastUid) continue;
        highestUid = Math.max(highestUid, msg.uid);

        if (await alreadyProcessed(account.id, msg.uid)) continue;
        result.scanned++;

        const from = msg.envelope?.from?.[0]?.address ?? '';
        const subject = msg.envelope?.subject ?? '';
        const receivedAt = msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null;
        const base = { accountId: account.id, uid: msg.uid, from, subject, receivedAt, messageId: msg.envelope?.messageId };

        if (!looksLikeBankMail(from, subject)) {
          await logMessage({ ...base, kind: 'ignored', status: 'skipped', detail: 'Not bank mail' });
          continue;
        }

        const institution = institutionFromSender(from);

        try {
          const parsed = await simpleParser(msg.source as Buffer);
          const pdfs = (parsed.attachments || []).filter(
            (a) => PDF_RE.test(a.filename || '') || a.contentType === 'application/pdf'
          );

          if (isStatementMail(subject, pdfs.length > 0) && pdfs.length > 0) {
            if (!institution) {
              await logMessage({ ...base, kind: 'statement', status: 'needs_mapping', detail: `Unrecognised sender ${from}` });
              result.needsMapping.push(from);
              continue;
            }

            const secret = await getSecret('statement', institution);
            let text = '';
            try {
              text = await extractPdfText(pdfs[0].content as Buffer, secret ?? undefined);
            } catch (e) {
              if (e instanceof PdfPasswordRequired) {
                await logMessage({
                  ...base, kind: 'statement', status: 'needs_password',
                  detail: `${institution}: ${e.message}`,
                });
                if (!result.needsPassword.includes(institution)) result.needsPassword.push(institution);
                continue;
              }
              throw e;
            }

            const target = await resolveAccount(institution, null);
            if (!target) {
              await logMessage({ ...base, kind: 'statement', status: 'needs_mapping', detail: `No account matches ${institution}` });
              result.needsMapping.push(institution);
              continue;
            }

            let lines = parseLines(text, await getRules());
            lines = lines.map((l) =>
              l.category ? l : { ...l, category: categorize(l.merchant).category || null }
            );

            if (lines.length === 0) {
              await logMessage({ ...base, kind: 'statement', status: 'failed', detail: 'No transactions found in PDF' });
              result.failed++;
              continue;
            }

            const period = detectStatementPeriod(text);
            await commitImport(target, null, lines, {
              periodFrom: period.from,
              periodTo: period.to,
              statementDate: period.statementDate,
              fileName: pdfs[0].filename ?? null,
            });
            touchedAccounts.add(target);
            result.statementsImported++;
            result.statementTxns += lines.length;
            await logMessage({ ...base, kind: 'statement', status: 'imported', detail: target, importedCount: lines.length });
            continue;
          }

          // Otherwise treat it as a single-transaction alert.
          const body = parsed.text || parsed.html || '';
          const alert = parseAlert(String(body), subject);
          if (!alert) {
            await logMessage({ ...base, kind: 'ignored', status: 'skipped', detail: 'No transaction found' });
            continue;
          }

          const inst = institution ?? '';
          const target = await resolveAccount(inst, alert.last4);
          if (!target) {
            await logMessage({
              ...base, kind: 'alert', status: 'needs_mapping',
              detail: `${inst || 'unknown'} ${alert.last4 ?? ''}`.trim(),
            });
            result.needsMapping.push(`${inst || from} ${alert.last4 ?? ''}`.trim());
            continue;
          }

          const inserted = await insertAlertTxn(alert, target, String(msg.envelope?.messageId ?? msg.uid));
          touchedAccounts.add(target);
          if (inserted) result.alertsImported++;
          await logMessage({
            ...base, kind: 'alert', status: inserted ? 'imported' : 'skipped',
            detail: inserted ? `${target} · ${alert.merchant}` : 'Already recorded',
            importedCount: inserted ? 1 : 0,
          });
        } catch (e) {
          result.failed++;
          await logMessage({ ...base, kind: 'ignored', status: 'failed', detail: String(e).slice(0, 300) });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  if (highestUid > account.lastUid) await setLastUid(account.id, highestUid);
  for (const a of touchedAccounts) result.superseded += await reconcileAlerts(a);

  return result;
}

/** Quick credential check that does not read or import anything. */
export async function testConnection(email: string, host: string, port: number, password: string): Promise<void> {
  const client = new ImapFlow({ host, port, secure: true, auth: { user: email, pass: password }, logger: false });
  await client.connect();
  await client.logout().catch(() => {});
}
