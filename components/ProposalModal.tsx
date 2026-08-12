'use client';
import { useState } from 'react';
import Sheet from './Sheet';
import Amount from './Amount';
import CategoryIcon from './CategoryIcon';
import { catInfo, friendlyDate, CATEGORIES } from '@/lib/reference';
import { displayMerchant } from '@/lib/merchantName';

export interface Proposal {
  id: string;
  merchant: string;
  amount: number;
  date: string | null;
  account: string;
  type: string;
  proposedCategory: string;
  confidence: string;
}

/**
 * Review sheet for automatic category guesses.
 *
 * Auto-categorisation is a suggestion engine, so every guess is listed with the category
 * it wants to assign and can be unticked. Nothing starts ticked — the user opts in to each
 * one rather than opting out of a bulk change they never saw.
 */
export default function ProposalModal({
  proposals,
  onClose,
  onApply,
}: {
  proposals: Proposal[];
  onClose: () => void;
  onApply: (accepted: Proposal[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const all = selected.size === proposals.length && proposals.length > 0;
  const chosen = proposals.filter((p) => selected.has(p.id));
  const total = chosen.reduce((s, p) => s + p.amount, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Sheet
      onClose={onClose}
      header={
        <div className="pt-1">
          <h2 className="text-title font-extrabold tracking-[-0.01em]">
            {proposals.length} suggested categor{proposals.length === 1 ? 'y' : 'ies'}
          </h2>
          <p className="text-small text-credmuted mt-1 leading-relaxed">
            Below are the transactions we could suggest a category for. Tick the ones you agree
            with — they stay in Review for you to confirm. Transactions we couldn&apos;t categorise
            are not listed; you can categorise those manually from the Review screen.
          </p>
          <button
            onClick={() => setSelected(all ? new Set() : new Set(proposals.map((p) => p.id)))}
            className="mt-2.5 px-3 py-1.5 rounded-full bg-credink text-white text-micro uppercase tracking-[0.1em] font-bold"
          >
            {all ? 'Deselect all' : `Select all ${proposals.length}`}
          </button>
        </div>
      }
      footer={
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-small font-bold bg-credsurface border border-credline text-credink"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(chosen)}
            disabled={chosen.length === 0}
            className="flex-1 py-3 rounded-xl text-small font-bold bg-credink text-white disabled:opacity-30"
          >
            Apply {chosen.length || ''}
          </button>
        </div>
      }
    >
      <p className="text-caption text-credmuted mb-2">
        {selected.size} of {proposals.length} selected
        {selected.size > 0 && ` · ₹${Math.round(total).toLocaleString('en-IN')}`}
      </p>

      {proposals.map((p) => {
        const on = selected.has(p.id);
        const ci = catInfo(p.proposedCategory);
        return (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className="w-full flex items-center gap-2.5 py-2.5 border-b border-credline last:border-0 text-left"
          >
            <span
              role="checkbox"
              aria-checked={on}
              className={`w-4 h-4 rounded flex-none flex items-center justify-center text-micro font-bold ${
                on ? 'bg-credink text-white' : 'border border-credline text-transparent'
              }`}
            >
              ✓
            </span>
            <span
              className="flex-none w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: `${CATEGORIES.find((x) => x.id === p.proposedCategory)?.color || '#7A8296'}18`, color: CATEGORIES.find((x) => x.id === p.proposedCategory)?.color || '#7A8296' }}
            >
              <CategoryIcon id={p.proposedCategory} size={15} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-small font-semibold truncate">{displayMerchant(p.merchant)}</div>
              <div className="text-micro text-credmuted mt-0.5 flex items-center gap-1 truncate">
                <span className="font-semibold text-credink/60">→ {ci.label}</span>
                <span>·</span>
                <span>{friendlyDate(p.date, true)}</span>
                <span>·</span>
                <span className="truncate">{p.account}</span>
              </div>
            </div>
            <span className="flex-none"><Amount value={p.amount} size="sm" /></span>
          </button>
        );
      })}
    </Sheet>
  );
}
