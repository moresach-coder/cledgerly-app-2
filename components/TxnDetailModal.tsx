'use client';
import { useState } from 'react';
import { CATEGORIES, catInfo, typeInfo, friendlyDate } from '@/lib/reference';
import CategoryIcon from './CategoryIcon';
import Amount from './Amount';
import type { Txn } from '@/lib/repo';

export default function TxnDetailModal({
  t,
  onClose,
  onCategorize,
  similarMerchants,
}: {
  t: Txn;
  onClose: () => void;
  onCategorize?: (category: string | null, applyToSimilar?: boolean) => Promise<void>;
  similarMerchants?: string[];
}) {
  const ci = t.category ? catInfo(t.category) : null;
  const ti = typeInfo(t.type);
  const [selectedCat, setSelectedCat] = useState<string | null>(t.category);
  const [applyToSimilar, setApplyToSimilar] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onCategorize) return;
    setSaving(true);
    try {
      await onCategorize(selectedCat, applyToSimilar);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-credsurface w-full max-w-xl rounded-t-[24px] p-6 pb-8 max-h-[92vh] overflow-y-auto text-credink">
        <button onClick={onClose} className="text-credmuted text-lg mb-6">&larr;</button>

        <div className="flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-full flex items-center justify-center border border-credline mb-4">
            <CategoryIcon id={t.category} size={24} />
          </span>
          <div className="font-credserif text-heading leading-tight px-4">{t.merchant}</div>
          <div className="mt-4"><Amount value={t.amount} size="xl" /></div>
          <div className="text-small text-credmuted mt-2 uppercase tracking-wide">{friendlyDate(t.date, true)}</div>
          <div className="mt-4 px-3.5 py-1.5 rounded-full border border-credline text-caption uppercase tracking-wide font-semibold">
            {ci ? ci.label : ti.label}
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <div className="border-t border-dashed border-credline pt-4">
            <div className="text-micro uppercase tracking-wide text-credmuted font-semibold mb-2">Category</div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`text-caption font-semibold px-2 py-2 rounded-lg border transition-all ${
                    selectedCat === cat.id
                      ? 'border-credink bg-credink text-white'
                      : 'border-credline text-credink bg-credbg'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              <button
                onClick={() => setSelectedCat(null)}
                className={`text-caption font-semibold px-2 py-2 rounded-lg border transition-all col-span-3 ${
                  selectedCat === null
                    ? 'border-credink bg-credink text-white'
                    : 'border-credline text-credmuted bg-credbg'
                }`}
              >
                Uncategorized
              </button>
            </div>
          </div>

          {similarMerchants && similarMerchants.length > 0 && onCategorize && (
            <div className="border-t border-dashed border-credline pt-4">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={applyToSimilar}
                  onChange={(e) => setApplyToSimilar(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-small font-semibold text-credink">Apply to {similarMerchants.length} similar merchants</span>
              </label>
              <div className="text-micro text-credmuted space-y-1">
                {similarMerchants.slice(0, 3).map((m) => (
                  <div key={m}>• {m}</div>
                ))}
                {similarMerchants.length > 3 && <div className="italic">and {similarMerchants.length - 3} more</div>}
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-credline pt-4">
            <div className="text-micro uppercase tracking-wide text-credmuted font-semibold mb-1.5">Account</div>
            <div className="text-body">{t.account}</div>
          </div>
          <div className="border-t border-dashed border-credline pt-4">
            <div className="text-micro uppercase tracking-wide text-credmuted font-semibold mb-1.5">Narration</div>
            <div className="text-small text-credmuted lowercase">{t.narration}</div>
          </div>
        </div>

        {onCategorize && (
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-credline text-credink font-semibold text-small"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-credink text-white font-semibold text-small disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
