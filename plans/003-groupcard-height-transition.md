# 003 — Animate GroupCard expand/collapse height

- **Status**: TODO
- **Commit**: no-git
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 1 file (`components/GroupCard.tsx`), ~15 lines changed

## Problem

When a grouped transaction card is expanded, the transaction list fades in (`animate-fadeIn`, 160ms opacity-only) but the height snaps — the card jumps from its collapsed size to the full expanded size in a single frame. Content below the card teleports downward. This breaks the spatial story of "this card is growing to reveal its contents."

```tsx
/* components/GroupCard.tsx:144–145 — current */
{open && (
  <div className="border-t border-credline animate-fadeIn">
```

## Target

Use a CSS grid height transition (`grid-template-rows: 0fr → 1fr`) so the content smoothly grows into its natural height. The inner content uses `overflow: hidden` during the transition.

```tsx
/* target — replace lines 143–146 */

{/* Expandable section — always mounted, height animated via grid */}
<div
  className="border-t border-credline"
  style={{
    display: 'grid',
    gridTemplateRows: open ? '1fr' : '0fr',
    opacity: open ? 1 : 0,
    transition: 'grid-template-rows 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms cubic-bezier(0.32, 0.72, 0, 1)',
  }}
>
  <div style={{ overflow: 'hidden' }}>
    {/* existing content: loading, confirmed list, or interactive list */}
    {!rows ? (
      <div className="px-4 py-4 text-caption text-credmuted text-center">Loading…</div>
    ) : confirmed ? (
      /* ... existing confirmed read-only list ... */
    ) : (
      /* ... existing interactive list with checkboxes ... */
    )}
  </div>
</div>
```

Key changes:
- The expanded section is **always mounted** (remove `{open && ...}` conditional)
- Outer div uses `grid-template-rows` to animate height, `opacity` for the fade
- Inner div uses `overflow: hidden` to clip content during the 0fr state
- `border-t` only shows when there's visible content (move it or make it conditional)
- `animate-fadeIn` removed — the inline transition handles both height and opacity

## Repo conventions to follow

- The app uses `cubic-bezier(0.32, 0.72, 0, 1)` as its spring curve consistently
- Inline `style` transitions are used in `app/report/page.tsx` for staggered reveals — same pattern
- `GroupCard.tsx:96` already uses `transition-transform duration-200` for the chevron rotation

## Steps

1. In `components/GroupCard.tsx`, remove the `{open && (` conditional wrapper around the expanded section (line 143–144) and its closing `)}` (line 231).

2. Replace the outer `<div className="border-t border-credline animate-fadeIn">` with the grid-animated wrapper:
   ```tsx
   <div
     style={{
       display: 'grid',
       gridTemplateRows: open ? '1fr' : '0fr',
       opacity: open ? 1 : 0,
       transition: 'grid-template-rows 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms cubic-bezier(0.32, 0.72, 0, 1)',
     }}
   >
     <div className="overflow-hidden">
       <div className="border-t border-credline">
   ```

3. Close the two new wrapper divs after the existing content's closing tags.

4. The `onExpand` call in `handleCardClick` (line 62) may now fire before `rows` are loaded — this is already the case, no change needed. The loading state renders inside the always-mounted wrapper.

5. The `useEffect` that resets `selected` when `open && rows` change (line 41–43) continues to work unchanged.

## Boundaries

- Do NOT change the checkbox logic, action bar, or any content inside the expanded section.
- Do NOT add new dependencies.
- Do NOT change the chevron rotation animation — it's already correct.
- If the conditional render pattern at line 143–144 no longer matches `{open && (`, STOP and report.

## Verification

- **Mechanical**: `npx next build` completes without errors.
- **Feel check**: on the Review page, tap a grouped card (2+ transactions):
  - The transaction list should grow smoothly from 0 height over ~300ms, not snap.
  - Content below the card should slide down smoothly, not jump.
  - Collapsing (tapping again) should reverse — height shrinks back to 0 with the same curve.
  - The opacity fade should be slightly faster (200ms) than the height (300ms), so content is fully visible before the height finishes settling.
  - Rapidly toggling open/close should retarget smoothly from the current position (CSS transitions handle this automatically).
  - In DevTools at 10% speed, confirm no layout shift or content clipping at the end of the animation.
- **Done when**: GroupCard expand/collapse feels physical — content grows into its space rather than appearing in a pre-cut hole.
