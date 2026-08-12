'use client';
import { useRef, useState } from 'react';
import Sheet, { SheetActions } from './Sheet';
import Amount from './Amount';
import { typeInfo, catInfo } from '@/lib/reference';

interface PreviewLine {
  date: string | null;
  merchant: string;
  amount: number;
  direction: 'debit' | 'credit';
  type: string;
  category: string | null;
  confidence: string;
}

interface Preview {
  lines: PreviewLine[];
  parsedTotal: number;
  categorizedCount?: number;
  total?: number;
}

const INSTITUTIONS = ['icici', 'hdfc', 'axis', 'amex', 'sbi', 'kotak', 'amazonpay', 'idfc', 'yesbank', 'indusind'];

export default function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');
  const [account, setAccount] = useState('');
  const [accountKnown, setAccountKnown] = useState(false);
  const [detected, setDetected] = useState<{ issuer: string | null; last4: string | null } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [editingAccount, setEditingAccount] = useState(false);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [imported, setImported] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [rememberFor, setRememberFor] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File, password?: string) {
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (password) fd.append('password', password);
      if (password && rememberFor.trim()) fd.append('rememberFor', rememberFor.trim());

      const res = await fetch('/api/import/file', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.needsPassword) {
        setPendingFile(file);
        setError(data.error);
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Could not read that file');
        return;
      }

      setPendingFile(null);
      setPdfPassword('');
      setText(data.text);
      setFileName(data.fileName);
      setSuggestions(data.suggestions || []);
      setDetected({ issuer: data.detectedIssuer, last4: data.detectedLast4 });
      setAccountKnown(!!data.accountKnown);
      setAccount(data.account || '');
      setEditingAccount(!data.account);
    } catch {
      setError('Could not read that file');
    } finally {
      setBusy(false);
    }
  }

  async function parse() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: account.trim() || 'Unspecified account', text, declared: null, mode: 'preview' }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
        setStep('review');
      } else setError(data.error || 'Could not parse that statement');
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: account.trim() || 'Unspecified account', text, declared: null }),
      });
      if (res.ok) {
        setImported(preview?.lines.length ?? 0);
        setStep('done');
      } else {
        setError('Import failed. Nothing was saved.');
      }
    } finally {
      setBusy(false);
    }
  }

  const rowCount = text.split('\n').filter((l) => l.trim()).length;
  const inputCls = 'w-full bg-credbg border border-credline rounded-lg px-3 py-2.5 text-sm text-credink';

  // ------------------------------------------------------------------ done
  if (step === 'done') {
    return (
      <Sheet
        onClose={onImported}
        header={<div className="text-center pt-1 text-title font-extrabold tracking-[-0.01em]">Statement Imported</div>}
        footer={
          <div className="flex gap-2.5">
            <button
              onClick={() => {
                setStep('upload'); setText(''); setFileName(''); setPreview(null);
                setAccount(''); setDetected(null); setError('');
              }}
              className="flex-1 py-3.5 rounded-xl text-body font-bold bg-credsurface border border-credline text-credink"
            >
              Import Another
            </button>
            <button
              onClick={onImported}
              className="flex-1 py-3.5 rounded-xl text-body font-bold bg-credink text-white"
            >
              Go to Review
            </button>
          </div>
        }
      >
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-full bg-pos/15 text-pos flex items-center justify-center text-heading mx-auto mb-4">
            ✓
          </div>
          <div className="text-body font-bold">{imported} transactions added</div>
          <div className="text-small text-credmuted mt-1.5 leading-relaxed px-4">
            From <strong className="text-credink">{fileName}</strong> into{' '}
            <strong className="text-credink">{account}</strong>.
          </div>
          <div className="text-small text-credmuted mt-4 bg-credbg border border-credline rounded-xl px-4 py-3 text-left leading-relaxed">
            They are waiting in <strong className="text-credink">Review</strong> and are not counted as confirmed
            spending until you check them.
          </div>
        </div>
      </Sheet>
    );
  }

  // ---------------------------------------------------------------- review
  if (step === 'review' && preview) {
    return (
      <Sheet
        onClose={onClose}
        header={
          <div className="text-center pt-1">
            <div className="text-credink"><Amount value={preview.parsedTotal} size="lg" /></div>
            <div className="text-small font-bold mt-1">{preview.lines.length} transactions</div>
            <div className="text-caption text-credmuted mt-0.5 truncate">{account}</div>
          </div>
        }
        footer={
          <SheetActions
            cancelLabel="Back"
            confirmLabel={busy ? 'Importing…' : `Import ${preview.lines.length}`}
            onCancel={() => setStep('upload')}
            onConfirm={commit}
            disabled={busy}
          />
        }
      >
        <div className="flex gap-2.5 mb-4">
          <div className="flex-1 bg-credbg border border-credline rounded-xl px-3.5 py-3">
            <div className="text-heading font-bold text-pos leading-none">{preview.categorizedCount ?? 0}</div>
            <div className="text-caption text-credmuted mt-1.5">Auto-categorised</div>
          </div>
          <div className="flex-1 bg-credbg border border-credline rounded-xl px-3.5 py-3">
            <div className="text-heading font-bold leading-none">
              {(preview.total ?? 0) - (preview.categorizedCount ?? 0)}
            </div>
            <div className="text-caption text-credmuted mt-1.5">Need a category</div>
          </div>
        </div>

        <div className="space-y-2">
          {preview.lines.slice(0, 40).map((t, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-credbg border border-credline rounded-xl px-3.5 py-2.5">
              <span className="w-2 h-2 rounded-full flex-none" style={{ background: t.category ? '#1FAA59' : '#C9CBD1' }} />
              <div className="flex-1 min-w-0">
                <div className="text-body font-medium truncate">{t.merchant}</div>
                <div className="text-caption text-credmuted mt-0.5 truncate">
                  {t.date || 'no date'} · {typeInfo(t.type).label}
                  {t.category ? ' / ' + catInfo(t.category).label : ''}
                </div>
              </div>
              <Amount value={t.amount} size="sm" sign={t.direction === 'credit'} />
            </div>
          ))}
          {preview.lines.length > 40 && (
            <p className="text-caption text-credmuted text-center py-2">
              and {preview.lines.length - 40} more
            </p>
          )}
        </div>
      </Sheet>
    );
  }

  // ---------------------------------------------------------------- upload
  return (
    <Sheet
      onClose={onClose}
      header={
        <div className="pt-1">
          <h2 className="text-title font-extrabold tracking-[-0.01em]">Import Statement</h2>
          <p className="text-small text-credmuted mt-0.5">Excel, CSV or PDF — one file at a time.</p>
        </div>
      }
      footer={
        <SheetActions
          confirmLabel={busy ? 'Reading…' : 'Continue'}
          onCancel={onClose}
          onConfirm={parse}
          disabled={busy || !text.trim()}
        />
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.xlsm,.csv,.pdf,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="w-full border-2 border-dashed border-credline rounded-2xl py-7 px-4 text-center hover:border-credink/30 transition-colors disabled:opacity-50"
      >
        <div className="text-heading mb-1.5">⬆</div>
        <div className="text-body font-bold">
          {busy ? 'Reading file…' : text ? 'Choose a different file' : 'Choose statement file'}
        </div>
        <div className="text-caption text-credmuted mt-1">Excel (.xlsx, .xls), CSV or PDF</div>
      </button>

      {error && (
        <div
          className={`text-caption p-2.5 rounded-lg flex gap-2 items-start mt-3 ${
            pendingFile ? 'bg-warn/10 text-warn' : 'bg-neg/10 text-neg'
          }`}
        >
          <span>{pendingFile ? '🔒' : '⚠'}</span>
          <span>{error}</span>
        </div>
      )}

      {pendingFile && (
        <div className="mt-3 bg-credbg border border-credline rounded-xl p-3.5">
          <label className="block text-caption uppercase tracking-[0.1em] text-credmuted font-bold mb-1.5">
            Statement password
          </label>
          <input
            type="password"
            value={pdfPassword}
            autoComplete="off"
            onChange={(e) => setPdfPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && pdfPassword) handleFile(pendingFile, pdfPassword); }}
            placeholder="The password your bank uses"
            className={inputCls}
          />
          <label className="block text-caption uppercase tracking-[0.1em] text-credmuted font-bold mt-3 mb-1.5">
            Remember it for
          </label>
          <select value={rememberFor} onChange={(e) => setRememberFor(e.target.value)} className={inputCls}>
            <option value="">Don&apos;t save it</option>
            {INSTITUTIONS.map((i) => <option key={i} value={i}>{i.toUpperCase()}</option>)}
          </select>
          <p className="text-micro text-credmuted mt-1.5 leading-relaxed">
            Saved to your macOS Keychain and reused for that bank&apos;s future statements. Only stored once it
            actually opens the file.
          </p>
          <button
            onClick={() => handleFile(pendingFile, pdfPassword)}
            disabled={busy || !pdfPassword}
            className="w-full mt-3 py-2.5 rounded-lg bg-credink text-white text-small font-bold disabled:opacity-40"
          >
            {busy ? 'Unlocking…' : 'Unlock Statement'}
          </button>
        </div>
      )}

      {text && !error && (
        <>
          <div className="text-caption p-2.5 rounded-lg flex gap-2 items-start bg-pos/10 text-pos mt-3">
            <span>✓</span>
            <span>Read <strong>{fileName}</strong> — {rowCount} rows found.</span>
          </div>

          {/* Account is inferred from the statement's own header; editing is available but
              not required, so the common case needs no typing at all. */}
          <div className="mt-3 bg-credbg border border-credline rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-caption uppercase tracking-[0.1em] text-credmuted font-bold">Account</div>
                <div className="text-body font-bold mt-1 truncate">{account || 'Not recognised'}</div>
                <div className="text-caption text-credmuted mt-0.5">
                  {accountKnown
                    ? 'Matched to an account you already have'
                    : detected?.issuer
                      ? `Detected ${detected.issuer}${detected.last4 ? ` ending ${detected.last4}` : ''} — new account`
                      : 'Could not detect it from the file — set it below'}
                </div>
              </div>
              <button
                onClick={() => setEditingAccount((v) => !v)}
                className="text-caption font-bold text-credink underline underline-offset-2 flex-none"
              >
                {editingAccount ? 'Done' : 'Change'}
              </button>
            </div>

            {editingAccount && (
              <div className="mt-3">
                <input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="e.g. Amex Platinum"
                  className={inputCls}
                  list="known-accounts"
                />
                <datalist id="known-accounts">
                  {suggestions.map((s) => <option key={s} value={s} />)}
                </datalist>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setAccount(s); setAccountKnown(true); setEditingAccount(false); }}
                        className="px-2.5 py-1 rounded-full border border-credline bg-credsurface text-caption text-credmuted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => setShowPaste((s) => !s)}
        className="text-caption text-credmuted font-semibold mt-4 underline underline-offset-2"
      >
        {showPaste ? 'Hide manual paste' : 'Or paste rows manually'}
      </button>

      {showPaste && (
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setFileName(''); }}
          placeholder={'02/08/2026, SWIGGY BANGALORE, 348.00'}
          className="w-full bg-credbg border border-credline rounded-lg px-3 py-2.5 text-small font-mono min-h-[110px] mt-2"
        />
      )}
    </Sheet>
  );
}
