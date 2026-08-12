'use client';
import { useEffect } from 'react';

/**
 * Bottom sheet with three fixed zones.
 *
 * The header and footer never move; only `children` scrolls. This exists as one component
 * so every sheet in the app inherits the same behaviour — the actions stay reachable at
 * any scroll position, which is not true if the whole sheet is one scroll container.
 *
 * `min-h-0` on the scroll area is load-bearing: a flex child defaults to `min-height:auto`
 * and refuses to shrink below its content, which pushes the footer off screen.
 */
export default function Sheet({
  header,
  footer,
  children,
  onClose,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}) {
  // Freeze the page behind the sheet. Without this, scrolling past the end of the sheet
  // hands the gesture to the page underneath and the background slides away.
  useEffect(() => {
    const root = document.documentElement;
    const prev = {
      htmlOverflow: root.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };
    const y = window.scrollY;
    const gap = window.innerWidth - root.clientWidth;

    // Pinning the body is what actually holds the page still. `overflow: hidden` alone
    // leaves the scrolling element free, so the page still slides behind the sheet.
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.width = '100%';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);

    return () => {
      root.style.overflow = prev.htmlOverflow;
      document.body.style.overflow = prev.bodyOverflow;
      document.body.style.position = prev.bodyPosition;
      document.body.style.top = prev.bodyTop;
      document.body.style.width = prev.bodyWidth;
      document.body.style.paddingRight = prev.paddingRight;
      window.scrollTo(0, y); // restore exactly where the user was
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-credink/45 backdrop-blur-[2px] z-50 flex items-end justify-center animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-credsurface w-full max-w-md rounded-t-sheet max-h-[80vh] flex flex-col text-credink shadow-sheet animate-sheetIn">
        <div className="flex-none px-5 pt-3 pb-4 border-b border-credline relative">
          <div className="w-9 h-1 rounded bg-credline mx-auto mb-3" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 w-8 h-8 rounded-full border border-credline text-credmuted text-small leading-none"
          >
            ✕
          </button>
          {header}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>

        <div className="flex-none px-5 py-4 border-t border-credline pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {footer}
        </div>
      </div>
    </div>
  );
}

/** Equal-width action pair. Emphasis comes from colour, never from width. */
export function SheetActions({
  cancelLabel = 'Cancel',
  confirmLabel,
  onCancel,
  onConfirm,
  disabled,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <button
        onClick={onCancel}
        className="pressable flex-1 py-3.5 rounded-xl text-body font-bold bg-credsurface border border-credline text-credink hover:bg-credsunken"
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className="pressable flex-1 py-3.5 rounded-xl text-body font-bold bg-accent text-white hover:bg-accent/90 disabled:opacity-30"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
