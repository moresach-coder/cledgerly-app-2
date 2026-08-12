'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { optionsFor, parsePeriod, type Granularity, type Period } from '@/lib/period';

const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const ITEM_H = 40;
const VISIBLE = 5;

function WheelColumn({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = items.findIndex((i) => i.id === value);
  const suppressSnap = useRef(false);

  useEffect(() => {
    if (!ref.current || suppressSnap.current) return;
    ref.current.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
  }, [idx]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTo({ top: Math.max(0, idx) * ITEM_H, behavior: 'instant' as any });
  }, [items.length]);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    const scrollTop = ref.current.scrollTop;
    const snappedIdx = Math.round(scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(snappedIdx, items.length - 1));
    if (items[clamped] && items[clamped].id !== value) {
      suppressSnap.current = true;
      onChange(items[clamped].id);
      requestAnimationFrame(() => { suppressSnap.current = false; });
    }
  }, [items, value, onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(handleScroll, 80);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(timer); };
  }, [handleScroll]);

  const padTop = Math.floor(VISIBLE / 2) * ITEM_H;

  return (
    <div className="relative" style={{ height: VISIBLE * ITEM_H }}>
      {/* Selection highlight */}
      <div
        className="absolute inset-x-0 pointer-events-none rounded-lg bg-credbg/80 border-y border-credline/40"
        style={{ top: padTop, height: ITEM_H }}
      />
      {/* Fade edges */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-credsurface to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-credsurface to-transparent pointer-events-none z-10" />
      <div
        ref={ref}
        className="h-full overflow-y-auto scrollbar-none snap-y snap-mandatory"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ height: padTop }} />
        {items.map((item) => {
          const on = item.id === value;
          return (
            <div
              key={item.id}
              className="snap-center flex items-center justify-center cursor-pointer select-none"
              style={{ height: ITEM_H }}
              onClick={() => onChange(item.id)}
            >
              <span
                className={`text-body transition-all duration-200 ${
                  on ? 'font-bold text-credink scale-105' : 'font-medium text-credmuted/60'
                }`}
                style={{ transitionTimingFunction: SPRING }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
        <div style={{ height: padTop }} />
      </div>
    </div>
  );
}

export default function PeriodPicker({
  months,
  value,
  granularity,
  onApply,
  compact,
}: {
  months: string[];
  value: string;
  granularity: Granularity;
  onApply: (id: string, g: Granularity) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draftG, setDraftG] = useState<Granularity>(granularity);
  const [draft, setDraft] = useState(value);
  const btnRef = useRef<HTMLButtonElement>(null);

  const active = parsePeriod(value);
  const options: Period[] = optionsFor(draftG, months);
  const allItems = [
    ...options.map((p) => ({ id: p.id, label: p.label })),
    { id: 'all', label: 'All Time' },
  ];

  useEffect(() => {
    if (open) {
      setDraftG(granularity);
      setDraft(value);
    }
  }, [open, granularity, value]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);

  const TABS: { id: Granularity; label: string }[] = [
    { id: 'month', label: 'Month' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'year', label: 'Year' },
  ];

  const dirty = draft !== value || draftG !== granularity;

  const modal = open && createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/30 backdrop-blur-[2px]"
        style={{ animation: `fadeIn 200ms ${SPRING}` }}
        onClick={() => setOpen(false)}
      />
      {/* Bottom sheet picker */}
      <div
        className="fixed bottom-0 inset-x-0 z-[999] bg-credsurface rounded-t-[1.25rem] shadow-2xl"
        style={{ animation: `slideUp 350ms ${SPRING}` }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-credline" />
        </div>

        {/* Segmented control */}
        <div className="px-5 pb-3">
          <div className="flex bg-credbg rounded-xl p-1 gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setDraftG(t.id);
                  const opts = optionsFor(t.id, months);
                  if (opts.length > 0) setDraft(opts[0].id);
                }}
                className={`flex-1 py-2 rounded-[10px] text-caption font-semibold transition-all duration-200 ${
                  draftG === t.id
                    ? 'text-accent bg-accent/5 border border-accent/20 shadow-sm'
                    : 'text-credmuted hover:text-credink border border-transparent'
                }`}
                style={{ transitionTimingFunction: SPRING }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wheel */}
        <div className="px-8">
          <WheelColumn
            key={draftG}
            items={allItems}
            value={draft}
            onChange={setDraft}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 px-5 pt-2 pb-8">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 py-2.5 rounded-xl text-caption font-semibold text-credmuted border border-credline hover:bg-credbg active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => { onApply(draft, draftG); setOpen(false); }}
            disabled={!dirty}
            className="flex-1 py-2.5 rounded-xl text-caption font-semibold text-accent border border-accent/20 bg-accent/5 hover:bg-accent/10 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            Apply
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .scrollbar-none::-webkit-scrollbar { display: none }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none }
      `}</style>
    </>,
    document.body
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={compact
          ? `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-small font-semibold transition-all ${
              open ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
            }`
          : `flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl border text-caption font-semibold transition-colors whitespace-nowrap ${
              open ? 'bg-accentsoft border-accent text-accent' : 'bg-credsurface border-credline text-credink'
            }`
        }
      >
        {!compact && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <rect x="3" y="4" width="18" height="17" rx="2.5" />
            <path d="M3 10h18M8 2v4M16 2v4" />
          </svg>
        )}
        {active.label}
        <svg
          width={compact ? "10" : "14"} height={compact ? "10" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {modal}
    </>
  );
}
