'use client';
import { useEffect, useMemo, useState } from 'react';
import { TYPES, CATEGORIES, typeInfo, catInfo, friendlyDate } from '@/lib/reference';
import Sheet from './Sheet';
import CategoryIcon from './CategoryIcon';
import Amount from './Amount';
import type { Txn } from '@/lib/repo';
import { displayMerchant } from '@/lib/merchantName';

export interface EditResult {
  merchant: string;
  type: string;
  category: string | null;
  note: string;
  rememberRule: boolean;
  status: 'accepted' | 'unknown';
}

const ALL_CATS = [...CATEGORIES, { id: 'unknown', label: 'Unknown', color: '#7A8296' }];

export default function EditModal({
  txn,
  onClose,
  onSubmit,
  selectionCount,
}: {
  txn: Txn;
  onClose: () => void;
  onSubmit: (r: EditResult) => void;
  selectionCount?: number;
}) {
  const [merchant, setMerchant] = useState(txn.merchant);
  const [type, setType] = useState(txn.type);
  const [category, setCategory] = useState<string>(txn.category || 'other');
  const [note, setNote] = useState(txn.note || '');
  const [rememberRule, setRememberRule] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMerchant(txn.merchant);
    setType(txn.type);
    setCategory(txn.category || 'other');
    setNote(txn.note || '');
    setRememberRule(false);
    setSearch('');
  }, [txn]);

  const isExpense = typeInfo(type).expense;
  const isUnknown = category === 'unknown';
  const isCredit = txn.direction === 'credit';
  const multi = (selectionCount ?? 0) > 1;

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_CATS;
    const q = search.toLowerCase();
    return ALL_CATS.filter(c => c.label.toLowerCase().includes(q));
  }, [search]);

  const originalCat = catInfo(txn.category || 'other');

  return (
    <Sheet
      onClose={onClose}
      header={
        <div className="text-center pt-2 pr-8">
          <div className="text-small text-credmuted font-medium leading-snug">{displayMerchant(merchant)}</div>
          <div className="mt-1.5">
            <Amount value={txn.amount} size="lg" sign={isCredit} />
          </div>
          <div className="text-caption uppercase tracking-[0.1em] text-credmuted font-semibold mt-2">
            {multi ? `${selectionCount} transactions` : friendlyDate(txn.date, true)}
          </div>
          {txn.category && txn.category !== 'unknown' && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-credink text-white text-micro uppercase tracking-[0.1em] font-bold">
              <CategoryIcon id={txn.category} size={14} />
              {originalCat.label}
            </div>
          )}
        </div>
      }
      footer={
        <div className="space-y-3">
          {/* Remember — iOS toggle style */}
          <label className="flex items-center justify-between px-1 cursor-pointer select-none">
            <span className="text-small text-credmuted">
              Remember for <span className="font-medium text-credink">{displayMerchant(merchant)}</span>
            </span>
            <div
              className={`relative w-[42px] h-[26px] rounded-full flex-none transition-colors duration-250 ${
                rememberRule ? 'bg-pos' : 'bg-credline'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
            >
              <div
                className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-250"
                style={{
                  left: rememberRule ? '19px' : '3px',
                  transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
                }}
              />
            </div>
            <input
              type="checkbox"
              checked={rememberRule}
              onChange={(e) => setRememberRule(e.target.checked)}
              className="sr-only"
            />
          </label>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="pressable flex-1 py-2.5 rounded-xl text-small font-semibold bg-credbg text-credmuted active:scale-[0.97] transition-all"
            >
              Skip
            </button>
            <button
              onClick={() =>
                onSubmit({
                  merchant,
                  type,
                  category: isExpense && !isUnknown ? category : null,
                  note,
                  rememberRule,
                  status: isUnknown ? 'unknown' : 'accepted',
                })
              }
              className="pressable flex-1 py-2.5 rounded-xl text-small font-semibold bg-credink text-white active:scale-[0.97] transition-all"
            >
              Confirm
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 min-h-[24rem]">
        {/* Dotted separator */}
        <div className="border-t border-dashed border-credline/60" />

        {/* Search */}
        <div className="relative">
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-credmuted/50"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category"
            className="w-full bg-credbg border border-credline rounded-xl pl-10 pr-3 py-2 text-small text-credink placeholder:text-credmuted/40 outline-none focus:border-credink/20 transition-colors"
          />
        </div>

        {/* Category tags — smaller font */}
        <div className="flex flex-wrap gap-2">
          {filtered.map((c) => {
            const on = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.08em] font-bold whitespace-nowrap transition-colors duration-150 border ${
                  on
                    ? 'border-credink/30 bg-credink/[0.06] text-credink'
                    : 'border-credline bg-credsurface text-credink/70'
                }`}
              >
                <CategoryIcon id={c.id} size={14} />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Note */}
        <div className="relative">
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-credmuted/50"
          >
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full bg-credbg border border-credline rounded-xl pl-10 pr-3 py-2 text-small text-credink placeholder:text-credmuted/40 outline-none focus:border-credink/20 transition-colors"
          />
        </div>
      </div>
    </Sheet>
  );
}
