'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CardVisual from '@/components/CardVisual';
import TxnRow from '@/components/TxnRow';
import EditModal, { type EditResult } from '@/components/EditModal';
import FilterSheet, { DEFAULT_FILTERS, type TxnFilters } from '@/components/FilterSheet';
import { Empty } from '@/components/Section';
import CategoryIcon from '@/components/CategoryIcon';
import Amount from '@/components/Amount';
import { catInfo, fmt, CATEGORIES } from '@/lib/reference';
import { useToast } from '@/components/Toast';
import type { Txn } from '@/lib/repo';

const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(k: string) {
  if (k.length === 4) return k;
  const [y, m] = k.split('-');
  return `${MONTH_SHORT[Number(m) - 1]} ${y}`;
}
function monthShort(k: string) {
  const [, m] = k.split('-');
  return MONTH_SHORT[Number(m) - 1]?.toUpperCase() || k;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function RevealSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 600ms ${SPRING} ${delay}ms, transform 600ms ${SPRING} ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Shell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-credline/20 rounded-[1.25rem] p-[1px] ${className}`}>
      <div className="bg-credsurface rounded-[calc(1.25rem-1px)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function fmtDonut(v: number): string {
  if (v >= 10000000000000) return `₹${(v / 10000000000000).toFixed(1)} T Cr`;
  if (v >= 1000000000000) return `₹${(v / 10000000).toFixed(0)} Cr`;
  if (v >= 10000000000) return `₹${(v / 10000000).toFixed(0)} Cr`;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  return fmt(v);
}

/* ─── Donut Chart ─── */
function DonutChart({ entries, total }: { entries: [string, number][]; total: number }) {
  const size = 160;
  const cx = size / 2, cy = size / 2;
  const r = 56;
  const strokeW = 22;
  const gap = 0.03;

  const slices: { id: string; color: string; start: number; end: number }[] = [];
  let cursor = -Math.PI / 2;
  for (const [id, val] of entries) {
    const pct = total > 0 ? val / total : 0;
    if (pct < 0.005) continue;
    const sweep = pct * Math.PI * 2 - gap;
    slices.push({ id, color: CATEGORIES.find(c => c.id === id)?.color || '#7A8296', start: cursor, end: cursor + sweep });
    cursor += pct * Math.PI * 2;
  }

  function arc(s: number, e: number) {
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    return `M${x1},${y1} A${r},${r} 0 ${e - s > Math.PI ? 1 : 0} 1 ${x2},${y2}`;
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        {slices.length === 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4E4E0" strokeWidth={strokeW} />
        )}
        {slices.map((s) => (
          <path key={s.id} d={arc(s.start, s.end)} fill="none" stroke={s.color} strokeWidth={strokeW} strokeLinecap="round" />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
        <span className={`font-extrabold text-credink tabular-nums leading-tight ${fmtDonut(total).length > 10 ? 'text-[9px]' : total >= 100000 ? 'text-caption' : 'text-heading'}`}>
          {fmtDonut(total)}
        </span>
        <span className="text-[8px] uppercase tracking-[0.1em] text-credmuted font-semibold mt-0.5">total spend</span>
      </div>
    </div>
  );
}

/* ─── Spend Trends Bar Chart ─── */
function SpendTrends({ spendByMonth, currentMonth, ready }: { spendByMonth: Record<string, number>; currentMonth: string; ready: boolean }) {
  const months = Object.keys(spendByMonth).sort();
  const lastMonths = months.slice(-6);
  if (lastMonths.length < 2) return null;

  const values = lastMonths.map(m => spendByMonth[m] || 0);
  const max = Math.max(...values, 1);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgPct = (avg / max) * 100;

  const currentIdx = lastMonths.indexOf(currentMonth);
  const prevMonth = currentIdx > 0 ? lastMonths[currentIdx - 1] : lastMonths.length >= 2 ? lastMonths[lastMonths.length - 2] : null;
  const currentVal = currentMonth !== 'all' ? (spendByMonth[currentMonth] || 0) : values[values.length - 1] || 0;
  const prevVal = prevMonth ? (spendByMonth[prevMonth] || 0) : 0;
  const changePct = prevVal > 0 ? Math.round(((currentVal - prevVal) / prevVal) * 100) : 0;
  const isDown = changePct < 0;

  return (
    <Shell>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Spend Trends</div>
          {prevVal > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isDown ? 'bg-pos/10 text-pos' : 'bg-neg/10 text-neg'
            }`}>
              {isDown ? '↓' : '↑'} {Math.abs(changePct)}% vs last month
            </span>
          )}
        </div>

        <div className="flex items-end gap-[5px] h-28 relative">
          {/* Avg line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-pos/30 z-10 pointer-events-none"
            style={{ bottom: `${avgPct}%` }}
          >
            <span className="absolute -top-4 left-0 text-[7px] font-bold text-pos/50 tabular-nums">
              avg
            </span>
          </div>

          {lastMonths.map((m, i) => {
            const val = values[i];
            const pct = (val / max) * 100;
            const isCurrent = m === currentMonth || (currentMonth === 'all' && i === lastMonths.length - 1);
            const active = val > 0;
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div
                  className={`w-full rounded-[3px] ${isCurrent ? 'bg-credink' : active ? 'bg-credline' : 'bg-credline/30'}`}
                  style={{
                    height: ready ? `${Math.max(pct, active ? 4 : 1)}%` : '1%',
                    transition: `height 500ms ${SPRING} ${i * 40}ms`,
                  }}
                />
                <span className={`text-[8px] font-bold ${isCurrent ? 'text-credink' : 'text-credmuted/50'}`}>
                  {monthShort(m)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

/* ─── Review Progress ─── */
function ReviewProgress({ confirmed, total }: { confirmed: number; total: number }) {
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const remaining = total - confirmed;
  const done = pct === 100;
  return (
    <div className="flex items-center gap-4">
      {/* Ring */}
      <div className="relative w-12 h-12 flex-none">
        <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
          <circle cx="24" cy="24" r="19" fill="none" stroke="#E4E4E0" strokeWidth="4" />
          <circle
            cx="24" cy="24" r="19" fill="none"
            stroke={done ? '#16A34A' : '#2F5BEA'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 119.4} 119.4`}
            style={{ transition: `stroke-dasharray 800ms ${SPRING}` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-extrabold text-credink tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-small font-bold text-credink">{confirmed} confirmed</div>
        {remaining > 0 ? (
          <div className="text-[10px] text-warn font-semibold">{remaining} need review</div>
        ) : (
          <div className="text-[10px] text-pos font-semibold">All done</div>
        )}
      </div>
    </div>
  );
}

/* ─── Period Picker Dropdown ─── */
function PeriodDropdown({
  month, months, years, onSelect, onClose,
}: {
  month: string;
  months: string[];
  years: Map<string, string[]>;
  onSelect: (m: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1.5 z-50 bg-credsurface border border-credline/60 rounded-2xl shadow-lifted p-2 min-w-[200px] max-h-80 overflow-y-auto animate-dropdownIn">
        <button
          onClick={() => onSelect('all')}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-small font-semibold transition-colors duration-150 ${
            month === 'all' ? 'bg-accent/10 text-accent' : 'text-credink hover:bg-credbg'
          }`}
        >
          All time
        </button>
        {[...years.entries()].map(([year, yMonths]) => (
          <div key={year}>
            <button
              onClick={() => onSelect(year)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-small font-bold transition-colors duration-150 ${
                month === year ? 'bg-accent/10 text-accent' : 'text-credink hover:bg-credbg'
              }`}
            >
              {year}
              <span className="text-credmuted font-normal ml-1.5 text-caption">{yMonths.length} mo</span>
            </button>
            <div className="ml-3 border-l-2 border-credline/30 mb-1">
              {yMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => onSelect(m)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-caption font-semibold transition-colors duration-150 ${
                    month === m ? 'bg-accent/10 text-accent' : 'text-credmuted hover:bg-credbg hover:text-credink'
                  }`}
                >
                  {monthLabel(m)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Main Page ─── */
function periodToMonth(p: string | null): string {
  if (!p || p === 'all') return 'all';
  if (p.startsWith('fy')) return 'all';
  if (p.startsWith('y')) return p.slice(1);
  if (p.startsWith('m')) return p.slice(1);
  if (p.startsWith('q')) return 'all';
  return p;
}

export default function CardDetailPage({ params }: { params: { account: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = decodeURIComponent(params.account);
  const toast = useToast();
  const [month, setMonth] = useState(() => periodToMonth(searchParams.get('period')));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TxnFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Txn | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  const load = useCallback(async (m: string) => {
    setChartReady(false);
    const res = await fetch(`/api/accounts/${encodeURIComponent(account)}?month=${m}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
    setTimeout(() => setChartReady(true), 80);
  }, [account]);

  useEffect(() => { load(month); }, [month, load]);

  const handleEditSubmit = useCallback(
    async (result: EditResult) => {
      if (!selected) return;
      await fetch(`/api/transactions/${selected.id}`, {
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
      setSelected(null);
      const oldLabel = catInfo(selected.category || 'other').label;
      const newLabel = result.category ? catInfo(result.category).label : 'Other';
      if (result.category !== (selected.category || null)) {
        toast(`${fmt(selected.amount)} moved from ${oldLabel} → ${newLabel}`, 'ok');
      }
      await load(month);
    },
    [selected, month, load, toast]
  );

  const activeFilterCount =
    (filters.categories.length ? 1 : 0) +
    (filters.type !== 'all' ? 1 : 0) +
    (filters.min != null || filters.max != null ? 1 : 0) +
    (filters.sort !== 'new' ? 1 : 0);

  const confirmedCount = data?.transactions.filter((t: Txn) => t.status === 'accepted').length || 0;
  const totalTxns = data?.transactions.length || 0;
  const pendingTxns = data?.transactions.filter((t: Txn) => t.status !== 'accepted') || [];

  const transactions: Txn[] = useMemo(() => {
    if (!data) return [];
    let rows: Txn[] = [...data.transactions];
    if (filters.type !== 'all') rows = rows.filter((t) => t.direction === filters.type);
    if (filters.categories.length) rows = rows.filter((t) => t.category && filters.categories.includes(t.category));
    if (filters.min != null) rows = rows.filter((t) => t.amount >= filters.min!);
    if (filters.max != null) rows = rows.filter((t) => t.amount <= filters.max!);
    rows.sort((a, b) => {
      if (filters.sort === 'high') return b.amount - a.amount;
      if (filters.sort === 'low') return a.amount - b.amount;
      const ad = a.date || '', bd = b.date || '';
      return filters.sort === 'old' ? ad.localeCompare(bd) : bd.localeCompare(ad);
    });
    return rows;
  }, [data, filters]);

  const categoryEntries = data
    ? (Object.entries(data.byCategory) as [string, number][]).sort((a, b) => b[1] - a[1])
    : [];

  const periodLbl = month === 'all' ? 'All time' : monthLabel(month);
  const months: string[] = data?.months ?? [];

  const years = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of months) {
      const y = m.slice(0, 4);
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(m);
    }
    return map;
  }, [months]);

  return (
    <div className="min-h-screen bg-credbg pb-28">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full border border-credline flex items-center justify-center text-credmuted hover:text-credink hover:border-credink/20 transition-colors duration-300"
          style={{ transitionTimingFunction: SPRING }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setPeriodOpen(v => !v); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-credline bg-credsurface text-small font-bold hover:border-credink/15 transition-colors duration-200"
            style={{ transitionTimingFunction: SPRING }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-credmuted" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {periodLbl}
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="text-credmuted transition-transform duration-200"
              style={{ transform: periodOpen ? 'rotate(180deg)' : 'rotate(0)', transitionTimingFunction: SPRING }}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {periodOpen && (
            <PeriodDropdown
              month={month}
              months={months}
              years={years}
              onSelect={(m) => { setMonth(m); setPeriodOpen(false); }}
              onClose={() => setPeriodOpen(false)}
            />
          )}
        </div>
      </div>

      <div className="px-5 max-w-xl mx-auto space-y-4">
        {/* Card Visual */}
        <CardVisual account={account} amount={data?.spend || 0} amountLabel={month === 'all' ? 'all time' : periodLbl} size="lg" />

        {loading ? null : data && (
          <>
            {/* Review Progress + Quick Stats */}
            <RevealSection>
              <Shell>
                <div className="px-5 py-4 flex items-center justify-between">
                  <ReviewProgress confirmed={confirmedCount} total={totalTxns} />
                  <div className="text-right min-w-0 flex-shrink">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-credmuted font-bold">{periodLbl}</div>
                    <div className={`font-extrabold text-credink tabular-nums mt-0.5 ${data.spend >= 10000000 ? 'text-small' : 'text-title'}`}>{fmt(data.spend)}</div>
                    <div className="text-[10px] text-credmuted font-semibold mt-0.5">{totalTxns} transaction{totalTxns !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                {pendingTxns.length > 0 && (
                  <div className="px-5 pb-4">
                    <button
                      onClick={() => {
                        const periodParam = month === 'all' ? '' : month.length === 4 ? `&period=y${month}` : `&period=m${month}`;
                        router.push(`/review?account=${encodeURIComponent(account)}${periodParam}`);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-caption font-semibold text-accent border border-accent/20 bg-accent/5 active:scale-[0.98] transition-all hover:bg-accent/10"
                      style={{ transitionTimingFunction: SPRING }}
                    >
                      Review {pendingTxns.length} Transaction{pendingTxns.length !== 1 ? 's' : ''}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                )}
              </Shell>
            </RevealSection>

            {/* Category Breakdown */}
            {categoryEntries.length > 0 && (
              <RevealSection delay={60}>
                <Shell>
                  <div className="px-5 pt-5 pb-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted mb-4">Spending Breakdown</div>

                    <div className="flex items-center gap-5 mb-4">
                      <DonutChart entries={categoryEntries} total={data.spend} />
                      <div className="flex-1 space-y-2">
                        {categoryEntries.slice(0, 4).map(([id, v]) => {
                          const cat = catInfo(id);
                          const pct = data.spend ? ((v / data.spend) * 100).toFixed(0) : '0';
                          return (
                            <button
                              key={id}
                              onClick={() => router.push(`/category/${encodeURIComponent(id)}`)}
                              className="flex items-center gap-2 w-full text-left group"
                            >
                              <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: cat.color }} />
                              <span className="text-[11px] font-semibold text-credink truncate flex-1">{cat.label}</span>
                              <span className="text-[10px] text-credmuted font-bold tabular-nums">{pct}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Full list */}
                    <div className="space-y-0">
                      {categoryEntries.slice(0, showAllCategories ? undefined : 3).map(([id, v], i) => {
                        const cat = catInfo(id);
                        const pct = data.spend ? ((v / data.spend) * 100).toFixed(1) : '0';
                        const maxCat = categoryEntries[0][1];
                        const barW = Math.max((v / maxCat) * 100, 3);
                        const txnCount = data.transactions.filter((t: Txn) => (t.category || 'other') === id && t.direction === 'debit').length;
                        return (
                          <button
                            key={id}
                            onClick={() => router.push(`/category/${encodeURIComponent(id)}`)}
                            className={`w-full text-left py-3 ${i > 0 ? 'border-t border-credline/30' : ''}`}
                            style={{
                              opacity: chartReady ? 1 : 0,
                              transform: chartReady ? 'translateX(0)' : 'translateX(-6px)',
                              transition: `opacity 400ms ${SPRING} ${i * 50}ms, transform 400ms ${SPRING} ${i * 50}ms`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-credmuted/50 flex-none"><CategoryIcon id={id} size={14} /></span>
                                <span className="text-small font-semibold text-credink truncate">{cat.label}</span>
                                <span className="text-[9px] text-credmuted/40 font-medium tabular-nums">{txnCount} txn{txnCount !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-none">
                                <span className="text-[9px] text-credmuted/50 font-bold tabular-nums">{pct}%</span>
                                <span className="text-small font-bold text-credink tabular-nums">{fmt(v)}</span>
                              </div>
                            </div>
                            <div className="h-[3px] bg-credline/20 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: chartReady ? `${barW}%` : '0%',
                                  backgroundColor: cat.color,
                                  transition: `width 700ms ${SPRING} ${i * 50 + 150}ms`,
                                }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {categoryEntries.length > 3 && (
                      <button
                        onClick={() => setShowAllCategories(v => !v)}
                        className="w-full py-3 border-t border-credline/30 text-[10px] uppercase tracking-[0.1em] font-bold text-credmuted hover:text-credink transition-colors duration-200"
                      >
                        {showAllCategories ? 'Show less' : `View all ${categoryEntries.length}`}
                      </button>
                    )}
                  </div>
                </Shell>
              </RevealSection>
            )}

            {/* Spend Trends */}
            {data.spendByMonth && Object.keys(data.spendByMonth).length > 1 && (
              <RevealSection delay={100}>
                <SpendTrends
                  spendByMonth={data.spendByMonth}
                  currentMonth={month === 'all' ? Object.keys(data.spendByMonth).sort().pop()! : month}
                  ready={chartReady}
                />
              </RevealSection>
            )}

            {/* Transactions */}
            <RevealSection delay={60}>
              <Shell>
                {/* Header */}
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Transactions</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-credmuted/60 bg-credbg px-2 py-0.5 rounded-full tabular-nums">{transactions.length}</span>
                    <button
                      onClick={() => setFilterOpen(true)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200 ${
                        activeFilterCount ? 'bg-accent/10 text-accent border border-accent/30' : 'bg-credbg text-credmuted border border-transparent'
                      }`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Transaction rows */}
                <div className="divide-y divide-credline/30">
                  {transactions.slice(0, 80).map((t, i) => (
                    <div key={t.id} className={`flex items-center px-4 ${i % 2 === 1 ? 'bg-credbg/40' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <TxnRow t={t} onClick={() => setSelected(t)} />
                      </div>
                      {t.status === 'accepted' && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-pos flex-none ml-1" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
                {transactions.length === 0 && <Empty text="Nothing matches this filter." />}

              </Shell>
            </RevealSection>

            {transactions.length > 80 && (
              <p className="text-[10px] text-credmuted text-center py-2 tabular-nums">and {transactions.length - 80} more</p>
            )}
          </>
        )}
      </div>

      {filterOpen && (
        <FilterSheet initial={filters} onClose={() => setFilterOpen(false)} onApply={(f) => { setFilters(f); setFilterOpen(false); }} />
      )}
      {selected && (
        <EditModal
          txn={selected}
          onClose={() => setSelected(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}
