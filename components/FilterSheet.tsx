'use client';
import { useState } from 'react';
import { CATEGORIES } from '@/lib/reference';
import CategoryIcon from './CategoryIcon';

export interface TxnFilters {
  sort: 'new' | 'old' | 'high' | 'low';
  categories: string[];
  type: 'all' | 'credit' | 'debit';
  min: number | null;
  max: number | null;
}

export const DEFAULT_FILTERS: TxnFilters = { sort: 'new', categories: [], type: 'all', min: null, max: null };

const SORT_OPTIONS: { id: TxnFilters['sort']; label: string; icon: string }[] = [
  { id: 'new', label: 'Newest First', icon: 'M12 5v14M5 12l7 7 7-7' },
  { id: 'old', label: 'Oldest First', icon: 'M12 19V5M5 12l7-7 7 7' },
  { id: 'high', label: 'Highest Amount', icon: 'M3 17h4V7H3v10zM9 17h4V3H9v14zM15 17h4v-6h-4v6z' },
  { id: 'low', label: 'Lowest Amount', icon: 'M3 17h4v-6H3v6zM9 17h4V7H9v10zM15 17h4V3h-4v14z' },
];

const TABS = [
  { id: 'sort' as const, label: 'Sort' },
  { id: 'category' as const, label: 'Category' },
  { id: 'amount' as const, label: 'Amount' },
  { id: 'type' as const, label: 'Type' },
];

type TabId = (typeof TABS)[number]['id'];

export default function FilterSheet({
  initial,
  onClose,
  onApply,
}: {
  initial: TxnFilters;
  onClose: () => void;
  onApply: (f: TxnFilters) => void;
}) {
  const [tab, setTab] = useState<TabId>('sort');
  const [f, setF] = useState<TxnFilters>(initial);

  function toggleCategory(id: string) {
    setF((prev) => ({
      ...prev,
      categories: prev.categories.includes(id) ? prev.categories.filter((c) => c !== id) : [...prev.categories, id],
    }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-credsurface w-full max-w-xl rounded-t-[24px] overflow-hidden text-credink flex flex-col animate-sheetIn" style={{ height: '55vh', maxHeight: '480px' }}>
        {/* Header */}
        <div className="flex-none px-5 pt-4 pb-0 border-b border-credline">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-body font-extrabold uppercase tracking-[0.08em]">Filter By</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-full border border-credline text-credmuted text-caption flex items-center justify-center">
              ✕
            </button>
          </div>

          {/* Tab bar — underlined style */}
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 pb-2.5 text-small font-bold text-center transition-colors relative ${
                  tab === t.id ? 'text-credink' : 'text-credmuted'
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-credink rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {tab === 'sort' && (
            <div className="space-y-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setF({ ...f, sort: opt.id })}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors ${
                    f.sort === opt.id ? 'bg-credink/[0.06]' : 'hover:bg-credbg'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${f.sort === opt.id ? 'bg-credink text-white' : 'bg-credbg text-credmuted'}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={opt.icon} />
                    </svg>
                  </span>
                  <span className={`flex-1 text-left text-small ${f.sort === opt.id ? 'font-bold text-credink' : 'font-medium text-credink/70'}`}>
                    {opt.label}
                  </span>
                  {f.sort === opt.id && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-none" aria-hidden>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === 'category' && (
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = f.categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                      on ? 'bg-credink/[0.06] ring-1 ring-credink/20' : 'bg-credbg hover:bg-credline/40'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-none"
                      style={{ background: `${c.color}18`, color: c.color }}
                    >
                      <CategoryIcon id={c.id} size={14} />
                    </span>
                    <span className={`text-small whitespace-nowrap ${on ? 'font-bold text-credink' : 'font-medium text-credink/70'}`}>
                      {c.label}
                    </span>
                    {on && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-credink flex-none" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'amount' && (() => {
            const invalid = f.min != null && f.max != null && f.min > f.max;
            const negMin = f.min != null && f.min < 0;
            const negMax = f.max != null && f.max < 0;
            return (
              <div>
                <p className="text-caption text-credmuted mb-3">Filter transactions by amount range (₹)</p>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 border rounded-xl px-3.5 py-3 ${negMin ? 'border-neg' : 'border-credline'}`}>
                    <div className="text-micro uppercase tracking-wide text-credmuted font-semibold mb-1">Min Amount</div>
                    <div className="flex items-center gap-1">
                      <span className="text-credmuted text-small">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={f.min ?? ''}
                        onChange={(e) => setF({ ...f, min: e.target.value === '' ? null : Number(e.target.value) })}
                        className="w-full text-body font-semibold outline-none bg-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <span className="text-credmuted font-bold">–</span>
                  <div className={`flex-1 border rounded-xl px-3.5 py-3 ${negMax ? 'border-neg' : 'border-credline'}`}>
                    <div className="text-micro uppercase tracking-wide text-credmuted font-semibold mb-1">Max Amount</div>
                    <div className="flex items-center gap-1">
                      <span className="text-credmuted text-small">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={f.max ?? ''}
                        onChange={(e) => setF({ ...f, max: e.target.value === '' ? null : Number(e.target.value) })}
                        className="w-full text-body font-semibold outline-none bg-transparent"
                        placeholder="Any"
                      />
                    </div>
                  </div>
                </div>
                {invalid && (
                  <p className="text-caption text-neg mt-2 font-medium">Minimum cannot be greater than maximum.</p>
                )}
                {(negMin || negMax) && (
                  <p className="text-caption text-neg mt-2 font-medium">Amount cannot be negative.</p>
                )}
              </div>
            );
          })()}

          {tab === 'type' && (
            <div className="space-y-1">
              {([
                ['all', 'All Transactions'],
                ['credit', 'Credit Only'],
                ['debit', 'Debit Only'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setF({ ...f, type: id })}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors ${
                    f.type === id ? 'bg-credink/[0.06]' : 'hover:bg-credbg'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${f.type === id ? 'border-credink' : 'border-credline'}`}>
                    {f.type === id && <span className="w-2.5 h-2.5 rounded-full bg-credink" />}
                  </span>
                  <span className={`flex-1 text-left text-small ${f.type === id ? 'font-bold text-credink' : 'font-medium text-credink/70'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none flex gap-2 px-5 py-3 border-t border-credline pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button onClick={() => setF(DEFAULT_FILTERS)} className="flex-1 py-2.5 rounded-xl text-small font-bold border border-credline text-credmuted">
            Reset
          </button>
          <button
            onClick={() => onApply(f)}
            disabled={(f.min != null && f.max != null && f.min > f.max) || (f.min != null && f.min < 0) || (f.max != null && f.max < 0)}
            className="flex-1 py-2.5 rounded-xl text-small font-bold bg-credink text-white disabled:opacity-30"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
