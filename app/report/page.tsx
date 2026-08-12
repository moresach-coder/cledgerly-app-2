'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import CategoryIcon from '@/components/CategoryIcon';
import { catInfo, fmt } from '@/lib/reference';
import { fyLabel } from '@/lib/period';
import { displayMerchant } from '@/lib/merchantName';

interface YearData {
  fy: number;
  label: string;
  total: number;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
  topMerchants: { merchant: string; total: number; count: number }[];
  biggestExpenses: { merchant: string; date: string; amount: number; category: string | null }[];
  recurring: { merchant: string; avg: number; months: number }[];
}

interface BudgetSuggestion {
  category: string;
  monthlyAvg: number;
  totalMonths: number;
}

interface ReportData {
  years: YearData[];
  fyList: number[];
  budgetSuggestions: BudgetSuggestion[];
}

const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';

function friendlyDate(d: string): string {
  const [yr, m, day] = d.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(day)} ${months[Number(m) - 1]} ${yr}`;
}

function pctChange(current: number, previous: number): { value: number; label: string } | null {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  return { value: pct, label: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%` };
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
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
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 700ms ${SPRING} ${delay}ms, transform 700ms ${SPRING} ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SectionShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-credline/20 rounded-[1.25rem] p-[1px] ${className}`}>
      <div className="bg-credsurface rounded-[calc(1.25rem-1px)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function AnnualReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [selectedFy, setSelectedFy] = useState<number | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    fetch('/api/report/annual')
      .then(r => r.json())
      .then((d: ReportData) => {
        setData(d);
        if (d.fyList.length > 0) setSelectedFy(d.fyList[0]);
        if (reducedMotion) { setChartReady(true); return; }
        setTimeout(() => setChartReady(true), 100);
      });
  }, [reducedMotion]);

  const switchFy = useCallback((fy: number) => {
    if (reducedMotion) { setSelectedFy(fy); setChartReady(true); return; }
    setChartReady(false);
    setSelectedFy(fy);
    setTimeout(() => setChartReady(true), 60);
  }, [reducedMotion]);

  if (!data) {
    return (
      <div className="min-h-screen bg-credbg flex items-center justify-center" role="status" aria-label="Loading report…">
        <div className="w-5 h-5 border-2 border-credink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const year = data.years.find(y => y.fy === selectedFy) || data.years[0];
  if (!year) {
    return (
      <div className="min-h-screen bg-credbg px-5 py-8 max-w-xl mx-auto">
        <p className="text-credmuted text-center mt-20 text-body">No transaction data found.</p>
      </div>
    );
  }

  const prevYear = data.years.find(y => y.fy === year.fy - 1);
  const totalChange = prevYear ? pctChange(year.total, prevYear.total) : null;

  const fyMonthKeys: string[] = [];
  for (let i = 0; i < 12; i++) {
    const mo = ((3 + i) % 12) + 1;
    const yr = mo >= 4 ? year.fy : year.fy + 1;
    fyMonthKeys.push(`${yr}-${String(mo).padStart(2, '0')}`);
  }

  const monthValues = fyMonthKeys.map(m => year.byMonth[m] || 0);
  const maxMonth = Math.max(...monthValues, 1);
  const activeMonths = monthValues.filter(v => v > 0).length;
  const avgMonth = year.total / Math.max(activeMonths, 1);

  const catEntries = Object.entries(year.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries.length > 0 ? catEntries[0][1] : 1;

  const barTransition = (i: number, delayBase = 0) =>
    reducedMotion ? 'none' : `width 800ms ${SPRING} ${i * 60 + delayBase}ms`;
  const fadeTransition = (i: number) =>
    reducedMotion ? 'none' : `opacity 500ms ${SPRING} ${i * 60}ms, transform 500ms ${SPRING} ${i * 60}ms`;
  const heightTransition = (i: number) =>
    reducedMotion ? 'none' : `height 600ms ${SPRING} ${i * 35}ms`;

  return (
    <div className="min-h-screen bg-credbg pb-32 touch-manipulation">
      {/* Header */}
      <div className="px-5 pt-8 pb-6 max-w-xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-credmuted text-small font-medium mb-6 hover:text-credink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-credbg rounded-md transition-colors duration-300"
          style={{ transitionTimingFunction: SPRING }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </Link>
        <h1 className="text-[13px] uppercase tracking-[0.14em] font-bold text-credmuted">
          Annual Report
        </h1>
      </div>

      <div className="px-5 max-w-xl mx-auto space-y-5">
        {/* FY Selector */}
        {data.fyList.length > 1 && (
          <nav aria-label="Financial year" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {data.fyList.map(fy => {
              const active = fy === selectedFy;
              return (
                <button
                  key={fy}
                  onClick={() => switchFy(fy)}
                  aria-pressed={active}
                  className={`px-4 py-2 rounded-full text-small font-bold whitespace-nowrap pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-credbg transition-colors duration-500 ${
                    active
                      ? 'bg-credink text-white'
                      : 'bg-transparent text-credmuted border border-credline hover:bg-credline/30 active:scale-[0.97]'
                  }`}
                  style={{ transitionTimingFunction: SPRING }}
                >
                  {fyLabel(fy)}
                </button>
              );
            })}
          </nav>
        )}

        {/* Hero — Total Spend */}
        <RevealSection>
          <div className="rounded-[1.5rem] relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1e2140 0%, #141627 30%, #0c0e18 60%, #10131f 100%)' }}>
            <div className="absolute inset-0" aria-hidden="true">
              <div className="absolute -top-12 -right-8 w-64 h-64 bg-gradient-to-br from-[#3b5bdb]/20 via-[#5c7cfa]/10 to-transparent rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#845ef7]/12 via-[#5c7cfa]/6 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 blur-xl" />
            </div>
            <div className="relative px-7 py-8">
              <div className="text-white/50 text-[10px] uppercase tracking-[0.18em] font-semibold mb-5">{year.label}</div>
              <div className="text-white font-semibold text-[1.75rem] leading-[1.1] tracking-[-0.02em] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmt(year.total)}
              </div>
              <div className="flex items-center gap-3 mt-4">
                {totalChange && (
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide whitespace-nowrap ${
                    totalChange.value > 0 ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300'
                  }`}>
                    {totalChange.label} vs {prevYear!.label}
                  </span>
                )}
                <span className="text-white/25 text-[10px] font-semibold tracking-wide tabular-nums">
                  ~{fmt(avgMonth)}/mo
                </span>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* Monthly Trend */}
        <RevealSection delay={80}>
          <SectionShell>
            <div className="px-5 pt-5 pb-4">
              <h2 className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted mb-5">Monthly Spend</h2>
              <div className="flex items-end gap-[5px] h-40" role="img" aria-label={`Monthly spending trend for ${year.label}`}>
                {fyMonthKeys.map((m, i) => {
                  const v = year.byMonth[m] || 0;
                  const h = Math.max((v / maxMonth) * 100, v > 0 ? 6 : 1);
                  const active = v > 0;
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Hover tooltip */}
                      {active && chartReady && (
                        <div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-credink text-white text-[8px] font-bold tabular-nums whitespace-nowrap opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-10"
                          style={{
                            transition: `opacity 200ms ${SPRING}, transform 200ms ${SPRING}`,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}
                          aria-hidden="true"
                        >
                          {fmt(v)}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-credink" />
                        </div>
                      )}
                      <div className="w-full flex-none mb-1.5" style={{ height: `${h}%` }}>
                        <div
                          className={`w-full h-full rounded-[4px] transition-all ${
                            active
                              ? 'bg-credink group-hover:bg-accent group-hover:shadow-[0_0_12px_rgba(47,91,234,0.3)]'
                              : 'bg-credline/30'
                          }`}
                          style={{
                            height: chartReady || reducedMotion ? '100%' : '2%',
                            transform: active ? undefined : undefined,
                            transition: `height 600ms ${SPRING} ${i * 35}ms, background-color 250ms ${SPRING}, box-shadow 250ms ${SPRING}, transform 250ms ${SPRING}`,
                          }}
                        />
                      </div>
                      <span className={`text-[8px] font-semibold transition-colors duration-200 ${
                        active ? 'text-credmuted group-hover:text-accent' : 'text-credline'
                      }`}>
                        {FY_MONTHS[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionShell>
        </RevealSection>

        {/* Category Breakdown */}
        <RevealSection delay={120}>
          <SectionShell>
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">By Category</h2>
                <span className="text-[9px] font-bold text-credmuted/60 bg-credbg px-2 py-0.5 rounded-full tabular-nums" aria-label={`${catEntries.length} categories`}>{catEntries.length}</span>
              </div>
              <div className="space-y-0">
                {catEntries.map(([catId, amount], i) => {
                  const cat = catInfo(catId);
                  const pct = ((amount / year.total) * 100).toFixed(0);
                  const prevAmt = prevYear?.byCategory[catId];
                  const change = prevAmt ? pctChange(amount, prevAmt) : null;
                  const barW = Math.max((amount / maxCat) * 100, 3);
                  return (
                    <div
                      key={catId}
                      className={`py-3.5 ${i > 0 ? 'border-t border-credline/30' : ''}`}
                      style={{
                        opacity: chartReady || reducedMotion ? 1 : 0,
                        transform: chartReady || reducedMotion ? 'translateX(0)' : 'translateX(-8px)',
                        transition: fadeTransition(i),
                      }}
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
                          style={{ background: `${cat.color}22`, color: cat.color }}
                          aria-hidden="true"
                        >
                          <CategoryIcon id={catId} size={16} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-small font-semibold text-credink">{cat.label}</span>
                        </div>
                        <span className="text-[9px] text-credmuted/50 font-bold tabular-nums mr-1">{pct}%</span>
                        {change && (
                          <span className={`text-[9px] font-bold tabular-nums mr-1 ${change.value > 0 ? 'text-red-400/70' : 'text-green-400/70'}`}>
                            {change.label}
                          </span>
                        )}
                        <span className="text-small font-bold text-credink tabular-nums">{fmt(amount)}</span>
                      </div>
                      <div className="h-[3px] bg-credline/20 rounded-full overflow-hidden ml-11" role="progressbar" aria-valuenow={amount} aria-valuemax={maxCat} aria-label={`${cat.label}: ${pct}%`}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: chartReady || reducedMotion ? `${barW}%` : '0%',
                            backgroundColor: cat.color,
                            transition: barTransition(i, 200),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionShell>
        </RevealSection>

        {/* Top Merchants */}
        {year.topMerchants.length > 0 && (
          <RevealSection delay={60}>
            <SectionShell>
              <div className="px-5 pt-5 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Top Merchants</h2>
                  <span className="text-[9px] font-bold text-credmuted/60 bg-credbg px-2 py-0.5 rounded-full tabular-nums">{year.topMerchants.length}</span>
                </div>
                {year.topMerchants.map((m, i) => (
                  <div key={i} className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-credline/30' : ''}`}>
                    <div className="min-w-0 flex-1 mr-4">
                      <span className="text-small font-semibold text-credink block truncate">{displayMerchant(m.merchant)}</span>
                      <span className="text-[10px] text-credmuted/60 tabular-nums">{m.count} txn{m.count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-small font-bold text-credink tabular-nums flex-none">{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            </SectionShell>
          </RevealSection>
        )}

        {/* Biggest Expenses */}
        {year.biggestExpenses.length > 0 && (
          <RevealSection delay={60}>
            <SectionShell>
              <div className="px-5 pt-5 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Biggest Expenses</h2>
                  <span className="text-[9px] font-bold text-credmuted/60 bg-credbg px-2 py-0.5 rounded-full tabular-nums">{year.biggestExpenses.length}</span>
                </div>
                {year.biggestExpenses.map((e, i) => (
                  <div key={i} className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-credline/30' : ''}`}>
                    <div className="min-w-0 flex-1 mr-4">
                      <span className="text-small font-semibold text-credink block truncate">{displayMerchant(e.merchant)}</span>
                      <span className="text-[10px] text-credmuted/60">{friendlyDate(e.date)}</span>
                    </div>
                    <span className="text-small font-bold text-credink tabular-nums flex-none">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            </SectionShell>
          </RevealSection>
        )}

        {/* Recurring */}
        {year.recurring.length > 0 && (
          <RevealSection delay={60}>
            <SectionShell>
              <div className="px-5 pt-5 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Recurring</h2>
                  <span className="text-[9px] font-bold text-credmuted/60 bg-credbg px-2 py-0.5 rounded-full tabular-nums">{year.recurring.length}</span>
                </div>
                {year.recurring.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-credline/30' : ''}`}>
                    <div className="min-w-0 flex-1 mr-4">
                      <span className="text-small font-semibold text-credink block truncate">{displayMerchant(r.merchant)}</span>
                      <span className="text-[10px] text-credmuted/60">{r.months} mo{r.months !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-right flex-none">
                      <span className="text-small font-bold text-credink tabular-nums">{fmt(r.avg)}</span>
                      <span className="text-[10px] text-credmuted/50 ml-0.5">avg</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionShell>
          </RevealSection>
        )}

        {/* Budget Suggestions */}
        {data.budgetSuggestions.length > 0 && (
          <RevealSection delay={60}>
            <SectionShell>
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Suggested Budget</h2>
                <p className="text-[10px] text-credmuted/50 mt-1 mb-4">Based on your spending averages</p>
                {data.budgetSuggestions.map((b, i) => {
                  const cat = catInfo(b.category);
                  return (
                    <div key={i} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-credline/30' : ''}`}>
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
                        style={{ background: `${cat.color}22`, color: cat.color }}
                        aria-hidden="true"
                      >
                        <CategoryIcon id={b.category} size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-small font-semibold text-credink truncate block">{cat.label}</span>
                        <span className="text-[10px] text-credmuted/50 tabular-nums">avg over {b.totalMonths} month{b.totalMonths !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="text-right flex-none">
                        <span className="text-small font-bold text-credink tabular-nums">{fmt(b.monthlyAvg)}</span>
                        <span className="text-[10px] text-credmuted/50">/mo</span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 mt-1 border-t border-credline/50 flex justify-between">
                  <span className="text-small font-bold text-credink">Total</span>
                  <span className="text-small font-bold text-credink tabular-nums">
                    {fmt(data.budgetSuggestions.reduce((s, b) => s + b.monthlyAvg, 0))}/mo
                  </span>
                </div>
              </div>
            </SectionShell>
          </RevealSection>
        )}
      </div>
    </div>
  );
}
