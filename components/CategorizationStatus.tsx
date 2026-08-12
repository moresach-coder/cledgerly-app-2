'use client';
import { useState } from 'react';
import { SectionTitle } from './Section';

export default function CategorizationStatus({
  uncategorized,
  unverified,
  account,
  onCategorizeAll,
}: {
  uncategorized: number;
  unverified: number;
  account: string;
  onCategorizeAll: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const totalNeedsAction = uncategorized + unverified;

  if (totalNeedsAction === 0) return null;

  const handleAutoCateg = async () => {
    setLoading(true);
    try {
      await onCategorizeAll();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-credbg border border-credline rounded-xl px-4 py-3 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-small font-semibold text-credink">Categorization</div>
        <div className="flex gap-2">
          {uncategorized > 0 && (
            <span className="text-caption font-semibold px-2 py-1 rounded-full bg-white text-credink border border-credline">
              {uncategorized} uncategorized
            </span>
          )}
          {unverified > 0 && (
            <span className="text-caption font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
              {unverified} unverified
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleAutoCateg}
        disabled={loading}
        className="w-full text-small font-semibold text-white bg-credink rounded-lg px-3 py-2 disabled:opacity-50"
      >
        {loading ? 'Auto-categorizing...' : `Auto-categorize all (${totalNeedsAction})`}
      </button>
      <div className="text-micro text-credmuted mt-2">
        Tap a transaction to verify or manually categorize. Apply to similar merchants in one action.
      </div>
    </div>
  );
}
