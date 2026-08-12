'use client';
import { useState } from 'react';
import CategoryIcon from './CategoryIcon';
import Amount from './Amount';
import { catInfo, typeInfo, friendlyDate } from '@/lib/reference';
import { displayMerchant } from '@/lib/merchantName';

export interface SimilarTxn {
  id: string;
  date: string | null;
  narration: string;
  merchant: string;
  amount: number;
  direction: string;
  account: string;
  type: string;
  category: string | null;
}

/**
 * Confirmation step before a category is applied to anything beyond the row being edited.
 *
 * Every candidate is listed with its date, amount and current category, and each can be
 * ticked off individually — a merchant often spans categories (groceries vs. a restaurant
 * bill from the same chain), so "same merchant" is a suggestion, never a decision.
 */
export default function SimilarModal({
  items,
  type,
  category,
  merchant,
  onSkip,
  onConfirm,
}: {
  items: SimilarTxn[];
  type: string;
  category: string | null;
  merchant: string;
  onSkip: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));

  const allSelected = selected.size === items.length;
  const target = category ? catInfo(category) : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTotal = items
    .filter((i) => selected.has(i.id))
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center">
      <div className="bg-credsurface w-full max-w-xl rounded-t-2xl max-h-[92vh] flex flex-col">
        <div className="flex-none p-5 pb-4 border-b border-credline">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-title font-extrabold tracking-[-0.01em]">
                Found {items.length} similar transaction{items.length === 1 ? '' : 's'}
              </h2>
              <p className="text-small text-credmuted mt-1 leading-relaxed">
                Also mark {items.length === 1 ? 'this' : 'these'} as{' '}
                <span className="font-semibold text-credink">
                  {target ? target.label : typeInfo(type).label}
                </span>
                ? Untick anything that belongs elsewhere.
              </p>
            </div>
            <button onClick={onSkip} aria-label="Close" className="flex-none w-8 h-8 rounded-lg border border-credline text-credmuted">
              ✕
            </button>
          </div>

          <button
            onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
            className="mt-3 px-3.5 py-1.5 rounded-full bg-credink text-white text-caption uppercase tracking-[0.1em] font-bold"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {/* min-h-0 is what lets this shrink instead of pushing the footer off-screen. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2">
          {items.map((i) => {
            const on = selected.has(i.id);
            const current = i.category ? catInfo(i.category) : null;
            return (
              <div
                key={i.id}
                onClick={() => toggle(i.id)}
                className="flex items-center gap-3 py-3 border-b border-credline last:border-0 cursor-pointer"
              >
                <span
                  className={`w-5 h-5 rounded flex-none flex items-center justify-center text-small font-bold ${
                    on ? 'bg-credink text-white' : 'border border-credline text-transparent'
                  }`}
                  role="checkbox"
                  aria-checked={on}
                >
                  ✓
                </span>
                <span className="text-credmuted flex-none"><CategoryIcon id={i.category} size={18} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-body font-medium truncate">{displayMerchant(i.merchant)}</div>
                  <div className="text-caption text-credmuted truncate">
                    {current ? current.label.toLowerCase() : 'uncategorised'} · {i.account}
                  </div>
                </div>
                <div className="text-right flex-none">
                  <Amount value={i.amount} size="sm" />
                  <div className="text-caption text-credmuted mt-0.5">{friendlyDate(i.date, true)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-none px-5 py-4 border-t border-credline pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <p className="text-caption text-credmuted mb-3">
            {selected.size} of {items.length} selected · ₹{Math.round(selectedTotal).toLocaleString('en-IN')}
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={onSkip}
              className="flex-1 py-3.5 rounded-xl text-body font-bold bg-credsurface border border-credline text-credink"
            >
              Skip
            </button>
            <button
              onClick={() => onConfirm([...selected])}
              className="flex-1 py-3.5 rounded-xl text-body font-bold bg-credink text-white"
            >
              {selected.size === 0 ? 'Only this one' : `Confirm ${selected.size + 1}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
