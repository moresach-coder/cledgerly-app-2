'use client';
import { STATUS_META, fmt } from '@/lib/reference';

interface Counts {
  total: number;
  pending: number;
  accepted: number;
  unknown: number;
  deferred: number;
  duplicate: number;
}
interface Statement {
  id: string;
  account: string;
  declared: number | null;
  parsed: number;
}

export default function ProgressCard({ counts, statements }: { counts: Counts; statements: Statement[] }) {
  const done = counts.accepted + counts.unknown + counts.duplicate;
  const pct = counts.total ? Math.round((done / counts.total) * 100) : 0;
  const order: (keyof Counts)[] = ['accepted', 'unknown', 'duplicate', 'deferred', 'pending'];

  const unreconciled = statements.filter((s) => s.declared != null && Math.abs(s.declared - s.parsed) > 1);
  const checkedCount = statements.filter((s) => s.declared != null).length;

  return (
    <div className="bg-surface border border-line rounded-2xl p-4">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <div className="text-2xl font-semibold mono">{pct}%</div>
          <div className="text-caption text-muted">reviewed</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold mono">
            {done}/{counts.total}
          </div>
          <div className="text-caption text-muted">transactions</div>
        </div>
      </div>
      <div className="h-[7px] rounded bg-surface2 overflow-hidden flex">
        {counts.total === 0 ? (
          <div className="h-full w-full bg-surface2" />
        ) : (
          order.map((s) =>
            counts[s] ? (
              <div
                key={s}
                className="h-full"
                style={{ width: `${(counts[s] / counts.total) * 100}%`, background: STATUS_META[s].color }}
              />
            ) : null
          )
        )}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {order
          .filter((s) => counts[s])
          .map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-micro text-muted">
              <i className="w-1.5 h-1.5 rounded-sm inline-block" style={{ background: STATUS_META[s].color }} />
              {STATUS_META[s].label} {counts[s]}
            </span>
          ))}
      </div>

      {statements.length > 0 && (
        <div className="mt-2.5">
          {unreconciled.length ? (
            unreconciled.map((s) => (
              <div key={s.id} className="text-caption p-2.5 rounded-lg flex gap-2 items-start bg-neg/10 text-neg">
                <span>&#9888;</span>
                <span>
                  <b>{s.account}</b> does not reconcile. Statement says {fmt(s.declared!)}, parsed {fmt(s.parsed)},
                  gap {fmt(Math.abs(s.declared! - s.parsed))}. Lines are missing or duplicated.
                </span>
              </div>
            ))
          ) : checkedCount ? (
            <div className="text-caption p-2.5 rounded-lg flex gap-2 items-start bg-pos/10 text-pos">
              <span>&#10003;</span>
              <span>
                {checkedCount} statement{checkedCount === 1 ? '' : 's'} reconciled against declared totals.
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
