# 001 — Add exit animation to toasts

- **Status**: TODO
- **Commit**: no-git
- **Severity**: HIGH
- **Category**: Missed opportunity / Spatial consistency
- **Estimated scope**: 1 file (`components/Toast.tsx`), ~20 lines changed

## Problem

Toasts enter with a slide-up animation (`animate-[toastIn_180ms_ease-out]`) but vanish instantly when dismissed or timed out. The spatial story is broken — content that entered from below should exit the same way. The abrupt disappearance is especially jarring when a toast is dismissed mid-read.

```tsx
/* components/Toast.tsx:35 — current */
<div
  role="status"
  className={`${STYLES[t.kind]} rounded-xl px-4 py-3 shadow-lg flex items-start gap-2.5 pointer-events-auto animate-[toastIn_180ms_ease-out]`}
>
```

The `remove` callback (line 62) immediately filters the toast from state — no exit phase:

```tsx
/* components/Toast.tsx:62 — current */
const remove = useCallback((id: number) => {
  setItems((prev) => prev.filter((t) => t.id !== id));
}, []);
```

## Target

Toasts exit with `opacity: 0; transform: translateY(8px)` over `180ms cubic-bezier(0.32, 0.72, 0, 1)` before unmounting. The entry animation also switches to the app's spring curve for cohesion.

```tsx
/* target — ToastItem with exit phase */
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
```

Key changes:
- `exiting` state drives a CSS transition (interruptible, not a keyframe restart)
- `dismiss` sets `exiting = true`, then delays `onDone` by 180ms to let the transition complete
- Both timeout and manual dismiss go through `dismiss`
- Entry keyframe uses `cubic-bezier(0.32, 0.72, 0, 1)` instead of bare `ease-out`

## Repo conventions to follow

- The app uses `cubic-bezier(0.32, 0.72, 0, 1)` as its spring curve everywhere (see `tailwind.config.js:96–101`)
- Inline `style` transitions are used in the report page for staggered reveals — same pattern here
- Entry keyframe `toastIn` is defined inline in the className; keep that pattern

## Steps

1. In `components/Toast.tsx`, add `useState` to the existing React import at line 1.
2. In the `ToastItem` component (starting at line 30), add an `exiting` state and a `dismiss` callback as shown in the Target section above.
3. Replace the `useEffect` body (lines 31–34) to call `dismiss` instead of `onDone` directly.
4. On the outer `<div>` (line 35), add the inline `style` object with conditional `opacity` and `transform`, and the `transition` property. Update the entry keyframe easing from `ease-out` to `cubic-bezier(0.32,0.72,0,1)`.
5. Change the dismiss button's `onClick` (line 42) from `() => onDone(t.id)` to `dismiss`.

## Boundaries

- Do NOT touch `ToastProvider` or the `push`/`remove` callbacks — exit logic lives entirely inside `ToastItem`.
- Do NOT add new dependencies or keyframes — this uses a CSS transition, not a keyframe.
- Do NOT change toast positioning, sizing, or color styling.
- If `ToastItem` no longer matches the code shown above (drift), STOP and report.

## Verification

- **Mechanical**: `npx next build` completes without errors. No new warnings.
- **Feel check**: trigger a toast (e.g. confirm a transaction), then:
  - Watch it enter from below with a spring feel, not a linear slide.
  - Wait for auto-dismiss: it should fade down and out over ~180ms, not vanish.
  - Click the ✕ button: same exit animation, not instant.
  - Trigger 2–3 toasts rapidly: each exits independently, no jumpiness in the stack.
  - In DevTools Animations panel at 10% speed, confirm the exit uses `translateY(8px)` and opacity reaches 0 before unmount.
- **Done when**: toasts enter and exit symmetrically along the Y axis, and the dismiss button triggers the same exit as the timeout.
