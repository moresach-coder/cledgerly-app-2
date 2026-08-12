'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Kind = 'ok' | 'err' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const ToastCtx = createContext<(text: string, kind?: Kind) => void>(() => {});

/** Call from any client component: `const toast = useToast(); toast('Saved', 'ok')`. */
export function useToast() {
  return useContext(ToastCtx);
}

const STYLES: Record<Kind, string> = {
  ok: 'bg-pos text-white',
  err: 'bg-neg text-white',
  info: 'bg-credink text-white',
};

const ICONS: Record<Kind, string> = { ok: '✓', err: '!', info: 'i' };

function ToastItem({ t, onDone }: { t: Toast; onDone: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDone(t.id), 180);
  }, [t.id, onDone]);

  useEffect(() => {
    const timer = setTimeout(dismiss, t.kind === 'err' ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [t, dismiss]);

  return (
    <div
      role="status"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 180ms cubic-bezier(0.32, 0.72, 0, 1), transform 180ms cubic-bezier(0.32, 0.72, 0, 1)',
      }}
      className={`${STYLES[t.kind]} rounded-xl px-4 py-3 shadow-lg flex items-start gap-2.5 pointer-events-auto animate-[toastIn_180ms_cubic-bezier(0.32,0.72,0,1)]`}
    >
      <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-micro font-bold flex-none mt-0.5">
        {ICONS[t.kind]}
      </span>
      <span className="text-small font-semibold leading-snug flex-1">{t.text}</span>
      <button onClick={dismiss} aria-label="Dismiss" className="text-white/70 text-small leading-none flex-none">
        ✕
      </button>
    </div>
  );
}

/**
 * App-wide confirmations.
 *
 * Anchored to the viewport rather than to the top of a page, because a message rendered
 * above a long form is invisible to someone who has scrolled down to press the button —
 * they cannot tell whether the action worked.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((text: string, kind: Kind = 'ok') => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), kind, text }]);
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-[88px] md:bottom-6 z-[100] w-[min(92vw,26rem)] space-y-2 pointer-events-none">
        {items.map((t) => (
          <ToastItem key={t.id} t={t} onDone={remove} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
