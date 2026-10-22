'use client';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GroupCard from '@/components/GroupCard';
import EditModal, { type EditResult } from '@/components/EditModal';
import SimilarModal, { type SimilarTxn } from '@/components/SimilarModal';
import { useToast } from '@/components/Toast';
import PeriodPicker from '@/components/PeriodPicker';
import { currentPeriod, parsePeriod, ALL_TIME, type Granularity } from '@/lib/period';
import type { Txn, TxnGroup } from '@/lib/repo';

const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';

const TABS = [
  { id: 'pending', label: 'Review' },
  { id: 'accepted', label: 'Confirmed' },
  { id: 'unknown', label: 'Unknown' },
  { id: 'duplicate', label: 'Duplicates' },
];

const SORT_OPTIONS = [
  { id: 'amount-desc', label: 'Highest Amount' },
  { id: 'amount-asc', label: 'Lowest Amount' },
  { id: 'count-desc', label: 'Most Transactions' },
  { id: 'name-asc', label: 'Merchant A–Z' },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]['id'];

function sortGroups(groups: TxnGroup[], sort: SortId): TxnGroup[] {
  const sorted = [...groups];
  switch (sort) {
    case 'amount-desc': return sorted.sort((a, b) => b.total - a.total);
    case 'amount-asc': return sorted.sort((a, b) => a.total - b.total);
    case 'count-desc': return sorted.sort((a, b) => b.count - a.count);
    case 'name-asc': return sorted.sort((a, b) => a.merchant.localeCompare(b.merchant));
  }
}

