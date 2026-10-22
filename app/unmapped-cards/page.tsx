'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function UnmappedCardsPage() {
  const [status, setStatus] = useState<any>(null);
  const [newAccounts, setNewAccounts] = useState<Record<string, string>>({});
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch('/api/email/status');
    setStatus(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function mapCard(last4: string, institution: string, accountName: string) {
    const res = await fetch('/api/email/cardmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last4, institution, account: accountName }),
    });
    if (res.ok) {
      toast(`Mapped ${institution} ${last4} → ${accountName}`, 'ok');
      load();
    } else {
      toast('Error mapping card', 'err');
    }
  }

  if (!status) return <div className="min-h-screen bg-credbg px-5 pt-5" />;

  const blocked = (status.blocked ?? []).filter((b: any) => b.status === 'needs_mapping');
  const knownAccounts: string[] = status.knownAccounts ?? [];

  return (
    <div className="min-h-screen bg-credbg text-credink px-5 pt-5 pb-8">
      <Link href="/settings" className="text-small text-credmuted font-semibold">&larr; Settings</Link>
      <h1 className="text-display font-extrabold tracking-[-0.02em] mt-2">Unmapped Cards</h1>
      <p className="text-small text-credmuted mt-1 mb-5">
        Credit card and bank emails without a matching account. Map them or create new accounts.
      </p>

      {blocked.length === 0 ? (
        <div className="bg-pos/10 border border-pos/25 rounded-xl p-4 mb-6">
          <div className="text-body font-bold text-pos">All set!</div>
          <p className="text-caption text-credmuted mt-1">No unmapped cards right now. Sync your email to discover new ones.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {blocked.map((b: any) => {
            const [institution, last4] = String(b.detail).split(' ');
            const key = `${institution}-${last4}`;
            return (
              <div key={b.id} className="bg-credsurface border border-credline rounded-xl p-4">
                <div className="mb-3">
                  <div className="text-small font-semibold">{b.subject || b.from_addr}</div>
                  <div className="text-caption text-credmuted mt-0.5">
                    {institution?.toUpperCase()} {last4 ? `· card ending ${last4}` : ''}
                  </div>
                </div>
                <div className="space-y-2">
                  {knownAccounts.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && mapCard(last4 || '0000', institution || 'unknown', e.target.value)}
                      className="w-full bg-credbg border border-credline rounded-lg px-3 py-2.5 text-sm text-credink"
                    >
                      <option value="">Assign to existing account…</option>
                      {knownAccounts.map((a: string) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  )}
                  {creatingFor === key ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`e.g. ${institution?.toUpperCase()} Credit Card`}
                        value={newAccounts[key] || ''}
                        onChange={(e) => setNewAccounts({ ...newAccounts, [key]: e.target.value })}
                        className="flex-1 bg-credbg border border-credline rounded-lg px-3 py-2.5 text-sm text-credink"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (newAccounts[key]?.trim()) {
                            mapCard(last4 || '0000', institution || 'unknown', newAccounts[key].trim());
                            setCreatingFor(null);
                          }
                        }}
                        disabled={!newAccounts[key]?.trim()}
                        className="px-4 py-2.5 rounded-lg bg-credink text-white text-small font-bold disabled:opacity-40"
                      >
                        Create
                      </button>
                      <button onClick={() => setCreatingFor(null)} className="px-3 py-2.5 rounded-lg text-credmuted text-small font-bold">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreatingFor(key)}
                      className="w-full py-2.5 rounded-lg border border-credink text-credink text-small font-bold"
                    >
                      + Create New Account
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
