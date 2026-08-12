'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import PeriodPicker from '@/components/PeriodPicker';
import Amount from '@/components/Amount';
import { useCountUp } from '@/components/CountUp';
import CategoryIcon from '@/components/CategoryIcon';
import BrandBadge from '@/components/BrandBadge';
import { catInfo, fmt, CATEGORIES } from '@/lib/reference';
import { currentPeriod, parsePeriod, type Granularity } from '@/lib/period';
import { accountKind } from '@/lib/cardMeta';
import { displayMerchant } from '@/lib/merchantName';
import SmartPrompt from '@/components/SmartPrompt';

const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';

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

export default function SummaryPage() {
  const router = useRouter();
  const [granularity, setGranularity] = useState<Granularity>('year');
  const [period, setPeriod] = useState(currentPeriod().id);
  const [data, setData] = useState<any>(null);
  const [categorySort, setCategorySort] = useState<'amount' | 'name'>('amount');
  const [categorySortOpen, setCategorySortOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [accountOrder, setAccountOrder] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (p: string) => {
    setReady(false);
    const res = await fetch(`/api/summary?period=${encodeURIComponent(p)}`);
    const d = await res.json();
    setData(d);
    setTimeout(() => setReady(true), 80);
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/summary?period=all');
      const all = await res.json();
      setAccountOrder(
        Object.entries(all.byAccount as Record<string, number>)
          .sort((a, b) => b[1] - a[1])
          .map(([name]) => name)
      );
    })();
  }, []);

  const rank = (name: string) => {
    const i = accountOrder.indexOf(name);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const accountEntries = data
    ? (Object.entries(data.byAccount) as [string, number][]).sort(
        (a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1]
      )
    : [];

  const cards = accountEntries.filter(([a]) => accountKind(a) !== 'bank');
  const banks = accountEntries.filter(([a]) => accountKind(a) === 'bank');

  const byCategoryAll = data?.byCategoryAll ?? {};
  const categoryEntries = data
    ? (Object.entries(byCategoryAll) as [string, number][]).sort((a, b) =>
        categorySort === 'amount' ? b[1] - a[1] : catInfo(a[0]).label.localeCompare(catInfo(b[0]).label)
      )
    : [];

  const maxCategoryVal = categoryEntries.length > 0 ? categoryEntries[0][1] : 1;

  const label = parsePeriod(period).label;
  const total = data?.total ?? 0;
  const animatedTotal = useCountUp(total);

  const AccountRow = ({ account, v, index }: { account: string; v: number; index: number }) => {
    const confirm = data?.confirmByAccount?.[account];
    const confirmPct = confirm ? Math.round((confirm.confirmed / confirm.total) * 100) : 0;
    const allConfirmed = confirm && confirm.confirmed === confirm.total;
    return (
      <button
        onClick={() => router.push(`/cards/${encodeURIComponent(account)}?period=${encodeURIComponent(period)}`)}
        className="w-full text-left px-5 py-3.5 flex items-center gap-3.5 hover:bg-credbg/40 transition-colors duration-200 group"
        style={{
          opacity: ready ? 1 : 0,
          transform: ready ? 'translateX(0)' : 'translateX(-6px)',
          transition: `opacity 400ms ${SPRING} ${index * 50}ms, transform 400ms ${SPRING} ${index * 50}ms, background-color 200ms ease`,
        }}
      >
        <BrandBadge account={account} size={38} />
        <div className="flex-1 min-w-0">
          <div className="text-small font-semibold text-credink leading-snug">{account}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="h-[3px] flex-1 rounded-full bg-credline/40 overflow-hidden max-w-[100px]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: ready ? `${confirmPct}%` : '0%',
                  backgroundColor: allConfirmed ? '#16A34A' : '#F59E0B',
                  transitionTimingFunction: SPRING,
                }}
              />
            </div>
            <span className={`text-[9px] font-semibold tabular-nums ${allConfirmed ? 'text-pos' : 'text-warn'}`}>
              {confirm ? (allConfirmed ? 'All reviewed' : `${confirm.total - confirm.confirmed} to review`) : '–'}
            </span>
          </div>
        </div>
        <div className="text-right flex-none">
          <span className="text-small font-bold text-credink tabular-nums">{fmt(v)}</span>
        </div>
      </button>
    );
  };

  const EmptyAccountRow = ({ label: lbl }: { label: string }) => (
    <div className="px-5 py-4 flex items-center gap-3.5">
      <span className="w-[38px] h-[38px] rounded-full bg-credline/30 flex items-center justify-center text-credmuted text-micro font-bold">—</span>
      <div className="flex-1 min-w-0">
        <div className="text-small text-credmuted">No {lbl} for {label}</div>
      </div>
      <span className="text-small font-bold text-credmuted tabular-nums">₹0</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-credbg text-credink pb-8">
      <div className="px-5 pt-4">
        <AppHeader title="" />
      </div>

      <div className="px-5 max-w-xl mx-auto space-y-4">
        {/* Smart Search — hero */}
        <SmartPrompt />

        {/* Heading row with period picker */}
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] uppercase tracking-[0.14em] font-bold text-credink">Overview</h2>
          {data && (
            <PeriodPicker
              months={data?.months ?? []}
              value={period}
              granularity={granularity}
              onApply={(id, g) => { setGranularity(g); setPeriod(id); }}
            />
          )}
        </div>

        {data && (
          <>
            {/* Hero card — gradient background */}
            <RevealSection>
              <div className="rounded-[1.5rem] relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1e2140 0%, #141627 30%, #0c0e18 60%, #10131f 100%)' }}>
                <div className="absolute inset-0">
                  <div className="absolute -top-12 -right-8 w-64 h-64 bg-gradient-to-br from-[#3b5bdb]/20 via-[#5c7cfa]/10 to-transparent rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#845ef7]/12 via-[#5c7cfa]/6 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 blur-xl" />
                  <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-[#339af0]/[0.04] rounded-full blur-2xl" />
                </div>
                <div className="relative px-7 py-7 text-center">
                  <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/50 mb-5">
                    Total Spent · {label}
                  </div>

                  <div className="text-white font-semibold text-[1.75rem] leading-[1.1] tracking-[-0.02em] tabular-nums" data-amount style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(animatedTotal)}
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* Cards — always show */}
            <RevealSection delay={60}>
              <Shell>
                <div className="px-5 pt-4 pb-1.5 flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Cards</span>
                  <span className="text-[9px] font-bold text-credmuted/60 bg-credbg px-2 py-0.5 rounded-full tabular-nums">{cards.length}</span>
                </div>
                {cards.length > 0 ? (
                  <div className="divide-y divide-credline/30">
                    {cards.map(([account, v], i) => (
                      <AccountRow key={account} account={account} v={v} index={i} />
                    ))}
                  </div>
                ) : (
                  <EmptyAccountRow label="cards" />
                )}
                <div className="h-1.5" />
              </Shell>
            </RevealSection>

            {/* Banks — always show */}
            <RevealSection delay={100}>
              <Shell>
                <div className="px-5 pt-4 pb-1.5 flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Bank Accounts</span>
                  <span className="text-[9px] font-bold text-credmuted/60 bg-credbg px-2 py-0.5 rounded-full tabular-nums">{banks.length}</span>
                </div>
                {banks.length > 0 ? (
                  <div className="divide-y divide-credline/30">
                    {banks.map(([account, v], i) => (
                      <AccountRow key={account} account={account} v={v} index={i} />
                    ))}
                  </div>
                ) : (
                  <EmptyAccountRow label="bank accounts" />
                )}
                <div className="h-1.5" />
              </Shell>
            </RevealSection>

            {/* Categories — show ALL spend, not just confirmed */}
            <RevealSection delay={60}>
              <Shell>
                <div className="px-5 pt-4 pb-2 flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">By Category</span>
                  <div className="relative">
                    <button
                      onClick={() => setCategorySortOpen(v => !v)}
                      className="w-7 h-7 rounded-full bg-credbg flex items-center justify-center text-credmuted hover:text-credink transition-colors duration-200"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        {categorySort === 'amount'
                          ? <path d="M3 6h18M6 12h12M9 18h6" />
                          : <path d="M4 6h16M4 12h10M4 18h4" />
                        }
                      </svg>
                    </button>
                    {categorySortOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setCategorySortOpen(false)} />
                        <div className="absolute right-0 top-9 z-50 bg-credsurface border border-credline/60 rounded-2xl shadow-lifted py-1.5 min-w-[150px] animate-dropdownIn">
                          {([['amount', 'By Amount'], ['name', 'By Name']] as const).map(([id, lbl]) => (
                            <button
                              key={id}
                              onClick={() => { setCategorySort(id); setCategorySortOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-small transition-colors duration-150 ${
                                categorySort === id ? 'text-accent font-semibold' : 'text-credmuted font-medium hover:text-credink'
                              }`}
                            >
                              {lbl}
                              {categorySort === id && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-2 text-accent" aria-hidden>
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-2">
                  {categoryEntries.slice(0, showAllCategories ? undefined : 5).map(([id, v]: any, i: number) => {
                    const pct = total > 0 ? Math.round(((v as number) / total) * 100) : 0;
                    const barPct = Math.round(((v as number) / maxCategoryVal) * 100);
                    const color = CATEGORIES.find(c => c.id === id)?.color || '#7A8296';
                    return (
                      <button
                        key={id}
                        onClick={() => router.push(`/category/${encodeURIComponent(id)}`)}
                        className={`w-full text-left py-3 ${i > 0 ? 'border-t border-credline/30' : ''} group`}
                        style={{
                          opacity: ready ? 1 : 0,
                          transform: ready ? 'translateX(0)' : 'translateX(-6px)',
                          transition: `opacity 400ms ${SPRING} ${i * 50}ms, transform 400ms ${SPRING} ${i * 50}ms`,
                        }}
                      >
                        <div className="flex items-center gap-3 mb-1.5">
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-none group-hover:scale-110 transition-transform duration-200"
                            style={{ background: `${color}22`, color, transitionTimingFunction: SPRING }}
                          >
                            <CategoryIcon id={id} size={16} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-small font-semibold text-credink">{catInfo(id).label}</span>
                          </div>
                          <span className="text-[9px] text-credmuted/50 font-bold tabular-nums mr-1">{pct}%</span>
                          <span className="text-small font-bold text-credink tabular-nums">{fmt(v)}</span>
                        </div>
                        <div className="h-[3px] bg-credline/20 rounded-full overflow-hidden ml-11">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: ready ? `${barPct}%` : '0%',
                              backgroundColor: color,
                              transition: `width 700ms ${SPRING} ${i * 50 + 150}ms`,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}

                  {/* Unconfirmed row */}
                  {(data?.unconfirmedTotal ?? 0) > 0 && (
                    <button
                      onClick={() => router.push('/review')}
                      className={`w-full text-left py-3 ${categoryEntries.length > 0 ? 'border-t border-credline/30' : ''} group`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none bg-warn/10 text-warn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4M12 16h.01" />
                          </svg>
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-small font-semibold text-warn/80">Unreviewed</span>
                        </div>
                        <span className="text-small font-bold text-warn tabular-nums">{fmt(data.unconfirmedTotal)}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-credmuted/30 ml-0.5" aria-hidden>
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>

                {categoryEntries.length > 5 && (
                  <button
                    onClick={() => setShowAllCategories(v => !v)}
                    className="w-full py-3 border-t border-credline/30 text-[10px] uppercase tracking-[0.1em] font-bold text-credmuted hover:text-credink transition-colors duration-200 flex items-center justify-center gap-1.5"
                  >
                    {showAllCategories ? 'Show less' : `View all ${categoryEntries.length}`}
                    <svg
                      width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="transition-transform duration-200"
                      style={{ transform: showAllCategories ? 'rotate(180deg)' : 'rotate(0)', transitionTimingFunction: SPRING }}
                      aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}

                {categoryEntries.length === 0 && (
                  <div className="px-5 py-6 text-center text-small text-credmuted">No spend data yet for {label}.</div>
                )}
              </Shell>
            </RevealSection>

            {/* Recurring */}
            {data.recurring.length > 0 && (
              <RevealSection delay={60}>
                <Shell>
                  <div className="px-5 pt-4 pb-1.5 flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-credmuted">Recurring</span>
                    <span className="text-[9px] font-bold text-credmuted/60 bg-credbg px-2 py-0.5 rounded-full tabular-nums">{data.recurring.length}</span>
                  </div>
                  <div className="px-5 pb-2">
                    {data.recurring.map((g: any, i: number) => (
                      <div key={i} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-credline/30' : ''}`}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none bg-credbg text-credmuted">
                          <CategoryIcon id="subs" size={16} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-small font-semibold text-credink truncate">{displayMerchant(g.merchant)}</div>
                          <div className="text-[9px] text-credmuted mt-0.5">{g.months} months</div>
                        </div>
                        <div className="text-right flex-none">
                          <div className="text-small font-bold text-credink tabular-nums">{fmt(g.avg)}</div>
                          <div className="text-[9px] text-credmuted font-medium">/mo avg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Shell>
              </RevealSection>
            )}

            {/* Annual Report */}
            <RevealSection delay={60}>
              <Link
                href="/report"
                className="flex items-center justify-between w-full group"
              >
                <Shell className="w-full">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6" />
                          <path d="M16 13H8M16 17H8M10 9H8" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-small font-semibold text-credink group-hover:text-accent transition-colors duration-200">Annual Report</div>
                        <div className="text-[9px] text-credmuted">Year-over-year financial overview</div>
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-credmuted/30 group-hover:text-credmuted transition-colors duration-200" aria-hidden>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Shell>
              </Link>
            </RevealSection>
          </>
        )}
      </div>
    </div>
  );
}