function Shell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-credline/20 rounded-[1.25rem] p-[1px] ${className}`}>
      <div className="bg-credsurface rounded-[calc(1.25rem-1px)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterAccount = searchParams.get('account');
  const filterPeriod = searchParams.get('period');
  const toast = useToast();

  const [groups, setGroups] = useState<TxnGroup[]>([]);
  const [counts, setCounts] = useState<any>({ total: 0, pending: 0, accepted: 0, unknown: 0, deferred: 0, duplicate: 0 });
  const [rowsByGroup, setRowsByGroup] = useState<Record<string, any[]>>({});
  const [tab, setTab] = useState('pending');
  const [editing, setEditing] = useState<{ txn: Txn; presetIds?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<{ txn: Txn; result: EditResult; items: SimilarTxn[] } | null>(null);
  const [sort, setSort] = useState<SortId>('amount-desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Period filter
  const [granularity, setGranularity] = useState<Granularity>('year');
  const [period, setPeriod] = useState(filterPeriod || 'all');
  const [months, setMonths] = useState<string[]>([]);

  // Account filter
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>(filterAccount || '');
  const [accountOpen, setAccountOpen] = useState(false);

  // Load accounts list once
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data.map((a: any) => a.account));
    })();
  }, []);

  // Load months for period picker
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/summary?period=all');
      const data = await res.json();
      setMonths(data.months ?? []);
    })();
  }, []);

  const load = useCallback(async (status: string) => {
    setReady(false);
    const p = parsePeriod(period);
    const isAll = p.id === ALL_TIME.id;
    const params = new URLSearchParams({ status });
    if (selectedAccount) params.set('account', selectedAccount);
    if (!isAll) {
      params.set('from', p.from);
      params.set('to', p.to);
    }

    const accountParam = selectedAccount ? `&account=${encodeURIComponent(selectedAccount)}` : '';
    const [gRes, cRes] = await Promise.all([
      fetch(`/api/transactions/groups?${params}`),
      fetch(`/api/transactions?status=all${accountParam}`),
    ]);
    const g = await gRes.json();
    const c = await cRes.json();
    setGroups(g.groups);
    setCounts(c.counts);
    setLoading(false);
    setTimeout(() => setReady(true), 80);
  }, [period, selectedAccount]);

  useEffect(() => { load(tab); }, [tab, load]);

  const sortedGroups = sortGroups(groups, sort);

  async function expand(g: TxnGroup) {
    if (rowsByGroup[g.key]) return;
    const res = await fetch(`/api/transactions?status=${tab}&ids=${g.ids.join(',')}`);
    const data = await res.json();
    setRowsByGroup((p) => ({ ...p, [g.key]: data.txns }));
  }

  async function applyIds(g: TxnGroup, ids: string[], status: 'accepted' | 'deferred') {
    if (ids.length === 0) return;
    const res = await fetch('/api/transactions/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, type: g.type, category: g.category, status }),
    });
    const d = await res.json();
    toast(
      status === 'accepted'
        ? `Confirmed ${d.updated} × ${g.merchant}`
        : `Moved ${d.updated} to Later`,
      'ok'
    );
    setRowsByGroup({});
    load(tab);
  }

  async function changeSelection(ids: string[]) {
    if (ids.length === 0) return;
    const res = await fetch(`/api/transactions?ids=${ids[0]}`);
    const data = await res.json();
    const first = data.txns[0];
    if (first) setEditing({ txn: first, presetIds: ids });
  }

  async function openRow(id: string) {
    const res = await fetch(`/api/transactions?ids=${id}`);
    const data = await res.json();
    if (data.txns[0]) setEditing({ txn: data.txns[0] });
  }

  async function submitEdit(txn: Txn, result: EditResult, presetIds?: string[]) {
    setEditing(null);
    if (presetIds && presetIds.length > 1) {
      await patch(txn.id, { ...result, applyToIds: presetIds.filter((id) => id !== txn.id) });
      toast(`Updated ${presetIds.length} × ${result.merchant}`, 'ok');
      return;
    }
    const res = await fetch(
      `/api/transactions/similar?id=${encodeURIComponent(txn.id)}&merchant=${encodeURIComponent(result.merchant)}`
    );
    const { similar: items } = await res.json();
    if (!items || items.length === 0) {
      await patch(txn.id, { ...result, applyToIds: [] });
      toast(`Updated ${result.merchant}`, 'ok');
      return;
    }
    setSimilar({ txn, result, items });
  }

  async function patch(id: string, body: any) {
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setRowsByGroup({});
    load(tab);
  }

  async function applySimilar(ids: string[]) {
    if (!similar) return;
    const { txn, result } = similar;
    setSimilar(null);
    await patch(txn.id, { ...result, applyToIds: ids });
    toast(`Updated ${ids.length + 1} transaction${ids.length ? 's' : ''}`, 'ok');
  }

  const pct = counts.total ? Math.round(((counts.total - counts.pending) / counts.total) * 100) : 0;
  const pending = counts.pending ?? 0;
  const isConfirmedTab = tab === 'accepted';
  const hasFilters = selectedAccount || period !== 'all';

  return (
    <div className="min-h-screen bg-credbg pb-24 px-5 pt-5">
      {/* Title row */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full border border-credline bg-credsurface flex items-center justify-center text-credink flex-none hover:border-credink/20 transition-colors"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-credink">Review</h1>
        </div>
      </div>

      {/* Progress hero */}
      <div
        className="rounded-[1.25rem] px-5 py-4 mb-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1c2e 0%, #0f1117 40%, #151820 100%)',
          opacity: ready ? 1 : 0,
          transform: ready ? 'scale(1)' : 'scale(0.97)',
          transition: `opacity 400ms ${SPRING}, transform 400ms ${SPRING}`,
        }}
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-pos/[0.1] to-transparent rounded-full" />
        <div className="flex items-center justify-between mb-2.5 relative">
          <div className="flex items-baseline gap-2">
            <span className="text-[2rem] font-extrabold leading-none text-white tabular-nums tracking-[-0.03em]">{pct}%</span>
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-[0.1em]">reviewed</span>
          </div>
          <span className="text-[10px] text-white/40 font-semibold">
            {pending > 0 ? `${pending} left` : 'All done'}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-pos to-emerald-400 rounded-full"
            style={{ width: `${pct}%`, transition: `width 800ms ${SPRING}` }}
          />
        </div>
      </div>

      {/* Filter bar: Period + Account */}
      <div className="flex items-center gap-2 mb-4">
        <PeriodPicker
          months={months}
          value={period}
          granularity={granularity}
          onApply={(id, g) => { setGranularity(g); setPeriod(id); setRowsByGroup({}); }}
        />

        {/* Account filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setAccountOpen(v => !v)}
            className={`flex items-center gap-2 pl-3.5 pr-3 py-2.5 rounded-xl border text-small font-bold transition-colors whitespace-nowrap truncate max-w-[180px] ${
              selectedAccount
                ? 'bg-accent/8 border-accent/30 text-accent'
                : 'bg-credsurface border-credline text-credink'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
            {selectedAccount || 'All accounts'}
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`} aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {accountOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
              <div className="absolute left-0 top-12 z-50 bg-credsurface border border-credline/60 rounded-2xl shadow-lifted py-1.5 min-w-[200px] max-h-64 overflow-y-auto animate-dropdownIn">
                <button
                  onClick={() => { setSelectedAccount(''); setAccountOpen(false); setRowsByGroup({}); }}
                  className={`w-full text-left px-4 py-2.5 text-small transition-colors ${
                    !selectedAccount ? 'text-accent font-semibold' : 'text-credmuted font-medium hover:text-credink'
                  }`}
                >
                  All accounts
                  {!selectedAccount && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-2 text-accent" aria-hidden>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
                {accounts.map(a => (
                  <button
                    key={a}
                    onClick={() => { setSelectedAccount(a); setAccountOpen(false); setRowsByGroup({}); }}
                    className={`w-full text-left px-4 py-2.5 text-small transition-colors truncate ${
                      selectedAccount === a ? 'text-accent font-semibold' : 'text-credink font-medium hover:bg-credbg'
                    }`}
                  >
                    {a}
                    {selectedAccount === a && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-2 text-accent" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSelectedAccount(''); setPeriod('all'); setRowsByGroup({}); }}
            className="text-[10px] font-bold text-credmuted hover:text-neg transition-colors px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Status tabs — underlined style */}
      <div className="flex items-center gap-0 mb-5 border-b border-credline -mx-5 px-5">
        <div className="flex-1 flex">
          {TABS.map((t) => {
            const on = tab === t.id;
            const n = counts[t.id] ?? 0;
            if (n === 0 && !on) return null;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setRowsByGroup({}); }}
                className={`flex-1 pb-2.5 text-[10px] uppercase tracking-[0.06em] font-bold whitespace-nowrap transition-colors relative text-center ${
                  on ? 'text-credink' : 'text-credmuted'
                }`}
              >
                {t.label}
                {n > 0 && <span className={`ml-0.5 ${on ? 'text-credink/40' : 'text-credmuted/50'}`}>{n}</span>}
                {on && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-credink rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Sort button */}
        <div className="relative flex-none pb-2.5">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="w-8 h-8 rounded-lg border border-credline bg-credsurface flex items-center justify-center text-credmuted hover:border-credink/20 transition-colors"
            aria-label="Sort"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 6h18M6 12h12M9 18h6" />
            </svg>
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-10 z-50 bg-credsurface border border-credline/60 rounded-2xl shadow-lifted py-1.5 min-w-[180px] animate-dropdownIn">
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { setSort(o.id); setSortOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 text-small transition-colors ${
                      sort === o.id ? 'text-accent font-semibold' : 'text-credmuted font-medium hover:text-credink'
                    }`}
                  >
                    {o.label}
                    {sort === o.id && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-2 text-accent" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? null : sortedGroups.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-credsurface border border-credline flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-credmuted" aria-hidden>
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="text-body font-bold mb-1.5">
            {counts.total === 0 ? 'Nothing imported yet' : 'All clear'}
          </div>
          <p className="text-small text-credmuted mb-4">
            {counts.total === 0
              ? 'Import a statement from Settings.'
              : hasFilters
                ? 'Nothing matches these filters.'
                : 'Nothing waiting in this tab.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedGroups.map((g, i) => (
            <div
              key={g.key}
              style={{
                opacity: ready ? 1 : 0,
                transform: ready ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 400ms ${SPRING} ${Math.min(i, 8) * 40}ms, transform 400ms ${SPRING} ${Math.min(i, 8) * 40}ms`,
              }}
            >
              <GroupCard
                g={g}
                rows={rowsByGroup[g.key]}
                onExpand={() => expand(g)}
                onApply={(ids, status) => applyIds(g, ids, status)}
                onChange={changeSelection}
                onOpenRow={openRow}
                confirmed={isConfirmedTab}
              />
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditModal
          txn={editing.txn}
          selectionCount={editing.presetIds?.length}
          onClose={() => setEditing(null)}
          onSubmit={(r) => submitEdit(editing.txn, r, editing.presetIds)}
        />
      )}
      {similar && (
        <SimilarModal
          items={similar.items}
          type={similar.result.type}
          category={similar.result.category}
          merchant={similar.result.merchant}
          onSkip={() => applySimilar([])}
          onConfirm={applySimilar}
        />
      )}
    </div>
  );
}
