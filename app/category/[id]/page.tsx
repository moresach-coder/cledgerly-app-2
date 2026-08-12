'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Amount from '@/components/Amount';
import CategoryIcon from '@/components/CategoryIcon';
import EditModal, { type EditResult } from '@/components/EditModal';
import { catInfo, CATEGORIES, friendlyDate, fmt } from '@/lib/reference';
import { displayMerchant } from '@/lib/merchantName';
import { useToast } from '@/components/Toast';
import type { Txn } from '@/lib/repo';

const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';

function Shell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-credline/20 rounded-[1.25rem] p-[1px] ${className}`}>
      <div className="bg-credsurface rounded-[calc(1.25rem-1px)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function CategoryDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const catId = decodeURIComponent(params.id);
  const ci = catInfo(catId);
  const color = CATEGORIES.find((c) => c.id === catId)?.color || '#7A8296';
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    setReady(false);
    const res = await fetch('/api/transactions?status=accepted');
    const data = await res.json();
    setTxns(data.txns.filter((t: Txn) => t.category === catId));
    setLoading(false);
    setTimeout(() => setReady(true), 80);
  }, [catId]);

  useEffect(() => { load(); }, [load]);

  const total = txns.reduce((s, t) => s + t.amount, 0);

  const dates = txns.map(t => t.date).filter(Boolean).sort() as string[];
  const dateRange = dates.length > 0
    ? `${friendlyDate(dates[0], true)} – ${friendlyDate(dates[dates.length - 1], true)}`
    : '';

  async function handleEditSubmit(result: EditResult) {
    if (!editing) return;
    const txn = editing;
    const oldLabel = ci.label;
    const newLabel = result.category ? catInfo(result.category).label : 'Other';

    await fetch(`/api/transactions/${txn.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: result.merchant,
        type: result.type,
        category: result.category,
        note: result.note,
        status: result.status,
        rememberRule: result.rememberRule,
      }),
    });
    setEditing(null);

    if (result.category !== catId) {
      toast(`${fmt(txn.amount)} moved from ${oldLabel} → ${newLabel}`, 'ok');
    } else {
      toast(`Updated ${displayMerchant(result.merchant)}`, 'ok');
    }
    load();
  }

  return (
    <div className="min-h-screen bg-credbg text-credink px-5 pt-5 pb-24">
      {/* Header */}
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
          <div className="flex items-center gap-2.5">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center flex-none"
              style={{ background: `${color}18`, color }}
            >
              <CategoryIcon id={catId} size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-title font-extrabold">{ci.label}</h1>
              <p className="text-caption text-credmuted">{txns.length} transaction{txns.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date range filter indicator */}
      {dateRange && (
        <div className="flex justify-end mb-4 px-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-credbg border border-credline/50 text-[10px] text-credmuted font-medium">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="17" rx="2.5" />
              <path d="M3 10h18" />
            </svg>
            {dateRange}
          </span>
        </div>
      )}

      {loading ? null : txns.length === 0 ? (
        <div className="text-center py-12 text-credmuted text-small">No transactions in this category.</div>
      ) : (
        <Shell>
          {/* Total header */}
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-credline/40">
            <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Total</span>
            <span className="text-body font-extrabold text-credink tabular-nums">{fmt(total)}</span>
          </div>

          {/* Transaction list */}
          <div className="divide-y divide-credline/30">
            {txns.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setEditing(t)}
                className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-credbg/40 transition-colors group"
                style={{
                  opacity: ready ? 1 : 0,
                  transform: ready ? 'translateX(0)' : 'translateX(-6px)',
                  transition: `opacity 400ms ${SPRING} ${i * 35}ms, transform 400ms ${SPRING} ${i * 35}ms, background-color 200ms ease`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-small font-semibold truncate">{displayMerchant(t.merchant)}</div>
                  <div className="text-caption text-credmuted mt-0.5">
                    {friendlyDate(t.date, true)} · {t.account}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <Amount value={t.amount} size="sm" />
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-credmuted/30 group-hover:text-credmuted transition-colors" aria-hidden>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </Shell>
      )}

      {/* Use the same EditModal as Review for consistency */}
      {editing && (
        <EditModal
          txn={editing}
          onClose={() => setEditing(null)}
          onSubmit={(r) => handleEditSubmit(r)}
        />
      )}
    </div>
  );
}
