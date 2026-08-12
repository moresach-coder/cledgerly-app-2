'use client';
import { useEffect, useState } from 'react';
import Amount from './Amount';
import { catInfo, friendlyDate } from '@/lib/reference';
import { displayMerchant } from '@/lib/merchantName';
import type { TxnGroup } from '@/lib/repo';

export interface GroupRow {
  id: string;
  date: string | null;
  merchant: string;
  amount: number;
  account: string;
  category: string | null;
}

export default function GroupCard({
  g,
  rows,
  onExpand,
  onApply,
  onChange,
  onOpenRow,
  confirmed,
}: {
  g: TxnGroup;
  rows?: GroupRow[];
  onExpand: () => void;
  onApply: (ids: string[], status: 'accepted' | 'deferred') => void;
  onChange: (ids: string[]) => void;
  onOpenRow: (id: string) => void;
  confirmed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const single = g.count === 1;


  useEffect(() => {
    if (open && rows) setSelected(new Set());
  }, [open, rows]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = !!rows && rows.length > 0 && selected.size === rows.length;
  const selectedRows = rows?.filter((r) => selected.has(r.id)) ?? [];
  const selectedTotal = selectedRows.reduce((s, r) => s + r.amount, 0);
  const ids = [...selected];

  function handleCardClick() {
    if (single) return;
    setOpen((v) => !v);
    if (!open) onExpand();
  }

  return (
    <div className="bg-credsurface border border-credline rounded-xl overflow-hidden shadow-subtle transition-shadow hover:shadow-card">
      <div
        onClick={handleCardClick}
        className={`px-4 py-3.5 ${!single ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center gap-3">
          <button
            className="flex-1 min-w-0 text-left"
            onClick={(e) => { if (single) { e.stopPropagation(); onOpenRow(g.ids[0]); } }}
          >
            <div className="text-body font-bold truncate">{displayMerchant(g.merchant)}</div>
            <div className="text-caption text-credmuted mt-0.5 truncate">
              {g.accounts.length === 1 ? g.accounts[0] : `${g.accounts.length} accounts`}
            </div>
          </button>
          <div className="text-right flex-none flex items-center gap-2">
            <Amount value={g.total} size="sm" />
            {!single && (
              <span className="flex flex-col items-center gap-0.5">
                <span className="min-w-[20px] h-[20px] rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center px-1">
                  {g.count}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-credmuted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {g.mixed && (
          <div className="mt-2">
            <span className="text-micro px-2 py-0.5 rounded-full bg-warn/10 text-warn font-bold">
              mixed
            </span>
          </div>
        )}

        {single && !confirmed && (
          <div className="flex gap-1.5 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); onChange(g.ids); }}
              className="pressable tap-safe flex-1 py-2 rounded-lg text-caption font-semibold text-accent border border-accent/20 bg-accent/5 hover:bg-accent/10 active:scale-[0.98] transition-all"
            >
              Update Category
            </button>
          </div>
        )}
      </div>

      {/* Expanded transaction list — always mounted, height animated via grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          transition: 'grid-template-rows 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-credline">
            {!rows ? (
              <div className="px-4 py-4 text-caption text-credmuted text-center">Loading…</div>
            ) : confirmed ? (
              <div className="divide-y divide-credline/60">
                {rows.map((r, i) => (
                  <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 ${i % 2 === 1 ? 'bg-credline/40' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-small font-medium">{friendlyDate(r.date, true)}</div>
                      {r.category && (
                        <div className="text-caption text-credmuted mt-0.5">{catInfo(r.category).label}</div>
                      )}
                    </div>
                    <span className="flex-none"><Amount value={r.amount} size="sm" /></span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="max-h-72 overflow-y-auto divide-y divide-credline/60">
                  {rows.map((r, i) => {
                    const on = selected.has(r.id);
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${on ? 'bg-accent/[0.04]' : i % 2 === 1 ? 'bg-credline/40' : ''}`}
                      >
                        <button
                          onClick={() => toggle(r.id)}
                          role="checkbox"
                          aria-checked={on}
                          aria-label={`Select ${r.merchant} ${r.amount}`}
                          className={`w-[18px] h-[18px] rounded flex-none flex items-center justify-center text-micro font-bold transition-colors ${
                            on ? 'bg-accent text-white' : 'border-2 border-credline text-transparent'
                          }`}
                        >
                          ✓
                        </button>
                        <button onClick={() => onOpenRow(r.id)} className="flex-1 min-w-0 text-left">
                          <div className="text-small font-medium">{friendlyDate(r.date, true)}</div>
                          {r.category && (
                            <div className="text-caption text-credmuted mt-0.5">{catInfo(r.category).label}</div>
                          )}
                        </button>
                        <span className="flex-none"><Amount value={r.amount} size="sm" /></span>
                      </div>
                    );
                  })}
                </div>

                {selected.size > 0 && (
                  <div className="px-4 py-1.5 bg-credbg/80 text-caption font-semibold text-credink/60 text-center">
                    {selected.size} selected · ₹{Math.round(selectedTotal).toLocaleString('en-IN')}
                  </div>
                )}

                <div className="flex gap-1.5 px-4 py-3 border-t border-credline bg-credbg/40">
                  <button
                    onClick={() => onChange(ids)}
                    disabled={selected.size === 0}
                    className="pressable tap-safe flex-1 py-2.5 rounded-lg text-caption font-semibold border transition-all disabled:bg-credbg disabled:border-credline/40 disabled:text-credmuted/40 disabled:cursor-not-allowed text-accent border-accent/20 bg-accent/5 hover:bg-accent/10 active:scale-[0.98]"
                  >
                    Update Category
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
