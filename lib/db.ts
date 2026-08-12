import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const globalForDb = globalThis as unknown as { _db?: Client; _dbReady?: Promise<void> };

function makeClient(): Client {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  const dbPath = path.join(dataDir, 'ledgerly.db');
  return createClient({ url: `file:${dbPath}` });
}

export const db: Client = globalForDb._db ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForDb._db = db;

async function migrate() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS statements (
      id TEXT PRIMARY KEY,
      account TEXT NOT NULL,
      declared REAL,
      parsed REAL NOT NULL,
      count INTEGER NOT NULL,
      imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT,
      narration TEXT NOT NULL,
      merchant TEXT NOT NULL,
      amount REAL NOT NULL,
      direction TEXT NOT NULL,
      account TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT,
      confidence TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT NOT NULL DEFAULT '',
      is_duplicate INTEGER NOT NULL DEFAULT 0,
      statement_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (statement_id) REFERENCES statements(id)
    );
    CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account);

    CREATE TABLE IF NOT EXISTS rules (
      key TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS email_accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 993,
      mailbox TEXT NOT NULL DEFAULT 'INBOX',
      last_uid INTEGER NOT NULL DEFAULT 0,
      last_sync_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS institution_secrets (
      institution TEXT PRIMARY KEY,
      hint TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_messages (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      uid INTEGER NOT NULL,
      message_id TEXT,
      from_addr TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      received_at TEXT,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      imported_count INTEGER NOT NULL DEFAULT 0,
      processed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_email_msg_status ON email_messages(status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_email_msg_unique ON email_messages(account_id, uid);

    CREATE TABLE IF NOT EXISTS card_map (
      last4 TEXT NOT NULL,
      institution TEXT NOT NULL,
      account TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (last4, institution)
    );
  `);

  // Column migrations
  const addCol = async (table: string, column: string, ddl: string) => {
    const cols = await db.execute(`PRAGMA table_info(${table})`);
    if (!cols.rows.some((c) => (c as any).name === column || c[1] === column)) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  };

  await addCol('transactions', 'source', `source TEXT NOT NULL DEFAULT 'manual'`);
  await addCol('transactions', 'source_ref', `source_ref TEXT`);
  await addCol('transactions', 'superseded_by', `superseded_by TEXT`);
  await addCol('statements', 'period_from', `period_from TEXT`);
  await addCol('statements', 'period_to', `period_to TEXT`);
  await addCol('statements', 'statement_date', `statement_date TEXT`);
  await addCol('statements', 'file_name', `file_name TEXT`);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_txn_source ON transactions(source)`);
}

export const dbReady: Promise<void> = globalForDb._dbReady ?? migrate();
if (process.env.NODE_ENV !== 'production') globalForDb._dbReady = dbReady;
