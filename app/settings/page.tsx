'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import ImportModal from '@/components/ImportModal';

const PRESETS: Record<string, { host: string; port: number }> = {
  'gmail.com': { host: 'imap.gmail.com', port: 993 },
  'googlemail.com': { host: 'imap.gmail.com', port: 993 },
  'outlook.com': { host: 'outlook.office365.com', port: 993 },
  'hotmail.com': { host: 'outlook.office365.com', port: 993 },
  'live.com': { host: 'outlook.office365.com', port: 993 },
  'yahoo.com': { host: 'imap.mail.yahoo.com', port: 993 },
  'icloud.com': { host: 'imap.mail.me.com', port: 993 },
};

const INSTITUTIONS = ['icici', 'hdfc', 'axis', 'amex', 'sbi', 'kotak', 'amazonpay', 'idfc', 'yesbank', 'indusind'];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-caption uppercase tracking-[0.1em] text-credmuted font-bold mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-caption text-credmuted mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full bg-credbg border border-credline rounded-lg px-3 py-2.5 text-sm text-credink';

export default function SettingsPage() {
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('993');
  const [appPassword, setAppPassword] = useState('');

  const [inst, setInst] = useState('icici');
  const [stmtPassword, setStmtPassword] = useState('');
  const [hint, setHint] = useState('');

  const [importing, setImporting] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');
  const [lookbackDays, setLookbackDays] = useState('120');
  const [showConnect, setShowConnect] = useState(false);

  const load = useCallback(async () => {
    const [res, accRes, cleanRes] = await Promise.all([
      fetch('/api/email/status'),
      fetch('/api/accounts/rename'),
      fetch('/api/cleanup'),
    ]);
    const base = await res.json();
    const acc = await accRes.json();
    const phantom = await cleanRes.json();
    setStatus({ ...base, accountStats: acc.accounts, phantom });
  }, []);

  useEffect(() => { load(); }, [load]);

  function onEmailChange(v: string) {
    setEmail(v);
    const domain = v.split('@')[1]?.toLowerCase();
    if (domain && PRESETS[domain]) {
      setHost(PRESETS[domain].host);
      setPort(String(PRESETS[domain].port));
    }
  }

  async function connect() {
    setBusy('connect'); 
    try {
      const res = await fetch('/api/email/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, host, port: Number(port), password: appPassword }),
      });
      const data = await res.json();
      if (!res.ok) toast(data.error, 'err');
      else {
        toast(`Connected ${email}`, 'ok');
        setAppPassword(''); setEmail(''); setShowConnect(false);
        load();
      }
    } finally { setBusy(''); }
  }

  async function saveStatementPassword() {
    setBusy('stmt'); 
    try {
      const res = await fetch('/api/email/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution: inst, password: stmtPassword, hint }),
      });
      const data = await res.json();
      if (!res.ok) toast(data.error, 'err');
      else {
        toast(`Saved ${inst.toUpperCase()} statement password`, 'ok');
        setStmtPassword(''); setHint('');
        load();
      }
    } finally { setBusy(''); }
  }

  async function sync() {
    setBusy('sync'); setSyncResult(null);
    try {
      const res = await fetch('/api/email/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstRunDays: Number(lookbackDays) || 120 }),
      });
      const data = await res.json();
      if (!res.ok) toast(data.error, 'err');
      else setSyncResult(data);
      load();
    } finally { setBusy(''); }
  }

  async function mapCard(last4: string, institution: string, account: string) {
    await fetch('/api/email/cardmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last4, institution, account }),
    });
    load();
  }

  const accounts = status?.accounts ?? [];

  return (
    <div className="min-h-screen bg-credbg text-credink px-5 pt-5 pb-8">
      <Link href="/" className="text-small text-credmuted font-semibold">&larr; Back</Link>
      <h1 className="text-display font-extrabold tracking-[-0.02em] mt-2">Settings</h1>
      <p className="text-small text-credmuted mt-1 mb-5">Sync, passwords and your accounts</p>

      {/* ------------------------------------------------------------ import */}
      <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3">Import</div>
      <button
        onClick={() => setImporting(true)}
        className="w-full flex items-center gap-3 bg-credsurface border border-credline rounded-xl px-4 py-3.5 mb-6 hover:border-credink/20 transition-colors"
      >
        <span className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </span>
        <div className="text-left flex-1">
          <div className="text-body font-bold">Import Statement</div>
          <div className="text-caption text-credmuted">Excel, CSV or PDF — one file at a time</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-credmuted/30" aria-hidden>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* ------------------------------------------------------------- mailbox */}
      <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3">Mailbox</div>

      {accounts.length > 0 && (
        <div className="space-y-2 mb-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="bg-credsurface border border-credline rounded-xl px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-pos flex-none" aria-hidden />
                  <div className="min-w-0">
                    <div className="text-body font-bold truncate">{a.email}</div>
                    <div className="text-caption text-credmuted mt-0.5">
                      Connected · last synced{' '}
                      {a.lastSyncAt ? new Date(a.lastSyncAt).toLocaleString() : 'never'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await fetch('/api/email/accounts', {
                      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: a.id, email: a.email }),
                    });
                    toast(`Disconnected ${a.email}`, 'ok');
                    load();
                  }}
                  className="text-caption font-bold text-neg flex-none"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The connect form is the main event only when nothing is connected yet; otherwise
          an empty disabled form dominates the page and makes everything look inactive. */}
      {accounts.length > 0 && !showConnect && (
        <button
          onClick={() => setShowConnect(true)}
          className="text-small font-bold text-credink underline underline-offset-2 mb-6"
        >
          + Add another mailbox
        </button>
      )}

      <div className={`bg-credsurface border border-credline rounded-xl p-4 mb-6 ${accounts.length > 0 && !showConnect ? 'hidden' : ''}`}>
        <Field label="Email address">
          <input value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="you@gmail.com" className={inputCls} />
        </Field>
        <div className="flex gap-2">
          <div className="flex-1"><Field label="IMAP host"><input value={host} onChange={(e) => setHost(e.target.value)} placeholder="imap.gmail.com" className={inputCls} /></Field></div>
          <div className="w-24"><Field label="Port"><input value={port} onChange={(e) => setPort(e.target.value)} className={inputCls} /></Field></div>
        </div>
        <Field
          label="App password"
          hint="Not your normal email password. Generate an app-specific password from your provider (Google: Account → Security → 2-Step Verification → App passwords). It is stored in your macOS Keychain, never in Ledgerly's database."
        >
          <input type="password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="16-character app password" className={inputCls} autoComplete="off" />
        </Field>
        <button
          onClick={connect}
          disabled={busy === 'connect' || !email || !host || !appPassword}
          className="w-full py-2.5 rounded-lg bg-credink text-white text-small font-bold disabled:opacity-40"
        >
          {busy === 'connect' ? 'Verifying…' : 'Connect Mailbox'}
        </button>
      </div>

      {/* ------------------------------------------------ statement passwords */}
      <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3">Statement Passwords</div>
      <p className="text-caption text-credmuted mb-3 leading-relaxed">
        Issuers protect statement PDFs with a pattern that stays the same every month, so you enter it once per
        institution and Ledgerly reuses it for every future statement.
      </p>

      {status?.institutions?.length > 0 && (
        <div className="space-y-2 mb-3">
          {status.institutions.map((i: any) => (
            <div key={i.institution} className="bg-credsurface border border-credline rounded-xl px-3.5 py-2.5 flex items-center justify-between">
              <div>
                <span className="text-small font-semibold uppercase">{i.institution}</span>
                {i.hint && <span className="text-caption text-credmuted ml-2">{i.hint}</span>}
              </div>
              <span className="text-caption font-semibold text-pos">Stored</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-credsurface border border-credline rounded-xl p-4 mb-6">
        <Field label="Institution">
          <select value={inst} onChange={(e) => setInst(e.target.value)} className={inputCls}>
            {INSTITUTIONS.map((i) => <option key={i} value={i}>{i.toUpperCase()}</option>)}
          </select>
        </Field>
        <Field label="Statement password">
          <input type="password" value={stmtPassword} onChange={(e) => setStmtPassword(e.target.value)} placeholder="e.g. ABCD1234" className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Reminder (optional)" hint="A note to yourself about the pattern, e.g. “first 4 of name + DDMM”. Stored in plain text — do not put the password here.">
          <input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="name + date of birth" className={inputCls} />
        </Field>
        <button
          onClick={saveStatementPassword}
          disabled={busy === 'stmt' || !stmtPassword}
          className="w-full py-2.5 rounded-lg bg-credink text-white text-small font-bold disabled:opacity-40"
        >
          {busy === 'stmt' ? 'Saving…' : 'Save Password'}
        </button>
      </div>

      {/* ------------------------------------------------------------ sync */}
      <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3">Sync</div>

      {accounts.some((a: any) => !a.lastSyncAt) && (
        <div className="bg-credsurface border border-credline rounded-xl p-3.5 mb-3">
          <label className="block text-caption uppercase tracking-[0.1em] text-credmuted font-bold mb-1.5">
            First sync — how far back
          </label>
          <select value={lookbackDays} onChange={(e) => setLookbackDays(e.target.value)} className={inputCls}>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="120">Last 4 months</option>
            <option value="365">Last year</option>
            <option value="1095">Last 3 years</option>
          </select>
          <p className="text-micro text-credmuted mt-1.5 leading-relaxed">
            Only applies to the first sync. After that Ledgerly picks up where it left off and only reads new
            mail. Start small — you can always widen it later.
          </p>
        </div>
      )}

      <button
        onClick={sync}
        disabled={busy === 'sync' || accounts.length === 0}
        className="w-full py-3 rounded-xl bg-credink text-white text-body font-bold disabled:opacity-40 mb-3"
      >
        {busy === 'sync' ? 'Checking your mail…' : 'Sync Now'}
      </button>

      {syncResult && (
        <div className="bg-credsurface border border-credline rounded-xl p-4 mb-3 text-small space-y-1.5">
          <div><strong>{syncResult.scanned}</strong> new messages scanned</div>
          <div><strong>{syncResult.alertsImported}</strong> transaction alerts imported</div>
          <div><strong>{syncResult.statementsImported}</strong> statements imported ({syncResult.statementTxns} transactions)</div>
          {syncResult.superseded > 0 && (
            <div className="text-pos">{syncResult.superseded} duplicate alerts merged into statement rows</div>
          )}
          {syncResult.needsPassword?.length > 0 && (
            <div className="text-warn">Needs a statement password: {syncResult.needsPassword.join(', ')}</div>
          )}
          {syncResult.needsMapping?.length > 0 && (
            <div className="text-warn">Needs a card mapping: {syncResult.needsMapping.join(', ')}</div>
          )}
          {syncResult.errors?.length > 0 && <div className="text-neg">{syncResult.errors.join('; ')}</div>}
          <div className="text-credmuted pt-1">Everything imported is waiting in Review.</div>
        </div>
      )}

      {/* ------------------------------------------------------- card mapping */}
      {status?.blocked?.filter((b: any) => b.status === 'needs_mapping').length > 0 && (
        <>
          <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3 mt-6">Unmapped Cards</div>
          <div className="space-y-2 mb-6">
            {status.blocked.filter((b: any) => b.status === 'needs_mapping').map((b: any) => {
              const [institution, last4] = String(b.detail).split(' ');
              return (
                <div key={b.id} className="bg-credsurface border border-credline rounded-xl px-3.5 py-3">
                  <div className="text-small font-semibold mb-1">{b.subject || b.from_addr}</div>
                  <div className="text-caption text-credmuted mb-2">{institution} {last4 ? `· card ending ${last4}` : ''}</div>
                  <select
                    defaultValue=""
                    onChange={(e) => e.target.value && mapCard(last4 || '0000', institution || 'unknown', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Assign to account…</option>
                    {(status.knownAccounts ?? []).map((a: string) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* --------------------------------------------------------------- data */}
      <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3 mt-6">Your Data</div>
      <Link
        href="/imports"
        className="flex items-center justify-between bg-credsurface border border-credline rounded-xl px-4 py-3.5 mb-6"
      >
        <span className="min-w-0">
          <span className="text-body font-bold block">What&apos;s Imported</span>
          <span className="text-caption text-credmuted">
            {status?.accountStats?.length ?? 0} accounts · statements, periods and anything stuck
          </span>
        </span>
        <span className="text-credmuted text-title flex-none ml-3">&rsaquo;</span>
      </Link>

      {/* ---------------------------------------------------------- cleanup */}
      {status?.phantom?.count > 0 && (
        <>
          <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3 mt-6">Data Cleanup</div>
          <div className="bg-warn/10 border border-warn/30 rounded-xl p-4 mb-6">
            <div className="text-body font-bold text-warn">
              {status.phantom.count} rows are not real transactions
            </div>
            <p className="text-caption text-credmuted mt-1.5 leading-relaxed">
              These came from statement headers, addresses and summary boxes before the parser filtered them
              out. Together they add a false{' '}
              <strong className="text-credink">₹{Math.round(status.phantom.totalAmount).toLocaleString('en-IN')}</strong>{' '}
              to your ledger.
            </p>

            <div className="mt-3 bg-credsurface border border-credline rounded-lg p-2.5 max-h-40 overflow-y-auto">
              {(status.phantom.rows ?? []).slice(0, 25).map((r: any) => (
                <div key={r.id} className="text-micro text-credmuted py-1 border-b border-credline last:border-0 flex gap-2">
                  <span className="font-mono flex-none w-16 text-right">
                    ₹{Math.round(r.amount).toLocaleString('en-IN')}
                  </span>
                  <span className="truncate">{r.narration}</span>
                </div>
              ))}
            </div>

            <button
              onClick={async () => {
                const res = await fetch('/api/cleanup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ all: true }),
                });
                const d = await res.json();
                toast(res.ok ? `Removed ${d.deleted} non-transaction rows` : d.error, res.ok ? 'ok' : 'err');
                load();
              }}
              className="w-full mt-3 py-2.5 rounded-lg bg-credink text-white text-small font-bold"
            >
              Remove all {status.phantom.count}
            </button>
            <p className="text-micro text-credmuted mt-2">
              Only these rows are deleted. Your real transactions are untouched.
            </p>
          </div>
        </>
      )}

      {/* --------------------------------------------------------- accounts */}
      <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3 mt-6">Accounts</div>
      <p className="text-caption text-credmuted mb-3 leading-relaxed">
        Rename an account, or merge one into another by giving it an existing name.
      </p>
      <div className="space-y-2 mb-6">
        {(status?.accountStats ?? []).map((a: any) => (
          <div key={a.account} className="bg-credsurface border border-credline rounded-xl px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-body font-semibold truncate">{a.account}</div>
                <div className="text-caption text-credmuted mt-0.5">
                  {a.n} transaction{a.n === 1 ? '' : 's'} · {a.first || '?'} to {a.last || '?'}
                </div>
              </div>
              <button
                onClick={() => setRenaming(renaming === a.account ? null : a.account)}
                className="text-caption font-bold text-credink underline underline-offset-2 flex-none"
              >
                {renaming === a.account ? 'Close' : 'Rename'}
              </button>
            </div>
            {renaming === a.account && (
              <div className="mt-3">
                <input
                  value={renameTo}
                  onChange={(e) => setRenameTo(e.target.value)}
                  placeholder="New name (an existing name merges them)"
                  className={inputCls}
                  list="all-accounts"
                />
                <datalist id="all-accounts">
                  {(status?.accountStats ?? []).map((x: any) => <option key={x.account} value={x.account} />)}
                </datalist>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/accounts/rename', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ from: a.account, to: renameTo.trim() }),
                    });
                    const d = await res.json();
                    toast(
                      res.ok ? `Moved ${d.moved} transactions to "${renameTo.trim()}"` : d.error,
                      res.ok ? 'ok' : 'err'
                    );
                    setRenaming(null); setRenameTo(''); load();
                  }}
                  disabled={!renameTo.trim() || renameTo.trim() === a.account}
                  className="w-full mt-2 py-2.5 rounded-lg bg-credink text-white text-small font-bold disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); toast('Statement imported — check Review', 'ok'); }}
        />
      )}
    </div>
  );
}
