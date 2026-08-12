# 002 — Apply existing dropdownIn animation to KebabMenu

- **Status**: TODO
- **Commit**: no-git
- **Severity**: HIGH
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file (`components/Section.tsx`), 1 line changed

## Problem

The KebabMenu dropdown appears instantly when toggled. The app already defines an `animate-dropdownIn` token (`180ms cubic-bezier(0.32, 0.72, 0, 1)`, scale from 0.95 + translateY(-4px) to settled) but it's not applied here. Every other popup in the app (Sheet, PeriodPicker, FilterSheet) has an entrance animation — this one doesn't.

```tsx
/* components/Section.tsx:38–43 — current */
<div className="absolute right-0 top-9 z-50 bg-credsurface border border-credline rounded-xl shadow-lg py-1.5 min-w-[160px]">
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
```

## Target

Add the existing `animate-dropdownIn` class to the dropdown container:

```tsx
/* target */
<div className="absolute right-0 top-9 z-50 bg-credsurface border border-credline rounded-xl shadow-lg py-1.5 min-w-[160px] animate-dropdownIn">
```

The token is already defined in `tailwind.config.js:90–92,101`:
```js
dropdownIn: {
  from: { opacity: '0', transform: 'scale(0.95) translateY(-4px)' },
  to: { opacity: '1', transform: 'scale(1) translateY(0)' },
},
// animation:
dropdownIn: 'dropdownIn 180ms cubic-bezier(0.32, 0.72, 0, 1) both',
```

## Repo conventions to follow

- Animation tokens are applied as Tailwind classes (`animate-fadeIn`, `animate-sheetIn`, `animate-dropdownIn`)
- `PeriodPicker.tsx:92` uses `animate-fadeIn` on its portal dropdown — same pattern

## Steps

1. In `components/Section.tsx`, line 38, add `animate-dropdownIn` to the className of the dropdown `<div>`.

That's it. One class addition.

## Boundaries

- Do NOT change the dropdown's positioning, z-index, sizing, or close behavior.
- Do NOT add new keyframes or tokens — `dropdownIn` already exists.
- Do NOT add an exit animation (the dropdown unmounts on close; a conditional-render exit would require restructuring that's out of scope).
- If the dropdown div's className no longer matches the code shown above, STOP and report.

## Verification

- **Mechanical**: `npx next build` completes without errors.
- **Feel check**: on the Summary page, tap the ··· kebab menu on any section:
  - The dropdown should scale in from slightly above and smaller, landing in 180ms.
  - It should feel snappy, not floaty — the spring curve overshoots very slightly.
  - Rapid open/close should not produce glitches (keyframe restarts are fine here since open/close unmounts).
  - In DevTools at 10% speed, confirm the dropdown starts at `scale(0.95) translateY(-4px)` and resolves to identity.
- **Done when**: the kebab dropdown enters with the same motion quality as the PeriodPicker and Sheet.
