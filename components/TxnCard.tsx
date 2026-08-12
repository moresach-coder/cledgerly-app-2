'use client';
import { typeInfo, catInfo, STATUS_META, fmt } from '@/lib/reference';
import type { Txn } from '@/lib/repo';
import { displayMerchant } from '@/lib/merchantName';

const CONF_META: Record<string, [string, string]> = {
  high: ['bg-pos/15 text-pos', 'high confidence'],
  medium: ['bg-warn/15 text-warn', 'rule match'],
  low: ['bg-neg/15 text-neg', 'needs your call'],
};

export default function TxnCard({
  t,
  onAccept,
  onEdit,
  onDefer,
  onReopen,
}: {
  t: Txn;
  onAccept: () => void;
  onEdit: () => void;
  onDefer: () => void;
  onReopen: () => void;
}) {
  const ti = typeInfo(t.type);
  const ci = t.category ? catInfo(t.category) : null;
  const [confCls, confLabel] = CONF_META[t.confidence] || CONF_META.low;
  const isPending = t.status === 'pending';

  return (
    <div className={`bg-surface border border-line rounded-xl p-3.5 mb-2.5 ${!isPending ? 'opacity-50' : ''}`}>
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          <div className="text-body font-medium">{displayMerchant(t.merchant)}</div>
          <div className="text-micro text-muted mt-0.5 truncate">{t.narration}</div>
          <div className="text-caption text-muted mt-1">
            {t.date || 'no date'} &middot; {t.account}
          </div>
        </div>
        <div className="text-right flex-none">
          <div className={`text-body font-semibold mono ${t.direction === 'credit' ? 'text-pos' : ''}`}>
            {t.direction === 'credit' ? '+' : ''}
            {fmt(t.amount)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        <span className="text-micro px-2 py-0.5 rounded-md font-semibold bg-surface2 border border-line">{ti.label}</span>
        {ci && (
          <span
            className="text-micro px-2 py-0.5 rounded-md font-semibold border"
            style={{ color: ci.color, borderColor: ci.color + '55' }}
          >
            {ci.label}
          </span>
        )}
        {isPending && <span className={`text-micro px-2 py-0.5 rounded-md font-semibold ${confCls}`}>{confLabel}</span>}
        {!isPending && (
          <span
            className="text-micro px-2 py-0.5 rounded-md font-semibold"
            style={{ color: STATUS_META[t.status].color, background: STATUS_META[t.status].color + '22' }}
          >
            {STATUS_META[t.status].label}
          </span>
        )}
        {t.isDuplicate && <span className="text-micro px-2 py-0.5 rounded-md font-semibold bg-neg/15 text-neg">possible duplicate</span>}
      </div>

      <div className="flex gap-1.5 mt-2.5">
        {isPending ? (
          <>
            {/* No "Unknown" action here — it is a category inside Change, so the choice
                lives with the other categories instead of being a competing button. */}
            <button onClick={onAccept} className="flex-1 py-2 rounded-lg text-caption font-bold bg-credink text-white">
              Confirm
            </button>
            <button onClick={onEdit} className="flex-1 py-2 rounded-lg text-caption font-semibold bg-surface2 border border-line text-ink">
              Change
            </button>
            <button onClick={onDefer} className="flex-1 py-2 rounded-lg text-caption font-semibold bg-surface2 border border-line text-muted">
              Later
            </button>
          </>
        ) : (
          <button onClick={onReopen} className="flex-1 py-2 rounded-lg text-caption font-semibold bg-surface2 border border-line text-ink">
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
