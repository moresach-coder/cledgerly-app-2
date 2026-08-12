'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import CardStack from '@/components/CardStack';
import Amount from '@/components/Amount';
import BrandBadge from '@/components/BrandBadge';
import { accountKind } from '@/lib/cardMeta';
import type { AccountListItem } from '@/lib/repo';

export default function CardsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/accounts');
    setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalThisMonth = accounts.reduce((s, a) => s + a.monthSpend, 0);
  const goTo = (account: string) => router.push(`/cards/${encodeURIComponent(account)}`);

  return (
    <div className="min-h-screen bg-credbg text-credink px-5 pt-5 pb-8">
      <AppHeader
        title="Cards"
        subtitle={`${accounts.length} account${accounts.length === 1 ? '' : 's'} · this month`}
      />

      {loading ? null : accounts.length === 0 ? (
        <div className="text-center py-16 text-credmuted text-sm">
          <div className="text-lg font-semibold text-credink mb-2">No cards yet</div>
          Import a statement from the Review tab and it will show up here.
        </div>
      ) : (
        <>
          <div className="mt-1">
            <CardStack accounts={accounts} onSelect={goTo} />
          </div>

          <div className="text-small uppercase tracking-[0.12em] font-bold text-credmuted mb-3 mt-6">
            All Accounts
          </div>
          <div className="space-y-2">
            {accounts.map((a) => {
              const kind = accountKind(a.account);
              return (
                <div
                  key={a.account}
                  onClick={() => goTo(a.account)}
                  className="flex items-center gap-3 bg-credsurface border border-credline rounded-xl px-3.5 py-3 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <BrandBadge account={a.account} />
                  <div className="flex-1 min-w-0">
                    <div className="text-body font-medium text-credink truncate">{a.account}</div>
                    <div className="text-caption text-credmuted mt-0.5">
                      {kind === 'credit_card' ? 'Credit card' : 'Bank account'} &middot; {a.txnCount} txns
                    </div>
                  </div>
                  <div className="text-credink"><Amount value={a.monthSpend} size="sm" /></div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
