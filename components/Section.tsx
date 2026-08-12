'use client';
import { useState } from 'react';
import Amount from './Amount';

/**
 * Section label. Deliberately small, uppercase, letterspaced and muted rather than a
 * large black heading — the data underneath is the thing worth looking at, the label
 * only needs to be findable.
 */
export function SectionTitle({ children, right, menu }: { children: React.ReactNode; right?: string; menu?: React.ReactNode }) {
  return (
    <div className="mb-3 flex justify-between items-center gap-3">
      <span className="text-small uppercase tracking-[0.12em] font-bold text-credmuted">{children}</span>
      <div className="flex items-center gap-2 flex-none">
        {right && <span className="text-caption uppercase tracking-[0.08em] text-credmuted/80 font-semibold">{right}</span>}
        {menu}
      </div>
    </div>
  );
}

/** Small "···" menu button that opens a compact dropdown of actions, anchored under the trigger. */
export function KebabMenu({ options }: { options: { label: string; onClick: () => void; active?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-full border border-credline flex items-center justify-center text-credmuted"
        aria-label="More options"
      >
        &#8942;
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-credsurface border border-credline rounded-xl shadow-lg py-1.5 min-w-[160px] animate-dropdownIn">
            {options.map((o) => (
              <button
                key={o.label}
                onClick={() => { o.onClick(); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-small ${o.active ? 'text-credink font-semibold' : 'text-credmuted'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Row({ icon, name, sub, amt, onClick }: { icon: React.ReactNode; name: string; sub: string; amt: number; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 bg-credsurface border border-credline rounded-xl px-3.5 py-3 ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
    >
      <span className="w-9 h-9 rounded-full flex items-center justify-center flex-none bg-credbg text-credink">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-body font-medium text-credink truncate">{name}</div>
        <div className="text-caption text-credmuted mt-0.5">{sub}</div>
      </div>
      <div className="text-credink"><Amount value={amt} size="sm" /></div>
    </div>
  );
}

export function Empty({ text = 'Nothing yet.' }: { text?: string }) {
  return <div className="text-center py-6 text-credmuted text-sm">{text}</div>;
}
