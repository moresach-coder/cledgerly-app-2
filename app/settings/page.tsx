'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/components/ThemeProvider';
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

const inputCls = 'w-full bg-credbg border border-credline rounded-lg px-3 py-2.5 text-sm text-credink';

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-caption uppercase tracking-[0.1em] text-credmuted font-bold mb-1.5">{children}</label>;
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-8">
      <div className="bg-credsurface border border-credline rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <p className="text-body text-credink leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-credbg border border-credline text-small font-bold text-credink">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-neg text-white text-small font-bold">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const toast = useToast();

  // null = loading, so we can avoid flicker on the connect form
  const [status, setStatus] = useState<any>(null);
  const [savedPasswords, setSavedPasswords] = useState<any[]>([]);
  const [cardMap, setCardMap] = useState<any[]>([]);
  const [accountStats, setAccountStats] = useState<any[]>([]);

  const [email, setEmail] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('993');
  const [appPassword, setAppPassword] = useState('');
  const [showConnect, setShowConnect] = useState(false);

  const [busy, setBusy] = useState('');
  const [syncResult, setSyncResult] = useState<any>(null);
  const [lookbackDays, setLookbackDays] = useState('120');

  const [stmtPasswords, setStmtPasswords] = useState<Record<string, string>>({});
  const [savingPwd, setSavingPwd] = useState<string | null>(null);
  const [updatingPwd, setUpdatingPwd] = useState<Set<string>>(new Set());

  // One state for the single open "create account" row — keyed by unique card key
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');

  const [importing, setImporting] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const load = useCallback(async () => {
    const [emailRes, accRes, pwdRes] = await Promise.all([
      fetch('/api/email/status'),
      fetch('/api/accounts/rename'),
      fetch('/api/email/passwords'),
    ]);
    const emailData = await emailRes.json();
    const accData = await accRes.json();
    const pwdData = await pwdRes.json();
    setStatus(emailData);
    setCardMap(emailData.cardMap ?? []);
    setAccountStats(accData.accounts ?? []);
    setSavedPasswords(pwdData.institutions ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  function onEmailChange(v: string) {
    setEmail(v);
    const domain = v.split('@')[1]?.toLowerCase();
    if (domain && PRESETS[domain]) { setHost(PRESETS[domain].host); setPort(String(PRESETS[domain].port)); }
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
      if (!res.ok) { toast(data.error, 'err'); return; }
      toast(`Connected ${email}`, 'ok');
      setAppPassword(''); setEmail(''); setHost(''); setShowConnect(false);
      load();
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

  async function saveStatementPassword(institution: string) {
    const pwd = stmtPasswords[institution];
    if (!pwd) return;
    setSavingPwd(institution);
    try {
      const res = await fetch('/api/email/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution, password: pwd, hint: '' }),
      });
      if (res.ok) {
        toast(`Password saved for ${institution.toUpperCase()}`, 'ok');
        setStmtPasswords(p => { const n = { ...p }; delete n[institution]; return n; });
        setUpdatingPwd(s => { const n = new Set(s); n.delete(institution); return n; });
        load();
      } else {
        const d = await res.json();
        toast(d.error || 'Error saving password', 'err');
      }
    } finally { setSavingPwd(null); }
  }

  async function createCardAccount(institution: string, last4: string) {
    if (!newAccountName.trim()) return;
    const res = await fetch('/api/email/cardmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last4, institution, account: newAccountName.trim() }),
    });
    if (res.ok) {
      toast(`"${newAccountName.trim()}" created`, 'ok');
      setCreatingFor(null); setNewAccountName('');
      load();
    } else {
      toast('Error creating account', 'err');
    }
  }

  const accounts = status?.accounts ?? [];
  const blocked = status?.blocked ?? [];
  const needsPassword = blocked.filter((b: any) => b.status === 'needs_password');
  const needsMapping = blocked.filter((b: any) => b.status === 'needs_mapping');

  // Deduplicate locked statements by institution
  const lockedInstitutions = new Map<string, any>();
  for (const b of needsPassword) {
    const inst = (b.detail || '').split(':')[0].trim().toLowerCase();
    if (!lockedInstitutions.has(inst)) lockedInstitutions.set(inst, b);
  }

  // Deduplicate sync result needs-mapping by unique key — prevents duplicate textboxes
  const syncCards: Array<{ inst: string; last4: string; key: string }> = [];
  if (syncResult?.needsMapping) {
    const seen = new Set<string>();
    for (const mapping of syncResult.needsMapping as string[]) {
      const parts = mapping.trim().split(/\s+/).filter(Boolean);
      const inst = parts[0] ?? 'unknown';
      const last4 = parts[1] ?? '';
      const key = `${inst}-${last4}`;
      if (!seen.has(key)) { seen.add(key); syncCards.push({ inst, last4, key }); }
    }
  }

  // Only show the connect form once data is loaded (avoids flash)
  const loaded = status !== null;
  const hasAccounts = accounts.length > 0;
  const showConnectForm = loaded && (!hasAccounts || showConnect);

  return (
    <div className="min-h-screen bg-credbg text-credink px-5 pt-5 pb-12">
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header with theme toggle */}
      <div className="flex items-center justify-between mb-2">
        <Link href="/" className="text-small text-credmuted font-semibold">&larr; Back</Link>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-credsurface border border-credline text-caption font-semibold text-credmuted pressable"
        >
          {theme === 'dark' ? '☀ Light' : '◐ Dark'}
        </button>
      </div>
      <h1 className="text-display font-extrabold tracking-[-0.02em] mt-1">Settings</h1>
      <p className="text-small text-credmuted mt-1 mb-6">Sync, passwords and accounts</p>

      {/* ── Import ────────────────────────────────────────── */}
      <div className="text-micro uppercase tracking-[0.12em] font-bold text-credmuted mb-2">Import</div>
      <button
        onClick={() => setImporting(true)}
        className="w-full flex items-center gap-3 bg-credsurface border border-credline rounded-xl px-4 py-3.5 mb-6 pressable"
      >
        <span className="w-9 h-9 rounded-lg bg-accentsoft flex items-center justify-center text-accent flex-none">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </span>
        <div className="text-left flex-1 min-w-0">
          <div className="text-body font-bold">Import Statement</div>
          <div className="text-caption text-credmuted">Excel, CSV or PDF — password-protected supported</div>
        </div>
        <span className="text-credmuted opacity-30 text-lg">›</span>
      </button>

      {/* ── Mailbox ───────────────────────────────────────── */}
      <div className="text-micro uppercase tracking-[0.12em] font-bold text-credmuted mb-2">Mailbox</div>

      {/* Skeleton while loading — prevents form flash */}
      {!loaded && (
        <div className="bg-credsurface border border-credline rounded-xl px-4 py-4 mb-6 space-y-2 animate-pulse">
          <div className="h-3 bg-credline rounded w-32" />
          <div className="h-3 bg-credline rounded w-48" />
        </div>
      )}

      {/* Connected mailboxes */}
      {hasAccounts && (
        <div className="space-y-2 mb-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="bg-credsurface border border-credline rounded-xl px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-pos flex-none mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-body font-bold truncate">{a.email}</div>
                  <div className="text-caption text-credmuted mt-0.5">
                    {a.lastSyncAt
                      ? `Synced ${new Date(a.lastSyncAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : 'Never synced'}
                  </div>
                </div>
                <button
                  onClick={() => setConfirm({
                    message: `Disconnect ${a.email}? The mailbox connection is removed but imported data is kept.`,
                    onConfirm: async () => {
                      await fetch('/api/email/accounts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, email: a.email }) });
                      toast(`Disconnected ${a.email}`, 'ok');
                      load();
                    },
                  })}
                  className="text-caption font-bold text-neg flex-none"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasAccounts && !showConnect && (
        <button onClick={() => setShowConnect(true)} className="text-small font-bold text-credmuted underline underline-offset-2 mb-5 block">
          + Add another mailbox
        </button>
      )}

      {/* Connect form — only rendered once loaded, only shown when needed */}
      {showConnectForm && (
        <div className="bg-credsurface border border-credline rounded-xl p-4 mb-6">
          <div className="mb-3">
            <Label>Email address</Label>
            <input value={email} onChange={e => onEmailChange(e.target.value)} placeholder="you@gmail.com" className={inputCls} />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <Label>IMAP host</Label>
              <input value={host} onChange={e => setHost(e.target.value)} placeholder="imap.gmail.com" className={inputCls} />
            </div>
            <div className="w-24">
              <Label>Port</Label>
              <input value={port} onChange={e => setPort(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="mb-3">
            <Label>App password</Label>
            <input type="password" value={appPassword} onChange={e => setAppPassword(e.target.value)} placeholder="16-character app password" className={inputCls} autoComplete="off" />
            <p className="text-caption text-credmuted mt-1.5 leading-relaxed">Generate an app-specific password — not your login password. Stored in macOS Keychain only.</p>
          </div>
          <div className="flex gap-2">
            {showConnect && hasAccounts && (
              <button onClick={() => setShowConnect(false)} className="px-4 py-2.5 rounded-lg border border-credline text-small font-bold text-credmuted">Cancel</button>
            )}
            <button
              onClick={connect}
              disabled={busy === 'connect' || !email || !host || !appPassword}
              className="flex-1 py-2.5 rounded-lg bg-credink text-white text-small font-bold disabled:opacity-40"
            >
              {busy === 'connect' ? 'Verifying…' : 'Connect Mailbox'}
            </button>
          </div>
        </div>
      )}

      {/* ── Sync ──────────────────────────────────────────── */}
      {loaded && hasAccounts && (
        <>
          <div className="text-micro uppercase tracking-[0.12em] font-bold text-credmuted mb-2 mt-2">Sync</div>
          <div className="bg-credsurface border border-credline rounded-xl p-3.5 mb-3">
            <Label>How far back to look</Label>
            <select value={lookbackDays} onChange={e => setLookbackDays(e.target.value)} className={inputCls}>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="120">Last 4 months</option>
              <option value="365">Last year</option>
              <option value="1095">Last 3 years</option>
            </select>
            <p className="text-micro text-credmuted mt-1.5 leading-relaxed">Ledgerly deduplicates automatically — re-scanning is safe.</p>
          </div>
          <button
            onClick={sync}
            disabled={busy === 'sync'}
            className="w-full py-3 rounded-xl bg-credink text-white text-body font-bold disabled:opacity-40 pressable mb-3"
          >
            {busy === 'sync' ? 'Checking your mail…' : 'Sync Now'}
          </button>
        </>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className="bg-credsurface border border-credline rounded-xl p-4 mb-4 text-small space-y-1.5">
          <div className="font-bold text-credink">{syncResult.scanned ?? 0} messages scanned</div>
          {syncResult.alertsImported > 0 && <div className="text-pos">✓ {syncResult.alertsImported} transaction alerts imported</div>}
          {syncResult.statementsImported > 0 && <div className="text-pos">✓ {syncResult.statementsImported} statements · {syncResult.statementTxns} transactions</div>}
          {syncResult.superseded > 0 && <div className="text-credmuted">{syncResult.superseded} duplicate alerts merged</div>}
          {syncResult.failed > 0 && <div className="text-neg">{syncResult.failed} failed</div>}

          {syncCards.length > 0 && (
            <div className="pt-2 border-t border-credline space-y-3">
              <div className="font-bold text-warn">New cards found — name them to import statements:</div>
              {syncCards.map(({ inst, last4, key }) => (
                <div key={key} className="bg-warn/5 border border-warn/20 rounded-lg p-3">
                  <div className="text-caption text-credmuted mb-2">
                    <span className="font-bold uppercase text-credink">{inst}</span>
                    {last4 && last4 !== '0000' && <span> · ···· {last4}</span>}
                  </div>
                  {creatingFor === key ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder={`e.g. ${inst.toUpperCase()} Credit Card`}
                        value={newAccountName}
                        onChange={e => setNewAccountName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createCardAccount(inst, last4 || '0000')}
                        className="flex-1 bg-credbg border border-credline rounded-lg px-2.5 py-1.5 text-sm text-credink"
                        autoFocus
                      />
                      <button onClick={() => createCardAccount(inst, last4 || '0000')} disabled={!newAccountName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-pos text-white text-xs font-bold disabled:opacity-40">Save</button>
                      <button onClick={() => setCreatingFor(null)} className="px-2 py-1.5 rounded-lg text-credmuted text-xs">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setCreatingFor(key); setNewAccountName(''); }}
                      className="px-3 py-1.5 rounded-lg bg-credink text-white text-xs font-bold"
                    >
                      + Create Account
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {syncResult.needsPassword?.length > 0 && (
            <div className="pt-2 border-t border-credline">
              <div className="text-warn">🔒 Locked PDFs from: {(syncResult.needsPassword as string[]).join(', ')} — enter password below</div>
            </div>
          )}
        </div>
      )}

      {/* ── Locked statements ─────────────────────────────── */}
      {lockedInstitutions.size > 0 && (
        <>
          <div className="text-micro uppercase tracking-[0.12em] font-bold text-credmuted mb-2 mt-4">Locked Statements</div>
          <p className="text-caption text-credmuted mb-3 leading-relaxed">
            Your bank's PDF password — saved once and applied automatically to all future statements.
          </p>
          <div className="space-y-3 mb-6">
            {[...lockedInstitutions.entries()].map(([inst, b]) => {
              const stored = savedPasswords.find(p => p.institution === inst);
              return (
                <div key={inst} className="bg-credsurface border border-warn/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-small font-bold uppercase tracking-wide">{inst}</span>
                    {stored && <span className="text-caption text-pos font-semibold">Stored ✓</span>}
                  </div>
                  <div className="text-caption text-credmuted mb-3 truncate">{b.from_addr}</div>
                  {stored && !updatingPwd.has(inst) ? (
                    <button
                      onClick={() => setUpdatingPwd(s => new Set([...s, inst]))}
                      className="text-caption text-credmuted underline underline-offset-2"
                    >
                      Update password
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Statement PDF password"
                        value={stmtPasswords[inst] || ''}
                        onChange={e => setStmtPasswords(p => ({ ...p, [inst]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && saveStatementPassword(inst)}
                        className="flex-1 bg-credbg border border-credline rounded-lg px-3 py-2 text-sm text-credink"
                        autoComplete="off"
                      />
                      <button
                        onClick={() => saveStatementPassword(inst)}
                        disabled={!stmtPasswords[inst] || savingPwd === inst}
                        className="px-4 py-2 rounded-lg bg-credink text-white text-small font-bold disabled:opacity-40"
                      >
                        {savingPwd === inst ? '…' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Saved passwords ───────────────────────────────── */}
      {savedPasswords.length > 0 && (
        <div className="bg-credsurface border border-credline rounded-xl p-4 mb-6">
          <div className="text-micro uppercase tracking-[0.12em] font-bold text-credmuted mb-2">Saved Passwords</div>
          <div className="space-y-2">
            {savedPasswords.map((p: any) => (
              <div key={p.institution} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pos flex-none" />
                  <span className="text-small font-semibold uppercase">{p.institution}</span>
                </div>
                <span className="text-caption text-pos">Stored ✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Credit card accounts (card_map) ───────────────── */}
      {cardMap.length > 0 && (
        <>
          <div className="text-micro uppercase tracking-[0.12em] font-bold text-credmuted mb-2 mt-2">Credit Card Accounts</div>
          <p className="text-caption text-credmuted mb-3 leading-relaxed">Cards mapped from your email. Transactions appear here after the next sync.</p>
          <div className="space-y-2 mb-6">
            {cardMap.map((c: any) => (
              <div key={`${c.institution}-${c.last4}`} className="bg-credsurface border border-credline rounded-xl px-3.5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accentsoft flex items-center justify-center flex-none">
                  <span className="text-xs font-bold text-accent uppercase">{(c.institution ?? '?')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body font-semibold truncate">{c.account}</div>
                  <div className="text-caption text-credmuted mt-0.5">
                    {c.institution?.toUpperCase()}{c.last4 && c.last4 !== '0000' ? ` · ···· ${c.last4}` : ''}
                  </div>
                </div>
                <span className="text-caption text-pos font-semibold flex-none">Mapped ✓</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Unmapped cards link ───────────────────────────── */}
      {needsMapping.length > 0 && (
        <Link href="/unmapped-cards" className="flex items-center justify-between bg-warn/8 border border-warn/25 rounded-xl px-4 py-3.5 mb-6 pressable">
          <div>
            <div className="text-body font-bold text-warn">Unmapped Cards</div>
            <div className="text-caption text-credmuted">{needsMapping.length} card{needsMapping.length !== 1 ? 's' : ''} waiting for an account</div>
          </div>
          <span className="text-warn opacity-40 text-lg">›</span>
        </Link>
      )}

      {/* ── Your data ─────────────────────────────────────── */}
      <div className="text-micro uppercase tracking-[0.12em] font-bold text-credmuted mb-2 mt-2">Your Data</div>
      <Link href="/imports" className="flex items-center justify-between bg-credsurface border border-credline rounded-xl px-4 py-3.5 mb-6 pressable">
        <div>
          <div className="text-body font-bold">What&apos;s Imported</div>
          <div className="text-caption text-credmuted">
            {accountStats.length} account{accountStats.length !== 1 ? 's' : ''} · statements and transactions
          </div>
        </div>
        <span className="text-credmuted opacity-30 text-lg">›</span>
      </Link>

      {/* ── Accounts with rename ──────────────────────────── */}
      {accountStats.length > 0 && (
        <>
          <div className="text-micro uppercase tracking-[0.12em] font-bold text-credmuted mb-2">Accounts</div>
          <p className="text-caption text-credmuted mb-3 leading-relaxed">Rename or merge accounts by typing an existing name.</p>
          <div className="space-y-2 mb-6">
            {accountStats.map((a: any) => (
              <div key={a.account} className="bg-credsurface border border-credline rounded-xl px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-body font-semibold truncate">{a.account}</div>
                    <div className="text-caption text-credmuted mt-0.5">{a.n} txn{a.n !== 1 ? 's' : ''} · {a.first ?? '?'} → {a.last ?? '?'}</div>
                  </div>
                  <button
                    onClick={() => { setRenaming(renaming === a.account ? null : a.account); setRenameTo(''); }}
                    className="text-caption font-bold text-credmuted underline underline-offset-2 flex-none"
                  >
                    {renaming === a.account ? 'Close' : 'Rename'}
                  </button>
                </div>
                {renaming === a.account && (
                  <div className="mt-3 space-y-2">
                    <input value={renameTo} onChange={e => setRenameTo(e.target.value)}
                      placeholder="New name — enter existing to merge" className={inputCls} autoFocus />
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/accounts/rename', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ from: a.account, to: renameTo.trim() }),
                        });
                        const d = await res.json();
                        toast(res.ok ? `Moved ${d.moved} transactions to "${renameTo.trim()}"` : d.error, res.ok ? 'ok' : 'err');
                        setRenaming(null); setRenameTo(''); load();
                      }}
                      disabled={!renameTo.trim() || renameTo.trim() === a.account}
                      className="w-full py-2.5 rounded-lg bg-credink text-white text-small font-bold disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); toast('Statement imported', 'ok'); load(); }}
        />
      )}
    </div>
  );
}
