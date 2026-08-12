'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandBadge from '@/components/BrandBadge';
import Amount from '@/components/Amount';
import { friendlyDate } from '@/lib/reference';

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'warn' | 'pos' }) {
  return (
    <div className="flex-1 bg-credsurface border border-credline rounded-xl px-3.5 py-3 min-w-0">
      <div className={`text-title font-extrabold leading-none ${tone === 'warn' ? 'text-warn' : tone === 'pos' ? 'text-pos' : 'text-credink'}`}>
        {value}
      </div>
      <div className="text-micro uppercase tracking-[0.08em] text-credmuted font-bold mt-1.5">{label}</div>
    </div>
  );
}

export default function ImportsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    setData(await (await fetch('/api/imports')).json());
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="min-h-screen bg-credbg px-5 pt-5" />;

  const totalTxns = data.accounts.reduce((s: number, a: any) => s + a.total, 0);
  const totalFiles = data.accounts.reduce((s: number, a: any) => s + a.statementFiles, 0);
  const locked = data.lockedStatements.reduce((s: number, x: any) => s + x.count, 0);
  const unmapped = data.unrecognisedSenders.reduce((s: number, x: any) => s + x.count, 0);

  return (
    <div className="min-h-screen bg-credbg text-credink px-5 pt-5 pb-8">
      <Link href="/settings" className="text-small text-credmuted font-semibold">&larr; Settings</Link>
      <h1 className="text-display font-extrabold tracking-[-0.02em] mt-2">What&apos;s Imported</h1>
      <p className="text-small text-credmuted mt-1 mb-5">
        {totalTxns} transactions from {totalFiles} statement file{totalFiles === 1 ? '' : 's'} and{' '}
        {data.mailScanned} scanned emails
      </p>

      <div className="flex gap-2.5 mb-6">
        <Stat label="Accounts" value={data.accounts.length} />
        <Stat label="Locked" value={locked} tone={locked ? 'warn' : undefined} />
        <Stat label="Unrecognised" value={unmapped} tone={unmapped ? 'warn' : undefined} />
      </div>

      {/* ------------------------------------------------------- per account */}
      <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3">By Account</div>
      <div className="space-y-2 mb-6">
        {data.accounts.map((a: any) => (
          <div
            key={a.account}
            onClick={() => router.push(`/cards/${encodeURIComponent(a.account)}`)}
            className="bg-credsurface border border-credline rounded-xl p-3.5 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <BrandBadge account={a.account} />
              <div className="flex-1 min-w-0">
                <div className="text-body font-bold truncate">{a.account}</div>
                <div className="text-caption text-credmuted mt-0.5">
                  {a.firstDate ? `${friendlyDate(a.firstDate, true)} — ${friendlyDate(a.lastDate, true)}` : 'no dated rows'}
                </div>
              </div>
              <div className="text-right flex-none">
                <Amount value={a.outflow} size="sm" />
                <div className="text-micro text-credmuted mt-0.5">{a.total} rows</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2.5 text-micro">
              <span className="px-2 py-0.5 rounded-full bg-credbg border border-credline text-credmuted">
                {a.statementFiles} statement{a.statementFiles === 1 ? '' : 's'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-credbg border border-credline text-credmuted">
                {a.fromAlerts} from alerts
              </span>
              {a.confirmed > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-pos/12 text-pos font-semibold">{a.confirmed} confirmed</span>
              )}
              {a.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-warn/12 text-warn font-semibold">{a.pending} to check</span>
              )}
              {a.undated > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-neg/12 text-neg font-semibold">{a.undated} undated</span>
              )}
              {a.duplicates > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-credbg border border-credline text-credmuted">
                  {a.duplicates} duplicate
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------ statement list */}
      {data.statements.length > 0 && (
        <>
          <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-1.5">Statements</div>
          <p className="text-caption text-credmuted mb-3 leading-relaxed">
            Every statement file, newest billing period first.
          </p>
          <div className="space-y-2 mb-6">
            {data.statements.map((s: any) => (
              <div
                key={s.id}
                onClick={() => router.push(`/cards/${encodeURIComponent(s.account)}`)}
                className="bg-credsurface border border-credline rounded-xl px-3.5 py-3 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start gap-3">
                  <BrandBadge account={s.account} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-small font-bold truncate">
                      {s.periodFrom
                        ? `${friendlyDate(s.periodFrom, true)} — ${friendlyDate(s.periodTo, true)}`
                        : 'Period not stated'}
                    </div>
                    <div className="text-caption text-credmuted mt-0.5 truncate">{s.account}</div>
                  </div>
                  <div className="text-right flex-none">
                    <Amount value={s.debits} size="sm" />
                    <div className="text-micro text-credmuted mt-0.5">{s.rows} rows</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 text-micro text-credmuted">
                  {s.statementDate && (
                    <span className="px-2 py-0.5 rounded-full bg-credbg border border-credline">
                      Statement dated {friendlyDate(s.statementDate, true)}
                    </span>
                  )}
                  {s.credits > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-pos/12 text-pos font-semibold">
                      ₹{Math.round(s.credits).toLocaleString('en-IN')} credited
                    </span>
                  )}
                  {s.fileName && (
                    <span className="px-2 py-0.5 rounded-full bg-credbg border border-credline truncate max-w-[14rem]">
                      {s.fileName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------------------------------------------------- locked by bank */}
      {data.lockedStatements.length > 0 && (
        <>
          <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-1.5">
            Locked Statements
          </div>
          <p className="text-caption text-credmuted mb-3 leading-relaxed">
            {locked} statement{locked === 1 ? '' : 's'} arrived but could not be opened. Add the password in
            Settings and run Sync again — they are kept, not discarded.
          </p>
          <div className="space-y-2 mb-6">
            {data.lockedStatements.map((s: any) => (
              <div key={s.sender} className="bg-warn/8 border border-warn/25 rounded-xl px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-small font-bold truncate">{s.sender}</div>
                    <div className="text-caption text-credmuted mt-0.5 truncate">{s.subject}</div>
                  </div>
                  <span className="text-caption font-bold text-warn flex-none">{s.count}</span>
                </div>
                <div className="text-micro text-credmuted mt-1.5">{s.detail}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --------------------------------------------------- unknown senders */}
      {data.unrecognisedSenders.length > 0 && (
        <>
          <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-1.5">
            Unrecognised Senders
          </div>
          <p className="text-caption text-credmuted mb-3 leading-relaxed">
            {unmapped} email{unmapped === 1 ? '' : 's'} looked like statements but Ledgerly could not tell which
            account they belong to. Many are brokers and funds rather than cards, and can be ignored.
          </p>
          <div className="space-y-2">
            {data.unrecognisedSenders.slice(0, 20).map((s: any) => (
              <div key={s.sender} className="bg-credsurface border border-credline rounded-xl px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-small font-semibold truncate">{s.sender}</div>
                    <div className="text-micro text-credmuted mt-0.5 truncate">{s.subject}</div>
                  </div>
                  <span className="text-caption font-bold text-credmuted flex-none">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
