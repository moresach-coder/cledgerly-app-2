'use client';
import Link from 'next/link';

export default function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-1 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-full bg-gradient-to-br from-credink to-[#2a2b38] text-white flex items-center justify-center text-body font-bold flex-none shadow-subtle ring-2 ring-credsurface">
            SM
          </span>
          <div className="min-w-0">
            <div className="text-body font-bold text-credink truncate uppercase tracking-[0.06em]">Ledgerly</div>
            <div className="text-micro uppercase tracking-[0.08em] text-credmuted font-semibold">Personal Finance</div>
          </div>
        </div>

        <Link
          href="/settings"
          aria-label="Settings"
          className="w-10 h-10 rounded-full bg-credsurface/80 backdrop-blur-xl border border-credline/60 flex items-center justify-center text-credmuted hover:text-credink hover:border-credink/20 transition-all shadow-subtle pressable"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.24.58.78.98 1.41 1H21a2 2 0 0 1 0 4h-.09c-.63.02-1.17.42-1.41 1z" />
          </svg>
        </Link>
      </div>

      {title && <h1 className="text-display font-extrabold tracking-[-0.02em] leading-tight">{title}</h1>}
      {subtitle && <p className="text-small text-credmuted mt-1.5">{subtitle}</p>}
    </div>
  );
}
